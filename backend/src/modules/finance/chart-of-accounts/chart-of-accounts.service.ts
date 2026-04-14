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

const chartOfAccountRollbackSnapshotSelect = {
  nameAr: true,
  nameEn: true,
  accountType: true,
  parentId: true,
  hierarchyLevel: true,
  isHeader: true,
  isBankAccount: true,
  defaultCurrencyId: true,
  branchId: true,
  normalBalance: true,
  isActive: true,
} satisfies Prisma.ChartOfAccountSelect;

type ChartOfAccountRollbackSnapshot = Prisma.ChartOfAccountGetPayload<{
  select: typeof chartOfAccountRollbackSnapshotSelect;
}>;

const CHART_OF_ACCOUNT_ROLLBACK_FIELDS: Array<
  keyof ChartOfAccountRollbackSnapshot
> = [
  'nameAr',
  'nameEn',
  'accountType',
  'parentId',
  'hierarchyLevel',
  'isHeader',
  'isBankAccount',
  'defaultCurrencyId',
  'branchId',
  'normalBalance',
  'isActive',
];

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
      const afterSnapshot = this.toChartOfAccountRollbackSnapshot(account);
      const changedFields = this.computeChartOfAccountChangedFields(
        null,
        afterSnapshot,
      );

      await this.auditLogsService.record({
        actorUserId,
        action: 'CHART_OF_ACCOUNT_CREATE',
        resource: 'chart-of-accounts',
        resourceId: String(account.id),
        details: this.buildChartOfAccountRollbackDetails({
          before: null,
          after: afterSnapshot,
          changedFields,
          additionalDetails: {
            accountType: account.accountType,
          },
        }),
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
    const beforeSnapshot = await this.getChartOfAccountRollbackSnapshotOrThrow(
      id,
    );

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
      const afterSnapshot = this.toChartOfAccountRollbackSnapshot(updated);
      const changedFields = this.computeChartOfAccountChangedFields(
        beforeSnapshot,
        afterSnapshot,
      );

      await this.auditLogsService.record({
        actorUserId,
        action: 'CHART_OF_ACCOUNT_UPDATE',
        resource: 'chart-of-accounts',
        resourceId: String(id),
        details: this.buildChartOfAccountRollbackDetails({
          before: beforeSnapshot,
          after: afterSnapshot,
          changedFields,
          additionalDetails: this.extractChartOfAccountRequestedChanges(payload),
        }),
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    const beforeSnapshot = await this.getChartOfAccountRollbackSnapshotOrThrow(
      id,
    );

    const removed = await this.prisma.chartOfAccount.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
      select: chartOfAccountRollbackSnapshotSelect,
    });
    const afterSnapshot = this.toChartOfAccountRollbackSnapshot(removed);
    const changedFields = this.computeChartOfAccountChangedFields(
      beforeSnapshot,
      afterSnapshot,
    );

    await this.auditLogsService.record({
      actorUserId,
      action: 'CHART_OF_ACCOUNT_DELETE',
      resource: 'chart-of-accounts',
      resourceId: String(id),
      details: this.buildChartOfAccountRollbackDetails({
        before: beforeSnapshot,
        after: afterSnapshot,
        changedFields,
      }),
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

  private async getChartOfAccountRollbackSnapshotOrThrow(
    id: number,
  ): Promise<ChartOfAccountRollbackSnapshot> {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: chartOfAccountRollbackSnapshotSelect,
    });

    if (!account) {
      throw new NotFoundException('Chart of account not found');
    }

    return this.toChartOfAccountRollbackSnapshot(account);
  }

  private toChartOfAccountRollbackSnapshot(source: {
    nameAr: string;
    nameEn: string | null;
    accountType: AccountType;
    parentId: number | null;
    hierarchyLevel: number;
    isHeader: boolean;
    isBankAccount: boolean;
    defaultCurrencyId: number | null;
    branchId: number | null;
    normalBalance: NormalBalance;
    isActive: boolean;
  }): ChartOfAccountRollbackSnapshot {
    return {
      nameAr: source.nameAr,
      nameEn: source.nameEn,
      accountType: source.accountType,
      parentId: source.parentId,
      hierarchyLevel: source.hierarchyLevel,
      isHeader: source.isHeader,
      isBankAccount: source.isBankAccount,
      defaultCurrencyId: source.defaultCurrencyId,
      branchId: source.branchId,
      normalBalance: source.normalBalance,
      isActive: source.isActive,
    };
  }

  private computeChartOfAccountChangedFields(
    before: ChartOfAccountRollbackSnapshot | null,
    after: ChartOfAccountRollbackSnapshot | null,
  ): string[] {
    if (!before && !after) {
      return [];
    }

    if (!before && after) {
      return [...CHART_OF_ACCOUNT_ROLLBACK_FIELDS];
    }

    if (before && !after) {
      return [...CHART_OF_ACCOUNT_ROLLBACK_FIELDS];
    }

    return CHART_OF_ACCOUNT_ROLLBACK_FIELDS.filter(
      (field) => before![field] !== after![field],
    );
  }

  private extractChartOfAccountRequestedChanges(
    payload: UpdateChartOfAccountDto,
  ): Record<string, Prisma.InputJsonValue> {
    const details: Record<string, Prisma.InputJsonValue> = {};

    if (payload.nameAr !== undefined) {
      details.nameAr = payload.nameAr;
    }
    if (payload.nameEn !== undefined) {
      details.nameEn = payload.nameEn;
    }
    if (payload.accountType !== undefined) {
      details.accountType = payload.accountType;
    }
    if (payload.parentId !== undefined) {
      details.parentId = payload.parentId;
    }
    if (payload.isHeader !== undefined) {
      details.isHeader = payload.isHeader;
    }
    if (payload.isBankAccount !== undefined) {
      details.isBankAccount = payload.isBankAccount;
    }
    if (payload.defaultCurrencyId !== undefined) {
      details.defaultCurrencyId = payload.defaultCurrencyId;
    }
    if (payload.branchId !== undefined) {
      details.branchId = payload.branchId;
    }
    if (payload.normalBalance !== undefined) {
      details.normalBalance = payload.normalBalance;
    }
    if (payload.isActive !== undefined) {
      details.isActive = payload.isActive;
    }

    return details;
  }

  private buildChartOfAccountRollbackDetails(input: {
    before: ChartOfAccountRollbackSnapshot | null;
    after: ChartOfAccountRollbackSnapshot | null;
    changedFields: string[];
    additionalDetails?: Record<string, Prisma.InputJsonValue>;
  }): Prisma.InputJsonValue {
    const { before, after, changedFields, additionalDetails } = input;

    return {
      ...(additionalDetails ?? {}),
      before,
      after,
      rollback: {
        schemaVersion: 1,
        eligible: true,
        before,
        after,
        changedFields,
      },
    } as Prisma.InputJsonValue;
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
