import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentType,
  AuditStatus,
  GradingComponentCalculationMode,
  GradingWorkflowStatus,
  MonthlyGrade,
  Prisma,
  StudentAttendanceStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DataScopeService } from '../../teaching-assignments/data-scope/data-scope.service';
import { CalculateMonthlyGradesDto } from './dto/calculate-monthly-grades.dto';
import { CreateMonthlyGradeDto } from './dto/create-monthly-grade.dto';
import { ListMonthlyGradesDto } from './dto/list-monthly-grades.dto';
import { UpdateMonthlyGradeDto } from './dto/update-monthly-grade.dto';

type PrismaDb = PrismaService | Prisma.TransactionClient;

type PolicyComponentContext = {
  id: string;
  code: string;
  maxScore: number;
  calculationMode: GradingComponentCalculationMode;
  includeInMonthly: boolean;
  includeInSemester: boolean;
  isActive: boolean;
};

type GradingPolicyContext = {
  id: string;
  maxAttendanceScore: number;
  maxHomeworkScore: number;
  maxExamScore: number;
  maxActivityScore: number;
  maxContributionScore: number;
  components: PolicyComponentContext[];
};

type EnrollmentMonthlyContext = {
  sectionId: string;
  gradeLevelId: string;
  academicYearId: string;
  academicTermId: string;
  monthStartDate: Date;
  monthEndDate: Date;
  policy: GradingPolicyContext;
};

const monthlyGradeInclude: Prisma.MonthlyGradeInclude = {
  _count: {
    select: {
      customComponentScores: true,
    },
  },
  studentEnrollment: {
    select: {
      id: true,
      sectionId: true,
      academicYearId: true,
      status: true,
      isActive: true,
      student: {
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
          isActive: true,
        },
      },
      section: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          gradeLevel: {
            select: {
              id: true,
              code: true,
              name: true,
              sequence: true,
            },
          },
        },
      },
      academicYear: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          isCurrent: true,
        },
      },
    },
  },
  subject: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  },
  academicMonth: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      startDate: true,
      endDate: true,
      status: true,
      isCurrent: true,
      isActive: true,
    },
  },
  academicTerm: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      isActive: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      isCurrent: true,
    },
  },
  gradingPolicy: {
    select: {
      id: true,
      assessmentType: true,
      status: true,
      maxExamScore: true,
      maxHomeworkScore: true,
      maxAttendanceScore: true,
      maxActivityScore: true,
      maxContributionScore: true,
      components: {
        where: {
          deletedAt: null,
          isActive: true,
          includeInMonthly: true,
        },
        select: {
          id: true,
          code: true,
          maxScore: true,
          calculationMode: true,
          includeInMonthly: true,
          includeInSemester: true,
          isActive: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
  lockedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
  customComponentScores: {
    where: {
      deletedAt: null,
      isActive: true,
    },
    include: {
      gradingPolicyComponent: {
        select: {
          id: true,
          code: true,
          name: true,
          maxScore: true,
          includeInMonthly: true,
          calculationMode: true,
          isActive: true,
        },
      },
    },
    orderBy: [
      {
        gradingPolicyComponent: {
          sortOrder: 'asc',
        },
      },
      {
        createdAt: 'asc',
      },
    ],
  },
  periodGradeComponents: {
    where: {
      deletedAt: null,
    },
    include: {
      gradingPolicyComponent: {
        select: {
          id: true,
          code: true,
          name: true,
          maxScore: true,
          includeInMonthly: true,
          calculationMode: true,
          isActive: true,
        },
      },
    },
  },
};

@Injectable()
export class MonthlyGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async create(payload: CreateMonthlyGradeDto, actorUserId: string) {
    const context = await this.ensureEnrollmentContext(
      payload.studentEnrollmentId,
      payload.subjectId,
      payload.academicMonthId,
    );
    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      payload.subjectId,
      context.academicYearId,
    );

    const existing = await this.prisma.monthlyGrade.findFirst({
      where: {
        studentEnrollmentId: payload.studentEnrollmentId,
        subjectId: payload.subjectId,
        academicMonthId: payload.academicMonthId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'توجد درجة شهرية مسبقًا لهذا القيد والمادة والشهر',
      );
    }

    const activityScore = payload.activityScore ?? 0;
    const contributionScore = payload.contributionScore ?? 0;
    this.validateManualScores(context.policy, activityScore, contributionScore);

    const autoScores = await this.computeComponentScores(
      this.prisma,
      payload.studentEnrollmentId,
      payload.subjectId,
      context.sectionId,
      context.monthStartDate,
      context.monthEndDate,
      context.academicYearId,
      context.academicTermId,
      context.policy,
      activityScore,
      contributionScore,
    );

    const monthlyTotal = this.computeMonthlyTotal(
      autoScores.attendanceScore,
      autoScores.homeworkScore,
      activityScore,
      contributionScore,
      0,
      autoScores.examScore,
    );

    try {
      const monthlyGrade = await this.prisma.monthlyGrade.create({
        data: {
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          academicMonthId: payload.academicMonthId,
          academicTermId: context.academicTermId,
          academicYearId: context.academicYearId,
          gradingPolicyId: context.policy.id,
          attendanceScore: autoScores.attendanceScore,
          homeworkScore: autoScores.homeworkScore,
          activityScore,
          contributionScore,
          customComponentsScore: 0,
          examScore: autoScores.examScore,
          monthlyTotal,
          status: GradingWorkflowStatus.DRAFT,
          isLocked: false,
          calculatedAt: new Date(),
          notes: payload.notes?.trim(),
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
          periodGradeComponents: {
            create: autoScores.computedComponents.map((c) => ({
              gradingPolicyComponentId: c.gradingPolicyComponentId,
              score: c.score,
              isAutoCalculated: c.isAutoCalculated,
              createdById: actorUserId,
              updatedById: actorUserId,
            })),
          },
        },
        include: monthlyGradeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'MONTHLY_GRADE_CREATE',
        resource: 'monthly-grades',
        resourceId: monthlyGrade.id,
        details: {
          studentEnrollmentId: monthlyGrade.studentEnrollmentId,
          subjectId: monthlyGrade.subjectId,
          academicMonthId: monthlyGrade.academicMonthId,
          gradingPolicyId: monthlyGrade.gradingPolicyId,
        },
      });

      return monthlyGrade;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'MONTHLY_GRADE_CREATE_FAILED',
        resource: 'monthly-grades',
        status: AuditStatus.FAILURE,
        details: {
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          academicMonthId: payload.academicMonthId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async calculate(payload: CalculateMonthlyGradesDto, actorUserId: string) {
    const month = await this.ensureAcademicMonthExistsAndActive(
      payload.academicMonthId,
    );
    const section = await this.ensureSectionExistsAndActive(payload.sectionId);
    await this.ensureSubjectExistsAndActive(payload.subjectId);

    await this.ensureSubjectOfferedInTerm(
      month.academicYearId,
      month.academicTermId,
      section.gradeLevelId,
      payload.subjectId,
    );

    const policy = await this.findMonthlyPolicy(
      month.academicYearId,
      section.gradeLevelId,
      payload.subjectId,
    );

    await this.ensureActorAuthorized(
      actorUserId,
      payload.sectionId,
      payload.subjectId,
      month.academicYearId,
    );

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        sectionId: payload.sectionId,
        academicYearId: month.academicYearId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (enrollments.length === 0) {
      return {
        message:
          'لا توجد قيود طلاب نشطة للشعبة والشهر المحددين',
        summary: {
          totalEnrollments: 0,
          created: 0,
          updated: 0,
          skippedLocked: 0,
        },
      };
    }

    const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
    const existingRows = await this.prisma.monthlyGrade.findMany({
      where: {
        academicMonthId: payload.academicMonthId,
        subjectId: payload.subjectId,
        studentEnrollmentId: {
          in: enrollmentIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        studentEnrollmentId: true,
        activityScore: true,
        contributionScore: true,
        isLocked: true,
      },
    });

    const existingByEnrollmentId = new Map(
      existingRows.map((row) => [row.studentEnrollmentId, row] as const),
    );

    const overwriteManual = payload.overwriteManual ?? false;
    const now = new Date();
    const summary = {
      totalEnrollments: enrollmentIds.length,
      created: 0,
      updated: 0,
      skippedLocked: 0,
    };

    await this.prisma.$transaction(async (tx) => {
      for (const enrollmentId of enrollmentIds) {
        const existing = existingByEnrollmentId.get(enrollmentId);

        if (existing?.isLocked) {
          summary.skippedLocked += 1;
          continue;
        }

        const activityScore = overwriteManual
          ? 0
          : (this.decimalToNumber(existing?.activityScore) ?? 0);
        const contributionScore = overwriteManual
          ? 0
          : (this.decimalToNumber(existing?.contributionScore) ?? 0);

        this.validateManualScores(policy, activityScore, contributionScore);

        const autoScores = await this.computeComponentScores(
          tx,
          enrollmentId,
          payload.subjectId,
          payload.sectionId,
          month.startDate,
          month.endDate,
          month.academicYearId,
          month.academicTermId,
          policy,
          activityScore,
          contributionScore,
        );

        const customComponentsScore = existing
          ? await this.sumCustomComponentScores(tx, existing.id, policy.id)
          : 0;

        const monthlyTotal = this.computeMonthlyTotal(
          autoScores.attendanceScore,
          autoScores.homeworkScore,
          activityScore,
          contributionScore,
          customComponentsScore,
          autoScores.examScore,
        );

        if (existing) {
          await tx.monthlyGrade.update({
            where: {
              id: existing.id,
            },
            data: {
              attendanceScore: autoScores.attendanceScore,
              homeworkScore: autoScores.homeworkScore,
              activityScore,
              contributionScore,
              customComponentsScore,
              examScore: autoScores.examScore,
              monthlyTotal,
              calculatedAt: now,
              updatedById: actorUserId,
              periodGradeComponents: {
                deleteMany: {},
                create: autoScores.computedComponents.map((c) => ({
                  gradingPolicyComponentId: c.gradingPolicyComponentId,
                  score: c.score,
                  isAutoCalculated: c.isAutoCalculated,
                  createdById: actorUserId,
                  updatedById: actorUserId,
                })),
              },
            },
          });
          summary.updated += 1;
        } else {
          await tx.monthlyGrade.create({
            data: {
              studentEnrollmentId: enrollmentId,
              subjectId: payload.subjectId,
              academicMonthId: payload.academicMonthId,
              academicTermId: month.academicTermId,
              academicYearId: month.academicYearId,
              gradingPolicyId: policy.id,
              attendanceScore: autoScores.attendanceScore,
              homeworkScore: autoScores.homeworkScore,
              activityScore,
              contributionScore,
              customComponentsScore: 0,
              examScore: autoScores.examScore,
              monthlyTotal: this.computeMonthlyTotal(
                autoScores.attendanceScore,
                autoScores.homeworkScore,
                activityScore,
                contributionScore,
                0,
                autoScores.examScore,
              ),
              status: GradingWorkflowStatus.DRAFT,
              isLocked: false,
              calculatedAt: now,
              isActive: true,
              createdById: actorUserId,
              updatedById: actorUserId,
              periodGradeComponents: {
                create: autoScores.computedComponents.map((c) => ({
                  gradingPolicyComponentId: c.gradingPolicyComponentId,
                  score: c.score,
                  isAutoCalculated: c.isAutoCalculated,
                  createdById: actorUserId,
                  updatedById: actorUserId,
                })),
              },
            },
          });
          summary.created += 1;
        }
      }
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'MONTHLY_GRADE_CALCULATE',
      resource: 'monthly-grades',
      details: {
        academicMonthId: payload.academicMonthId,
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        overwriteManual,
        summary,
      },
    });

    return {
      message: 'اكتمل احتساب الدرجات الشهرية',
      summary,
    };
  }

  async findAll(query: ListMonthlyGradesDto, actorUserId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.MonthlyGradeWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      academicTermId: query.academicTermId,
      academicMonthId: query.academicMonthId,
      subjectId: query.subjectId,
      studentEnrollmentId: query.studentEnrollmentId,
      status: query.status,
      isLocked: query.isLocked,
      isActive: query.isActive,
      studentEnrollment: {
        sectionId: query.sectionId,
        studentId: query.studentId,
      },
      OR: query.search
        ? [
            {
              studentEnrollment: {
                student: {
                  fullName: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              studentEnrollment: {
                student: {
                  admissionNo: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              subject: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              subject: {
                code: {
                  contains: query.search,
                },
              },
            },
            {
              academicMonth: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              notes: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const scope = await this.dataScopeService.getSectionSubjectYearGrants({
      actorUserId,
      capability: 'MANAGE_GRADES',
      academicYearId: query.academicYearId,
    });

    if (!scope.isPrivileged) {
      if (scope.grants.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }

      const scopedOr: Prisma.MonthlyGradeWhereInput[] = scope.grants.map(
        (grant) => ({
          academicYearId: grant.academicYearId,
          subjectId: grant.subjectId,
          studentEnrollment: {
            sectionId: grant.sectionId,
          },
        }),
      );

      where.AND = [
        {
          OR: scopedOr,
        },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.monthlyGrade.count({ where }),
      this.prisma.monthlyGrade.findMany({
        where,
        include: monthlyGradeInclude,
        orderBy: [
          {
            academicYear: {
              startDate: 'desc',
            },
          },
          {
            academicTerm: {
              sequence: 'asc',
            },
          },
          {
            academicMonth: {
              sequence: 'asc',
            },
          },
          {
            studentEnrollment: {
              student: {
                fullName: 'asc',
              },
            },
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, actorUserId: string) {
    const monthlyGrade = await this.prisma.monthlyGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: monthlyGradeInclude,
    });

    if (!monthlyGrade) {
      throw new NotFoundException('الدرجة الشهرية غير موجودة');
    }

    await this.ensureActorAuthorized(
      actorUserId,
      monthlyGrade.studentEnrollment.sectionId,
      monthlyGrade.subject.id,
      monthlyGrade.academicYear.id,
    );

    return monthlyGrade;
  }

  async update(
    id: string,
    payload: UpdateMonthlyGradeDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureMonthlyGradeExists(id);

    if (existing.isLocked) {
      throw new ConflictException('لا يمكن تعديل درجة شهرية مقفلة');
    }

    const context = await this.ensureMonthlyGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    const activityScore =
      payload.activityScore ??
      this.decimalToNumber(existing.activityScore) ??
      0;
    const contributionScore =
      payload.contributionScore ??
      this.decimalToNumber(existing.contributionScore) ??
      0;

    this.validateManualScores(context.policy, activityScore, contributionScore);

    const monthlyTotal = this.computeMonthlyTotal(
      this.decimalToNumber(existing.attendanceScore) ?? 0,
      this.decimalToNumber(existing.homeworkScore) ?? 0,
      activityScore,
      contributionScore,
      this.decimalToNumber(existing.customComponentsScore) ?? 0,
      this.decimalToNumber(existing.examScore) ?? 0,
    );

    const autoScores = await this.computeComponentScores(
      this.prisma,
      existing.studentEnrollmentId,
      existing.subjectId,
      context.sectionId,
      context.monthStartDate,
      context.monthEndDate,
      existing.academicYearId,
      existing.academicTermId,
      context.policy,
      activityScore,
      contributionScore,
    );

    const monthlyGrade = await this.prisma.monthlyGrade.update({
      where: {
        id,
      },
      data: {
        activityScore: payload.activityScore,
        contributionScore: payload.contributionScore,
        status: payload.status,
        notes: payload.notes?.trim(),
        isActive: payload.isActive,
        monthlyTotal,
        updatedById: actorUserId,
        periodGradeComponents: {
          deleteMany: {},
          create: autoScores.computedComponents.map((c) => ({
            gradingPolicyComponentId: c.gradingPolicyComponentId,
            score: c.score,
            isAutoCalculated: c.isAutoCalculated,
            createdById: actorUserId,
            updatedById: actorUserId,
          })),
        },
      },
      include: monthlyGradeInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'MONTHLY_GRADE_UPDATE',
      resource: 'monthly-grades',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return monthlyGrade;
  }

  async lock(id: string, actorUserId: string) {
    const existing = await this.ensureMonthlyGradeExists(id);
    const context = await this.ensureMonthlyGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (existing.isLocked) {
      throw new ConflictException('الدرجة الشهرية مقفلة بالفعل');
    }

    const monthlyGrade = await this.prisma.monthlyGrade.update({
      where: {
        id,
      },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedByUserId: actorUserId,
        status: GradingWorkflowStatus.APPROVED,
        updatedById: actorUserId,
      },
      include: monthlyGradeInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'MONTHLY_GRADE_LOCK',
      resource: 'monthly-grades',
      resourceId: id,
    });

    return monthlyGrade;
  }

  async unlock(id: string, actorUserId: string) {
    const existing = await this.ensureMonthlyGradeExists(id);
    const context = await this.ensureMonthlyGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (!existing.isLocked) {
      throw new ConflictException('الدرجة الشهرية غير مقفلة');
    }

    const monthlyGrade = await this.prisma.monthlyGrade.update({
      where: {
        id,
      },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedByUserId: null,
        status: GradingWorkflowStatus.IN_REVIEW,
        updatedById: actorUserId,
      },
      include: monthlyGradeInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'MONTHLY_GRADE_UNLOCK',
      resource: 'monthly-grades',
      resourceId: id,
    });

    return monthlyGrade;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureMonthlyGradeExists(id);
    const context = await this.ensureMonthlyGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (existing.isLocked) {
      throw new ConflictException('لا يمكن حذف درجة شهرية مقفلة');
    }

    await this.prisma.$transaction([
      this.prisma.monthlyCustomComponentScore.updateMany({
        where: {
          monthlyGradeId: id,
          deletedAt: null,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
          updatedById: actorUserId,
        },
      }),
      this.prisma.monthlyGrade.update({
        where: {
          id,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
          updatedById: actorUserId,
        },
      }),
    ]);

    await this.auditLogsService.record({
      actorUserId,
      action: 'MONTHLY_GRADE_DELETE',
      resource: 'monthly-grades',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEnrollmentContext(
    studentEnrollmentId: string,
    subjectId: string,
    academicMonthId: string,
  ): Promise<EnrollmentMonthlyContext> {
    const [enrollment, month] = await this.prisma.$transaction([
      this.prisma.studentEnrollment.findFirst({
        where: {
          id: studentEnrollmentId,
          deletedAt: null,
        },
        select: {
          id: true,
          academicYearId: true,
          sectionId: true,
          isActive: true,
          section: {
            select: {
              id: true,
              gradeLevelId: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.academicMonth.findFirst({
        where: {
          id: academicMonthId,
          deletedAt: null,
        },
        select: {
          id: true,
          academicYearId: true,
          academicTermId: true,
          startDate: true,
          endDate: true,
          isActive: true,
        },
      }),
    ]);

    if (!enrollment) {
      throw new BadRequestException('قيد الطالب غير صالح أو محذوف');
    }

    if (!enrollment.isActive) {
      throw new BadRequestException('قيد الطالب غير نشط');
    }

    if (!enrollment.section.isActive) {
      throw new BadRequestException('شعبة القيد غير نشطة');
    }

    if (!month) {
      throw new BadRequestException('الشهر الأكاديمي غير صالح أو محذوف');
    }

    if (!month.isActive) {
      throw new BadRequestException('الشهر الأكاديمي غير نشط');
    }

    if (enrollment.academicYearId !== month.academicYearId) {
      throw new BadRequestException(
        'السنة الدراسية لقيد الطالب لا تطابق سنة الشهر الأكاديمي',
      );
    }

    await this.ensureSubjectExistsAndActive(subjectId);
    await this.ensureSubjectOfferedInTerm(
      month.academicYearId,
      month.academicTermId,
      enrollment.section.gradeLevelId,
      subjectId,
    );

    const policy = await this.findMonthlyPolicy(
      month.academicYearId,
      enrollment.section.gradeLevelId,
      subjectId,
    );

    return {
      sectionId: enrollment.sectionId,
      gradeLevelId: enrollment.section.gradeLevelId,
      academicYearId: month.academicYearId,
      academicTermId: month.academicTermId,
      monthStartDate: month.startDate,
      monthEndDate: month.endDate,
      policy,
    };
  }

  private async ensureMonthlyGradeContext(id: string) {
    const monthlyGrade = await this.prisma.monthlyGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        subjectId: true,
        academicYearId: true,
        academicMonthId: true,
        academicMonth: {
          select: {
            startDate: true,
            endDate: true,
          },
        },
        studentEnrollment: {
          select: {
            sectionId: true,
            section: {
              select: {
                gradeLevelId: true,
              },
            },
          },
        },
      },
    });

    if (!monthlyGrade) {
      throw new NotFoundException('الدرجة الشهرية غير موجودة');
    }

    const policy = await this.findMonthlyPolicy(
      monthlyGrade.academicYearId,
      monthlyGrade.studentEnrollment.section.gradeLevelId,
      monthlyGrade.subjectId,
    );

    return {
      sectionId: monthlyGrade.studentEnrollment.sectionId,
      monthStartDate: monthlyGrade.academicMonth.startDate,
      monthEndDate: monthlyGrade.academicMonth.endDate,
      policy,
    };
  }

  private async ensureMonthlyGradeExists(id: string): Promise<MonthlyGrade> {
    const monthlyGrade = await this.prisma.monthlyGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!monthlyGrade) {
      throw new NotFoundException('الدرجة الشهرية غير موجودة');
    }

    return monthlyGrade;
  }

  private async ensureAcademicMonthExistsAndActive(academicMonthId: string) {
    const month = await this.prisma.academicMonth.findFirst({
      where: {
        id: academicMonthId,
        deletedAt: null,
      },
      select: {
        id: true,
        academicYearId: true,
        academicTermId: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });

    if (!month) {
      throw new BadRequestException('الشهر الأكاديمي غير صالح أو محذوف');
    }

    if (!month.isActive) {
      throw new BadRequestException('الشهر الأكاديمي غير نشط');
    }

    return month;
  }

  private async ensureSectionExistsAndActive(sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        deletedAt: null,
      },
      select: {
        id: true,
        gradeLevelId: true,
        isActive: true,
      },
    });

    if (!section) {
      throw new BadRequestException('الشعبة غير صالحة أو محذوفة');
    }

    if (!section.isActive) {
      throw new BadRequestException('الشعبة غير نشطة');
    }

    return section;
  }

  private async ensureSubjectExistsAndActive(subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!subject) {
      throw new BadRequestException('المادة غير صالحة أو محذوفة');
    }

    if (!subject.isActive) {
      throw new BadRequestException('المادة غير نشطة');
    }

    return subject;
  }

  private async ensureSubjectOfferedInTerm(
    academicYearId: string,
    academicTermId: string,
    gradeLevelId: string,
    subjectId: string,
  ) {
    const offeringCount = await this.prisma.termSubjectOffering.count({
      where: {
        academicTermId,
        deletedAt: null,
        isActive: true,
        gradeLevelSubject: {
          academicYearId,
          gradeLevelId,
          subjectId,
          deletedAt: null,
          isActive: true,
        },
      },
    });

    if (offeringCount === 0) {
      throw new BadRequestException(
        'المادة غير معروضة لهذه المرحلة في الفصل المحدد',
      );
    }
  }

  private async findMonthlyPolicy(
    academicYearId: string,
    gradeLevelId: string,
    subjectId: string,
  ): Promise<GradingPolicyContext> {
    const selectPolicy = {
      id: true,
      maxAttendanceScore: true,
      maxHomeworkScore: true,
      maxExamScore: true,
      maxActivityScore: true,
      maxContributionScore: true,
      components: {
        where: {
          deletedAt: null,
          isActive: true,
          includeInMonthly: true,
        },
        select: {
          id: true,
          code: true,
          maxScore: true,
          calculationMode: true,
          includeInMonthly: true,
          includeInSemester: true,
          isActive: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    } satisfies Prisma.GradingPolicySelect;

    const approvedPolicy = await this.prisma.gradingPolicy.findFirst({
      where: {
        academicYearId,
        gradeLevelId,
        subjectId,
        assessmentType: AssessmentType.MONTHLY,
        status: GradingWorkflowStatus.APPROVED,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          updatedAt: 'desc',
        },
      ],
      select: selectPolicy,
    });

    const policy =
      approvedPolicy ??
      (await this.prisma.gradingPolicy.findFirst({
        where: {
          academicYearId,
          gradeLevelId,
          subjectId,
          assessmentType: AssessmentType.MONTHLY,
          isActive: true,
          deletedAt: null,
        },
        orderBy: [
          {
            isDefault: 'desc',
          },
          {
            updatedAt: 'desc',
          },
        ],
        select: selectPolicy,
      }));

    if (!policy) {
      throw new BadRequestException(
        'لا توجد سياسة درجات شهرية للسنة والمرحلة والمادة المحددة',
      );
    }

    const components: PolicyComponentContext[] = policy.components.map(
      (component) => ({
        id: component.id,
        code: component.code,
        maxScore: this.decimalToNumber(component.maxScore) ?? 0,
        calculationMode: component.calculationMode,
        includeInMonthly: component.includeInMonthly,
        includeInSemester: component.includeInSemester,
        isActive: component.isActive,
      }),
    );

    const hasComponents = components.length > 0;
    const sumByMode = (mode: GradingComponentCalculationMode) =>
      components
        .filter((component) => component.calculationMode === mode)
        .reduce((sum, component) => sum + component.maxScore, 0);

    const sumByCode = (code: string) =>
      components
        .filter((component) => component.code === code)
        .reduce((sum, component) => sum + component.maxScore, 0);

    return {
      id: policy.id,
      maxAttendanceScore: hasComponents
        ? sumByMode(GradingComponentCalculationMode.AUTO_ATTENDANCE)
        : this.decimalToNumber(policy.maxAttendanceScore) ?? 0,
      maxHomeworkScore: hasComponents
        ? sumByMode(GradingComponentCalculationMode.AUTO_HOMEWORK)
        : this.decimalToNumber(policy.maxHomeworkScore) ?? 0,
      maxExamScore: hasComponents
        ? sumByMode(GradingComponentCalculationMode.AUTO_EXAM)
        : this.decimalToNumber(policy.maxExamScore) ?? 0,
      maxActivityScore: hasComponents
        ? sumByCode('ACTIVITY')
        : this.decimalToNumber(policy.maxActivityScore) ?? 0,
      maxContributionScore: hasComponents
        ? sumByCode('CONTRIBUTION')
        : this.decimalToNumber(policy.maxContributionScore) ?? 0,
      components,
    };
  }

  private async computeComponentScores(
    db: PrismaDb,
    studentEnrollmentId: string,
    subjectId: string,
    sectionId: string,
    monthStartDate: Date,
    monthEndDate: Date,
    academicYearId: string,
    academicTermId: string,
    policy: GradingPolicyContext,
    manualActivityScore: number,
    manualContributionScore: number,
  ) {
    const [totalAttendanceDays, presentAttendanceDays, homeworkRows, examRows] =
      await Promise.all([
        db.studentAttendance.count({
          where: {
            studentEnrollmentId,
            attendanceDate: {
              gte: monthStartDate,
              lte: monthEndDate,
            },
            deletedAt: null,
            isActive: true,
          },
        }),
        db.studentAttendance.count({
          where: {
            studentEnrollmentId,
            status: StudentAttendanceStatus.PRESENT,
            attendanceDate: {
              gte: monthStartDate,
              lte: monthEndDate,
            },
            deletedAt: null,
            isActive: true,
          },
        }),
        db.studentHomework.findMany({
          where: {
            studentEnrollmentId,
            deletedAt: null,
            isActive: true,
            homework: {
              subjectId,
              sectionId,
              homeworkDate: {
                gte: monthStartDate,
                lte: monthEndDate,
              },
              deletedAt: null,
              isActive: true,
            },
          },
          select: {
            isCompleted: true,
            manualScore: true,
            homework: {
              select: {
                maxScore: true,
              },
            },
          },
        }),
        db.studentExamScore.findMany({
          where: {
            studentEnrollmentId,
            isPresent: true,
            deletedAt: null,
            isActive: true,
            examAssessment: {
              sectionId,
              subjectId,
              examDate: {
                gte: monthStartDate,
                lte: monthEndDate,
              },
              deletedAt: null,
              isActive: true,
              examPeriod: {
                assessmentType: AssessmentType.MONTHLY,
                academicYearId,
                academicTermId,
                deletedAt: null,
                isActive: true,
              },
            },
          },
          select: {
            score: true,
            examAssessment: {
              select: {
                maxScore: true,
              },
            },
          },
        }),
      ]);

    const computedComponents: {
      gradingPolicyComponentId: string;
      score: number;
      isAutoCalculated: boolean;
    }[] = [];

    let totalAttendanceScore = 0;
    let totalHomeworkScore = 0;
    let totalExamScore = 0;

    for (const comp of policy.components) {
      if (
        comp.calculationMode === GradingComponentCalculationMode.AUTO_ATTENDANCE
      ) {
        const score =
          totalAttendanceDays === 0
            ? 0
            : this.round2(
                (presentAttendanceDays / totalAttendanceDays) * comp.maxScore,
              );
        totalAttendanceScore += score;
        computedComponents.push({
          gradingPolicyComponentId: comp.id,
          score,
          isAutoCalculated: true,
        });
      } else if (
        comp.calculationMode === GradingComponentCalculationMode.AUTO_HOMEWORK
      ) {
        let tHwScore = 0;
        let tHwMaxScore = 0;
        for (const row of homeworkRows) {
          const rowMaxScore = this.decimalToNumber(row.homework.maxScore) ?? 0;
          const manScore = this.decimalToNumber(row.manualScore);
          tHwScore += manScore ?? (row.isCompleted ? rowMaxScore : 0);
          tHwMaxScore += rowMaxScore;
        }
        const score =
          tHwMaxScore > 0
            ? this.round2((tHwScore / tHwMaxScore) * comp.maxScore)
            : 0;
        totalHomeworkScore += score;
        computedComponents.push({
          gradingPolicyComponentId: comp.id,
          score,
          isAutoCalculated: true,
        });
      } else if (
        comp.calculationMode === GradingComponentCalculationMode.AUTO_EXAM
      ) {
        let tExScore = 0;
        let tExMaxScore = 0;
        for (const row of examRows) {
          tExScore += this.decimalToNumber(row.score) ?? 0;
          tExMaxScore += this.decimalToNumber(row.examAssessment.maxScore) ?? 0;
        }
        const score =
          tExMaxScore > 0
            ? this.round2((tExScore / tExMaxScore) * comp.maxScore)
            : 0;
        totalExamScore += score;
        computedComponents.push({
          gradingPolicyComponentId: comp.id,
          score,
          isAutoCalculated: true,
        });
      } else if (
        comp.calculationMode === GradingComponentCalculationMode.MANUAL
      ) {
        let score = 0;
        if (comp.code === 'ACTIVITY') score = manualActivityScore;
        else if (comp.code === 'CONTRIBUTION') score = manualContributionScore;
        computedComponents.push({
          gradingPolicyComponentId: comp.id,
          score,
          isAutoCalculated: false,
        });
      }
    }

    return {
      attendanceScore: totalAttendanceScore,
      homeworkScore: totalHomeworkScore,
      examScore: totalExamScore,
      computedComponents,
    };
  }

  private async sumCustomComponentScores(
    db: PrismaDb,
    monthlyGradeId: string,
    gradingPolicyId: string,
  ): Promise<number> {
    const aggregate = await db.monthlyCustomComponentScore.aggregate({
      where: {
        monthlyGradeId,
        deletedAt: null,
        isActive: true,
        gradingPolicyComponent: {
          gradingPolicyId,
          includeInMonthly: true,
          deletedAt: null,
          isActive: true,
        },
      },
      _sum: {
        score: true,
      },
    });

    return this.decimalToNumber(aggregate._sum.score) ?? 0;
  }

  private validateManualScores(
    policy: GradingPolicyContext,
    activityScore: number,
    contributionScore: number,
  ) {
    if (activityScore < 0 || activityScore > policy.maxActivityScore) {
      throw new BadRequestException(
        `يجب أن تكون activityScore بين 0 و${policy.maxActivityScore}`,
      );
    }

    if (
      contributionScore < 0 ||
      contributionScore > policy.maxContributionScore
    ) {
      throw new BadRequestException(
        `يجب أن تكون contributionScore بين 0 و${policy.maxContributionScore}`,
      );
    }
  }

  private computeMonthlyTotal(
    attendanceScore: number,
    homeworkScore: number,
    activityScore: number,
    contributionScore: number,
    customComponentsScore: number,
    examScore: number,
  ): number {
    return this.round2(
      attendanceScore +
        homeworkScore +
        activityScore +
        contributionScore +
        customComponentsScore +
        examScore,
    );
  }

  private decimalToNumber(
    value: Prisma.Decimal | number | null | undefined,
  ): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return Number(value);
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async ensureActorAuthorized(
    actorUserId: string,
    sectionId: string,
    subjectId: string,
    academicYearId: string,
  ) {
    await this.dataScopeService.ensureCanManageSectionSubjectYear({
      actorUserId,
      sectionId,
      subjectId,
      academicYearId,
      capability: 'MANAGE_GRADES',
    });
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'توجد درجة شهرية مسبقًا لهذا القيد والمادة والشهر',
      );
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'خطأ غير معروف';
  }
}

