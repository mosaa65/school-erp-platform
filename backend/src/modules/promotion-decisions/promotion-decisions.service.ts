import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, PromotionDecisionLookup } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreatePromotionDecisionDto } from './dto/create-promotion-decision.dto';
import { ListPromotionDecisionsDto } from './dto/list-promotion-decisions.dto';
import { UpdatePromotionDecisionDto } from './dto/update-promotion-decision.dto';

const promotionDecisionInclude: Prisma.PromotionDecisionLookupInclude = {
  _count: {
    select: {
      annualResults: true,
      conditionalForRules: true,
      retainedForRules: true,
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
export class PromotionDecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreatePromotionDecisionDto, actorUserId: string) {
    const normalizedCode = this.normalizeCode(payload.code);
    const normalizedName = this.normalizeRequiredText(payload.name, 'name');

    try {
      const promotionDecision =
        await this.prisma.promotionDecisionLookup.create({
          data: {
            code: normalizedCode,
            name: normalizedName,
            description: payload.description?.trim(),
            isSystem: payload.isSystem ?? false,
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: promotionDecisionInclude,
        });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PROMOTION_DECISION_CREATE',
        resource: 'promotion-decisions',
        resourceId: promotionDecision.id,
        details: {
          code: promotionDecision.code,
          name: promotionDecision.name,
        },
      });

      return promotionDecision;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'PROMOTION_DECISION_CREATE_FAILED',
        resource: 'promotion-decisions',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListPromotionDecisionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PromotionDecisionLookupWhereInput = {
      deletedAt: null,
      isSystem: query.isSystem,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              code: {
                contains: query.search,
              },
            },
            {
              name: {
                contains: query.search,
              },
            },
            {
              description: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.promotionDecisionLookup.count({ where }),
      this.prisma.promotionDecisionLookup.findMany({
        where,
        include: promotionDecisionInclude,
        orderBy: [{ isSystem: 'desc' }, { code: 'asc' }],
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
    const promotionDecision =
      await this.prisma.promotionDecisionLookup.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: promotionDecisionInclude,
      });

    if (!promotionDecision) {
      throw new NotFoundException('لم يتم العثور على قرار الترفيع');
    }

    return promotionDecision;
  }

  async update(
    id: string,
    payload: UpdatePromotionDecisionDto,
    actorUserId: string,
  ) {
    const promotionDecision = await this.ensurePromotionDecisionExists(id);

    if (
      promotionDecision.isSystem &&
      payload.code &&
      payload.code !== promotionDecision.code
    ) {
      throw new ConflictException(
        'لا يمكن تعديل رمز قرار الترفيع النظامي',
      );
    }

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedName =
      payload.name === undefined
        ? undefined
        : this.normalizeRequiredText(payload.name, 'name');

    try {
      const updated = await this.prisma.promotionDecisionLookup.update({
        where: {
          id,
        },
        data: {
          code: normalizedCode,
          name: normalizedName,
          description: payload.description?.trim(),
          isSystem: payload.isSystem,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: promotionDecisionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PROMOTION_DECISION_UPDATE',
        resource: 'promotion-decisions',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const promotionDecision = await this.ensurePromotionDecisionExists(id);

    if (promotionDecision.isSystem) {
      throw new ConflictException(
        'لا يمكن حذف قرار الترفيع النظامي',
      );
    }

    const linkedAnnualResults = await this.prisma.annualResult.count({
      where: {
        promotionDecisionId: id,
        deletedAt: null,
      },
    });
    const linkedOutcomeRules = await this.prisma.gradingOutcomeRule.count({
      where: {
        deletedAt: null,
        OR: [{ conditionalDecisionId: id }, { retainedDecisionId: id }],
      },
    });

    if (linkedAnnualResults > 0 || linkedOutcomeRules > 0) {
      throw new ConflictException(
        'Cannot delete promotion decision linked to active annual results or outcome rules',
      );
    }

    await this.prisma.promotionDecisionLookup.update({
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
      action: 'PROMOTION_DECISION_DELETE',
      resource: 'promotion-decisions',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensurePromotionDecisionExists(
    id: string,
  ): Promise<PromotionDecisionLookup> {
    const promotionDecision =
      await this.prisma.promotionDecisionLookup.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

    if (!promotionDecision) {
      throw new NotFoundException('لم يتم العثور على قرار الترفيع');
    }

    return promotionDecision;
  }

  private normalizeCode(code: string): string {
    const normalized = code.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('لا يمكن أن يكون الرمز فارغًا');
    }

    return normalized;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`لا يمكن أن يكون ${fieldName} فارغًا`);
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('رمز قرار الترفيع موجود مسبقًا');
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

