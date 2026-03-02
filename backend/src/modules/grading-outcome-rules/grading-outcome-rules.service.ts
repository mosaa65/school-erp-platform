import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, GradingOutcomeRule, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateGradingOutcomeRuleDto } from './dto/create-grading-outcome-rule.dto';
import { ListGradingOutcomeRulesDto } from './dto/list-grading-outcome-rules.dto';
import { UpdateGradingOutcomeRuleDto } from './dto/update-grading-outcome-rule.dto';

const gradingOutcomeRuleInclude: Prisma.GradingOutcomeRuleInclude = {
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      isCurrent: true,
    },
  },
  gradeLevel: {
    select: {
      id: true,
      code: true,
      name: true,
      stage: true,
      sequence: true,
    },
  },
  conditionalDecision: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  },
  retainedDecision: {
    select: {
      id: true,
      code: true,
      name: true,
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
};

@Injectable()
export class GradingOutcomeRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateGradingOutcomeRuleDto, actorUserId: string) {
    this.validateOutcomeThresholds(
      payload.promotedMaxFailedSubjects,
      payload.conditionalMaxFailedSubjects,
    );
    await this.ensureYearAndGradeExist(
      payload.academicYearId,
      payload.gradeLevelId,
    );
    await this.ensureDecisionExists(payload.conditionalDecisionId);
    await this.ensureDecisionExists(payload.retainedDecisionId);

    try {
      const gradingOutcomeRule = await this.prisma.gradingOutcomeRule.create({
        data: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          promotedMaxFailedSubjects: payload.promotedMaxFailedSubjects,
          conditionalMaxFailedSubjects: payload.conditionalMaxFailedSubjects,
          conditionalDecisionId: payload.conditionalDecisionId,
          retainedDecisionId: payload.retainedDecisionId,
          tieBreakStrategy: payload.tieBreakStrategy,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: gradingOutcomeRuleInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_OUTCOME_RULE_CREATE',
        resource: 'grading-outcome-rules',
        resourceId: gradingOutcomeRule.id,
        details: {
          academicYearId: gradingOutcomeRule.academicYearId,
          gradeLevelId: gradingOutcomeRule.gradeLevelId,
        },
      });

      return gradingOutcomeRule;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_OUTCOME_RULE_CREATE_FAILED',
        resource: 'grading-outcome-rules',
        status: AuditStatus.FAILURE,
        details: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListGradingOutcomeRulesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.GradingOutcomeRuleWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      gradeLevelId: query.gradeLevelId,
      tieBreakStrategy: query.tieBreakStrategy,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              academicYear: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              gradeLevel: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              gradeLevel: {
                code: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.gradingOutcomeRule.count({ where }),
      this.prisma.gradingOutcomeRule.findMany({
        where,
        include: gradingOutcomeRuleInclude,
        orderBy: [
          {
            academicYear: {
              startDate: 'desc',
            },
          },
          {
            gradeLevel: {
              sequence: 'asc',
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
    const gradingOutcomeRule = await this.prisma.gradingOutcomeRule.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: gradingOutcomeRuleInclude,
    });

    if (!gradingOutcomeRule) {
      throw new NotFoundException('Grading outcome rule not found');
    }

    return gradingOutcomeRule;
  }

  async update(
    id: string,
    payload: UpdateGradingOutcomeRuleDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureGradingOutcomeRuleExists(id);

    const promotedMaxFailedSubjects =
      payload.promotedMaxFailedSubjects ?? existing.promotedMaxFailedSubjects;
    const conditionalMaxFailedSubjects =
      payload.conditionalMaxFailedSubjects ??
      existing.conditionalMaxFailedSubjects;
    this.validateOutcomeThresholds(
      promotedMaxFailedSubjects,
      conditionalMaxFailedSubjects,
    );

    if (payload.academicYearId || payload.gradeLevelId) {
      await this.ensureYearAndGradeExist(
        payload.academicYearId ?? existing.academicYearId,
        payload.gradeLevelId ?? existing.gradeLevelId,
      );
    }

    if (payload.conditionalDecisionId) {
      await this.ensureDecisionExists(payload.conditionalDecisionId);
    }
    if (payload.retainedDecisionId) {
      await this.ensureDecisionExists(payload.retainedDecisionId);
    }

    try {
      const gradingOutcomeRule = await this.prisma.gradingOutcomeRule.update({
        where: {
          id,
        },
        data: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          promotedMaxFailedSubjects: payload.promotedMaxFailedSubjects,
          conditionalMaxFailedSubjects: payload.conditionalMaxFailedSubjects,
          conditionalDecisionId: payload.conditionalDecisionId,
          retainedDecisionId: payload.retainedDecisionId,
          tieBreakStrategy: payload.tieBreakStrategy,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: gradingOutcomeRuleInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_OUTCOME_RULE_UPDATE',
        resource: 'grading-outcome-rules',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return gradingOutcomeRule;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureGradingOutcomeRuleExists(id);

    await this.prisma.gradingOutcomeRule.update({
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
      action: 'GRADING_OUTCOME_RULE_DELETE',
      resource: 'grading-outcome-rules',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureGradingOutcomeRuleExists(
    id: string,
  ): Promise<GradingOutcomeRule> {
    const gradingOutcomeRule = await this.prisma.gradingOutcomeRule.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!gradingOutcomeRule) {
      throw new NotFoundException('Grading outcome rule not found');
    }

    return gradingOutcomeRule;
  }

  private async ensureYearAndGradeExist(
    academicYearId: string,
    gradeLevelId: string,
  ) {
    const [academicYear, gradeLevel] = await this.prisma.$transaction([
      this.prisma.academicYear.findFirst({
        where: {
          id: academicYearId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.gradeLevel.findFirst({
        where: {
          id: gradeLevelId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!academicYear) {
      throw new BadRequestException('Academic year is invalid or deleted');
    }

    if (!gradeLevel) {
      throw new BadRequestException('Grade level is invalid or deleted');
    }
  }

  private async ensureDecisionExists(promotionDecisionId: string) {
    const decision = await this.prisma.promotionDecisionLookup.findFirst({
      where: {
        id: promotionDecisionId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!decision) {
      throw new BadRequestException(
        'Promotion decision is invalid, deleted, or inactive',
      );
    }
  }

  private validateOutcomeThresholds(
    promotedMaxFailedSubjects: number,
    conditionalMaxFailedSubjects: number,
  ) {
    if (conditionalMaxFailedSubjects < promotedMaxFailedSubjects) {
      throw new BadRequestException(
        'conditionalMaxFailedSubjects must be greater than or equal to promotedMaxFailedSubjects',
      );
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Outcome rule already exists for this academic year and grade level',
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
