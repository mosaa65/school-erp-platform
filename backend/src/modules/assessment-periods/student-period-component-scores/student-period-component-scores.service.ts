import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentComponentEntryMode,
  AuditStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateStudentPeriodComponentScoreDto } from './dto/create-student-period-component-score.dto';
import { ListStudentPeriodComponentScoresDto } from './dto/list-student-period-component-scores.dto';
import { UpdateStudentPeriodComponentScoreDto } from './dto/update-student-period-component-score.dto';

const studentPeriodComponentScoreInclude: Prisma.StudentPeriodComponentScoreInclude =
  {
    studentPeriodResult: {
      select: {
        id: true,
        assessmentPeriodId: true,
        studentEnrollmentId: true,
        subjectId: true,
        isLocked: true,
        assessmentPeriod: {
          select: {
            id: true,
            name: true,
            category: true,
            status: true,
            isLocked: true,
            maxScore: true,
          },
        },
        studentEnrollment: {
          select: {
            id: true,
            sectionId: true,
            student: {
              select: {
                id: true,
                admissionNo: true,
                fullName: true,
              },
            },
          },
        },
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    },
    assessmentPeriodComponent: {
      select: {
        id: true,
        assessmentPeriodId: true,
        code: true,
        name: true,
        entryMode: true,
        maxScore: true,
        sortOrder: true,
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
  };

type ComponentScoreContext = {
  studentPeriodResultId: string;
  assessmentPeriodComponentId: string;
  assessmentPeriodId: string;
  componentMaxScore: number;
  entryMode: AssessmentComponentEntryMode;
  resultLocked: boolean;
  periodLocked: boolean;
};

@Injectable()
export class StudentPeriodComponentScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    payload: CreateStudentPeriodComponentScoreDto,
    actorUserId: string,
  ) {
    const context = await this.ensureContext(
      payload.studentPeriodResultId,
      payload.assessmentPeriodComponentId,
    );

    this.ensureEditable(context);
    const finalScore = payload.finalScore ?? payload.rawScore;
    this.validateScore(payload.rawScore, context.componentMaxScore);
    this.validateScore(finalScore, context.componentMaxScore);

    const softDeletedRow =
      await this.prisma.studentPeriodComponentScore.findFirst({
        where: {
          studentPeriodResultId: payload.studentPeriodResultId,
          assessmentPeriodComponentId: payload.assessmentPeriodComponentId,
          deletedAt: {
            not: null,
          },
        },
        select: { id: true },
      });

    if (softDeletedRow) {
      const restored = await this.prisma.studentPeriodComponentScore.update({
        where: { id: softDeletedRow.id },
        data: {
          rawScore: payload.rawScore,
          finalScore,
          notes: payload.notes?.trim(),
          isActive: payload.isActive ?? true,
          deletedAt: null,
          updatedById: actorUserId,
        },
        include: studentPeriodComponentScoreInclude,
      });

      await this.recalculateResultTotal(
        payload.studentPeriodResultId,
        actorUserId,
      );

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_PERIOD_COMPONENT_SCORE_RESTORE',
        resource: 'student-period-component-scores',
        resourceId: restored.id,
        details: {
          studentPeriodResultId: restored.studentPeriodResultId,
          assessmentPeriodComponentId: restored.assessmentPeriodComponentId,
          finalScore: restored.finalScore,
        },
      });

      return restored;
    }

    try {
      const score = await this.prisma.studentPeriodComponentScore.create({
        data: {
          studentPeriodResultId: payload.studentPeriodResultId,
          assessmentPeriodComponentId: payload.assessmentPeriodComponentId,
          rawScore: payload.rawScore,
          finalScore,
          notes: payload.notes?.trim(),
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentPeriodComponentScoreInclude,
      });

      await this.recalculateResultTotal(
        payload.studentPeriodResultId,
        actorUserId,
      );

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_PERIOD_COMPONENT_SCORE_CREATE',
        resource: 'student-period-component-scores',
        resourceId: score.id,
        details: {
          studentPeriodResultId: score.studentPeriodResultId,
          assessmentPeriodComponentId: score.assessmentPeriodComponentId,
          finalScore: score.finalScore,
        },
      });

      return score;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_PERIOD_COMPONENT_SCORE_CREATE_FAILED',
        resource: 'student-period-component-scores',
        status: AuditStatus.FAILURE,
        details: {
          studentPeriodResultId: payload.studentPeriodResultId,
          assessmentPeriodComponentId: payload.assessmentPeriodComponentId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentPeriodComponentScoresDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentPeriodComponentScoreWhereInput = {
      deletedAt: null,
      studentPeriodResultId: query.studentPeriodResultId,
      assessmentPeriodComponentId: query.assessmentPeriodComponentId,
      isActive: query.isActive,
      studentPeriodResult: {
        assessmentPeriodId: query.assessmentPeriodId,
        subjectId: query.subjectId,
        studentEnrollmentId: query.studentEnrollmentId,
        studentEnrollment: query.studentId
          ? { studentId: query.studentId }
          : undefined,
      },
      OR: query.search
        ? [
            { notes: { contains: query.search } },
            {
              assessmentPeriodComponent: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              studentPeriodResult: {
                studentEnrollment: {
                  student: {
                    fullName: {
                      contains: query.search,
                    },
                  },
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentPeriodComponentScore.count({ where }),
      this.prisma.studentPeriodComponentScore.findMany({
        where,
        include: studentPeriodComponentScoreInclude,
        orderBy: [
          { assessmentPeriodComponent: { sortOrder: 'asc' } },
          { createdAt: 'asc' },
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
    const score = await this.prisma.studentPeriodComponentScore.findFirst({
      where: { id, deletedAt: null },
      include: studentPeriodComponentScoreInclude,
    });

    if (!score) {
      throw new NotFoundException('Student period component score not found');
    }

    return score;
  }

  async update(
    id: string,
    payload: UpdateStudentPeriodComponentScoreDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureScoreExists(id);
    const context = await this.ensureContext(
      existing.studentPeriodResultId,
      existing.assessmentPeriodComponentId,
    );

    this.ensureEditable(context);

    const rawScore = payload.rawScore ?? this.decimalToNumber(existing.rawScore);
    const finalScore =
      payload.finalScore ?? this.decimalToNumber(existing.finalScore);

    if (rawScore === undefined || finalScore === undefined) {
      throw new BadRequestException('Scores are required');
    }

    this.validateScore(rawScore, context.componentMaxScore);
    this.validateScore(finalScore, context.componentMaxScore);

    const score = await this.prisma.studentPeriodComponentScore.update({
      where: { id },
      data: {
        rawScore: payload.rawScore,
        finalScore: payload.finalScore,
        notes: payload.notes?.trim(),
        isActive: payload.isActive,
        updatedById: actorUserId,
      },
      include: studentPeriodComponentScoreInclude,
    });

    await this.recalculateResultTotal(existing.studentPeriodResultId, actorUserId);

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_PERIOD_COMPONENT_SCORE_UPDATE',
      resource: 'student-period-component-scores',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return score;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureScoreExists(id);
    const context = await this.ensureContext(
      existing.studentPeriodResultId,
      existing.assessmentPeriodComponentId,
    );

    this.ensureEditable(context);

    await this.prisma.studentPeriodComponentScore.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.recalculateResultTotal(existing.studentPeriodResultId, actorUserId);

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_PERIOD_COMPONENT_SCORE_DELETE',
      resource: 'student-period-component-scores',
      resourceId: id,
    });

    return { success: true, id };
  }

  private async ensureContext(
    studentPeriodResultId: string,
    assessmentPeriodComponentId: string,
  ): Promise<ComponentScoreContext> {
    const [result, component] = await this.prisma.$transaction([
      this.prisma.studentPeriodResult.findFirst({
        where: { id: studentPeriodResultId, deletedAt: null },
        select: {
          id: true,
          assessmentPeriodId: true,
          isLocked: true,
          assessmentPeriod: {
            select: {
              id: true,
              isLocked: true,
            },
          },
        },
      }),
      this.prisma.assessmentPeriodComponent.findFirst({
        where: { id: assessmentPeriodComponentId, deletedAt: null },
        select: {
          id: true,
          assessmentPeriodId: true,
          entryMode: true,
          maxScore: true,
          isActive: true,
        },
      }),
    ]);

    if (!result) {
      throw new BadRequestException('Student period result not found');
    }

    if (!component || !component.isActive) {
      throw new BadRequestException('Assessment period component not found');
    }

    if (component.assessmentPeriodId !== result.assessmentPeriodId) {
      throw new BadRequestException(
        'Assessment period component does not belong to this result period',
      );
    }

    return {
      studentPeriodResultId: result.id,
      assessmentPeriodComponentId: component.id,
      assessmentPeriodId: result.assessmentPeriodId,
      componentMaxScore: this.decimalToNumber(component.maxScore) ?? 0,
      entryMode: component.entryMode,
      resultLocked: result.isLocked,
      periodLocked: result.assessmentPeriod.isLocked,
    };
  }

  private ensureEditable(context: ComponentScoreContext) {
    if (context.periodLocked || context.resultLocked) {
      throw new ConflictException('Student period result is locked');
    }

    const editableModes = new Set<AssessmentComponentEntryMode>([
      AssessmentComponentEntryMode.MANUAL,
      AssessmentComponentEntryMode.AUTO_ATTENDANCE,
      AssessmentComponentEntryMode.AUTO_HOMEWORK,
      AssessmentComponentEntryMode.AUTO_EXAM,
    ]);

    if (!editableModes.has(context.entryMode)) {
      throw new BadRequestException('Component is read-only');
    }
  }

  private async ensureScoreExists(id: string) {
    const score = await this.prisma.studentPeriodComponentScore.findFirst({
      where: { id, deletedAt: null },
    });

    if (!score) {
      throw new NotFoundException('Student period component score not found');
    }

    return score;
  }

  private validateScore(score: number, maxScore: number) {
    if (score < 0 || score > maxScore) {
      throw new BadRequestException(`score must be between 0 and ${maxScore}`);
    }
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

  private decimalToNumber(
    value: Prisma.Decimal | number | null | undefined,
  ): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return Number(value);
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Student period component score already exists',
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
