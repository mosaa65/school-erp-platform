import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  MonthlyCustomComponentScore,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateMonthlyCustomComponentScoreDto } from './dto/create-monthly-custom-component-score.dto';
import { ListMonthlyCustomComponentScoresDto } from './dto/list-monthly-custom-component-scores.dto';
import { UpdateMonthlyCustomComponentScoreDto } from './dto/update-monthly-custom-component-score.dto';

const monthlyCustomComponentScoreInclude: Prisma.MonthlyCustomComponentScoreInclude =
  {
    monthlyGrade: {
      select: {
        id: true,
        studentEnrollmentId: true,
        subjectId: true,
        academicMonthId: true,
        academicYearId: true,
        gradingPolicyId: true,
        isLocked: true,
        isActive: true,
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
            section: {
              select: {
                id: true,
                code: true,
                name: true,
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
        academicMonth: {
          select: {
            id: true,
            code: true,
            name: true,
            sequence: true,
          },
        },
      },
    },
    gradingPolicyComponent: {
      select: {
        id: true,
        code: true,
        name: true,
        maxScore: true,
        includeInMonthly: true,
        calculationMode: true,
        isActive: true,
        gradingPolicyId: true,
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
  monthlyGradeId: string;
  sectionId: string;
  subjectId: string;
  academicYearId: string;
  gradingPolicyId: string;
  monthlyGradeLocked: boolean;
  maxScore: number;
};

@Injectable()
export class MonthlyCustomComponentScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    payload: CreateMonthlyCustomComponentScoreDto,
    actorUserId: string,
  ) {
    const context = await this.ensureContext(
      payload.monthlyGradeId,
      payload.gradingPolicyComponentId,
    );

    if (context.monthlyGradeLocked) {
      throw new ConflictException(
        'Cannot modify custom components of a locked monthly grade',
      );
    }

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      context.subjectId,
      context.academicYearId,
    );
    this.validateScore(payload.score, context.maxScore);

    const softDeletedRow =
      await this.prisma.monthlyCustomComponentScore.findFirst({
        where: {
          monthlyGradeId: payload.monthlyGradeId,
          gradingPolicyComponentId: payload.gradingPolicyComponentId,
          deletedAt: {
            not: null,
          },
        },
        select: {
          id: true,
        },
      });

    if (softDeletedRow) {
      const restored = await this.prisma.monthlyCustomComponentScore.update({
        where: {
          id: softDeletedRow.id,
        },
        data: {
          score: payload.score,
          notes: payload.notes?.trim(),
          isActive: payload.isActive ?? true,
          deletedAt: null,
          updatedById: actorUserId,
        },
        include: monthlyCustomComponentScoreInclude,
      });

      await this.recalculateMonthlyGradeTotals(
        payload.monthlyGradeId,
        actorUserId,
      );

      await this.auditLogsService.record({
        actorUserId,
        action: 'MONTHLY_CUSTOM_COMPONENT_SCORE_RESTORE',
        resource: 'monthly-custom-component-scores',
        resourceId: restored.id,
        details: {
          monthlyGradeId: restored.monthlyGradeId,
          gradingPolicyComponentId: restored.gradingPolicyComponentId,
          score: restored.score,
        },
      });

      return restored;
    }

    try {
      const monthlyCustomComponentScore =
        await this.prisma.monthlyCustomComponentScore.create({
          data: {
            monthlyGradeId: payload.monthlyGradeId,
            gradingPolicyComponentId: payload.gradingPolicyComponentId,
            score: payload.score,
            notes: payload.notes?.trim(),
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: monthlyCustomComponentScoreInclude,
        });

      await this.recalculateMonthlyGradeTotals(
        payload.monthlyGradeId,
        actorUserId,
      );

      await this.auditLogsService.record({
        actorUserId,
        action: 'MONTHLY_CUSTOM_COMPONENT_SCORE_CREATE',
        resource: 'monthly-custom-component-scores',
        resourceId: monthlyCustomComponentScore.id,
        details: {
          monthlyGradeId: monthlyCustomComponentScore.monthlyGradeId,
          gradingPolicyComponentId:
            monthlyCustomComponentScore.gradingPolicyComponentId,
          score: monthlyCustomComponentScore.score,
        },
      });

      return monthlyCustomComponentScore;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'MONTHLY_CUSTOM_COMPONENT_SCORE_CREATE_FAILED',
        resource: 'monthly-custom-component-scores',
        status: AuditStatus.FAILURE,
        details: {
          monthlyGradeId: payload.monthlyGradeId,
          gradingPolicyComponentId: payload.gradingPolicyComponentId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListMonthlyCustomComponentScoresDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.MonthlyCustomComponentScoreWhereInput = {
      deletedAt: null,
      monthlyGradeId: query.monthlyGradeId,
      gradingPolicyComponentId: query.gradingPolicyComponentId,
      isActive: query.isActive,
      monthlyGrade: {
        academicMonthId: query.academicMonthId,
        subjectId: query.subjectId,
        studentEnrollmentId: query.studentEnrollmentId,
        studentEnrollment: {
          sectionId: query.sectionId,
          studentId: query.studentId,
        },
      },
      OR: query.search
        ? [
            {
              gradingPolicyComponent: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              gradingPolicyComponent: {
                code: {
                  contains: query.search,
                },
              },
            },
            {
              monthlyGrade: {
                studentEnrollment: {
                  student: {
                    fullName: {
                      contains: query.search,
                    },
                  },
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
      this.prisma.monthlyCustomComponentScore.count({ where }),
      this.prisma.monthlyCustomComponentScore.findMany({
        where,
        include: monthlyCustomComponentScoreInclude,
        orderBy: [
          {
            monthlyGrade: {
              academicMonth: {
                sequence: 'asc',
              },
            },
          },
          {
            gradingPolicyComponent: {
              sortOrder: 'asc',
            },
          },
          {
            createdAt: 'asc',
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
    const monthlyCustomComponentScore =
      await this.prisma.monthlyCustomComponentScore.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: monthlyCustomComponentScoreInclude,
      });

    if (!monthlyCustomComponentScore) {
      throw new NotFoundException('Monthly custom component score not found');
    }

    return monthlyCustomComponentScore;
  }

  async update(
    id: string,
    payload: UpdateMonthlyCustomComponentScoreDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureMonthlyCustomComponentScoreExists(id);

    if (
      payload.monthlyGradeId !== undefined &&
      payload.monthlyGradeId !== existing.monthlyGradeId
    ) {
      throw new BadRequestException(
        'monthlyGradeId cannot be changed. Delete and recreate the record instead.',
      );
    }

    if (
      payload.gradingPolicyComponentId !== undefined &&
      payload.gradingPolicyComponentId !== existing.gradingPolicyComponentId
    ) {
      throw new BadRequestException(
        'gradingPolicyComponentId cannot be changed. Delete and recreate the record instead.',
      );
    }

    const context = await this.ensureContext(
      existing.monthlyGradeId,
      existing.gradingPolicyComponentId,
    );

    if (context.monthlyGradeLocked) {
      throw new ConflictException(
        'Cannot modify custom components of a locked monthly grade',
      );
    }

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      context.subjectId,
      context.academicYearId,
    );

    const score = payload.score ?? this.decimalToNumber(existing.score) ?? 0;
    this.validateScore(score, context.maxScore);

    const monthlyCustomComponentScore =
      await this.prisma.monthlyCustomComponentScore.update({
        where: {
          id,
        },
        data: {
          score: payload.score,
          notes: payload.notes?.trim(),
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: monthlyCustomComponentScoreInclude,
      });

    await this.recalculateMonthlyGradeTotals(
      existing.monthlyGradeId,
      actorUserId,
    );

    await this.auditLogsService.record({
      actorUserId,
      action: 'MONTHLY_CUSTOM_COMPONENT_SCORE_UPDATE',
      resource: 'monthly-custom-component-scores',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return monthlyCustomComponentScore;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureMonthlyCustomComponentScoreExists(id);
    const context = await this.ensureContext(
      existing.monthlyGradeId,
      existing.gradingPolicyComponentId,
    );

    if (context.monthlyGradeLocked) {
      throw new ConflictException(
        'Cannot modify custom components of a locked monthly grade',
      );
    }

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      context.subjectId,
      context.academicYearId,
    );

    await this.prisma.monthlyCustomComponentScore.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.recalculateMonthlyGradeTotals(
      existing.monthlyGradeId,
      actorUserId,
    );

    await this.auditLogsService.record({
      actorUserId,
      action: 'MONTHLY_CUSTOM_COMPONENT_SCORE_DELETE',
      resource: 'monthly-custom-component-scores',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureMonthlyCustomComponentScoreExists(
    id: string,
  ): Promise<MonthlyCustomComponentScore> {
    const monthlyCustomComponentScore =
      await this.prisma.monthlyCustomComponentScore.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

    if (!monthlyCustomComponentScore) {
      throw new NotFoundException('Monthly custom component score not found');
    }

    return monthlyCustomComponentScore;
  }

  private async ensureContext(
    monthlyGradeId: string,
    gradingPolicyComponentId: string,
  ): Promise<ComponentScoreContext> {
    const [monthlyGrade, component] = await this.prisma.$transaction([
      this.prisma.monthlyGrade.findFirst({
        where: {
          id: monthlyGradeId,
          deletedAt: null,
        },
        select: {
          id: true,
          subjectId: true,
          academicYearId: true,
          gradingPolicyId: true,
          isLocked: true,
          studentEnrollment: {
            select: {
              sectionId: true,
            },
          },
        },
      }),
      this.prisma.gradingPolicyComponent.findFirst({
        where: {
          id: gradingPolicyComponentId,
          deletedAt: null,
        },
        select: {
          id: true,
          gradingPolicyId: true,
          maxScore: true,
          includeInMonthly: true,
          isActive: true,
        },
      }),
    ]);

    if (!monthlyGrade) {
      throw new BadRequestException('Monthly grade is invalid or deleted');
    }

    if (!component) {
      throw new BadRequestException(
        'Grading policy component is invalid or deleted',
      );
    }

    if (!component.isActive) {
      throw new BadRequestException('Grading policy component is inactive');
    }

    if (!component.includeInMonthly) {
      throw new BadRequestException(
        'Grading policy component is not enabled for monthly calculations',
      );
    }

    if (component.gradingPolicyId !== monthlyGrade.gradingPolicyId) {
      throw new BadRequestException(
        'Selected grading policy component does not belong to the monthly grade policy',
      );
    }

    return {
      monthlyGradeId: monthlyGrade.id,
      sectionId: monthlyGrade.studentEnrollment.sectionId,
      subjectId: monthlyGrade.subjectId,
      academicYearId: monthlyGrade.academicYearId,
      gradingPolicyId: monthlyGrade.gradingPolicyId,
      monthlyGradeLocked: monthlyGrade.isLocked,
      maxScore: this.decimalToNumber(component.maxScore) ?? 0,
    };
  }

  private async recalculateMonthlyGradeTotals(
    monthlyGradeId: string,
    actorUserId: string,
  ) {
    const [monthlyGrade, customSum] = await this.prisma.$transaction([
      this.prisma.monthlyGrade.findFirst({
        where: {
          id: monthlyGradeId,
          deletedAt: null,
        },
        select: {
          id: true,
          gradingPolicyId: true,
          attendanceScore: true,
          homeworkScore: true,
          activityScore: true,
          contributionScore: true,
          examScore: true,
        },
      }),
      this.prisma.monthlyCustomComponentScore.aggregate({
        where: {
          monthlyGradeId,
          deletedAt: null,
          isActive: true,
        },
        _sum: {
          score: true,
        },
      }),
    ]);

    if (!monthlyGrade) {
      throw new NotFoundException('Monthly grade not found');
    }

    const customComponentsScore =
      this.decimalToNumber(customSum._sum.score) ?? 0;
    const monthlyTotal = this.round2(
      (this.decimalToNumber(monthlyGrade.attendanceScore) ?? 0) +
        (this.decimalToNumber(monthlyGrade.homeworkScore) ?? 0) +
        (this.decimalToNumber(monthlyGrade.activityScore) ?? 0) +
        (this.decimalToNumber(monthlyGrade.contributionScore) ?? 0) +
        customComponentsScore +
        (this.decimalToNumber(monthlyGrade.examScore) ?? 0),
    );

    await this.prisma.monthlyGrade.update({
      where: {
        id: monthlyGrade.id,
      },
      data: {
        customComponentsScore,
        monthlyTotal,
        updatedById: actorUserId,
      },
    });
  }

  private validateScore(score: number, maxScore: number) {
    if (score < 0 || score > maxScore) {
      throw new BadRequestException(`score must be between 0 and ${maxScore}`);
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
        'Monthly custom component score already exists for this monthly grade and policy component',
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
