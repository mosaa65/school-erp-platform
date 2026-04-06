import { Injectable } from '@nestjs/common';
import {
  AccountType,
  InvoiceStatus,
  JournalEntryStatus,
  PaymentTransactionStatus,
  Prisma,
  TaxType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildHybridBranchClause } from '../utils/hybrid-branch-scope';

// ─── Existing Interfaces ────────────────────────────────────────────

export interface TrialBalanceEntry {
  accountId: number;
  nameAr: string;
  nameEn: string | null;
  accountType: AccountType;
  hierarchyLevel: number;
  isHeader: boolean;
  currentBalance: number;
  debitBalance: number;
  creditBalance: number;
}

export interface GeneralLedgerEntry {
  journalEntryId: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  lineDescription: string | null;
  debitAmount: number;
  creditAmount: number;
  status: JournalEntryStatus;
  accountId: number;
  accountName: string;
}

// ─── New Report Interfaces ──────────────────────────────────────────

export interface IncomeStatementLineItem {
  accountId: number;
  nameAr: string;
  nameEn: string | null;
  balance: number;
}

export interface IncomeStatementResult {
  revenueAccounts: IncomeStatementLineItem[];
  expenseAccounts: IncomeStatementLineItem[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  period: { dateFrom?: string; dateTo?: string };
}

export interface BalanceSheetLineItem {
  accountId: number;
  nameAr: string;
  nameEn: string | null;
  balance: number;
}

export interface BalanceSheetResult {
  assets: { accounts: BalanceSheetLineItem[]; total: number };
  liabilities: { accounts: BalanceSheetLineItem[]; total: number };
  equity: { accounts: BalanceSheetLineItem[]; total: number };
  retainedEarnings: number;
  totalEquityWithEarnings: number;
  isBalanced: boolean;
  asOfDate: string;
}

export interface StudentStatementEntry {
  date: Date;
  type: 'INVOICE' | 'PAYMENT';
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface StudentAccountStatementResult {
  student: { id: string; fullName: string } | null;
  enrollmentId: string;
  entries: StudentStatementEntry[];
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
}

export interface VatReportLineItem {
  taxCodeId: number;
  taxNameAr: string;
  taxType: TaxType;
  rate: number;
  taxableBase: number;
  vatAmount: number;
  invoiceCount: number;
}

export interface VatReportResult {
  outputVat: VatReportLineItem[];
  inputVat: VatReportLineItem[];
  totalOutputVat: number;
  totalInputVat: number;
  netVatPayable: number;
  period: { dateFrom?: string; dateTo?: string };
}

export interface AgingBucket {
  current: number; // 0-30 days
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface AgingCustomerEntry {
  enrollmentId: string;
  studentName: string;
  buckets: AgingBucket;
  invoiceCount: number;
}

export interface AccountsReceivableAgingResult {
  customers: AgingCustomerEntry[];
  summary: AgingBucket;
  customerCount: number;
  asOfDate: string;
}

type ReportAccount = {
  id: number;
  nameAr: string;
  nameEn: string | null;
  accountType: AccountType;
  hierarchyLevel: number;
  isHeader: boolean;
};

@Injectable()
export class FinancialReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════════════════
  //  1. ميزان المراجعة — Trial Balance
  // ════════════════════════════════════════════════════════════════════

  async getTrialBalance(query: {
    fiscalYearId?: number;
    branchId?: number;
    includeHeaders?: boolean;
    asOfDate?: string;
  }): Promise<{
    data: TrialBalanceEntry[];
    totals: { totalDebit: number; totalCredit: number };
  }> {
    const accounts = await this.listAccountsForReports({
      branchId: query.branchId,
      includeHeaders: query.includeHeaders,
    });
    const balanceMap = await this.loadAccountBalanceMap({
      accountIds: accounts.map((account) => account.id),
      fiscalYearId: query.fiscalYearId,
      branchId: query.branchId,
      dateTo: query.asOfDate,
    });

    const trialBalance: TrialBalanceEntry[] = accounts.map((account) => {
      const balance = this.round(balanceMap.get(account.id) ?? 0);
      const debitBalance = balance >= 0 ? balance : 0;
      const creditBalance = balance < 0 ? Math.abs(balance) : 0;

      return {
        accountId: account.id,
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        accountType: account.accountType,
        hierarchyLevel: account.hierarchyLevel,
        isHeader: account.isHeader,
        currentBalance: balance,
        debitBalance,
        creditBalance,
      };
    });

    const totals = trialBalance.reduce(
      (acc, entry) => ({
        totalDebit: acc.totalDebit + entry.debitBalance,
        totalCredit: acc.totalCredit + entry.creditBalance,
      }),
      { totalDebit: 0, totalCredit: 0 },
    );

    return {
      data: trialBalance,
      totals: {
        totalDebit: Number(totals.totalDebit.toFixed(2)),
        totalCredit: Number(totals.totalCredit.toFixed(2)),
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  2. دفتر الأستاذ العام — General Ledger
  // ════════════════════════════════════════════════════════════════════

  async getGeneralLedger(query: {
    accountId?: number;
    fiscalYearId?: number;
    fiscalPeriodId?: number;
    branchId?: number;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: GeneralLedgerEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: any = {
      journalEntry: {
        ...this.buildPostedJournalEntryWhere({
          fiscalYearId: query.fiscalYearId,
          fiscalPeriodId: query.fiscalPeriodId,
          branchId: query.branchId,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        }),
      },
      deletedAt: null,
      isActive: true,
      ...(query.accountId ? { accountId: query.accountId } : {}),
    };

    const [total, lines] = await this.prisma.$transaction([
      this.prisma.journalEntryLine.count({ where }),
      this.prisma.journalEntryLine.findMany({
        where,
        include: {
          journalEntry: {
            select: {
              id: true,
              entryNumber: true,
              entryDate: true,
              description: true,
              status: true,
            },
          },
          account: {
            select: {
              id: true,
              nameAr: true,
            },
          },
        },
        orderBy: [
          { journalEntry: { entryDate: 'asc' } },
          { lineNumber: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data: GeneralLedgerEntry[] = lines.map((line) => ({
      journalEntryId: line.journalEntry.id,
      entryNumber: line.journalEntry.entryNumber,
      entryDate: line.journalEntry.entryDate,
      description: line.journalEntry.description,
      lineDescription: line.description,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
      status: line.journalEntry.status,
      accountId: line.account.id,
      accountName: line.account.nameAr,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  3. ملخص الحسابات حسب النوع — Account Summary by Type
  // ════════════════════════════════════════════════════════════════════

  async getAccountSummary(): Promise<{
    assets: number;
    liabilities: number;
    equity: number;
    revenue: number;
    expenses: number;
    netIncome: number;
  }> {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        isHeader: false,
      },
      select: {
        accountType: true,
        currentBalance: true,
      },
    });

    const summary = {
      assets: 0,
      liabilities: 0,
      equity: 0,
      revenue: 0,
      expenses: 0,
      netIncome: 0,
    };

    for (const account of accounts) {
      const balance = Number(account.currentBalance);
      switch (account.accountType) {
        case AccountType.ASSET:
          summary.assets += balance;
          break;
        case AccountType.LIABILITY:
          summary.liabilities += Math.abs(balance);
          break;
        case AccountType.EQUITY:
          summary.equity += Math.abs(balance);
          break;
        case AccountType.REVENUE:
          summary.revenue += Math.abs(balance);
          break;
        case AccountType.EXPENSE:
          summary.expenses += balance;
          break;
      }
    }

    summary.netIncome = summary.revenue - summary.expenses;

    return {
      assets: Number(summary.assets.toFixed(2)),
      liabilities: Number(summary.liabilities.toFixed(2)),
      equity: Number(summary.equity.toFixed(2)),
      revenue: Number(summary.revenue.toFixed(2)),
      expenses: Number(summary.expenses.toFixed(2)),
      netIncome: Number(summary.netIncome.toFixed(2)),
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  4. قائمة الدخل — Income Statement
  // ════════════════════════════════════════════════════════════════════

  async getIncomeStatement(query: {
    fiscalYearId?: number;
    branchId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<IncomeStatementResult> {
    return this.getIncomeStatementByDateRange(query);
  }

  /**
   * Income Statement computed from journal entry lines within a date range
   */
  private async getIncomeStatementByDateRange(query: {
    fiscalYearId?: number;
    branchId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<IncomeStatementResult> {
    const accounts = await this.listAccountsForReports({
      branchId: query.branchId,
      includeHeaders: false,
      accountTypes: [AccountType.REVENUE, AccountType.EXPENSE],
    });
    const balanceMap = await this.loadAccountBalanceMap({
      accountIds: accounts.map((account) => account.id),
      fiscalYearId: query.fiscalYearId,
      branchId: query.branchId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    const revenueAccounts: IncomeStatementLineItem[] = [];
    const expenseAccounts: IncomeStatementLineItem[] = [];

    for (const account of accounts) {
      const netBalance = balanceMap.get(account.id) ?? 0;
      const item: IncomeStatementLineItem = {
        accountId: account.id,
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        balance: Math.abs(this.round(netBalance)),
      };

      if (account.accountType === AccountType.REVENUE) {
        revenueAccounts.push(item);
      } else {
        expenseAccounts.push(item);
      }
    }

    const totalRevenue = this.round(
      revenueAccounts.reduce((s, a) => s + a.balance, 0),
    );
    const totalExpenses = this.round(
      expenseAccounts.reduce((s, a) => s + a.balance, 0),
    );

    return {
      revenueAccounts,
      expenseAccounts,
      totalRevenue,
      totalExpenses,
      netIncome: this.round(totalRevenue - totalExpenses),
      period: { dateFrom: query.dateFrom, dateTo: query.dateTo },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  5. الميزانية العمومية — Balance Sheet
  // ════════════════════════════════════════════════════════════════════

  async getBalanceSheet(query: {
    branchId?: number;
    asOfDate?: string;
  }): Promise<BalanceSheetResult> {
    const asOfDate = query.asOfDate ?? new Date().toISOString().slice(0, 10);

    const accounts = await this.listAccountsForReports({
      branchId: query.branchId,
      includeHeaders: false,
    });
    const balanceMap = await this.loadAccountBalanceMap({
      accountIds: accounts.map((account) => account.id),
      branchId: query.branchId,
      dateTo: asOfDate,
    });

    const assetAccounts: BalanceSheetLineItem[] = [];
    const liabilityAccounts: BalanceSheetLineItem[] = [];
    const equityAccounts: BalanceSheetLineItem[] = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of accounts) {
      const balance = this.round(balanceMap.get(account.id) ?? 0);
      const item: BalanceSheetLineItem = {
        accountId: account.id,
        nameAr: account.nameAr,
        nameEn: account.nameEn,
        balance: this.round(Math.abs(balance)),
      };

      switch (account.accountType) {
        case AccountType.ASSET:
          item.balance = this.round(balance);
          assetAccounts.push(item);
          break;
        case AccountType.LIABILITY:
          liabilityAccounts.push(item);
          break;
        case AccountType.EQUITY:
          equityAccounts.push(item);
          break;
        case AccountType.REVENUE:
          totalRevenue += Math.abs(balance);
          break;
        case AccountType.EXPENSE:
          totalExpenses += Math.abs(balance);
          break;
      }
    }

    const totalAssets = this.round(
      assetAccounts.reduce((s, a) => s + a.balance, 0),
    );
    const totalLiabilities = this.round(
      liabilityAccounts.reduce((s, a) => s + a.balance, 0),
    );
    const totalEquity = this.round(
      equityAccounts.reduce((s, a) => s + a.balance, 0),
    );
    const retainedEarnings = this.round(totalRevenue - totalExpenses);
    const totalEquityWithEarnings = this.round(totalEquity + retainedEarnings);

    // Accounting equation: Assets = Liabilities + Equity (+ Retained Earnings)
    const isBalanced =
      Math.abs(totalAssets - (totalLiabilities + totalEquityWithEarnings)) <
      0.01;

    return {
      assets: { accounts: assetAccounts, total: totalAssets },
      liabilities: { accounts: liabilityAccounts, total: totalLiabilities },
      equity: { accounts: equityAccounts, total: totalEquity },
      retainedEarnings,
      totalEquityWithEarnings,
      isBalanced,
      asOfDate,
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  6. كشف حساب الطالب — Student Account Statement
  // ════════════════════════════════════════════════════════════════════

  async getStudentAccountStatement(query: {
    enrollmentId: string;
    academicYearId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<StudentAccountStatementResult> {
    // Fetch invoices for this enrollment
    const invoices = await this.prisma.studentInvoice.findMany({
      where: {
        enrollmentId: query.enrollmentId,
        ...(query.academicYearId
          ? { academicYearId: query.academicYearId }
          : {}),
        status: { notIn: [InvoiceStatus.CANCELLED] },
        ...(query.dateFrom || query.dateTo
          ? {
              invoiceDate: {
                ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        totalAmount: true,
        status: true,
        notes: true,
      },
      orderBy: { invoiceDate: 'asc' },
    });

    const invoiceIds = invoices.map((inv) => inv.id);

    // Fetch payments for these invoices
    const payments = await this.prisma.paymentTransaction.findMany({
      where: {
        invoiceId: { in: invoiceIds },
        status: PaymentTransactionStatus.COMPLETED,
        ...(query.dateFrom || query.dateTo
          ? {
              paidAt: {
                ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        transactionNumber: true,
        amount: true,
        paidAt: true,
        paymentMethod: true,
        receiptNumber: true,
        invoiceId: true,
      },
      orderBy: { paidAt: 'asc' },
    });

    // Fetch student info
    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { id: query.enrollmentId },
      select: {
        student: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Build statement entries sorted by date
    const entries: StudentStatementEntry[] = [];

    for (const inv of invoices) {
      entries.push({
        date: inv.invoiceDate,
        type: 'INVOICE',
        referenceNumber: inv.invoiceNumber,
        description: `فاتورة ${inv.invoiceNumber}${inv.notes ? ` — ${inv.notes}` : ''}`,
        debit: this.round(Number(inv.totalAmount)),
        credit: 0,
        runningBalance: 0, // calculated below
      });
    }

    for (const pmt of payments) {
      entries.push({
        date: pmt.paidAt ?? new Date(),
        type: 'PAYMENT',
        referenceNumber: pmt.receiptNumber ?? pmt.transactionNumber,
        description: `دفعة ${pmt.transactionNumber} — ${pmt.paymentMethod}`,
        debit: 0,
        credit: this.round(Number(pmt.amount)),
        runningBalance: 0,
      });
    }

    // Sort by date, invoices first if same date
    entries.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.type === 'INVOICE' ? -1 : 1;
    });

    // Calculate running balance
    let runningBalance = 0;
    for (const entry of entries) {
      runningBalance += entry.debit - entry.credit;
      entry.runningBalance = this.round(runningBalance);
    }

    const totalInvoiced = this.round(entries.reduce((s, e) => s + e.debit, 0));
    const totalPaid = this.round(entries.reduce((s, e) => s + e.credit, 0));

    return {
      student: enrollment?.student ?? null,
      enrollmentId: query.enrollmentId,
      entries,
      totalInvoiced,
      totalPaid,
      outstandingBalance: this.round(totalInvoiced - totalPaid),
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  7. التقرير الضريبي — VAT Report
  // ════════════════════════════════════════════════════════════════════

  async getVatReport(query: {
    dateFrom?: string;
    dateTo?: string;
    branchId?: number;
  }): Promise<VatReportResult> {
    // Fetch all invoice line items with tax info
    const lineItems = await this.prisma.invoiceLineItem.findMany({
      where: {
        taxCodeId: { not: null },
        invoice: {
          status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
          ...(buildHybridBranchClause(query.branchId) ?? {}),
          ...(query.dateFrom || query.dateTo
            ? {
                invoiceDate: {
                  ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                  ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
                },
              }
            : {}),
        },
      },
      select: {
        taxCodeId: true,
        vatRate: true,
        vatAmount: true,
        unitPrice: true,
        quantity: true,
        discountAmount: true,
        invoiceId: true,
        taxCode: {
          select: {
            id: true,
            taxNameAr: true,
            taxType: true,
            rate: true,
          },
        },
      },
    });

    // Group by tax code id
    const taxMap = new Map<
      number,
      {
        taxCodeId: number;
        taxNameAr: string;
        taxType: TaxType;
        rate: number;
        taxableBase: number;
        vatAmount: number;
        invoiceIds: Set<bigint>;
      }
    >();

    for (const item of lineItems) {
      if (!item.taxCode) continue;

      const key = item.taxCode.id;
      const existing = taxMap.get(key);
      const lineBase =
        Number(item.quantity) * Number(item.unitPrice) -
        Number(item.discountAmount);

      if (existing) {
        existing.taxableBase += lineBase;
        existing.vatAmount += Number(item.vatAmount);
        existing.invoiceIds.add(item.invoiceId);
      } else {
        taxMap.set(key, {
          taxCodeId: item.taxCode.id,
          taxNameAr: item.taxCode.taxNameAr,
          taxType: item.taxCode.taxType,
          rate: Number(item.taxCode.rate),
          taxableBase: lineBase,
          vatAmount: Number(item.vatAmount),
          invoiceIds: new Set([item.invoiceId]),
        });
      }
    }

    const outputVat: VatReportLineItem[] = [];
    const inputVat: VatReportLineItem[] = [];

    for (const entry of taxMap.values()) {
      const lineItem: VatReportLineItem = {
        taxCodeId: entry.taxCodeId,
        taxNameAr: entry.taxNameAr,
        taxType: entry.taxType,
        rate: entry.rate,
        taxableBase: this.round(entry.taxableBase),
        vatAmount: this.round(entry.vatAmount),
        invoiceCount: entry.invoiceIds.size,
      };

      if (entry.taxType === TaxType.OUTPUT) {
        outputVat.push(lineItem);
      } else if (entry.taxType === TaxType.INPUT) {
        inputVat.push(lineItem);
      } else {
        // EXEMPT and ZERO_RATED go to output for reporting visibility
        outputVat.push(lineItem);
      }
    }

    const totalOutputVat = this.round(
      outputVat.reduce((s, v) => s + v.vatAmount, 0),
    );
    const totalInputVat = this.round(
      inputVat.reduce((s, v) => s + v.vatAmount, 0),
    );

    return {
      outputVat,
      inputVat,
      totalOutputVat,
      totalInputVat,
      netVatPayable: this.round(totalOutputVat - totalInputVat),
      period: { dateFrom: query.dateFrom, dateTo: query.dateTo },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  8. أعمار الديون — Accounts Receivable Aging
  // ════════════════════════════════════════════════════════════════════

  async getAccountsReceivableAging(query: {
    branchId?: number;
    academicYearId?: string;
    asOfDate?: string;
  }): Promise<AccountsReceivableAgingResult> {
    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();
    const asOfDateStr = asOfDate.toISOString().slice(0, 10);

    // Fetch all outstanding invoices (ISSUED or PARTIAL)
    const invoices = await this.prisma.studentInvoice.findMany({
      where: {
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] },
        ...(buildHybridBranchClause(query.branchId) ?? {}),
        ...(query.academicYearId
          ? { academicYearId: query.academicYearId }
          : {}),
      },
      select: {
        id: true,
        enrollmentId: true,
        dueDate: true,
        balanceDue: true,
        totalAmount: true,
        paidAmount: true,
        enrollment: {
          select: {
            id: true,
            student: {
              select: { fullName: true },
            },
          },
        },
      },
    });

    // Group by enrollment and bucket by age
    const customerMap = new Map<
      string,
      {
        enrollmentId: string;
        studentName: string;
        buckets: AgingBucket;
        invoiceCount: number;
      }
    >();

    for (const inv of invoices) {
      const balance = Number(
        inv.balanceDue ?? Number(inv.totalAmount) - Number(inv.paidAmount),
      );
      if (balance <= 0) continue;

      const daysOverdue = Math.max(
        0,
        Math.floor(
          (asOfDate.getTime() - new Date(inv.dueDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      const existing = customerMap.get(inv.enrollmentId);
      const buckets: AgingBucket = existing?.buckets ?? {
        current: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        total: 0,
      };

      if (daysOverdue <= 30) {
        buckets.current += balance;
      } else if (daysOverdue <= 60) {
        buckets.days31to60 += balance;
      } else if (daysOverdue <= 90) {
        buckets.days61to90 += balance;
      } else {
        buckets.over90 += balance;
      }
      buckets.total += balance;

      if (existing) {
        existing.invoiceCount += 1;
      } else {
        customerMap.set(inv.enrollmentId, {
          enrollmentId: inv.enrollmentId,
          studentName: inv.enrollment?.student?.fullName ?? 'غير معروف',
          buckets,
          invoiceCount: 1,
        });
      }
    }

    // Build result
    const customers: AgingCustomerEntry[] = [];
    const summaryBuckets: AgingBucket = {
      current: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
      total: 0,
    };

    for (const entry of customerMap.values()) {
      // Round all bucket values
      entry.buckets.current = this.round(entry.buckets.current);
      entry.buckets.days31to60 = this.round(entry.buckets.days31to60);
      entry.buckets.days61to90 = this.round(entry.buckets.days61to90);
      entry.buckets.over90 = this.round(entry.buckets.over90);
      entry.buckets.total = this.round(entry.buckets.total);

      customers.push(entry);

      summaryBuckets.current += entry.buckets.current;
      summaryBuckets.days31to60 += entry.buckets.days31to60;
      summaryBuckets.days61to90 += entry.buckets.days61to90;
      summaryBuckets.over90 += entry.buckets.over90;
      summaryBuckets.total += entry.buckets.total;
    }

    // Round summary
    summaryBuckets.current = this.round(summaryBuckets.current);
    summaryBuckets.days31to60 = this.round(summaryBuckets.days31to60);
    summaryBuckets.days61to90 = this.round(summaryBuckets.days61to90);
    summaryBuckets.over90 = this.round(summaryBuckets.over90);
    summaryBuckets.total = this.round(summaryBuckets.total);

    // Sort customers by total outstanding descending
    customers.sort((a, b) => b.buckets.total - a.buckets.total);

    return {
      customers,
      summary: summaryBuckets,
      customerCount: customers.length,
      asOfDate: asOfDateStr,
    };
  }

  // ─── Utility ──────────────────────────────────────────────────────

  private round(value: number): number {
    return Number(value.toFixed(2));
  }

  private async listAccountsForReports(input: {
    branchId?: number;
    includeHeaders?: boolean;
    accountTypes?: AccountType[];
  }): Promise<ReportAccount[]> {
    const where: Prisma.ChartOfAccountWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(input.includeHeaders === false ? { isHeader: false } : {}),
      ...(input.accountTypes?.length
        ? { accountType: { in: input.accountTypes } }
        : {}),
      ...(buildHybridBranchClause(input.branchId) ?? {}),
    };

    return this.prisma.chartOfAccount.findMany({
      where,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        accountType: true,
        hierarchyLevel: true,
        isHeader: true,
      },
      orderBy: { nameAr: 'asc' },
    });
  }

  private buildPostedJournalEntryWhere(input: {
    fiscalYearId?: number;
    fiscalPeriodId?: number;
    branchId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Prisma.JournalEntryWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      status: JournalEntryStatus.POSTED,
      ...(input.fiscalYearId ? { fiscalYearId: input.fiscalYearId } : {}),
      ...(input.fiscalPeriodId ? { fiscalPeriodId: input.fiscalPeriodId } : {}),
      ...(buildHybridBranchClause(input.branchId) ?? {}),
      ...(input.dateFrom || input.dateTo
        ? {
            entryDate: {
              ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
              ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
            },
          }
        : {}),
    };
  }

  private async loadAccountBalanceMap(input: {
    accountIds: number[];
    fiscalYearId?: number;
    fiscalPeriodId?: number;
    branchId?: number;
    dateFrom?: string;
    dateTo?: string;
  }) {
    if (input.accountIds.length === 0) {
      return new Map<number, number>();
    }

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId: {
          in: input.accountIds,
        },
        deletedAt: null,
        isActive: true,
        journalEntry: this.buildPostedJournalEntryWhere(input),
      },
      select: {
        accountId: true,
        debitAmount: true,
        creditAmount: true,
      },
    });

    const balanceMap = new Map<number, number>();

    for (const line of lines) {
      const previous = balanceMap.get(line.accountId) ?? 0;
      balanceMap.set(
        line.accountId,
        previous + Number(line.debitAmount) - Number(line.creditAmount),
      );
    }

    return balanceMap;
  }
}
