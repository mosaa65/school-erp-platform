import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType, AuditStatus, NormalBalance, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  buildHybridBranchClause,
  combineWhereClauses,
} from '../utils/hybrid-branch-scope';
import { CreateChartOfAccountDto } from './dto/create-chart-of-account.dto';
import { ListChartOfAccountsDto } from './dto/list-chart-of-accounts.dto';
import { UpdateChartOfAccountDto } from './dto/update-chart-of-account.dto';

const chartOfAccountInclude: Prisma.ChartOfAccountInclude = {
  parent: {
    select: {
      id: true,
      nameAr: true,
    },
  },
  branch: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
    },
  },
  defaultCurrency: {
    select: {
      id: true,
      nameAr: true,
      symbol: true,
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
export class ChartOfAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateChartOfAccountDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const nameEn =
      payload.nameEn === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameEn, 'nameEn');

    const parent = payload.parentId
      ? await this.ensureAccountExists(payload.parentId)
      : null;

    const hierarchyLevel = parent ? parent.hierarchyLevel + 1 : 1;
    const normalBalance =
      payload.normalBalance ?? this.defaultBalance(payload.accountType);

    try {
      const account = await this.prisma.chartOfAccount.create({
        data: {
          nameAr,
          nameEn,
          accountType: payload.accountType,
          parentId: payload.parentId,
          hierarchyLevel,
          isHeader: payload.isHeader ?? false,
          isBankAccount: payload.isBankAccount ?? false,
          defaultCurrencyId: payload.defaultCurrencyId,
          branchId: payload.branchId,
          normalBalance,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        } as Prisma.ChartOfAccountUncheckedCreateInput,
        include: chartOfAccountInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'CHART_OF_ACCOUNT_CREATE',
        resource: 'chart-of-accounts',
        resourceId: String(account.id),
        details: {
          accountType: account.accountType,
        },
      });

      return account;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'CHART_OF_ACCOUNT_CREATE_FAILED',
        resource: 'chart-of-accounts',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListChartOfAccountsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const baseWhere: Prisma.ChartOfAccountWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      accountType: query.accountType,
      parentId: query.parentId,
      isHeader: query.isHeader,
    };
    const branchWhere = buildHybridBranchClause(query.branchId) as
      | Prisma.ChartOfAccountWhereInput
      | undefined;
    const searchWhere: Prisma.ChartOfAccountWhereInput | undefined = query.search
      ? {
          OR: [
            {
              nameAr: {
                contains: query.search,
              },
            },
            {
              nameEn: {
                contains: query.search,
              },
            },
          ],
        }
      : undefined;
    const where = combineWhereClauses<Prisma.ChartOfAccountWhereInput>(
      baseWhere,
      branchWhere,
      searchWhere,
    );

    const [total, items] = await this.prisma.$transaction([
      this.prisma.chartOfAccount.count({ where }),
      this.prisma.chartOfAccount.findMany({
        where,
        include: chartOfAccountInclude,
        orderBy: [{ nameAr: 'asc' }, { id: 'asc' }],
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
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: chartOfAccountInclude,
    });

    if (!account) {
      throw new NotFoundException('Chart of account not found');
    }

    return account;
  }

  async update(
    id: number,
    payload: UpdateChartOfAccountDto,
    actorUserId: string,
  ) {
    if (payload.parentId && payload.parentId === id) {
      throw new BadRequestException('Parent account cannot be the same account');
    }

    const parent = payload.parentId
      ? await this.ensureAccountExists(payload.parentId)
      : null;

    const hierarchyLevel =
      payload.parentId === undefined ? undefined : parent ? parent.hierarchyLevel + 1 : 1;

    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const nameEn =
      payload.nameEn === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameEn, 'nameEn');

    const normalBalance =
      payload.normalBalance ??
      (payload.accountType
        ? this.defaultBalance(payload.accountType)
        : undefined);

    try {
      const updated = await this.prisma.chartOfAccount.update({
        where: { id },
        data: {
          nameAr,
          nameEn,
          accountType: payload.accountType,
          parentId: payload.parentId,
          hierarchyLevel,
          isHeader: payload.isHeader,
          isBankAccount: payload.isBankAccount,
          defaultCurrencyId: payload.defaultCurrencyId,
          branchId: payload.branchId,
          normalBalance,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: chartOfAccountInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'CHART_OF_ACCOUNT_UPDATE',
        resource: 'chart-of-accounts',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureAccountExists(id);

    await this.prisma.chartOfAccount.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'CHART_OF_ACCOUNT_DELETE',
      resource: 'chart-of-accounts',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureAccountExists(id: number) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        hierarchyLevel: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Chart of account not found');
    }

    return account;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private defaultBalance(accountType: AccountType): NormalBalance {
    switch (accountType) {
      case AccountType.ASSET:
      case AccountType.EXPENSE:
        return NormalBalance.DEBIT;
      case AccountType.LIABILITY:
      case AccountType.EQUITY:
      case AccountType.REVENUE:
        return NormalBalance.CREDIT;
      default:
        return NormalBalance.DEBIT;
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Chart of account already exists');
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
