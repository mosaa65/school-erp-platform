import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, FinancialCategoryType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { ListFinancialCategoriesDto } from './dto/list-financial-categories.dto';
import { UpdateFinancialCategoryDto } from './dto/update-financial-category.dto';

const financialCategoryInclude: Prisma.FinancialCategoryInclude = {
  parent: {
    select: {
      id: true,
      nameAr: true,
      code: true,
      categoryType: true,
    },
  },
  children: {
    select: {
      id: true,
      nameAr: true,
      code: true,
      categoryType: true,
    },
  },
  coaAccount: {
    select: {
      id: true,
      accountCode: true,
      nameAr: true,
    },
  },
};

@Injectable()
export class FinancialCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateFinancialCategoryDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const code = payload.code?.trim();

    if (code !== undefined && !code) {
      throw new BadRequestException('code cannot be empty');
    }

    if (payload.parentId) {
      const parent = await this.ensureCategoryExists(payload.parentId);
      if (parent.categoryType !== payload.categoryType) {
        throw new BadRequestException('Parent category type must match category type');
      }
    }

    if (payload.coaAccountId) {
      await this.findPostingAccountById(payload.coaAccountId);
    }

    try {
      const category = await this.prisma.financialCategory.create({
        data: {
          nameAr,
          categoryType: payload.categoryType,
          code,
          parentId: payload.parentId,
          isActive: payload.isActive ?? true,
          coaAccountId: payload.coaAccountId,
        },
        include: financialCategoryInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FINANCIAL_CATEGORY_CREATE',
        resource: 'financial-categories',
        resourceId: String(category.id),
        details: { nameAr: category.nameAr, categoryType: category.categoryType },
      });

      return category;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'FINANCIAL_CATEGORY_CREATE_FAILED',
        resource: 'financial-categories',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListFinancialCategoriesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.FinancialCategoryWhereInput = {
      isActive: query.isActive,
      categoryType: query.categoryType,
      parentId: query.parentId,
      coaAccountId: query.coaAccountId,
      OR: query.search
        ? [
            { nameAr: { contains: query.search } },
            { code: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.financialCategory.count({ where }),
      this.prisma.financialCategory.findMany({
        where,
        include: financialCategoryInclude,
        orderBy: [{ nameAr: 'asc' }],
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
    const category = await this.prisma.financialCategory.findFirst({
      where: { id },
      include: financialCategoryInclude,
    });

    if (!category) {
      throw new NotFoundException('Financial category not found');
    }

    return category;
  }

  async update(id: number, payload: UpdateFinancialCategoryDto, actorUserId: string) {
    const existing = await this.ensureCategoryExists(id);

    if (payload.parentId && payload.parentId === id) {
      throw new BadRequestException('Parent category cannot be the same category');
    }

    const targetCategoryType = payload.categoryType ?? existing.categoryType;
    const targetParentId = payload.parentId ?? existing.parentId;

    if (targetParentId) {
      const parent = await this.ensureCategoryExists(targetParentId);
      if (parent.categoryType !== targetCategoryType) {
        throw new BadRequestException('Parent category type must match category type');
      }
    }

    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    const code = payload.code?.trim();
    if (payload.code !== undefined && !code) {
      throw new BadRequestException('code cannot be empty');
    }

    if (payload.coaAccountId) {
      await this.findPostingAccountById(payload.coaAccountId);
    }

    try {
      const updated = await this.prisma.financialCategory.update({
        where: { id },
        data: {
          nameAr,
          categoryType: payload.categoryType,
          code,
          parentId: payload.parentId,
          isActive: payload.isActive,
          coaAccountId: payload.coaAccountId,
        },
        include: financialCategoryInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FINANCIAL_CATEGORY_UPDATE',
        resource: 'financial-categories',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureCategoryExists(id);

    await this.prisma.financialCategory.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'FINANCIAL_CATEGORY_DELETE',
      resource: 'financial-categories',
      resourceId: String(id),
    });

    return { success: true, id };
  }

  private async ensureCategoryExists(id: number) {
    const category = await this.prisma.financialCategory.findFirst({
      where: { id },
      select: {
        id: true,
        categoryType: true,
        parentId: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Financial category not found');
    }

    return category;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }
    return normalized;
  }

  private async findPostingAccountById(accountId: number) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        id: accountId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        isHeader: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Posting account ${accountId} was not found`);
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountId} cannot be a header account`,
      );
    }

    return account;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Financial category already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
