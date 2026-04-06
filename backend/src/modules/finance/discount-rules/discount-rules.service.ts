import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateDiscountRuleDto } from './dto/create-discount-rule.dto';
import { ListDiscountRulesDto } from './dto/list-discount-rules.dto';
import { UpdateDiscountRuleDto } from './dto/update-discount-rule.dto';

const discountRuleInclude: Prisma.DiscountRuleInclude = {
  academicYear: {
    select: {
      id: true,
      name: true,
    },
  },
  discountGlAccount: {
    select: {
      id: true,
      nameAr: true,
    },
  },
  contraGlAccount: {
    select: {
      id: true,
      nameAr: true,
    },
  },
};

@Injectable()
export class DiscountRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateDiscountRuleDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const rule = await this.prisma.discountRule.create({
        data: {
          nameAr,
          discountType: payload.discountType,
          calculationMethod: payload.calculationMethod,
          value: payload.value,
          appliesToFeeType: payload.appliesToFeeType,
          siblingOrderFrom: payload.siblingOrderFrom,
          maxDiscountPercentage: payload.maxDiscountPercentage,
          requiresApproval: payload.requiresApproval ?? false,
          discountGlAccountId: payload.discountGlAccountId,
          contraGlAccountId: payload.contraGlAccountId,
          academicYearId: payload.academicYearId,
          isActive: payload.isActive ?? true,
        },
        include: discountRuleInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'DISCOUNT_RULE_CREATE',
        resource: 'discount-rules',
        resourceId: String(rule.id),
        details: {
          discountType: rule.discountType,
          calculationMethod: rule.calculationMethod,
          value: rule.value,
        },
      });

      return rule;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'DISCOUNT_RULE_CREATE_FAILED',
        resource: 'discount-rules',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListDiscountRulesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.DiscountRuleWhereInput = {
      isActive: query.isActive,
      discountType: query.discountType,
      appliesToFeeType: query.appliesToFeeType,
      academicYearId: query.academicYearId,
      OR: query.search
        ? [
            {
              nameAr: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.discountRule.count({ where }),
      this.prisma.discountRule.findMany({
        where,
        include: discountRuleInclude,
        orderBy: [{ createdAt: 'desc' }],
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

  async findOne(id: number) {
    const rule = await this.prisma.discountRule.findFirst({
      where: {
        id,
      },
      include: discountRuleInclude,
    });

    if (!rule) {
      throw new NotFoundException('Discount rule not found');
    }

    return rule;
  }

  async update(
    id: number,
    payload: UpdateDiscountRuleDto,
    actorUserId: string,
  ) {
    await this.ensureDiscountRuleExists(id);

    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const updated = await this.prisma.discountRule.update({
        where: { id },
        data: {
          nameAr,
          discountType: payload.discountType,
          calculationMethod: payload.calculationMethod,
          value: payload.value,
          appliesToFeeType: payload.appliesToFeeType,
          siblingOrderFrom: payload.siblingOrderFrom,
          maxDiscountPercentage: payload.maxDiscountPercentage,
          requiresApproval: payload.requiresApproval,
          discountGlAccountId: payload.discountGlAccountId,
          contraGlAccountId: payload.contraGlAccountId,
          academicYearId: payload.academicYearId,
          isActive: payload.isActive,
        },
        include: discountRuleInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'DISCOUNT_RULE_UPDATE',
        resource: 'discount-rules',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureDiscountRuleExists(id);

    await this.prisma.discountRule.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'DISCOUNT_RULE_DELETE',
      resource: 'discount-rules',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureDiscountRuleExists(id: number) {
    const rule = await this.prisma.discountRule.findFirst({
      where: {
        id,
      },
      select: { id: true },
    });

    if (!rule) {
      throw new NotFoundException('Discount rule not found');
    }
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Discount rule already exists');
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
