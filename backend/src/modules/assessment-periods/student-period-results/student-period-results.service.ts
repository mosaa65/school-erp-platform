import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentPeriodCategory,
  AssessmentComponentEntryMode,
  AuditStatus,
  GradingWorkflowStatus,
  Prisma,
  StudentAttendanceStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateStudentPeriodResultDto } from './dto/create-student-period-result.dto';
import { CalculateStudentPeriodResultsDto } from './dto/calculate-student-period-results.dto';
import { ListStudentPeriodResultsDto } from './dto/list-student-period-results.dto';
import { UpdateStudentPeriodResultDto } from './dto/update-student-period-result.dto';

const studentPeriodResultInclude: Prisma.StudentPeriodResultInclude = {
  _count: {
    select: {
      componentScores: true,
    },
  },
  assessmentPeriod: {
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      maxScore: true,
      academicYearId: true,
      academicTermId: true,
      academicMonthId: true,
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
  academicTerm: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      isActive: true,
    },
  },
  academicMonth: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      isActive: true,
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
  termSubjectOffering: {
    select: {
      id: true,
      academicTermId: true,
      gradeLevelSubject: {
        select: {
          id: true,
          subjectId: true,
          gradeLevelId: true,
        },
      },
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
};

@Injectable()
export class StudentPeriodResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateStudentPeriodResultDto, actorUserId: string) {
    const period = await this.ensureAssessmentPeriod(payload.assessmentPeriodId);
    if (period.isLocked) {
      throw new ConflictException('Assessment period is locked');
    }

    const enrollment = await this.ensureEnrollmentExists(
      payload.studentEnrollmentId,
    );
    if (enrollment.academicYearId !== period.academicYearId) {
      throw new BadRequestException('Academic year mismatch');
    }

    const subject = await this.ensureSubjectExists(payload.subjectId);

    const termSubjectOffering = payload.termSubjectOfferingId
      ? await this.ensureTermSubjectOfferingExists(
          payload.termSubjectOfferingId,
        )
      : null;

    if (
      termSubjectOffering &&
      period.academicTermId &&
      termSubjectOffering.academicTermId !== period.academicTermId
    ) {
      throw new BadRequestException('Term subject offering term mismatch');
    }

    if (
      termSubjectOffering &&
      termSubjectOffering.gradeLevelSubject.subjectId !== subject.id
    ) {
      throw new BadRequestException(
        'Term subject offering subject mismatch',
      );
    }

    const status = payload.status ?? GradingWorkflowStatus.DRAFT;
    const shouldLock = status === GradingWorkflowStatus.APPROVED;

    const softDeletedRow = await this.prisma.studentPeriodResult.findFirst({
      where: {
        assessmentPeriodId: period.id,
        studentEnrollmentId: enrollment.id,
        subjectId: subject.id,
        deletedAt: {
          not: null,
        },
      },
      select: { id: true },
    });

    if (softDeletedRow) {
      const restored = await this.prisma.studentPeriodResult.update({
        where: { id: softDeletedRow.id },
        data: {
          academicYearId: period.academicYearId,
          academicTermId: period.academicTermId,
          academicMonthId: period.academicMonthId,
          termSubjectOfferingId: termSubjectOffering?.id ?? null,
          sectionId: enrollment.sectionId ?? null,
          status,
          isLocked: shouldLock,
          lockedAt: shouldLock ? new Date() : null,
          lockedByUserId: shouldLock ? actorUserId : null,
          notes: payload.notes?.trim(),
          isActive: payload.isActive ?? true,
          deletedAt: null,
          updatedById: actorUserId,
        },
        include: studentPeriodResultInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_PERIOD_RESULT_RESTORE',
        resource: 'student-period-results',
        resourceId: restored.id,
        details: {
          assessmentPeriodId: restored.assessmentPeriodId,
          studentEnrollmentId: restored.studentEnrollmentId,
          subjectId: restored.subjectId,
        },
      });

      return restored;
    }

    try {
      const result = await this.prisma.studentPeriodResult.create({
        data: {
          assessmentPeriodId: period.id,
          studentEnrollmentId: enrollment.id,
          subjectId: subject.id,
          academicYearId: period.academicYearId,
          academicTermId: period.academicTermId,
          academicMonthId: period.academicMonthId,
          termSubjectOfferingId: termSubjectOffering?.id ?? null,
          sectionId: enrollment.sectionId ?? null,
          status,
          isLocked: shouldLock,
          lockedAt: shouldLock ? new Date() : null,
          lockedByUserId: shouldLock ? actorUserId : null,
          notes: payload.notes?.trim(),
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentPeriodResultInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_PERIOD_RESULT_CREATE',
        resource: 'student-period-results',
        resourceId: result.id,
        details: {
          assessmentPeriodId: result.assessmentPeriodId,
          studentEnrollmentId: result.studentEnrollmentId,
          subjectId: result.subjectId,
        },
      });

      return result;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_PERIOD_RESULT_CREATE_FAILED',
        resource: 'student-period-results',
        status: AuditStatus.FAILURE,
        details: {
          assessmentPeriodId: payload.assessmentPeriodId,
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async calculateAggregated(
    payload: CalculateStudentPeriodResultsDto,
    actorUserId: string,
  ) {
    const period = await this.prisma.assessmentPeriod.findFirst({
      where: { id: payload.assessmentPeriodId, deletedAt: null },
      select: {
        id: true,
        isLocked: true,
      },
    });

    if (!period) {
      throw new BadRequestException('Assessment period not found');
    }

    if (period.isLocked) {
      throw new ConflictException('Assessment period is locked');
    }

    const components = await this.prisma.assessmentPeriodComponent.findMany({
      where: {
        assessmentPeriodId: period.id,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        maxScore: true,
        entryMode: true,
      },
    });

    if (components.length === 0) {
      return { success: true, updatedResults: 0, updatedComponents: 0 };
    }

    const aggregatedComponents = components.filter(
      (component) =>
        component.entryMode === AssessmentComponentEntryMode.AGGREGATED_PERIODS,
    );
    const autoAttendanceComponents = components.filter(
      (component) =>
        component.entryMode === AssessmentComponentEntryMode.AUTO_ATTENDANCE,
    );
    const autoHomeworkComponents = components.filter(
      (component) =>
        component.entryMode === AssessmentComponentEntryMode.AUTO_HOMEWORK,
    );
    const autoExamComponents = components.filter(
      (component) => component.entryMode === AssessmentComponentEntryMode.AUTO_EXAM,
    );

    const componentIds = aggregatedComponents.map((component) => component.id);
    const componentMaxScore = new Map(
      components.map((component) => [
        component.id,
        this.decimalToNumber(component.maxScore) ?? 0,
      ]),
    );

    const sourceLinks = await this.prisma.assessmentComponentSourcePeriod.findMany({
      where: {
        assessmentPeriodComponentId: { in: componentIds },
        deletedAt: null,
        isActive: true,
      },
      select: {
        assessmentPeriodComponentId: true,
        sourcePeriodId: true,
      },
    });

    const componentSources = new Map<string, string[]>();
    const sourcePeriodIds = new Set<string>();
    for (const link of sourceLinks) {
      const list = componentSources.get(link.assessmentPeriodComponentId) ?? [];
      list.push(link.sourcePeriodId);
      componentSources.set(link.assessmentPeriodComponentId, list);
      sourcePeriodIds.add(link.sourcePeriodId);
    }

    const sourcePeriods = sourcePeriodIds.size
      ? await this.prisma.assessmentPeriod.findMany({
          where: {
            id: { in: Array.from(sourcePeriodIds) },
            deletedAt: null,
          },
          select: {
            id: true,
            maxScore: true,
          },
        })
      : [];

    const sourceMaxScores = new Map(
      sourcePeriods.map((periodItem) => [
        periodItem.id,
        this.decimalToNumber(periodItem.maxScore) ?? 0,
      ]),
    );

    const results = await this.prisma.studentPeriodResult.findMany({
      where: {
        assessmentPeriodId: period.id,
        deletedAt: null,
        isActive: true,
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        studentEnrollmentId: payload.studentEnrollmentId,
      },
      select: {
        id: true,
        studentEnrollmentId: true,
        subjectId: true,
        isLocked: true,
      },
    });

    const editableResults = results.filter((result) => !result.isLocked);
    if (editableResults.length === 0) {
      return { success: true, updatedResults: 0, updatedComponents: 0 };
    }

    const enrollmentIds = Array.from(
      new Set(editableResults.map((result) => result.studentEnrollmentId)),
    );
    const subjectIds = Array.from(
      new Set(editableResults.map((result) => result.subjectId)),
    );

    const monthlyResults =
      sourcePeriodIds.size && enrollmentIds.length && subjectIds.length
        ? await this.prisma.studentPeriodResult.findMany({
            where: {
              assessmentPeriodId: { in: Array.from(sourcePeriodIds) },
              deletedAt: null,
              studentEnrollmentId: { in: enrollmentIds },
              subjectId: { in: subjectIds },
            },
            select: {
              assessmentPeriodId: true,
              studentEnrollmentId: true,
              subjectId: true,
              totalScore: true,
            },
          })
        : [];

    const monthlyScoreMap = new Map<string, number>();
    for (const monthly of monthlyResults) {
      const key = this.scoreKey(
        monthly.assessmentPeriodId,
        monthly.studentEnrollmentId,
        monthly.subjectId,
      );
      monthlyScoreMap.set(
        key,
        this.decimalToNumber(monthly.totalScore) ?? 0,
      );
    }

    const resultScope = await this.resolveResultDateScope(period.id);
    let updatedComponents = 0;
    let updatedResults = 0;

    for (const result of editableResults) {
      for (const component of aggregatedComponents) {
        const sources = componentSources.get(component.id) ?? [];
        let sourceMaxTotal = 0;
        let rawSum = 0;

        for (const sourceId of sources) {
          sourceMaxTotal += sourceMaxScores.get(sourceId) ?? 0;
          rawSum +=
            monthlyScoreMap.get(
              this.scoreKey(sourceId, result.studentEnrollmentId, result.subjectId),
            ) ?? 0;
        }

        const maxScore = componentMaxScore.get(component.id) ?? 0;
        const finalScore =
          sourceMaxTotal > 0
            ? this.round2((rawSum / sourceMaxTotal) * maxScore)
            : 0;
        const rawScore = this.round2(rawSum);

        await this.prisma.studentPeriodComponentScore.upsert({
          where: {
            studentPeriodResultId_assessmentPeriodComponentId: {
              studentPeriodResultId: result.id,
              assessmentPeriodComponentId: component.id,
            },
          },
          update: {
            rawScore,
            finalScore,
            isAutoCalculated: true,
            updatedById: actorUserId,
          },
          create: {
            studentPeriodResultId: result.id,
            assessmentPeriodComponentId: component.id,
            rawScore,
            finalScore,
            isAutoCalculated: true,
            isActive: true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
        });

        updatedComponents += 1;
      }

      updatedComponents += await this.syncAutomaticComponentsForResult(
        result.id,
        {
          attendanceComponents: autoAttendanceComponents,
          homeworkComponents: autoHomeworkComponents,
          examComponents: autoExamComponents,
          scope: resultScope,
        },
        actorUserId,
      );

      await this.recalculateResultTotal(result.id, actorUserId);
      updatedResults += 1;
    }

    return { success: true, updatedResults, updatedComponents };
  }

  async findAll(query: ListStudentPeriodResultsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentPeriodResultWhereInput = {
      deletedAt: null,
      assessmentPeriodId: query.assessmentPeriodId,
      academicYearId: query.academicYearId,
      academicTermId: query.academicTermId,
      academicMonthId: query.academicMonthId,
      sectionId: query.sectionId,
      subjectId: query.subjectId,
      studentEnrollmentId: query.studentEnrollmentId,
      termSubjectOfferingId: query.termSubjectOfferingId,
      status: query.status,
      isLocked: query.isLocked,
      isActive: query.isActive,
      studentEnrollment: query.studentId
        ? {
            studentId: query.studentId,
          }
        : undefined,
      OR: query.search
        ? [
            { notes: { contains: query.search } },
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
              subject: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              assessmentPeriod: {
                name: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentPeriodResult.count({ where }),
      this.prisma.studentPeriodResult.findMany({
        where,
        include: studentPeriodResultInclude,
        orderBy: [
          { assessmentPeriod: { sequence: 'asc' } },
          { createdAt: 'desc' },
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
    const result = await this.prisma.studentPeriodResult.findFirst({
      where: { id, deletedAt: null },
      include: studentPeriodResultInclude,
    });

    if (!result) {
      throw new NotFoundException('Student period result not found');
    }

    return result;
  }

  async update(
    id: string,
    payload: UpdateStudentPeriodResultDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureResultExists(id);
    if (existing.isLocked) {
      throw new ConflictException('Student period result is locked');
    }

    const status = payload.status ?? existing.status;
    const shouldLock = status === GradingWorkflowStatus.APPROVED;

    const result = await this.prisma.studentPeriodResult.update({
      where: { id },
      data: {
        status: payload.status,
        isLocked: shouldLock ? true : existing.isLocked,
        lockedAt: shouldLock ? new Date() : existing.lockedAt,
        lockedByUserId: shouldLock ? actorUserId : existing.lockedByUserId,
        notes: payload.notes?.trim(),
        isActive: payload.isActive,
        updatedById: actorUserId,
      },
      include: studentPeriodResultInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_PERIOD_RESULT_UPDATE',
      resource: 'student-period-results',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return result;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureResultExists(id);
    if (existing.isLocked) {
      throw new ConflictException('Student period result is locked');
    }

    await this.prisma.studentPeriodResult.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_PERIOD_RESULT_DELETE',
      resource: 'student-period-results',
      resourceId: id,
    });

    return { success: true, id };
  }

  async lock(id: string, actorUserId: string) {
    const existing = await this.ensureResultExists(id);

    if (existing.isLocked) {
      throw new ConflictException('Student period result is already locked');
    }

    const result = await this.prisma.studentPeriodResult.update({
      where: { id },
      data: {
        status: GradingWorkflowStatus.APPROVED,
        isLocked: true,
        lockedAt: new Date(),
        lockedByUserId: actorUserId,
        updatedById: actorUserId,
      },
      include: studentPeriodResultInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_PERIOD_RESULT_LOCK',
      resource: 'student-period-results',
      resourceId: id,
    });

    return result;
  }

  async unlock(id: string, actorUserId: string) {
    const existing = await this.ensureResultExists(id);

    if (!existing.isLocked) {
      throw new ConflictException('Student period result is not locked');
    }

    const result = await this.prisma.studentPeriodResult.update({
      where: { id },
      data: {
        status:
          existing.status === GradingWorkflowStatus.ARCHIVED
            ? GradingWorkflowStatus.ARCHIVED
            : GradingWorkflowStatus.DRAFT,
        isLocked: false,
        lockedAt: null,
        lockedByUserId: null,
        updatedById: actorUserId,
      },
      include: studentPeriodResultInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_PERIOD_RESULT_UNLOCK',
      resource: 'student-period-results',
      resourceId: id,
    });

    return result;
  }

  private async ensureAssessmentPeriod(id: string) {
    const period = await this.prisma.assessmentPeriod.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        academicYearId: true,
        academicTermId: true,
        academicMonthId: true,
        isLocked: true,
      },
    });

    if (!period) {
      throw new BadRequestException('Assessment period not found');
    }

    return period;
  }

  private async ensureEnrollmentExists(id: string) {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        academicYearId: true,
        sectionId: true,
        isActive: true,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('Student enrollment not found');
    }

    return enrollment;
  }

  private scoreKey(periodId: string, enrollmentId: string, subjectId: string) {
    return `${periodId}:${enrollmentId}:${subjectId}`;
  }

  private async resolveResultDateScope(assessmentPeriodId: string) {
    const period = await this.prisma.assessmentPeriod.findFirst({
      where: { id: assessmentPeriodId, deletedAt: null },
      select: {
        category: true,
        academicYear: {
          select: {
            startDate: true,
            endDate: true,
          },
        },
        academicTerm: {
          select: {
            startDate: true,
            endDate: true,
          },
        },
        academicMonth: {
          select: {
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!period) {
      throw new BadRequestException('Assessment period not found');
    }

    if (period.category === AssessmentPeriodCategory.MONTHLY) {
      return {
        startDate: period.academicMonth?.startDate ?? period.academicYear.startDate,
        endDate: period.academicMonth?.endDate ?? period.academicYear.endDate,
      };
    }

    if (period.category === AssessmentPeriodCategory.SEMESTER) {
      return {
        startDate: period.academicTerm?.startDate ?? period.academicYear.startDate,
        endDate: period.academicTerm?.endDate ?? period.academicYear.endDate,
      };
    }

    return {
      startDate: period.academicYear.startDate,
      endDate: period.academicYear.endDate,
    };
  }

  private async syncAutomaticComponentsForResult(
    studentPeriodResultId: string,
    params: {
      attendanceComponents: Array<{ id: string; maxScore: Prisma.Decimal | number }>;
      homeworkComponents: Array<{ id: string; maxScore: Prisma.Decimal | number }>;
      examComponents: Array<{ id: string; maxScore: Prisma.Decimal | number }>;
      scope: { startDate: Date; endDate: Date };
    },
    actorUserId: string,
  ) {
    const result = await this.prisma.studentPeriodResult.findFirst({
      where: { id: studentPeriodResultId, deletedAt: null },
      select: {
        id: true,
        studentEnrollmentId: true,
        subjectId: true,
        sectionId: true,
        academicYearId: true,
        academicTermId: true,
      },
    });

    if (!result) {
      throw new BadRequestException('Student period result not found');
    }

    let updatedCount = 0;

    if (params.attendanceComponents.length > 0) {
      const attendanceRows = await this.prisma.studentAttendance.findMany({
        where: {
          studentEnrollmentId: result.studentEnrollmentId,
          attendanceDate: {
            gte: params.scope.startDate,
            lte: params.scope.endDate,
          },
          deletedAt: null,
          isActive: true,
        },
        select: {
          status: true,
        },
      });

      const attendanceEarned = attendanceRows.reduce((sum, row) => {
        switch (row.status) {
          case StudentAttendanceStatus.PRESENT:
            return sum + 1;
          case StudentAttendanceStatus.LATE:
            return sum + 0.5;
          case StudentAttendanceStatus.EARLY_LEAVE:
            return sum + 0.75;
          case StudentAttendanceStatus.EXCUSED_ABSENCE:
            return sum + 0.5;
          default:
            return sum;
        }
      }, 0);

      const attendanceBase = attendanceRows.length;

      for (const component of params.attendanceComponents) {
        const maxScore = this.decimalToNumber(component.maxScore) ?? 0;
        const finalScore =
          attendanceBase > 0
            ? this.round2((attendanceEarned / attendanceBase) * maxScore)
            : 0;

        await this.upsertAutoComponentScore(
          studentPeriodResultId,
          component.id,
          this.round2(attendanceEarned),
          finalScore,
          actorUserId,
        );
        updatedCount += 1;
      }
    }

    if (params.homeworkComponents.length > 0) {
      const homeworkRows = await this.prisma.studentHomework.findMany({
        where: {
          studentEnrollmentId: result.studentEnrollmentId,
          deletedAt: null,
          isActive: true,
          homework: {
            subjectId: result.subjectId,
            sectionId: result.sectionId ?? undefined,
            academicYearId: result.academicYearId,
            academicTermId: result.academicTermId ?? undefined,
            homeworkDate: {
              gte: params.scope.startDate,
              lte: params.scope.endDate,
            },
            deletedAt: null,
            isActive: true,
          },
        },
        select: {
          manualScore: true,
          isCompleted: true,
          homework: {
            select: {
              maxScore: true,
            },
          },
        },
      });

      const homeworkEarned = homeworkRows.reduce((sum, row) => {
        if (row.manualScore !== null && row.manualScore !== undefined) {
          return sum + (this.decimalToNumber(row.manualScore) ?? 0);
        }
        return sum + (row.isCompleted ? this.decimalToNumber(row.homework.maxScore) ?? 0 : 0);
      }, 0);

      const homeworkBase = homeworkRows.reduce(
        (sum, row) => sum + (this.decimalToNumber(row.homework.maxScore) ?? 0),
        0,
      );

      for (const component of params.homeworkComponents) {
        const maxScore = this.decimalToNumber(component.maxScore) ?? 0;
        const finalScore =
          homeworkBase > 0
            ? this.round2((homeworkEarned / homeworkBase) * maxScore)
            : 0;

        await this.upsertAutoComponentScore(
          studentPeriodResultId,
          component.id,
          this.round2(homeworkEarned),
          finalScore,
          actorUserId,
        );
        updatedCount += 1;
      }
    }

    if (params.examComponents.length > 0) {
      const examRows = await this.prisma.studentExamScore.findMany({
        where: {
          studentEnrollmentId: result.studentEnrollmentId,
          deletedAt: null,
          isActive: true,
          examAssessment: {
            subjectId: result.subjectId,
            sectionId: result.sectionId ?? undefined,
            deletedAt: null,
            isActive: true,
            examDate: {
              gte: params.scope.startDate,
              lte: params.scope.endDate,
            },
            examPeriod: {
              academicYearId: result.academicYearId,
              academicTermId: result.academicTermId ?? undefined,
              deletedAt: null,
            },
          },
        },
        select: {
          score: true,
          isPresent: true,
          examAssessment: {
            select: {
              maxScore: true,
            },
          },
        },
      });

      const examEarned = examRows.reduce(
        (sum, row) => sum + (row.isPresent ? this.decimalToNumber(row.score) ?? 0 : 0),
        0,
      );
      const examBase = examRows.reduce(
        (sum, row) => sum + (this.decimalToNumber(row.examAssessment.maxScore) ?? 0),
        0,
      );

      for (const component of params.examComponents) {
        const maxScore = this.decimalToNumber(component.maxScore) ?? 0;
        const finalScore =
          examBase > 0 ? this.round2((examEarned / examBase) * maxScore) : 0;

        await this.upsertAutoComponentScore(
          studentPeriodResultId,
          component.id,
          this.round2(examEarned),
          finalScore,
          actorUserId,
        );
        updatedCount += 1;
      }
    }

    return updatedCount;
  }

  private async upsertAutoComponentScore(
    studentPeriodResultId: string,
    assessmentPeriodComponentId: string,
    rawScore: number,
    finalScore: number,
    actorUserId: string,
  ) {
    await this.prisma.studentPeriodComponentScore.upsert({
      where: {
        studentPeriodResultId_assessmentPeriodComponentId: {
          studentPeriodResultId,
          assessmentPeriodComponentId,
        },
      },
      update: {
        rawScore,
        finalScore,
        isAutoCalculated: true,
        updatedById: actorUserId,
      },
      create: {
        studentPeriodResultId,
        assessmentPeriodComponentId,
        rawScore,
        finalScore,
        isAutoCalculated: true,
        isActive: true,
        createdById: actorUserId,
        updatedById: actorUserId,
      },
    });
  }

  private async recalculateResultTotal(
    studentPeriodResultId: string,
    actorUserId: string,
  ) {
    const total = await this.prisma.studentPeriodComponentScore.aggregate({
      where: {
        studentPeriodResultId,
        deletedAt: null,
        isActive: true,
      },
      _sum: {
        finalScore: true,
      },
    });

    const totalScore = this.decimalToNumber(total._sum.finalScore) ?? 0;

    await this.prisma.studentPeriodResult.update({
      where: { id: studentPeriodResultId },
      data: {
        totalScore,
        calculatedAt: new Date(),
        updatedById: actorUserId,
      },
    });
  }

  private async ensureSubjectExists(id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, isActive: true },
    });

    if (!subject || !subject.isActive) {
      throw new BadRequestException('Subject not found or inactive');
    }

    return subject;
  }

  private async ensureTermSubjectOfferingExists(id: string) {
    const offering = await this.prisma.termSubjectOffering.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        academicTermId: true,
        gradeLevelSubject: {
          select: {
            subjectId: true,
          },
        },
      },
    });

    if (!offering) {
      throw new BadRequestException('Term subject offering not found');
    }

    return offering;
  }

  private async ensureResultExists(id: string) {
    const result = await this.prisma.studentPeriodResult.findFirst({
      where: { id, deletedAt: null },
    });

    if (!result) {
      throw new NotFoundException('Student period result not found');
    }

    return result;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Student period result already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
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
}
