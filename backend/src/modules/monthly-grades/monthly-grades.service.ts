import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentType,
  AuditStatus,
  GradingWorkflowStatus,
  MonthlyGrade,
  Prisma,
  StudentAttendanceStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CalculateMonthlyGradesDto } from './dto/calculate-monthly-grades.dto';
import { CreateMonthlyGradeDto } from './dto/create-monthly-grade.dto';
import { ListMonthlyGradesDto } from './dto/list-monthly-grades.dto';
import { UpdateMonthlyGradeDto } from './dto/update-monthly-grade.dto';

type PrismaDb = PrismaService | Prisma.TransactionClient;

type GradingPolicyContext = {
  id: string;
  maxAttendanceScore: number;
  maxHomeworkScore: number;
  maxExamScore: number;
  maxActivityScore: number;
  maxContributionScore: number;
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
};

@Injectable()
export class MonthlyGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
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
        'Monthly grade already exists for this enrollment, subject, and month',
      );
    }

    const autoScores = await this.computeAutoScores(
      this.prisma,
      payload.studentEnrollmentId,
      payload.subjectId,
      context.sectionId,
      context.monthStartDate,
      context.monthEndDate,
      context.academicYearId,
      context.academicTermId,
      context.policy,
    );

    const activityScore = payload.activityScore ?? 0;
    const contributionScore = payload.contributionScore ?? 0;
    this.validateManualScores(context.policy, activityScore, contributionScore);

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
          'No active enrollments found for the selected section and month',
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

        const autoScores = await this.computeAutoScores(
          tx,
          enrollmentId,
          payload.subjectId,
          payload.sectionId,
          month.startDate,
          month.endDate,
          month.academicYearId,
          month.academicTermId,
          policy,
        );

        const customComponentsScore = existing
          ? await this.sumCustomComponentScores(tx, existing.id, policy.id)
          : 0;
        const activityScore = overwriteManual
          ? 0
          : (this.decimalToNumber(existing?.activityScore) ?? 0);
        const contributionScore = overwriteManual
          ? 0
          : (this.decimalToNumber(existing?.contributionScore) ?? 0);

        this.validateManualScores(policy, activityScore, contributionScore);

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
              activityScore: 0,
              contributionScore: 0,
              customComponentsScore: 0,
              examScore: autoScores.examScore,
              monthlyTotal: this.computeMonthlyTotal(
                autoScores.attendanceScore,
                autoScores.homeworkScore,
                0,
                0,
                0,
                autoScores.examScore,
              ),
              status: GradingWorkflowStatus.DRAFT,
              isLocked: false,
              calculatedAt: now,
              isActive: true,
              createdById: actorUserId,
              updatedById: actorUserId,
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
      message: 'Monthly grade calculation completed',
      summary,
    };
  }

  async findAll(query: ListMonthlyGradesDto) {
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

  async findOne(id: string) {
    const monthlyGrade = await this.prisma.monthlyGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: monthlyGradeInclude,
    });

    if (!monthlyGrade) {
      throw new NotFoundException('Monthly grade not found');
    }

    return monthlyGrade;
  }

  async update(
    id: string,
    payload: UpdateMonthlyGradeDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureMonthlyGradeExists(id);

    if (existing.isLocked) {
      throw new ConflictException('Cannot update a locked monthly grade');
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
      throw new ConflictException('Monthly grade is already locked');
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
      throw new ConflictException('Monthly grade is not locked');
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
      throw new ConflictException('Cannot delete a locked monthly grade');
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
      throw new BadRequestException('Student enrollment is invalid or deleted');
    }

    if (!enrollment.isActive) {
      throw new BadRequestException('Student enrollment is inactive');
    }

    if (!enrollment.section.isActive) {
      throw new BadRequestException('Enrollment section is inactive');
    }

    if (!month) {
      throw new BadRequestException('Academic month is invalid or deleted');
    }

    if (!month.isActive) {
      throw new BadRequestException('Academic month is inactive');
    }

    if (enrollment.academicYearId !== month.academicYearId) {
      throw new BadRequestException(
        'Student enrollment academic year does not match academic month year',
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
      throw new NotFoundException('Monthly grade not found');
    }

    const policy = await this.findMonthlyPolicy(
      monthlyGrade.academicYearId,
      monthlyGrade.studentEnrollment.section.gradeLevelId,
      monthlyGrade.subjectId,
    );

    return {
      sectionId: monthlyGrade.studentEnrollment.sectionId,
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
      throw new NotFoundException('Monthly grade not found');
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
      throw new BadRequestException('Academic month is invalid or deleted');
    }

    if (!month.isActive) {
      throw new BadRequestException('Academic month is inactive');
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
      throw new BadRequestException('Section is invalid or deleted');
    }

    if (!section.isActive) {
      throw new BadRequestException('Section is inactive');
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
      throw new BadRequestException('Subject is invalid or deleted');
    }

    if (!subject.isActive) {
      throw new BadRequestException('Subject is inactive');
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
        'Subject is not offered for this grade level in the selected term',
      );
    }
  }

  private async findMonthlyPolicy(
    academicYearId: string,
    gradeLevelId: string,
    subjectId: string,
  ): Promise<GradingPolicyContext> {
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
      select: {
        id: true,
        maxAttendanceScore: true,
        maxHomeworkScore: true,
        maxExamScore: true,
        maxActivityScore: true,
        maxContributionScore: true,
      },
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
        select: {
          id: true,
          maxAttendanceScore: true,
          maxHomeworkScore: true,
          maxExamScore: true,
          maxActivityScore: true,
          maxContributionScore: true,
        },
      }));

    if (!policy) {
      throw new BadRequestException(
        'No monthly grading policy found for selected year, grade, and subject',
      );
    }

    return {
      id: policy.id,
      maxAttendanceScore: this.decimalToNumber(policy.maxAttendanceScore) ?? 0,
      maxHomeworkScore: this.decimalToNumber(policy.maxHomeworkScore) ?? 0,
      maxExamScore: this.decimalToNumber(policy.maxExamScore) ?? 0,
      maxActivityScore: this.decimalToNumber(policy.maxActivityScore) ?? 0,
      maxContributionScore:
        this.decimalToNumber(policy.maxContributionScore) ?? 0,
    };
  }

  private async computeAutoScores(
    db: PrismaDb,
    studentEnrollmentId: string,
    subjectId: string,
    sectionId: string,
    monthStartDate: Date,
    monthEndDate: Date,
    academicYearId: string,
    academicTermId: string,
    policy: GradingPolicyContext,
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

    const attendanceScore =
      totalAttendanceDays === 0
        ? 0
        : this.round2(
            (presentAttendanceDays / totalAttendanceDays) *
              policy.maxAttendanceScore,
          );

    let totalHomeworkScore = 0;
    let totalHomeworkMaxScore = 0;

    for (const row of homeworkRows) {
      const rowMaxScore = this.decimalToNumber(row.homework.maxScore) ?? 0;
      const manualScore = this.decimalToNumber(row.manualScore);
      const effectiveScore = manualScore ?? (row.isCompleted ? rowMaxScore : 0);

      totalHomeworkScore += effectiveScore;
      totalHomeworkMaxScore += rowMaxScore;
    }

    const homeworkScore =
      totalHomeworkMaxScore > 0
        ? this.round2(
            (totalHomeworkScore / totalHomeworkMaxScore) *
              policy.maxHomeworkScore,
          )
        : 0;

    let totalExamScore = 0;
    let totalExamMaxScore = 0;

    for (const row of examRows) {
      totalExamScore += this.decimalToNumber(row.score) ?? 0;
      totalExamMaxScore +=
        this.decimalToNumber(row.examAssessment.maxScore) ?? 0;
    }

    const examScore =
      totalExamMaxScore > 0
        ? this.round2(
            (totalExamScore / totalExamMaxScore) * policy.maxExamScore,
          )
        : 0;

    return {
      attendanceScore,
      homeworkScore,
      examScore,
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
        `activityScore must be between 0 and ${policy.maxActivityScore}`,
      );
    }

    if (
      contributionScore < 0 ||
      contributionScore > policy.maxContributionScore
    ) {
      throw new BadRequestException(
        `contributionScore must be between 0 and ${policy.maxContributionScore}`,
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
    const user = await this.prisma.user.findFirst({
      where: {
        id: actorUserId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Authenticated user is not active');
    }

    if (!user.employeeId) {
      // Allow privileged users without linked employee profile.
      return;
    }

    const assignmentsCount = await this.prisma.employeeTeachingAssignment.count(
      {
        where: {
          employeeId: user.employeeId,
          sectionId,
          subjectId,
          academicYearId,
          deletedAt: null,
          isActive: true,
        },
      },
    );

    if (assignmentsCount === 0) {
      throw new ForbiddenException(
        'You are not assigned to this subject and section for the selected academic year',
      );
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Monthly grade already exists for this enrollment, subject, and month',
      );
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
