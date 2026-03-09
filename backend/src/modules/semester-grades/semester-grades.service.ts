import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentType,
  AuditStatus,
  GradingWorkflowStatus,
  Prisma,
  SemesterGrade,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DataScopeService } from '../data-scope/data-scope.service';
import { CalculateSemesterGradesDto } from './dto/calculate-semester-grades.dto';
import { CreateSemesterGradeDto } from './dto/create-semester-grade.dto';
import { FillFinalExamScoresDto } from './dto/fill-final-exam-scores.dto';
import { ListSemesterGradesDto } from './dto/list-semester-grades.dto';
import { UpdateSemesterGradeDto } from './dto/update-semester-grade.dto';

type PrismaDb = PrismaService | Prisma.TransactionClient;

type SemesterContext = {
  sectionId: string;
  gradeLevelId: string;
  academicYearId: string;
};

const semesterGradeInclude: Prisma.SemesterGradeInclude = {
  studentEnrollment: {
    select: {
      id: true,
      studentId: true,
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
  approvedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
};

@Injectable()
export class SemesterGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async create(payload: CreateSemesterGradeDto, actorUserId: string) {
    const context = await this.ensureEnrollmentContext(
      payload.studentEnrollmentId,
      payload.subjectId,
      payload.academicTermId,
    );
    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      payload.subjectId,
      context.academicYearId,
    );

    const existing = await this.prisma.semesterGrade.findFirst({
      where: {
        studentEnrollmentId: payload.studentEnrollmentId,
        subjectId: payload.subjectId,
        academicTermId: payload.academicTermId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'توجد درجة فصلية مسبقًا لهذا القيد والمادة والفصل',
      );
    }

    const semesterWorkTotal = payload.semesterWorkTotal ?? 0;
    const finalExamScore =
      payload.finalExamScore === undefined ? null : payload.finalExamScore;
    this.validateScore(semesterWorkTotal, 'semesterWorkTotal');
    if (finalExamScore !== null) {
      this.validateScore(finalExamScore, 'finalExamScore');
    }

    const status = payload.status ?? GradingWorkflowStatus.DRAFT;
    const shouldLock = status === GradingWorkflowStatus.APPROVED;

    try {
      const semesterGrade = await this.prisma.semesterGrade.create({
        data: {
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          academicTermId: payload.academicTermId,
          academicYearId: context.academicYearId,
          semesterWorkTotal,
          finalExamScore,
          semesterTotal: this.computeSemesterTotal(
            semesterWorkTotal,
            finalExamScore,
          ),
          status,
          isLocked: shouldLock,
          lockedAt: shouldLock ? new Date() : null,
          lockedByUserId: shouldLock ? actorUserId : null,
          approvedByUserId: shouldLock ? actorUserId : null,
          approvedAt: shouldLock ? new Date() : null,
          calculatedAt: new Date(),
          notes: payload.notes?.trim(),
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: semesterGradeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'SEMESTER_GRADE_CREATE',
        resource: 'semester-grades',
        resourceId: semesterGrade.id,
        details: {
          studentEnrollmentId: semesterGrade.studentEnrollmentId,
          subjectId: semesterGrade.subjectId,
          academicTermId: semesterGrade.academicTermId,
        },
      });

      return semesterGrade;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'SEMESTER_GRADE_CREATE_FAILED',
        resource: 'semester-grades',
        status: AuditStatus.FAILURE,
        details: {
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          academicTermId: payload.academicTermId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }
  async calculate(payload: CalculateSemesterGradesDto, actorUserId: string) {
    const context = await this.ensureTermSectionSubjectContext(
      payload.academicTermId,
      payload.sectionId,
      payload.subjectId,
    );
    await this.ensureActorAuthorized(
      actorUserId,
      payload.sectionId,
      payload.subjectId,
      context.academicYearId,
    );

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        sectionId: payload.sectionId,
        academicYearId: context.academicYearId,
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
        message: 'لا توجد قيود طلاب نشطة للشعبة المحددة',
        summary: {
          totalEnrollments: 0,
          created: 0,
          updated: 0,
          skippedLocked: 0,
        },
      };
    }

    const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
    const existingRows = await this.prisma.semesterGrade.findMany({
      where: {
        academicTermId: payload.academicTermId,
        subjectId: payload.subjectId,
        studentEnrollmentId: {
          in: enrollmentIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        studentEnrollmentId: true,
        finalExamScore: true,
        isLocked: true,
      },
    });

    const existingByEnrollmentId = new Map(
      existingRows.map((row) => [row.studentEnrollmentId, row] as const),
    );
    const summary = {
      totalEnrollments: enrollmentIds.length,
      created: 0,
      updated: 0,
      skippedLocked: 0,
    };

    const overwriteManual = payload.overwriteManual ?? false;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const enrollmentId of enrollmentIds) {
        const existing = existingByEnrollmentId.get(enrollmentId);

        if (existing?.isLocked) {
          summary.skippedLocked += 1;
          continue;
        }

        const semesterWorkTotal = await this.sumMonthlyTotals(
          tx,
          enrollmentId,
          payload.subjectId,
          payload.academicTermId,
        );

        const finalExamScore = overwriteManual
          ? null
          : (this.decimalToNumber(existing?.finalExamScore) ?? null);

        if (existing) {
          await tx.semesterGrade.update({
            where: {
              id: existing.id,
            },
            data: {
              semesterWorkTotal,
              finalExamScore,
              semesterTotal: this.computeSemesterTotal(
                semesterWorkTotal,
                finalExamScore,
              ),
              calculatedAt: now,
              updatedById: actorUserId,
            },
          });
          summary.updated += 1;
        } else {
          await tx.semesterGrade.create({
            data: {
              studentEnrollmentId: enrollmentId,
              subjectId: payload.subjectId,
              academicTermId: payload.academicTermId,
              academicYearId: context.academicYearId,
              semesterWorkTotal,
              finalExamScore: null,
              semesterTotal: this.computeSemesterTotal(semesterWorkTotal, null),
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
      action: 'SEMESTER_GRADE_CALCULATE',
      resource: 'semester-grades',
      details: {
        academicTermId: payload.academicTermId,
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        overwriteManual,
        summary,
      },
    });

    return {
      message: 'اكتمل احتساب الدرجات الفصلية',
      summary,
    };
  }

  async fillFinalExamScores(
    payload: FillFinalExamScoresDto,
    actorUserId: string,
  ) {
    const context = await this.ensureTermSectionSubjectContext(
      payload.academicTermId,
      payload.sectionId,
      payload.subjectId,
    );
    await this.ensureActorAuthorized(
      actorUserId,
      payload.sectionId,
      payload.subjectId,
      context.academicYearId,
    );

    const assessments = await this.prisma.examAssessment.findMany({
      where: {
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        deletedAt: null,
        isActive: true,
        examPeriod: {
          academicTermId: payload.academicTermId,
          academicYearId: context.academicYearId,
          assessmentType: AssessmentType.FINAL,
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        id: true,
      },
    });

    if (assessments.length === 0) {
      return {
        message: 'لا توجد تقييمات نهائية نشطة لهذا الفصل',
        summary: {
          totalEnrollments: 0,
          created: 0,
          updated: 0,
          skippedLocked: 0,
          skippedExisting: 0,
        },
      };
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        sectionId: payload.sectionId,
        academicYearId: context.academicYearId,
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

    const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
    const existingRows = await this.prisma.semesterGrade.findMany({
      where: {
        academicTermId: payload.academicTermId,
        subjectId: payload.subjectId,
        studentEnrollmentId: {
          in: enrollmentIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        studentEnrollmentId: true,
        semesterWorkTotal: true,
        finalExamScore: true,
        isLocked: true,
      },
    });
    const existingByEnrollmentId = new Map(
      existingRows.map((row) => [row.studentEnrollmentId, row] as const),
    );

    const assessmentIds = assessments.map((assessment) => assessment.id);
    const scoreRows = await this.prisma.studentExamScore.findMany({
      where: {
        examAssessmentId: {
          in: assessmentIds,
        },
        studentEnrollmentId: {
          in: enrollmentIds,
        },
        isPresent: true,
        deletedAt: null,
        isActive: true,
      },
      select: {
        studentEnrollmentId: true,
        score: true,
        examAssessment: {
          select: {
            maxScore: true,
          },
        },
      },
    });

    const scoreByEnrollmentId = new Map<
      string,
      { score: number; max: number }
    >();
    for (const row of scoreRows) {
      const current = scoreByEnrollmentId.get(row.studentEnrollmentId) ?? {
        score: 0,
        max: 0,
      };
      current.score += this.decimalToNumber(row.score) ?? 0;
      current.max += this.decimalToNumber(row.examAssessment.maxScore) ?? 0;
      scoreByEnrollmentId.set(row.studentEnrollmentId, current);
    }

    const finalPolicyMax = await this.findFinalPolicyMaxExamScore(
      context.academicYearId,
      context.gradeLevelId,
      payload.subjectId,
    );

    const summary = {
      totalEnrollments: enrollmentIds.length,
      created: 0,
      updated: 0,
      skippedLocked: 0,
      skippedExisting: 0,
    };
    const overwriteExisting = payload.overwriteExisting ?? false;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const enrollmentId of enrollmentIds) {
        const existing = existingByEnrollmentId.get(enrollmentId);

        if (existing?.isLocked) {
          summary.skippedLocked += 1;
          continue;
        }

        if (
          existing &&
          !overwriteExisting &&
          this.decimalToNumber(existing.finalExamScore) !== undefined
        ) {
          summary.skippedExisting += 1;
          continue;
        }

        const scored = scoreByEnrollmentId.get(enrollmentId) ?? {
          score: 0,
          max: 0,
        };
        const finalExamScore =
          scored.max > 0
            ? this.round2(
                (scored.score / scored.max) * (finalPolicyMax ?? scored.max),
              )
            : 0;

        const semesterWorkTotal = existing
          ? (this.decimalToNumber(existing.semesterWorkTotal) ?? 0)
          : await this.sumMonthlyTotals(
              tx,
              enrollmentId,
              payload.subjectId,
              payload.academicTermId,
            );

        if (existing) {
          await tx.semesterGrade.update({
            where: {
              id: existing.id,
            },
            data: {
              finalExamScore,
              semesterTotal: this.computeSemesterTotal(
                semesterWorkTotal,
                finalExamScore,
              ),
              calculatedAt: now,
              updatedById: actorUserId,
            },
          });
          summary.updated += 1;
        } else {
          await tx.semesterGrade.create({
            data: {
              studentEnrollmentId: enrollmentId,
              subjectId: payload.subjectId,
              academicTermId: payload.academicTermId,
              academicYearId: context.academicYearId,
              semesterWorkTotal,
              finalExamScore,
              semesterTotal: this.computeSemesterTotal(
                semesterWorkTotal,
                finalExamScore,
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
      action: 'SEMESTER_GRADE_FILL_FINAL_EXAM',
      resource: 'semester-grades',
      details: {
        academicTermId: payload.academicTermId,
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        overwriteExisting,
        summary,
      },
    });

    return {
      message: 'تم تطبيق درجات الاختبار النهائي على الدرجات الفصلية',
      summary,
    };
  }

  async findAll(query: ListSemesterGradesDto, actorUserId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.SemesterGradeWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      academicTermId: query.academicTermId,
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

      const scopedOr: Prisma.SemesterGradeWhereInput[] = scope.grants.map(
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
      this.prisma.semesterGrade.count({ where }),
      this.prisma.semesterGrade.findMany({
        where,
        include: semesterGradeInclude,
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
    const semesterGrade = await this.prisma.semesterGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: semesterGradeInclude,
    });

    if (!semesterGrade) {
      throw new NotFoundException('الدرجة الفصلية غير موجودة');
    }

    await this.ensureActorAuthorized(
      actorUserId,
      semesterGrade.studentEnrollment.sectionId,
      semesterGrade.subject.id,
      semesterGrade.academicYear.id,
    );

    return semesterGrade;
  }

  async update(
    id: string,
    payload: UpdateSemesterGradeDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureSemesterGradeExists(id);

    if (existing.isLocked) {
      throw new ConflictException('لا يمكن تعديل درجة فصلية مقفلة');
    }

    if (
      payload.studentEnrollmentId !== undefined ||
      payload.subjectId !== undefined ||
      payload.academicTermId !== undefined
    ) {
      throw new BadRequestException(
        'لا يمكن تعديل studentEnrollmentId أو subjectId أو academicTermId',
      );
    }

    const context = await this.ensureSemesterGradeContext(id);
    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    const semesterWorkTotal =
      payload.semesterWorkTotal ??
      this.decimalToNumber(existing.semesterWorkTotal) ??
      0;
    this.validateScore(semesterWorkTotal, 'semesterWorkTotal');

    const finalExamScore =
      payload.finalExamScore !== undefined
        ? payload.finalExamScore
        : (this.decimalToNumber(existing.finalExamScore) ?? null);
    if (finalExamScore !== null) {
      this.validateScore(finalExamScore, 'finalExamScore');
    }

    const shouldLock = payload.status === GradingWorkflowStatus.APPROVED;
    const lockData =
      shouldLock === true
        ? {
            isLocked: true,
            lockedAt: existing.lockedAt ?? new Date(),
            lockedByUserId: existing.lockedByUserId ?? actorUserId,
            approvedByUserId: actorUserId,
            approvedAt: new Date(),
          }
        : {};

    const semesterGrade = await this.prisma.semesterGrade.update({
      where: {
        id,
      },
      data: {
        semesterWorkTotal,
        finalExamScore,
        semesterTotal: this.computeSemesterTotal(
          semesterWorkTotal,
          finalExamScore,
        ),
        status: payload.status,
        notes: payload.notes?.trim(),
        isActive: payload.isActive,
        calculatedAt: new Date(),
        updatedById: actorUserId,
        ...lockData,
      },
      include: semesterGradeInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'SEMESTER_GRADE_UPDATE',
      resource: 'semester-grades',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return semesterGrade;
  }

  async lock(id: string, actorUserId: string) {
    const existing = await this.ensureSemesterGradeExists(id);
    const context = await this.ensureSemesterGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (existing.isLocked) {
      throw new ConflictException('الدرجة الفصلية مقفلة بالفعل');
    }

    const semesterGrade = await this.prisma.semesterGrade.update({
      where: {
        id,
      },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedByUserId: actorUserId,
        approvedByUserId: actorUserId,
        approvedAt: new Date(),
        status: GradingWorkflowStatus.APPROVED,
        updatedById: actorUserId,
      },
      include: semesterGradeInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'SEMESTER_GRADE_LOCK',
      resource: 'semester-grades',
      resourceId: id,
    });

    return semesterGrade;
  }

  async unlock(id: string, actorUserId: string) {
    const existing = await this.ensureSemesterGradeExists(id);
    const context = await this.ensureSemesterGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (!existing.isLocked) {
      throw new ConflictException('الدرجة الفصلية غير مقفلة');
    }

    const semesterGrade = await this.prisma.semesterGrade.update({
      where: {
        id,
      },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedByUserId: null,
        approvedByUserId: null,
        approvedAt: null,
        status: GradingWorkflowStatus.IN_REVIEW,
        updatedById: actorUserId,
      },
      include: semesterGradeInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'SEMESTER_GRADE_UNLOCK',
      resource: 'semester-grades',
      resourceId: id,
    });

    return semesterGrade;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureSemesterGradeExists(id);
    const context = await this.ensureSemesterGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (existing.isLocked) {
      throw new ConflictException('لا يمكن حذف درجة فصلية مقفلة');
    }

    await this.prisma.semesterGrade.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'SEMESTER_GRADE_DELETE',
      resource: 'semester-grades',
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
    academicTermId: string,
  ): Promise<SemesterContext> {
    const [enrollment, term] = await this.prisma.$transaction([
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
      this.prisma.academicTerm.findFirst({
        where: {
          id: academicTermId,
          deletedAt: null,
        },
        select: {
          id: true,
          academicYearId: true,
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
    if (!term) {
      throw new BadRequestException('الفصل الأكاديمي غير صالح أو محذوف');
    }
    if (!term.isActive) {
      throw new BadRequestException('الفصل الأكاديمي غير نشط');
    }
    if (enrollment.academicYearId !== term.academicYearId) {
      throw new BadRequestException(
        'السنة الدراسية لقيد الطالب لا تطابق سنة الفصل الأكاديمي',
      );
    }

    await this.ensureSubjectExistsAndActive(subjectId);
    await this.ensureSubjectOfferedInTerm(
      term.academicYearId,
      academicTermId,
      enrollment.section.gradeLevelId,
      subjectId,
    );

    return {
      sectionId: enrollment.sectionId,
      gradeLevelId: enrollment.section.gradeLevelId,
      academicYearId: term.academicYearId,
    };
  }

  private async ensureTermSectionSubjectContext(
    academicTermId: string,
    sectionId: string,
    subjectId: string,
  ): Promise<SemesterContext> {
    const [term, section] = await this.prisma.$transaction([
      this.prisma.academicTerm.findFirst({
        where: {
          id: academicTermId,
          deletedAt: null,
        },
        select: {
          id: true,
          academicYearId: true,
          isActive: true,
        },
      }),
      this.prisma.section.findFirst({
        where: {
          id: sectionId,
          deletedAt: null,
        },
        select: {
          id: true,
          gradeLevelId: true,
          isActive: true,
        },
      }),
    ]);

    if (!term) {
      throw new BadRequestException('الفصل الأكاديمي غير صالح أو محذوف');
    }
    if (!term.isActive) {
      throw new BadRequestException('الفصل الأكاديمي غير نشط');
    }
    if (!section) {
      throw new BadRequestException('الشعبة غير صالحة أو محذوفة');
    }
    if (!section.isActive) {
      throw new BadRequestException('الشعبة غير نشطة');
    }

    await this.ensureSubjectExistsAndActive(subjectId);
    await this.ensureSubjectOfferedInTerm(
      term.academicYearId,
      academicTermId,
      section.gradeLevelId,
      subjectId,
    );

    return {
      sectionId: section.id,
      gradeLevelId: section.gradeLevelId,
      academicYearId: term.academicYearId,
    };
  }

  private async ensureSemesterGradeContext(
    id: string,
  ): Promise<SemesterContext> {
    const semesterGrade = await this.prisma.semesterGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
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

    if (!semesterGrade) {
      throw new NotFoundException('الدرجة الفصلية غير موجودة');
    }

    return {
      sectionId: semesterGrade.studentEnrollment.sectionId,
      gradeLevelId: semesterGrade.studentEnrollment.section.gradeLevelId,
      academicYearId: semesterGrade.academicYearId,
    };
  }

  private async ensureSemesterGradeExists(id: string): Promise<SemesterGrade> {
    const semesterGrade = await this.prisma.semesterGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!semesterGrade) {
      throw new NotFoundException('الدرجة الفصلية غير موجودة');
    }

    return semesterGrade;
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

  private async sumMonthlyTotals(
    db: PrismaDb,
    studentEnrollmentId: string,
    subjectId: string,
    academicTermId: string,
  ): Promise<number> {
    const aggregate = await db.monthlyGrade.aggregate({
      where: {
        studentEnrollmentId,
        subjectId,
        academicTermId,
        deletedAt: null,
        isActive: true,
      },
      _sum: {
        monthlyTotal: true,
      },
    });

    return this.round2(this.decimalToNumber(aggregate._sum.monthlyTotal) ?? 0);
  }

  private async findFinalPolicyMaxExamScore(
    academicYearId: string,
    gradeLevelId: string,
    subjectId: string,
  ): Promise<number | undefined> {
    const approvedPolicy = await this.prisma.gradingPolicy.findFirst({
      where: {
        academicYearId,
        gradeLevelId,
        subjectId,
        assessmentType: AssessmentType.FINAL,
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
        maxExamScore: true,
      },
    });

    const policy =
      approvedPolicy ??
      (await this.prisma.gradingPolicy.findFirst({
        where: {
          academicYearId,
          gradeLevelId,
          subjectId,
          assessmentType: AssessmentType.FINAL,
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
          maxExamScore: true,
        },
      }));

    return this.decimalToNumber(policy?.maxExamScore);
  }

  private computeSemesterTotal(
    semesterWorkTotal: number,
    finalExamScore: number | null,
  ): number {
    return this.round2(semesterWorkTotal + (finalExamScore ?? 0));
  }

  private validateScore(value: number, fieldName: string) {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `يجب أن تكون قيمة ${fieldName} رقمًا غير سالب`,
      );
    }
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
        'توجد درجة فصلية مسبقًا لهذا القيد والمادة والفصل',
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

