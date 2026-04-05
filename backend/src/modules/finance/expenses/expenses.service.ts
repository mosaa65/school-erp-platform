import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  DocumentType,
  FinancialCategoryType,
  JournalEntryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

const DEFAULT_CASH_ACCOUNT_CODE = '1101';
const DEFAULT_EXPENSE_ACCOUNT_CODE = '5006';

const expenseInclude: Prisma.ExpenseInclude = {
  fund: {
    select: {
      id: true,
      nameAr: true,
      code: true,
      fundType: true,
      coaAccountId: true,
    },
  },
  category: {
    select: {
      id: true,
      nameAr: true,
      code: true,
      categoryType: true,
      coaAccountId: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      email: true,
    },
  },
  approvedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
  journalEntry: {
    select: {
      id: true,
      entryNumber: true,
      status: true,
    },
  },
};

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async create(payload: CreateExpenseDto, actorUserId: string) {
    const expenseDate = new Date(payload.expenseDate);

    try {
      const created = await this.prisma.expense.create({
        data: {
          fundId: payload.fundId,
          categoryId: payload.categoryId,
          amount: payload.amount,
          expenseDate,
          vendorName: payload.vendorName?.trim(),
          invoiceNumber: payload.invoiceNumber?.trim(),
          description: payload.description?.trim(),
          createdByUserId: actorUserId,
        },
        include: expenseInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EXPENSE_CREATE',
        resource: 'expenses',
        resourceId: String(created.id),
        details: {
          amount: created.amount,
          fundId: created.fundId,
          categoryId: created.categoryId,
        },
      });

      return created;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EXPENSE_CREATE_FAILED',
        resource: 'expenses',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListExpensesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ExpenseWhereInput = {
      fundId: query.fundId,
      categoryId: query.categoryId,
      isApproved: query.isApproved,
      expenseDate:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            { vendorName: { contains: query.search } },
            { invoiceNumber: { contains: query.search } },
            { description: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
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
    const expense = await this.prisma.expense.findFirst({
      where: { id },
      include: expenseInclude,
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(id: number, payload: UpdateExpenseDto, actorUserId: string) {
    const existing = await this.ensureExpenseExists(id);

    if (existing.isApproved || existing.journalEntryId) {
      throw new BadRequestException('Cannot update an approved expense');
    }

    try {
      const updated = await this.prisma.expense.update({
        where: { id },
        data: {
          fundId: payload.fundId,
          categoryId: payload.categoryId,
          amount: payload.amount,
          expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : undefined,
          vendorName: payload.vendorName?.trim(),
          invoiceNumber: payload.invoiceNumber?.trim(),
          description: payload.description?.trim(),
        },
        include: expenseInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EXPENSE_UPDATE',
        resource: 'expenses',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async approve(id: number, actorUserId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id },
      select: {
        id: true,
        fundId: true,
        categoryId: true,
        amount: true,
        expenseDate: true,
        isApproved: true,
        journalEntryId: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.isApproved || expense.journalEntryId) {
      throw new BadRequestException('Expense is already approved');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const fund = await this.ensureFundExists(tx, expense.fundId);
      const category = await this.ensureCategoryExists(
        tx,
        expense.categoryId,
        FinancialCategoryType.EXPENSE,
      );

      const fiscalYear = await this.findFiscalYearForDate(
        tx,
        expense.expenseDate,
      );
      const fiscalPeriod = await this.findFiscalPeriodForDate(
        tx,
        fiscalYear.id,
        expense.expenseDate,
      );
      const baseCurrency = await this.findBaseCurrency(tx);

      const debitAccount = category.coaAccountId
        ? await this.findPostingAccountById(tx, category.coaAccountId)
        : await this.findPostingAccountByCode(
            tx,
            DEFAULT_EXPENSE_ACCOUNT_CODE,
          );
      const creditAccount = fund.coaAccountId
        ? await this.findPostingAccountById(tx, fund.coaAccountId)
        : await this.findPostingAccountByCode(tx, DEFAULT_CASH_ACCOUNT_CODE);

      const entryNumber = await this.documentSequencesService.reserveNextNumber(
        DocumentType.JOURNAL_ENTRY,
        {
          tx,
          fiscalYearId: fiscalYear.id,
          date: expense.expenseDate,
        },
      );

      const now = new Date();
      const description = `Expense entry ${expense.id}`;
      const amount = Number(expense.amount);

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: expense.expenseDate,
          fiscalYearId: fiscalYear.id,
          fiscalPeriodId: fiscalPeriod?.id,
          description,
          referenceType: 'EXPENSE',
          referenceId: expense.id.toString(),
          status: JournalEntryStatus.POSTED,
          totalDebit: amount,
          totalCredit: amount,
          currencyId: baseCurrency?.id,
          exchangeRate: 1,
          createdById: actorUserId,
          updatedById: actorUserId,
          approvedById: actorUserId,
          approvedAt: now,
          postedById: actorUserId,
          postedAt: now,
          isActive: true,
          lines: {
            create: [
              {
                lineNumber: 1,
                accountId: debitAccount.id,
                description,
                debitAmount: amount,
                creditAmount: 0,
                isActive: true,
                createdById: actorUserId,
                updatedById: actorUserId,
              },
              {
                lineNumber: 2,
                accountId: creditAccount.id,
                description,
                debitAmount: 0,
                creditAmount: amount,
                isActive: true,
                createdById: actorUserId,
                updatedById: actorUserId,
              },
            ],
          },
        },
      });

      await tx.chartOfAccount.update({
        where: { id: debitAccount.id },
        data: {
          currentBalance: { increment: amount },
        },
      });

      await tx.chartOfAccount.update({
        where: { id: creditAccount.id },
        data: {
          currentBalance: { increment: -amount },
        },
      });

      await tx.financialFund.update({
        where: { id: fund.id },
        data: {
          currentBalance: { increment: -amount },
        },
      });

      return tx.expense.update({
        where: { id: expense.id },
        data: {
          isApproved: true,
          approvedByUserId: actorUserId,
          journalEntryId: journalEntry.id,
        },
        include: expenseInclude,
      });
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EXPENSE_APPROVE',
      resource: 'expenses',
      resourceId: String(id),
      details: { journalEntryId: created.journalEntryId },
    });

    return created;
  }

  async remove(id: number, actorUserId: string) {
    const existing = await this.ensureExpenseExists(id);

    if (existing.isApproved || existing.journalEntryId) {
      throw new BadRequestException('Cannot delete an approved expense');
    }

    await this.prisma.expense.delete({
      where: { id },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EXPENSE_DELETE',
      resource: 'expenses',
      resourceId: String(id),
    });

    return { success: true, id };
  }

  private async ensureExpenseExists(id: number) {
    const expense = await this.prisma.expense.findFirst({
      where: { id },
      select: {
        id: true,
        isApproved: true,
        journalEntryId: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  private async ensureFundExists(
    tx: Prisma.TransactionClient,
    fundId: number,
  ) {
    const fund = await tx.financialFund.findFirst({
      where: { id: fundId, isActive: true },
      select: {
        id: true,
        coaAccountId: true,
      },
    });

    if (!fund) {
      throw new NotFoundException('Financial fund not found');
    }

    return fund;
  }

  private async ensureCategoryExists(
    tx: Prisma.TransactionClient,
    categoryId: number,
    expectedType: FinancialCategoryType,
  ) {
    const category = await tx.financialCategory.findFirst({
      where: { id: categoryId, isActive: true },
      select: {
        id: true,
        categoryType: true,
        coaAccountId: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Financial category not found');
    }

    if (category.categoryType !== expectedType) {
      throw new BadRequestException('Category type does not match expense');
    }

    return category;
  }

  private async findFiscalYearForDate(
    tx: Prisma.TransactionClient,
    date: Date,
  ) {
    const fiscalYear = await tx.fiscalYear.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { startDate: 'desc' },
    });

    if (!fiscalYear) {
      throw new BadRequestException('No fiscal year configured for the expense date');
    }

    return fiscalYear;
  }

  private async findFiscalPeriodForDate(
    tx: Prisma.TransactionClient,
    fiscalYearId: number,
    date: Date,
  ) {
    return tx.fiscalPeriod.findFirst({
      where: {
        fiscalYearId,
        deletedAt: null,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  private async findBaseCurrency(tx: Prisma.TransactionClient) {
    return tx.currency.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        isBase: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  private async findPostingAccountByCode(
    tx: Prisma.TransactionClient,
    accountCode: string,
  ) {
    const account = await tx.chartOfAccount.findFirst({
      where: {
        accountCode,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        isHeader: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Posting account ${accountCode} was not found`);
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountCode} cannot be a header account`,
      );
    }

    return account;
  }

  private async findPostingAccountById(
    tx: Prisma.TransactionClient,
    accountId: number,
  ) {
    const account = await tx.chartOfAccount.findFirst({
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
      throw new ConflictException('Expense entry already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
