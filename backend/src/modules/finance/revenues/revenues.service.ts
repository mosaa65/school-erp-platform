import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountType,
  AuditStatus,
  DocumentType,
  FinancialCategoryType,
  JournalEntryStatus,
  Prisma,
  RevenueSourceType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import {
  findActiveFiscalYearForDate,
  findPostingFiscalPeriodForDate,
} from '../utils/posting-fiscal-period';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { ListRevenuesDto } from './dto/list-revenues.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';

const DEFAULT_CASH_ACCOUNT_NAME_EN = 'Cash and Banks';
const DEFAULT_CASH_ACCOUNT_NAME_AR = 'النقدية والبنوك';
const DEFAULT_REVENUE_ACCOUNT_NAME_EN = 'Tuition Revenue';
const DEFAULT_REVENUE_ACCOUNT_NAME_AR = 'إيراد الرسوم الدراسية';

const revenueInclude: Prisma.RevenueInclude = {
  fund: {
    select: {
      id: true,
      nameAr: true,
      fundType: true,
      coaAccountId: true,
    },
  },
  category: {
    select: {
      id: true,
      nameAr: true,
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
  journalEntry: {
    select: {
      id: true,
      entryNumber: true,
      status: true,
    },
  },
};

@Injectable()
export class RevenuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async create(payload: CreateRevenueDto, actorUserId: string) {
    const revenueDate = new Date(payload.revenueDate);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const fund = await this.ensureFundExists(tx, payload.fundId);
        const category = await this.ensureCategoryExists(
          tx,
          payload.categoryId,
          FinancialCategoryType.REVENUE,
        );

        const fiscalYear = await this.findFiscalYearForDate(tx, revenueDate);
        const fiscalPeriod = await this.findFiscalPeriodForDate(
          tx,
          fiscalYear.id,
          revenueDate,
        );
        const baseCurrency = await this.findBaseCurrency(tx);

        const debitAccount = fund.coaAccountId
          ? await this.findPostingAccountById(tx, fund.coaAccountId)
          : await this.findPostingAccountByName(
              tx,
              DEFAULT_CASH_ACCOUNT_NAME_EN,
              DEFAULT_CASH_ACCOUNT_NAME_AR,
              AccountType.ASSET,
            );
        const creditAccount = category.coaAccountId
          ? await this.findPostingAccountById(tx, category.coaAccountId)
          : await this.findPostingAccountByName(
              tx,
              DEFAULT_REVENUE_ACCOUNT_NAME_EN,
              DEFAULT_REVENUE_ACCOUNT_NAME_AR,
              AccountType.REVENUE,
            );

        const revenue = await tx.revenue.create({
          data: {
            fundId: fund.id,
            categoryId: category.id,
            amount: payload.amount,
            revenueDate,
            sourceType: payload.sourceType ?? RevenueSourceType.OTHER,
            sourceId: payload.sourceId?.trim(),
            receiptNumber: payload.receiptNumber?.trim(),
            description: payload.description?.trim(),
            createdByUserId: actorUserId,
          },
        });

        const entryNumber = await this.documentSequencesService.reserveNextNumber(
          DocumentType.JOURNAL_ENTRY,
          {
            tx,
            fiscalYearId: fiscalYear.id,
            date: revenueDate,
          },
        );

        const now = new Date();
        const description =
          payload.description?.trim() ?? `Revenue entry ${revenue.id}`;
        const amount = Number(payload.amount);

        const journalEntry = await tx.journalEntry.create({
          data: {
            entryNumber,
            entryDate: revenueDate,
            fiscalYearId: fiscalYear.id,
            fiscalPeriodId: fiscalPeriod?.id,
            description,
            referenceType: 'REVENUE',
            referenceId: revenue.id.toString(),
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
            currentBalance: { increment: amount },
          },
        });

        return tx.revenue.update({
          where: { id: revenue.id },
          data: { journalEntryId: journalEntry.id },
          include: revenueInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'REVENUE_CREATE',
        resource: 'revenues',
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
        action: 'REVENUE_CREATE_FAILED',
        resource: 'revenues',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListRevenuesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.RevenueWhereInput = {
      fundId: query.fundId,
      categoryId: query.categoryId,
      sourceType: query.sourceType,
      revenueDate:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            { receiptNumber: { contains: query.search } },
            { description: { contains: query.search } },
            { sourceId: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.revenue.count({ where }),
      this.prisma.revenue.findMany({
        where,
        include: revenueInclude,
        orderBy: [{ revenueDate: 'desc' }, { id: 'desc' }],
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
    const revenue = await this.prisma.revenue.findFirst({
      where: { id },
      include: revenueInclude,
    });

    if (!revenue) {
      throw new NotFoundException('Revenue not found');
    }

    return revenue;
  }

  async update(id: number, payload: UpdateRevenueDto, actorUserId: string) {
    const existing = await this.ensureRevenueExists(id);

    if (
      existing.journalEntryId &&
      (payload.amount !== undefined ||
        payload.revenueDate !== undefined ||
        payload.fundId !== undefined ||
        payload.categoryId !== undefined)
    ) {
      throw new BadRequestException('Cannot update posted revenue amounts');
    }

    const data: Prisma.RevenueUpdateInput = {
      sourceType: payload.sourceType,
      sourceId: payload.sourceId?.trim(),
      receiptNumber: payload.receiptNumber?.trim(),
      description: payload.description?.trim(),
    };

    if (!existing.journalEntryId) {
      if (payload.amount !== undefined) {
        data.amount = payload.amount;
      }
      if (payload.revenueDate) {
        data.revenueDate = new Date(payload.revenueDate);
      }
      if (payload.fundId) {
        data.fund = { connect: { id: payload.fundId } };
      }
      if (payload.categoryId) {
        data.category = { connect: { id: payload.categoryId } };
      }
    }

    try {
      const updated = await this.prisma.revenue.update({
        where: { id },
        data,
        include: revenueInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'REVENUE_UPDATE',
        resource: 'revenues',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    const existing = await this.ensureRevenueExists(id);

    if (existing.journalEntryId) {
      throw new BadRequestException('Cannot delete revenue linked to a journal entry');
    }

    await this.prisma.revenue.delete({
      where: { id },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'REVENUE_DELETE',
      resource: 'revenues',
      resourceId: String(id),
    });

    return { success: true, id };
  }

  private async ensureRevenueExists(id: number) {
    const revenue = await this.prisma.revenue.findFirst({
      where: { id },
      select: {
        id: true,
        journalEntryId: true,
      },
    });

    if (!revenue) {
      throw new NotFoundException('Revenue not found');
    }

    return revenue;
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
      throw new BadRequestException('Category type does not match revenue');
    }

    return category;
  }

  private async findFiscalYearForDate(
    tx: Prisma.TransactionClient,
    date: Date,
  ) {
    return findActiveFiscalYearForDate(tx, date, 'the revenue date');
  }

  private async findFiscalPeriodForDate(
    tx: Prisma.TransactionClient,
    fiscalYearId: number,
    date: Date,
  ) {
    return findPostingFiscalPeriodForDate(
      tx,
      fiscalYearId,
      date,
      'the revenue date',
    );
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

  private async findPostingAccountByName(
    tx: Prisma.TransactionClient,
    accountNameEn: string,
    accountNameAr: string,
    fallbackType?: AccountType,
  ) {
    const namedAccount = await tx.chartOfAccount.findFirst({
      where: {
        OR: [{ nameEn: accountNameEn }, { nameAr: accountNameAr }],
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        isHeader: true,
      },
    });

    const account =
      namedAccount ??
      (fallbackType
        ? await tx.chartOfAccount.findFirst({
            where: {
              accountType: fallbackType,
              deletedAt: null,
              isActive: true,
              isHeader: false,
            },
            select: {
              id: true,
              isHeader: true,
            },
            orderBy: { id: 'asc' },
          })
        : null);

    if (!account) {
      throw new NotFoundException(`Posting account ${accountNameEn} was not found`);
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountNameEn} cannot be a header account`,
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
      throw new ConflictException('Revenue entry already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
