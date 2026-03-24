import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  BudgetStatus,
  JournalEntryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsDto } from './dto/list-budgets.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

const budgetInclude: Prisma.BudgetInclude = {
  fiscalYear: { select: { id: true, yearName: true } },
  branch: { select: { id: true, nameAr: true } },
  approvedByUser: { select: { id: true, email: true } },
  createdByUser: { select: { id: true, email: true } },
  lines: {
    orderBy: { id: 'asc' },
    include: {
      account: { select: { id: true, accountCode: true, nameAr: true } },
    },
  },
};

const budgetSummaryInclude: Prisma.BudgetInclude = {
  fiscalYear: { select: { id: true, yearName: true } },
  branch: { select: { id: true, nameAr: true } },
  createdByUser: { select: { id: true, email: true } },
};

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateBudgetDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }
    if (!payload.lines || payload.lines.length === 0) {
      throw new BadRequestException('Budget must include at least one line');
    }

    const totalAmount = payload.lines.reduce((sum, l) => sum + l.budgetedAmount, 0);

    try {
      const budget = await this.prisma.budget.create({
        data: {
          nameAr,
          fiscalYearId: payload.fiscalYearId,
          branchId: payload.branchId,
          budgetType: payload.budgetType ?? 'ANNUAL',
          startDate,
          endDate,
          totalAmount,
          status: BudgetStatus.DRAFT,
          notes: payload.notes?.trim(),
          createdByUserId: actorUserId,
          lines: {
            create: payload.lines.map((line) => ({
              accountId: line.accountId,
              lineDescription: line.lineDescription?.trim(),
              budgetedAmount: line.budgetedAmount,
              notes: line.notes?.trim(),
            })),
          },
        },
        include: budgetInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'BUDGET_CREATE',
        resource: 'budgets',
        resourceId: String(budget.id),
        details: { nameAr: budget.nameAr, totalAmount },
      });

      return budget;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'BUDGET_CREATE_FAILED',
        resource: 'budgets',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListBudgetsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.BudgetWhereInput = {
      status: query.status,
      budgetType: query.budgetType,
      fiscalYearId: query.fiscalYearId,
      branchId: query.branchId,
      OR: query.search
        ? [{ nameAr: { contains: query.search } }]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.budget.count({ where }),
      this.prisma.budget.findMany({
        where,
        include: budgetSummaryInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const budget = await this.prisma.budget.findFirst({
      where: { id },
      include: budgetInclude,
    });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async update(id: number, payload: UpdateBudgetDto, actorUserId: string) {
    const existing = await this.findOne(id);
    if (existing.status !== BudgetStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT budgets can be updated');
    }

    try {
      const updated = await this.prisma.budget.update({
        where: { id },
        data: {
          nameAr: payload.nameAr?.trim(),
          fiscalYearId: payload.fiscalYearId,
          branchId: payload.branchId,
          budgetType: payload.budgetType,
          startDate: payload.startDate ? new Date(payload.startDate) : undefined,
          endDate: payload.endDate ? new Date(payload.endDate) : undefined,
          notes: payload.notes?.trim(),
        },
        include: budgetInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'BUDGET_UPDATE',
        resource: 'budgets',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async approve(id: number, actorUserId: string) {
    const budget = await this.findOne(id);
    if (budget.status !== BudgetStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT budgets can be approved');
    }

    const updated = await this.prisma.budget.update({
      where: { id },
      data: {
        status: BudgetStatus.APPROVED,
        approvedByUserId: actorUserId,
        approvedAt: new Date(),
      },
      include: budgetInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'BUDGET_APPROVE',
      resource: 'budgets',
      resourceId: String(id),
    });

    return updated;
  }

  async remove(id: number, actorUserId: string) {
    const budget = await this.findOne(id);
    if (budget.status !== BudgetStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT budgets can be deleted');
    }

    await this.prisma.budget.update({
      where: { id },
      data: { status: BudgetStatus.CLOSED },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'BUDGET_DELETE',
      resource: 'budgets',
      resourceId: String(id),
    });

    return { success: true, id };
  }

  /**
   * Budget vs Actual Report — مقارنة المبالغ المخططة بالنفقات الفعلية
   */
  async getBudgetVsActual(id: number) {
    const budget = await this.findOne(id);

    const accountIds = budget.lines.map((l: any) => l.accountId);

    // Get actual amounts from posted journal entries in the budget period
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId: { in: accountIds },
        deletedAt: null,
        isActive: true,
        journalEntry: {
          deletedAt: null,
          isActive: true,
          status: JournalEntryStatus.POSTED,
          entryDate: {
            gte: budget.startDate,
            lte: budget.endDate,
          },
          ...(budget.branchId ? { branchId: budget.branchId } : {}),
        },
      },
      select: {
        accountId: true,
        debitAmount: true,
        creditAmount: true,
      },
    });

    // Build actual amounts map
    const actualMap = new Map<number, number>();
    for (const line of lines) {
      const prev = actualMap.get(line.accountId) ?? 0;
      actualMap.set(
        line.accountId,
        prev + Number(line.debitAmount) - Number(line.creditAmount),
      );
    }

    const report = budget.lines.map((budgetLine: any) => {
      const actualAmount = Math.abs(actualMap.get(budgetLine.accountId) ?? 0);
      const budgetedAmount = Number(budgetLine.budgetedAmount);
      const variance = budgetedAmount - actualAmount;
      const variancePercentage = budgetedAmount > 0
        ? Number(((variance / budgetedAmount) * 100).toFixed(2))
        : 0;

      return {
        accountId: budgetLine.accountId,
        accountCode: budgetLine.account?.accountCode,
        accountName: budgetLine.account?.nameAr,
        lineDescription: budgetLine.lineDescription,
        budgetedAmount: Number(budgetedAmount.toFixed(2)),
        actualAmount: Number(actualAmount.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        variancePercentage,
        utilizationPercentage: budgetedAmount > 0
          ? Number(((actualAmount / budgetedAmount) * 100).toFixed(2))
          : 0,
      };
    });

    const totalBudgeted = report.reduce((s: number, r: any) => s + r.budgetedAmount, 0);
    const totalActual = report.reduce((s: number, r: any) => s + r.actualAmount, 0);

    return {
      budgetId: budget.id,
      budgetName: budget.nameAr,
      period: {
        startDate: budget.startDate,
        endDate: budget.endDate,
      },
      lines: report,
      summary: {
        totalBudgeted: Number(totalBudgeted.toFixed(2)),
        totalActual: Number(totalActual.toFixed(2)),
        totalVariance: Number((totalBudgeted - totalActual).toFixed(2)),
        overallUtilization: totalBudgeted > 0
          ? Number(((totalActual / totalBudgeted) * 100).toFixed(2))
          : 0,
      },
    };
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${fieldName} cannot be empty`);
    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Budget already exists');
    }
    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
