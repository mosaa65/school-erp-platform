import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  DocumentType,
  JournalEntryStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import {
  findActiveFiscalYearForDate,
  findPostingFiscalPeriodForDate,
} from '../utils/posting-fiscal-period';
import { DepreciationJournalDto } from './dto/depreciation-journal.dto';
import {
  InventoryAdjustmentJournalDto,
  InventoryAdjustmentType,
} from './dto/inventory-adjustment-journal.dto';
import { InventoryAdjustmentJournalResponseDto } from './dto/inventory-adjustment-journal-response.dto';
import { ProcurementPaymentJournalDto } from './dto/procurement-payment-journal.dto';
import {
  ProcurementVendorBalanceResponseDto,
  type ProcurementVendorBalanceExpenseItemDto,
} from './dto/procurement-vendor-balance.dto';
import { PurchaseJournalDto } from './dto/purchase-journal.dto';

const DEFAULT_PROCUREMENT_EXPENSE_ACCOUNT_CODE = '5004';
const DEFAULT_ACCOUNTS_PAYABLE_ACCOUNT_CODE = '2101';
const DEFAULT_VAT_ACCOUNT_CODE = '2104';
const DEFAULT_CASH_ACCOUNT_CODE = '1101';
const DEFAULT_GATEWAY_ACCOUNT_CODE = '1102';
const DEFAULT_DEPRECIATION_EXPENSE_ACCOUNT_CODE = '5005';
const DEFAULT_ACCUMULATED_DEPRECIATION_ACCOUNT_CODE = '1203';

type PostingLineInput = {
  accountId: number;
  debitAmount: number;
  creditAmount: number;
  description: string;
  branchId?: number | null;
};

@Injectable()
export class ProcurementIntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async createPurchaseJournal(payload: PurchaseJournalDto, actorUserId: string) {
    const vatAmount = payload.vatAmount ?? 0;
    const baseAmount = this.roundMoney(payload.totalAmount - vatAmount);

    if (baseAmount < 0) {
      throw new BadRequestException('VAT amount cannot exceed total amount');
    }

    const expenseAccountId = await this.findPostingAccountByCode(
      DEFAULT_PROCUREMENT_EXPENSE_ACCOUNT_CODE,
    );
    const payableAccountId = await this.findPostingAccountByCode(
      DEFAULT_ACCOUNTS_PAYABLE_ACCOUNT_CODE,
    );
    const vatAccountId =
      vatAmount > 0
        ? await this.findPostingAccountByCode(DEFAULT_VAT_ACCOUNT_CODE)
        : null;

    const lines: PostingLineInput[] = [
      {
        accountId: expenseAccountId,
        debitAmount: baseAmount,
        creditAmount: 0,
        description: 'مصروف مشتريات',
        branchId: payload.branchId,
      },
    ];

    if (vatAmount > 0 && vatAccountId) {
      lines.push({
        accountId: vatAccountId,
        debitAmount: this.roundMoney(vatAmount),
        creditAmount: 0,
        description: 'ضريبة مدخلات',
        branchId: payload.branchId,
      });
    }

    lines.push({
      accountId: payableAccountId,
      debitAmount: 0,
      creditAmount: this.roundMoney(payload.totalAmount),
      description: 'ذمم دائنة — موردون',
      branchId: payload.branchId,
    });

    const entry = await this.createPostedJournalEntry({
      entryDate: new Date(),
      description: payload.description?.trim() ?? 'قيد مشتريات',
      referenceType: 'PROCUREMENT_PO',
      branchId: payload.branchId,
      actorUserId,
      lines,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'PROCUREMENT_PURCHASE_JOURNAL',
      resource: 'finance-procurement',
      resourceId: entry.id,
      details: {
        entryNumber: entry.entryNumber,
        totalAmount: payload.totalAmount,
        vatAmount,
      },
    });

    return {
      journalEntryId: entry.id,
      entryNumber: entry.entryNumber,
      totalAmount: this.roundMoney(payload.totalAmount),
      vatAmount: this.roundMoney(vatAmount),
    };
  }

  async createInventoryAdjustmentJournal(
    payload: InventoryAdjustmentJournalDto,
    actorUserId: string,
  ): Promise<InventoryAdjustmentJournalResponseDto> {
    const debitAccountCode =
      payload.adjustmentType === InventoryAdjustmentType.INCREASE
        ? DEFAULT_PROCUREMENT_EXPENSE_ACCOUNT_CODE
        : DEFAULT_ACCOUNTS_PAYABLE_ACCOUNT_CODE;
    const creditAccountCode =
      payload.adjustmentType === InventoryAdjustmentType.INCREASE
        ? DEFAULT_ACCOUNTS_PAYABLE_ACCOUNT_CODE
        : DEFAULT_PROCUREMENT_EXPENSE_ACCOUNT_CODE;

    const debitAccountId = await this.findPostingAccountByCode(debitAccountCode);
    const creditAccountId = await this.findPostingAccountByCode(creditAccountCode);
    const amount = this.roundMoney(payload.amount);
    const adjustmentLabel =
      payload.adjustmentType === InventoryAdjustmentType.INCREASE
        ? 'زيادة مخزون'
        : 'نقص مخزون';

    const entry = await this.createPostedJournalEntry({
      entryDate: new Date(),
      description: payload.description?.trim() ?? 'قيد تسوية مخزون',
      referenceType: 'INVENTORY_ADJUSTMENT',
      branchId: payload.branchId,
      actorUserId,
      lines: [
        {
          accountId: debitAccountId,
          debitAmount: amount,
          creditAmount: 0,
          description: adjustmentLabel,
          branchId: payload.branchId,
        },
        {
          accountId: creditAccountId,
          debitAmount: 0,
          creditAmount: amount,
          description: adjustmentLabel,
          branchId: payload.branchId,
        },
      ],
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'PROCUREMENT_INVENTORY_ADJUSTMENT_JOURNAL',
      resource: 'finance-procurement',
      resourceId: entry.id,
      status: AuditStatus.SUCCESS,
      details: {
        entryNumber: entry.entryNumber,
        amount,
        adjustmentType: payload.adjustmentType,
      },
    });

    return {
      journalEntryId: entry.id,
      entryNumber: entry.entryNumber,
      amount,
      adjustmentType: payload.adjustmentType,
      debitAccountCode,
      creditAccountCode,
    };
  }

  async createPaymentJournal(
    payload: ProcurementPaymentJournalDto,
    actorUserId: string,
  ) {
    const payableAccountId = await this.findPostingAccountByCode(
      DEFAULT_ACCOUNTS_PAYABLE_ACCOUNT_CODE,
    );
    const creditAccountCode = this.resolveCreditAccountCode(payload.paymentMethod);
    const creditAccountId = await this.findPostingAccountByCode(creditAccountCode);

    const lines: PostingLineInput[] = [
      {
        accountId: payableAccountId,
        debitAmount: this.roundMoney(payload.amount),
        creditAmount: 0,
        description: 'سداد مورد',
        branchId: payload.branchId,
      },
      {
        accountId: creditAccountId,
        debitAmount: 0,
        creditAmount: this.roundMoney(payload.amount),
        description: 'دفع نقدي/بنكي',
        branchId: payload.branchId,
      },
    ];

    const entry = await this.createPostedJournalEntry({
      entryDate: new Date(),
      description: payload.description?.trim() ?? 'قيد سداد مورد',
      referenceType: 'PROCUREMENT_PAYMENT',
      branchId: payload.branchId,
      actorUserId,
      lines,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'PROCUREMENT_PAYMENT_JOURNAL',
      resource: 'finance-procurement',
      resourceId: entry.id,
      status: AuditStatus.SUCCESS,
      details: {
        entryNumber: entry.entryNumber,
        amount: payload.amount,
      },
    });

    return {
      journalEntryId: entry.id,
      entryNumber: entry.entryNumber,
      amount: this.roundMoney(payload.amount),
    };
  }

  async getVendorBalance(
    vendorKey: string,
  ): Promise<ProcurementVendorBalanceResponseDto> {
    const normalizedVendorKey = vendorKey.trim();

    if (!normalizedVendorKey) {
      throw new BadRequestException('Vendor identifier is required');
    }

    const expenses = await this.prisma.expense.findMany({
      where: {
        vendorName: normalizedVendorKey,
      },
      orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        amount: true,
        expenseDate: true,
        isApproved: true,
        journalEntryId: true,
        invoiceNumber: true,
        description: true,
        vendorName: true,
      },
    });

    if (expenses.length === 0) {
      throw new NotFoundException(`Vendor ${normalizedVendorKey} was not found`);
    }

    const mappedExpenses = expenses.map((expense) =>
      this.mapVendorBalanceExpenseItem(expense),
    );
    const approvedExpenseTotal = this.roundMoney(
      expenses
        .filter((expense) => expense.isApproved)
        .reduce((sum, expense) => sum + Number(expense.amount), 0),
    );
    const pendingExpenseTotal = this.roundMoney(
      expenses
        .filter((expense) => !expense.isApproved)
        .reduce((sum, expense) => sum + Number(expense.amount), 0),
    );
    const balanceDue = this.roundMoney(
      approvedExpenseTotal + pendingExpenseTotal,
    );

    return {
      vendorKey: normalizedVendorKey,
      vendorName: expenses[0]?.vendorName?.trim() ?? normalizedVendorKey,
      summary: {
        expenseCount: expenses.length,
        approvedExpenseCount: expenses.filter((expense) => expense.isApproved).length,
        pendingExpenseCount: expenses.filter((expense) => !expense.isApproved).length,
        approvedExpenseTotal,
        pendingExpenseTotal,
        balanceDue,
      },
      expenses: mappedExpenses,
    };
  }

  async createDepreciationJournal(
    payload: DepreciationJournalDto,
    actorUserId: string,
  ) {
    const expenseAccountId = await this.findPostingAccountByCode(
      DEFAULT_DEPRECIATION_EXPENSE_ACCOUNT_CODE,
    );
    const accumulatedAccountId = await this.findPostingAccountByCode(
      DEFAULT_ACCUMULATED_DEPRECIATION_ACCOUNT_CODE,
    );

    const lines: PostingLineInput[] = [
      {
        accountId: expenseAccountId,
        debitAmount: this.roundMoney(payload.amount),
        creditAmount: 0,
        description: 'مصروف إهلاك',
        branchId: payload.branchId,
      },
      {
        accountId: accumulatedAccountId,
        debitAmount: 0,
        creditAmount: this.roundMoney(payload.amount),
        description: 'مجمع الإهلاك',
        branchId: payload.branchId,
      },
    ];

    const entry = await this.createPostedJournalEntry({
      entryDate: new Date(),
      description: payload.description?.trim() ?? 'قيد إهلاك',
      referenceType: 'ASSET_DEPRECIATION',
      branchId: payload.branchId,
      actorUserId,
      lines,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ASSET_DEPRECIATION_JOURNAL',
      resource: 'finance-procurement',
      resourceId: entry.id,
      details: {
        entryNumber: entry.entryNumber,
        amount: payload.amount,
      },
    });

    return {
      journalEntryId: entry.id,
      entryNumber: entry.entryNumber,
      amount: this.roundMoney(payload.amount),
    };
  }

  private resolveCreditAccountCode(paymentMethod?: PaymentMethod) {
    if (!paymentMethod) return DEFAULT_CASH_ACCOUNT_CODE;

    if (paymentMethod === PaymentMethod.CARD || paymentMethod === PaymentMethod.MOBILE_WALLET) {
      return DEFAULT_GATEWAY_ACCOUNT_CODE;
    }

    return DEFAULT_CASH_ACCOUNT_CODE;
  }

  private async createPostedJournalEntry(input: {
    entryDate: Date;
    description: string;
    referenceType: string;
    referenceId?: string;
    branchId?: number;
    actorUserId: string;
    lines: PostingLineInput[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const fiscalYear = await this.findFiscalYearForDate(tx, input.entryDate);
      const fiscalPeriod = await this.findFiscalPeriodForDate(
        tx,
        fiscalYear.id,
        input.entryDate,
      );
      const baseCurrency = await this.findBaseCurrency(tx);

      const { totalDebit, totalCredit } = this.calculateTotals(input.lines);
      this.assertBalanced(totalDebit, totalCredit);

      const entryNumber = await this.documentSequencesService.reserveNextNumber(
        DocumentType.JOURNAL_ENTRY,
        {
          tx,
          fiscalYearId: fiscalYear.id,
          branchId: input.branchId ?? null,
          date: input.entryDate,
        },
      );

      const entry = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: input.entryDate,
          fiscalYearId: fiscalYear.id,
          fiscalPeriodId: fiscalPeriod?.id,
          branchId: input.branchId,
          description: input.description,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          status: JournalEntryStatus.POSTED,
          totalDebit,
          totalCredit,
          currencyId: baseCurrency?.id,
          exchangeRate: 1,
          createdById: input.actorUserId,
          updatedById: input.actorUserId,
          approvedById: input.actorUserId,
          approvedAt: input.entryDate,
          postedById: input.actorUserId,
          postedAt: input.entryDate,
          isActive: true,
          lines: {
            create: input.lines.map((line, index) => ({
              lineNumber: index + 1,
              accountId: line.accountId,
              description: line.description,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              branchId: line.branchId ?? undefined,
              isActive: true,
              createdById: input.actorUserId,
              updatedById: input.actorUserId,
            })),
          },
        },
        select: { id: true, entryNumber: true },
      });

      for (const line of input.lines) {
        const balanceChange = Number(line.creditAmount) - Number(line.debitAmount);
        await tx.chartOfAccount.update({
          where: { id: line.accountId },
          data: {
            currentBalance: {
              increment: balanceChange,
            },
          },
        });
      }

      return entry;
    });
  }

  private async findFiscalYearForDate(tx: Prisma.TransactionClient, date: Date) {
    return findActiveFiscalYearForDate(tx, date, 'the entry date');
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
      'the entry date',
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

  private async findPostingAccountByCode(accountCode: string) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        accountCode,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, isHeader: true },
    });

    if (!account) {
      throw new NotFoundException(`Posting account ${accountCode} was not found`);
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountCode} cannot be a header account`,
      );
    }

    return account.id;
  }

  private mapVendorBalanceExpenseItem(
    expense: {
      id: number;
      amount: Prisma.Decimal | number | string;
      expenseDate: Date;
      isApproved: boolean;
      journalEntryId: string | null;
      invoiceNumber: string | null;
      description: string | null;
    },
  ): ProcurementVendorBalanceExpenseItemDto {
    return {
      id: expense.id,
      amount: this.roundMoney(Number(expense.amount)),
      expenseDate: expense.expenseDate.toISOString().slice(0, 10),
      isApproved: expense.isApproved,
      journalEntryId: expense.journalEntryId,
      invoiceNumber: expense.invoiceNumber,
      description: expense.description,
    };
  }

  private calculateTotals(lines: PostingLineInput[]) {
    const totals = lines.reduce(
      (acc, line) => ({
        totalDebit: acc.totalDebit + Number(line.debitAmount),
        totalCredit: acc.totalCredit + Number(line.creditAmount),
      }),
      { totalDebit: 0, totalCredit: 0 },
    );

    return {
      totalDebit: this.roundMoney(totals.totalDebit),
      totalCredit: this.roundMoney(totals.totalCredit),
    };
  }

  private assertBalanced(totalDebit: number, totalCredit: number) {
    if (totalDebit <= 0 || totalCredit <= 0) {
      throw new BadRequestException('Total debit and credit must be greater than zero');
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Journal entry is not balanced');
    }
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
