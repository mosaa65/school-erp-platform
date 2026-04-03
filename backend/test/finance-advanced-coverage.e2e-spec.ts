import {
  AccountType,
  DocumentType,
  FeeType,
  FinancialCategoryType,
  FinancialFundType,
  InvoiceStatus,
  NormalBalance,
  TaxType,
} from '@prisma/client';
import request from 'supertest';
import {
  bootstrapFinanceE2eContext,
  cleanupFinanceBillingFixture,
  cleanupFinanceJournalFixture,
  createFinanceAuthHeader,
  createFinanceBillingFixture,
  createFinanceJournalFixture,
  dateOnly,
  decimalToNumber,
  type FinanceBillingFixture,
  type FinanceE2eContext,
  type FinanceJournalFixture,
  teardownFinanceE2eContext,
} from './finance-test-helpers';

jest.setTimeout(45000);

type JournalEntryBody = {
  id: string;
  entryNumber: string;
  status: string;
};

type GeneralLedgerBody = {
  data: Array<{
    entryNumber: string;
    accountId: number;
    debitAmount: number;
    creditAmount: number;
  }>;
  pagination: {
    total: number;
  };
};

type TrialBalanceBody = {
  data: Array<{
    accountId: number;
    currentBalance: number;
  }>;
  totals: {
    totalDebit: number;
    totalCredit: number;
  };
};

type InvoiceBody = {
  id: string;
  status: string;
  installments: Array<{
    id: string;
    installmentNumber: number;
    status: string;
    lateFee?: string | number;
  }>;
};

type InstallmentBody = {
  id: string;
  status: string;
  amount: string | number;
  paidAmount: string | number;
  lateFee: string | number;
  notes?: string | null;
};

type InstallmentListBody = {
  data: InstallmentBody[];
  pagination: {
    total: number;
  };
};

type StudentStatementBody = {
  invoices: Array<{
    id: string;
    status: string;
    installments: Array<{
      number: number;
      status: string;
      amount: number;
      paidAmount: number;
    }>;
  }>;
};

type VatReportBody = {
  outputVat: Array<{
    taxCodeId: number;
    taxCode: string;
    taxNameAr: string;
    taxType: TaxType;
    rate: number;
    taxableBase: number;
    vatAmount: number;
    invoiceCount: number;
  }>;
  inputVat: Array<{
    taxCodeId: number;
    taxCode: string;
    taxNameAr: string;
    taxType: TaxType;
    rate: number;
    taxableBase: number;
    vatAmount: number;
    invoiceCount: number;
  }>;
  totalOutputVat: number;
  totalInputVat: number;
  netVatPayable: number;
  period: {
    dateFrom?: string;
    dateTo?: string;
  };
};

type RevenueBody = {
  id: number;
  amount: string | number;
  journalEntry: {
    id: string;
    status: string;
  };
};

type ExpenseBody = {
  id: number;
  amount: string | number;
  isApproved: boolean;
  journalEntry: {
    id: string;
    status: string;
  } | null;
};

type PaginatedListBody = {
  pagination: {
    total: number;
  };
};

describe('Finance Advanced Coverage (e2e)', () => {
  let context: FinanceE2eContext | null = null;
  const journalFixtures: FinanceJournalFixture[] = [];
  let billingFixture: FinanceBillingFixture | null = null;
  const createdTaxCodeIds: number[] = [];
  const createdHybridAccountIds: number[] = [];
  const createdLegacyRecordIds = {
    fundIds: [] as number[],
    categoryIds: [] as number[],
    accountIds: [] as number[],
    revenueIds: [] as number[],
    expenseIds: [] as number[],
  };

  const httpServer = () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    return context.httpServer();
  };

  const authHeader = () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    return createFinanceAuthHeader(context);
  };

  beforeAll(async () => {
    context = await bootstrapFinanceE2eContext();
  });

  afterEach(async () => {
    if (context && billingFixture) {
      await cleanupFinanceBillingFixture(context, billingFixture);
      billingFixture = null;
    }

    if (context && createdTaxCodeIds.length > 0) {
      await context.prisma.taxCode.deleteMany({
        where: {
          id: {
            in: createdTaxCodeIds,
          },
        },
      });
      createdTaxCodeIds.length = 0;
    }

    if (context) {
      if (createdLegacyRecordIds.revenueIds.length > 0) {
        await context.prisma.revenue.deleteMany({
          where: {
            id: {
              in: createdLegacyRecordIds.revenueIds,
            },
          },
        });
      }

      if (createdLegacyRecordIds.expenseIds.length > 0) {
        await context.prisma.expense.deleteMany({
          where: {
            id: {
              in: createdLegacyRecordIds.expenseIds,
            },
          },
        });
      }

      if (journalFixtures.length > 0) {
        const fiscalYearIds = [
          ...new Set(journalFixtures.map((fixture) => fixture.fiscalYearId)),
        ];
        await context.prisma.journalEntry.deleteMany({
          where: {
            fiscalYearId: {
              in: fiscalYearIds,
            },
          },
        });
        await context.prisma.documentSequence.deleteMany({
          where: {
            fiscalYearId: {
              in: fiscalYearIds,
            },
            documentType: DocumentType.JOURNAL_ENTRY,
          },
        });
      }

      if (createdLegacyRecordIds.fundIds.length > 0) {
        await context.prisma.financialFund.deleteMany({
          where: {
            id: {
              in: createdLegacyRecordIds.fundIds,
            },
          },
        });
      }

      if (createdLegacyRecordIds.categoryIds.length > 0) {
        await context.prisma.financialCategory.deleteMany({
          where: {
            id: {
              in: createdLegacyRecordIds.categoryIds,
            },
          },
        });
      }

      if (createdLegacyRecordIds.accountIds.length > 0) {
        await context.prisma.chartOfAccount.deleteMany({
          where: {
            id: {
              in: createdLegacyRecordIds.accountIds,
            },
          },
        });
      }
    }

    if (context) {
      while (journalFixtures.length > 0) {
        const fixture = journalFixtures.pop()!;
        await cleanupFinanceJournalFixture(context, fixture);
      }
    }

    if (context && createdHybridAccountIds.length > 0) {
      await context.prisma.chartOfAccount.deleteMany({
        where: {
          id: {
            in: createdHybridAccountIds,
          },
        },
      });
      createdHybridAccountIds.length = 0;
    }

    createdLegacyRecordIds.fundIds.length = 0;
    createdLegacyRecordIds.categoryIds.length = 0;
    createdLegacyRecordIds.accountIds.length = 0;
    createdLegacyRecordIds.revenueIds.length = 0;
    createdLegacyRecordIds.expenseIds.length = 0;
  });

  afterAll(async () => {
    await teardownFinanceE2eContext(context);
    context = null;
  });

  it('filters general ledger and trial balance by branchId while inheriting shared entries', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const primaryFixture = await createFinanceJournalFixture(context);
    const secondaryFixture = await createFinanceJournalFixture(context);
    journalFixtures.push(primaryFixture, secondaryFixture);
    const sharedAccounts = await createSharedPostingAccounts(
      context,
      primaryFixture,
      createdHybridAccountIds,
    );

    const primaryEntry = await createAndPostJournalEntry(
      context,
      primaryFixture,
      300,
    );
    const secondaryEntry = await createAndPostJournalEntry(
      context,
      secondaryFixture,
      125,
    );
    const sharedEntry = await createAndPostJournalEntry(context, primaryFixture, 75, {
      branchId: null,
      debitAccountId: sharedAccounts.debitAccountId,
      creditAccountId: sharedAccounts.creditAccountId,
      description: `Shared hybrid journal ${primaryFixture.suffix}`,
    });

    const [
      allLedgerResponse,
      branchLedgerResponse,
      branchTrialBalanceResponse,
    ] = await Promise.all([
      request(httpServer())
        .get('/finance/reports/general-ledger')
        .set(authHeader())
        .expect(200),
      request(httpServer())
        .get(
          `/finance/reports/general-ledger?branchId=${primaryFixture.branchId}&fiscalYearId=${primaryFixture.fiscalYearId}`,
        )
        .set(authHeader())
        .expect(200),
      request(httpServer())
        .get(
          `/finance/reports/trial-balance?branchId=${primaryFixture.branchId}&fiscalYearId=${primaryFixture.fiscalYearId}&includeHeaders=false`,
        )
        .set(authHeader())
        .expect(200),
    ]);

    const allLedger = allLedgerResponse.body as GeneralLedgerBody;
    const branchLedger = branchLedgerResponse.body as GeneralLedgerBody;
    const branchTrialBalance =
      branchTrialBalanceResponse.body as TrialBalanceBody;

    expect(allLedger.pagination.total).toBeGreaterThanOrEqual(4);
    expect(
      allLedger.data.some(
        (entry) => entry.entryNumber === primaryEntry.entryNumber,
      ),
    ).toBe(true);
    expect(
      allLedger.data.some(
        (entry) => entry.entryNumber === secondaryEntry.entryNumber,
      ),
    ).toBe(true);
    expect(
      allLedger.data.some(
        (entry) => entry.entryNumber === sharedEntry.entryNumber,
      ),
    ).toBe(true);

    expect(branchLedger.pagination.total).toBe(4);
    expect(
      branchLedger.data.some(
        (entry) => entry.entryNumber === primaryEntry.entryNumber,
      ),
    ).toBe(true);
    expect(
      branchLedger.data.some(
        (entry) => entry.entryNumber === sharedEntry.entryNumber,
      ),
    ).toBe(true);
    expect(
      branchLedger.data.some(
        (entry) => entry.accountId === primaryFixture.debitAccountId,
      ),
    ).toBe(true);
    expect(
      branchLedger.data.some(
        (entry) => entry.accountId === primaryFixture.creditAccountId,
      ),
    ).toBe(true);
    expect(
      branchLedger.data.some(
        (entry) => entry.accountId === sharedAccounts.debitAccountId,
      ),
    ).toBe(true);
    expect(
      branchLedger.data.some(
        (entry) => entry.accountId === sharedAccounts.creditAccountId,
      ),
    ).toBe(true);
    expect(
      branchLedger.data.every(
        (entry) =>
          entry.accountId !== secondaryFixture.debitAccountId &&
          entry.accountId !== secondaryFixture.creditAccountId,
      ),
    ).toBe(true);

    expect(branchTrialBalance.totals.totalDebit).toBe(375);
    expect(branchTrialBalance.totals.totalCredit).toBe(375);
    expect(
      branchTrialBalance.data.some(
        (entry) =>
          entry.accountId === primaryFixture.debitAccountId &&
          entry.currentBalance === 300,
      ),
    ).toBe(true);
    expect(
      branchTrialBalance.data.some(
        (entry) =>
          entry.accountId === primaryFixture.creditAccountId &&
          entry.currentBalance === -300,
      ),
    ).toBe(true);
    expect(
      branchTrialBalance.data.some(
        (entry) =>
          entry.accountId === sharedAccounts.debitAccountId &&
          entry.currentBalance === 75,
      ),
    ).toBe(true);
    expect(
      branchTrialBalance.data.some(
        (entry) =>
          entry.accountId === sharedAccounts.creditAccountId &&
          entry.currentBalance === -75,
      ),
    ).toBe(true);
    expect(
      branchTrialBalance.data.every(
        (entry) =>
          entry.accountId !== secondaryFixture.debitAccountId &&
          entry.accountId !== secondaryFixture.creditAccountId,
      ),
    ).toBe(true);
  });

  it('rejects journal entries when line branch scope conflicts with the journal branch', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const primaryFixture = await createFinanceJournalFixture(context);
    const secondaryFixture = await createFinanceJournalFixture(context);
    journalFixtures.push(primaryFixture, secondaryFixture);

    await request(httpServer())
      .post('/finance/journal-entries')
      .set(authHeader())
      .send({
        entryDate: dateOnly(primaryFixture.startDate),
        fiscalYearId: primaryFixture.fiscalYearId,
        fiscalPeriodId: primaryFixture.fiscalPeriodId,
        branchId: primaryFixture.branchId,
        description: `Hybrid validation ${primaryFixture.suffix}`,
        lines: [
          {
            accountId: primaryFixture.debitAccountId,
            description: 'Debit line with wrong line branch',
            debitAmount: 100,
            branchId: secondaryFixture.branchId,
          },
          {
            accountId: primaryFixture.creditAccountId,
            description: 'Credit line',
            creditAmount: 100,
          },
        ],
      })
      .expect(400);

    await request(httpServer())
      .post('/finance/journal-entries')
      .set(authHeader())
      .send({
        entryDate: dateOnly(primaryFixture.startDate),
        fiscalYearId: primaryFixture.fiscalYearId,
        fiscalPeriodId: primaryFixture.fiscalPeriodId,
        branchId: primaryFixture.branchId,
        description: `Hybrid account mismatch ${primaryFixture.suffix}`,
        lines: [
          {
            accountId: secondaryFixture.debitAccountId,
            description: 'Debit line from another branch account',
            debitAmount: 100,
          },
          {
            accountId: primaryFixture.creditAccountId,
            description: 'Credit line',
            creditAmount: 100,
          },
        ],
      })
      .expect(400);
  });

  it('persists lateFee and OVERDUE installment status and exposes them through installment APIs and student statement', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    billingFixture = await createFinanceBillingFixture(context);
    const invoice = await createIssuedInvoiceWithPastDueInstallment(
      context,
      billingFixture,
    );
    const installmentId = invoice.installments[0]?.id;

    if (!installmentId) {
      throw new Error('Expected installment to be created for test invoice.');
    }

    const updateResponse = await request(httpServer())
      .patch(`/finance/invoice-installments/${installmentId}`)
      .set(authHeader())
      .send({
        status: 'OVERDUE',
        lateFee: 25,
        notes: 'Late fee applied for overdue installment',
      })
      .expect(200);

    const updatedInstallment = updateResponse.body as InstallmentBody;
    expect(updatedInstallment.status).toBe('OVERDUE');
    expect(decimalToNumber(updatedInstallment.lateFee)).toBe(25);

    const [installmentResponse, overdueListResponse, statementResponse] =
      await Promise.all([
        request(httpServer())
          .get(`/finance/invoice-installments/${installmentId}`)
          .set(authHeader())
          .expect(200),
        request(httpServer())
          .get(
            `/finance/invoice-installments?invoiceId=${invoice.id}&status=OVERDUE`,
          )
          .set(authHeader())
          .expect(200),
        request(httpServer())
          .get(
            `/finance/billing/student-statement/${billingFixture.enrollmentId}`,
          )
          .set(authHeader())
          .expect(200),
      ]);

    const installmentBody = installmentResponse.body as InstallmentBody;
    const overdueList = overdueListResponse.body as InstallmentListBody;
    const statement = statementResponse.body as StudentStatementBody;

    expect(installmentBody.status).toBe('OVERDUE');
    expect(decimalToNumber(installmentBody.lateFee)).toBe(25);
    expect(installmentBody.notes).toContain('Late fee applied');
    expect(overdueList.pagination.total).toBe(1);
    expect(overdueList.data[0]?.id).toBe(installmentId);
    expect(overdueList.data[0]?.status).toBe('OVERDUE');
    expect(decimalToNumber(overdueList.data[0]?.lateFee ?? 0)).toBe(25);
    expect(statement.invoices).toHaveLength(1);
    expect(statement.invoices[0]?.status).toBe(InvoiceStatus.ISSUED);
    expect(statement.invoices[0]?.installments[0]?.status).toBe('OVERDUE');
    expect(statement.invoices[0]?.installments[0]?.amount).toBe(600);
    expect(statement.invoices[0]?.installments[0]?.paidAmount).toBe(0);
  });

  it('includes OUTPUT INPUT EXEMPT and ZERO_RATED tax codes in the VAT report', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    billingFixture = await createFinanceBillingFixture(context);
    const taxCodes = await createVatTaxCodes(
      context,
      billingFixture.startDate,
      createdTaxCodeIds,
    );
    const invoiceDate = dateOnly(billingFixture.startDate);
    const dueDate = dateOnly(addUtcDays(billingFixture.startDate, 7));

    await request(httpServer())
      .post('/finance/student-invoices')
      .set(authHeader())
      .send({
        enrollmentId: billingFixture.enrollmentId,
        academicYearId: billingFixture.academicYearId,
        branchId: billingFixture.branchId,
        invoiceDate,
        dueDate,
        currencyId: billingFixture.currencyId,
        status: InvoiceStatus.ISSUED,
        lines: [
          {
            feeType: FeeType.TUITION,
            descriptionAr: `VAT Output ${billingFixture.suffix}`.slice(0, 200),
            quantity: 1,
            unitPrice: 200,
            vatRate: 15,
            taxCodeId: taxCodes.outputId,
            accountId: billingFixture.revenueAccountId,
          },
          {
            feeType: FeeType.TUITION,
            descriptionAr: `VAT Input ${billingFixture.suffix}`.slice(0, 200),
            quantity: 1,
            unitPrice: 300,
            vatRate: 5,
            taxCodeId: taxCodes.inputId,
            accountId: billingFixture.revenueAccountId,
          },
          {
            feeType: FeeType.TUITION,
            descriptionAr: `VAT Exempt ${billingFixture.suffix}`.slice(0, 200),
            quantity: 1,
            unitPrice: 150,
            vatRate: 0,
            taxCodeId: taxCodes.exemptId,
            accountId: billingFixture.revenueAccountId,
          },
          {
            feeType: FeeType.TUITION,
            descriptionAr: `VAT Zero ${billingFixture.suffix}`.slice(0, 200),
            quantity: 1,
            unitPrice: 250,
            vatRate: 0,
            taxCodeId: taxCodes.zeroRatedId,
            accountId: billingFixture.revenueAccountId,
          },
        ],
      })
      .expect(201);

    const vatResponse = await request(httpServer())
      .get(
        `/finance/reports/vat-report?branchId=${billingFixture.branchId}&dateFrom=${invoiceDate}&dateTo=${invoiceDate}`,
      )
      .set(authHeader())
      .expect(200);

    const vatReport = vatResponse.body as VatReportBody;
    const outputCodes = vatReport.outputVat.map((item) => item.taxCode).sort();
    const inputCodes = vatReport.inputVat.map((item) => item.taxCode).sort();

    expect(outputCodes).toEqual(
      [taxCodes.outputCode, taxCodes.exemptCode, taxCodes.zeroRatedCode].sort(),
    );
    expect(inputCodes).toEqual([taxCodes.inputCode]);
    expect(vatReport.totalOutputVat).toBe(30);
    expect(vatReport.totalInputVat).toBe(15);
    expect(vatReport.netVatPayable).toBe(15);
    expect(
      vatReport.outputVat.find((item) => item.taxCode === taxCodes.exemptCode)
        ?.vatAmount,
    ).toBe(0);
    expect(
      vatReport.outputVat.find(
        (item) => item.taxCode === taxCodes.zeroRatedCode,
      )?.vatAmount,
    ).toBe(0);
    expect(
      vatReport.inputVat.find((item) => item.taxCode === taxCodes.inputCode)
        ?.taxableBase,
    ).toBe(300);
  });

  it('creates legacy revenue and approved expense entries with posted journals and expected balances', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const legacyFixture = await createLegacyFinanceFixture(
      context,
      createdLegacyRecordIds,
    );
    journalFixtures.push(legacyFixture.journalFixture);

    const revenueResponse = await request(httpServer())
      .post('/finance/revenues')
      .set(authHeader())
      .send({
        fundId: legacyFixture.fundId,
        categoryId: legacyFixture.revenueCategoryId,
        amount: 450,
        revenueDate: dateOnly(legacyFixture.journalFixture.startDate),
        sourceType: 'OTHER',
        receiptNumber: `REV-${legacyFixture.journalFixture.suffix}`.slice(
          0,
          50,
        ),
        description: 'Legacy revenue happy path',
      })
      .expect(201);

    const createdRevenue = revenueResponse.body as RevenueBody;
    createdLegacyRecordIds.revenueIds.push(createdRevenue.id);
    expect(decimalToNumber(createdRevenue.amount)).toBe(450);
    expect(createdRevenue.journalEntry.status).toBe('POSTED');

    const expenseCreateResponse = await request(httpServer())
      .post('/finance/expenses')
      .set(authHeader())
      .send({
        fundId: legacyFixture.fundId,
        categoryId: legacyFixture.expenseCategoryId,
        amount: 180,
        expenseDate: dateOnly(
          addUtcDays(legacyFixture.journalFixture.startDate, 1),
        ),
        vendorName: 'Legacy Vendor',
        invoiceNumber: `EXP-${legacyFixture.journalFixture.suffix}`.slice(
          0,
          50,
        ),
        description: 'Legacy expense happy path',
      })
      .expect(201);

    const createdExpense = expenseCreateResponse.body as ExpenseBody;
    createdLegacyRecordIds.expenseIds.push(createdExpense.id);
    expect(createdExpense.isApproved).toBe(false);
    expect(createdExpense.journalEntry).toBeNull();

    const approveExpenseResponse = await request(httpServer())
      .patch(`/finance/expenses/${createdExpense.id}/approve`)
      .set(authHeader())
      .expect(200);

    const approvedExpense = approveExpenseResponse.body as ExpenseBody;
    expect(approvedExpense.isApproved).toBe(true);
    expect(approvedExpense.journalEntry?.status).toBe('POSTED');

    const [fundAccount, revenueAccount, expenseAccount] = await Promise.all([
      context.prisma.chartOfAccount.findUniqueOrThrow({
        where: { id: legacyFixture.fundAccountId },
        select: { currentBalance: true },
      }),
      context.prisma.chartOfAccount.findUniqueOrThrow({
        where: { id: legacyFixture.revenueAccountId },
        select: { currentBalance: true },
      }),
      context.prisma.chartOfAccount.findUniqueOrThrow({
        where: { id: legacyFixture.expenseAccountId },
        select: { currentBalance: true },
      }),
    ]);

    expect(decimalToNumber(fundAccount.currentBalance)).toBe(270);
    expect(decimalToNumber(revenueAccount.currentBalance)).toBe(-450);
    expect(decimalToNumber(expenseAccount.currentBalance)).toBe(180);

    const [revenuesListResponse, expensesListResponse] = await Promise.all([
      request(httpServer())
        .get(`/finance/revenues?fundId=${legacyFixture.fundId}`)
        .set(authHeader())
        .expect(200),
      request(httpServer())
        .get(`/finance/expenses?fundId=${legacyFixture.fundId}&isApproved=true`)
        .set(authHeader())
        .expect(200),
    ]);

    const revenuesList = revenuesListResponse.body as PaginatedListBody;
    const expensesList = expensesListResponse.body as PaginatedListBody;

    expect(revenuesList.pagination.total).toBe(1);
    expect(expensesList.pagination.total).toBe(1);
  });
});

async function createAndPostJournalEntry(
  context: FinanceE2eContext,
  fixture: FinanceJournalFixture,
  amount: number,
  overrides?: {
    branchId?: number | null;
    debitAccountId?: number;
    creditAccountId?: number;
    description?: string;
    debitLineBranchId?: number | null;
    creditLineBranchId?: number | null;
  },
) {
  const branchId =
    overrides?.branchId === undefined ? fixture.branchId : overrides.branchId;
  const createResponse = await request(context.httpServer())
    .post('/finance/journal-entries')
    .set(createFinanceAuthHeader(context))
    .send({
      entryDate: dateOnly(fixture.startDate),
      fiscalYearId: fixture.fiscalYearId,
      fiscalPeriodId: fixture.fiscalPeriodId,
      ...(branchId === null ? {} : { branchId }),
      description:
        overrides?.description ?? `Branch filter journal ${fixture.suffix}`,
      lines: [
        {
          accountId: overrides?.debitAccountId ?? fixture.debitAccountId,
          description: 'Debit line',
          debitAmount: amount,
          ...(overrides?.debitLineBranchId === undefined
            ? {}
            : { branchId: overrides.debitLineBranchId }),
        },
        {
          accountId: overrides?.creditAccountId ?? fixture.creditAccountId,
          description: 'Credit line',
          creditAmount: amount,
          ...(overrides?.creditLineBranchId === undefined
            ? {}
            : { branchId: overrides.creditLineBranchId }),
        },
      ],
    })
    .expect(201);

  const created = createResponse.body as JournalEntryBody;

  await request(context.httpServer())
    .patch(`/finance/journal-entries/${created.id}/approve`)
    .set(createFinanceAuthHeader(context))
    .expect(200);

  await request(context.httpServer())
    .patch(`/finance/journal-entries/${created.id}/post`)
    .set(createFinanceAuthHeader(context))
    .expect(200);

  return created;
}

async function createSharedPostingAccounts(
  context: FinanceE2eContext,
  fixture: FinanceJournalFixture,
  createdAccountIds: number[],
) {
  const [debitAccount, creditAccount] = await Promise.all([
    context.prisma.chartOfAccount.create({
      data: {
        accountCode: `HDE${fixture.suffix.slice(-8)}`.slice(0, 20),
        nameAr: `مصروف هجين ${fixture.suffix}`.slice(0, 100),
        nameEn: `Hybrid Debit ${fixture.suffix}`.slice(0, 100),
        accountType: AccountType.EXPENSE,
        hierarchyLevel: 1,
        isHeader: false,
        isBankAccount: false,
        normalBalance: NormalBalance.DEBIT,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
        branchId: null,
        createdById: context.adminUserId,
        updatedById: context.adminUserId,
      },
      select: { id: true },
    }),
    context.prisma.chartOfAccount.create({
      data: {
        accountCode: `HCR${fixture.suffix.slice(-8)}`.slice(0, 20),
        nameAr: `إيراد هجين ${fixture.suffix}`.slice(0, 100),
        nameEn: `Hybrid Credit ${fixture.suffix}`.slice(0, 100),
        accountType: AccountType.REVENUE,
        hierarchyLevel: 1,
        isHeader: false,
        isBankAccount: false,
        normalBalance: NormalBalance.CREDIT,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
        branchId: null,
        createdById: context.adminUserId,
        updatedById: context.adminUserId,
      },
      select: { id: true },
    }),
  ]);

  createdAccountIds.push(debitAccount.id, creditAccount.id);

  return {
    debitAccountId: debitAccount.id,
    creditAccountId: creditAccount.id,
  };
}

async function createIssuedInvoiceWithPastDueInstallment(
  context: FinanceE2eContext,
  fixture: FinanceBillingFixture,
) {
  const invoiceDate = addUtcDays(fixture.startDate, -10);
  const dueDate = addUtcDays(fixture.startDate, -5);

  const response = await request(context.httpServer())
    .post('/finance/student-invoices')
    .set(createFinanceAuthHeader(context))
    .send({
      enrollmentId: fixture.enrollmentId,
      academicYearId: fixture.academicYearId,
      branchId: fixture.branchId,
      invoiceDate: dateOnly(invoiceDate),
      dueDate: dateOnly(dueDate),
      currencyId: fixture.currencyId,
      status: InvoiceStatus.ISSUED,
      lines: [
        {
          feeType: 'TUITION',
          descriptionAr: `رسوم متأخرة ${fixture.suffix}`.slice(0, 200),
          quantity: 1,
          unitPrice: 600,
          accountId: fixture.revenueAccountId,
        },
      ],
      installments: [
        {
          installmentNumber: 1,
          dueDate: dateOnly(dueDate),
          amount: 600,
          lateFee: 0,
          notes: 'Original due installment',
        },
      ],
    })
    .expect(201);

  return response.body as InvoiceBody;
}

function addUtcDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function createVatTaxCodes(
  context: FinanceE2eContext,
  effectiveDate: Date,
  createdTaxCodeIds: number[],
) {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const basePayload = {
    effectiveFrom: dateOnly(effectiveDate),
    isActive: true,
  };

  const [output, input, exempt, zeroRated] = await Promise.all([
    createTaxCode(context, {
      ...basePayload,
      taxCode: `O${suffix.slice(-8)}`.slice(0, 10),
      taxNameAr: `مخرجات ${suffix}`.slice(0, 80),
      rate: 15,
      taxType: TaxType.OUTPUT,
    }),
    createTaxCode(context, {
      ...basePayload,
      taxCode: `I${suffix.slice(-8)}`.slice(0, 10),
      taxNameAr: `مدخلات ${suffix}`.slice(0, 80),
      rate: 5,
      taxType: TaxType.INPUT,
    }),
    createTaxCode(context, {
      ...basePayload,
      taxCode: `E${suffix.slice(-8)}`.slice(0, 10),
      taxNameAr: `معفى ${suffix}`.slice(0, 80),
      rate: 0,
      taxType: TaxType.EXEMPT,
    }),
    createTaxCode(context, {
      ...basePayload,
      taxCode: `Z${suffix.slice(-8)}`.slice(0, 10),
      taxNameAr: `صفرية ${suffix}`.slice(0, 80),
      rate: 0,
      taxType: TaxType.ZERO_RATED,
    }),
  ]);

  createdTaxCodeIds.push(output.id, input.id, exempt.id, zeroRated.id);

  return {
    outputId: output.id,
    inputId: input.id,
    exemptId: exempt.id,
    zeroRatedId: zeroRated.id,
    outputCode: output.taxCode,
    inputCode: input.taxCode,
    exemptCode: exempt.taxCode,
    zeroRatedCode: zeroRated.taxCode,
  };
}

async function createTaxCode(
  context: FinanceE2eContext,
  payload: {
    taxCode: string;
    taxNameAr: string;
    rate: number;
    taxType: TaxType;
    effectiveFrom: string;
    isActive: boolean;
  },
) {
  const response = await request(context.httpServer())
    .post('/finance/tax-configurations')
    .set(createFinanceAuthHeader(context))
    .send(payload)
    .expect(201);

  return response.body as {
    id: number;
    taxCode: string;
  };
}

async function createLegacyFinanceFixture(
  context: FinanceE2eContext,
  createdLegacyRecordIds: {
    fundIds: number[];
    categoryIds: number[];
    accountIds: number[];
    revenueIds: number[];
    expenseIds: number[];
  },
) {
  const journalFixture = await createFinanceJournalFixture(context);
  const suffix = journalFixture.suffix;

  const [fundAccount, revenueAccount, expenseAccount] = await Promise.all([
    context.prisma.chartOfAccount.create({
      data: {
        accountCode: `TFA${suffix.slice(-8)}`.slice(0, 20),
        nameAr: `صندوق اختبار ${suffix}`.slice(0, 100),
        nameEn: `Legacy Fund ${suffix}`.slice(0, 100),
        accountType: AccountType.ASSET,
        hierarchyLevel: 1,
        isHeader: false,
        isBankAccount: true,
        normalBalance: NormalBalance.DEBIT,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
        branchId: journalFixture.branchId,
        createdById: context.adminUserId,
        updatedById: context.adminUserId,
      },
      select: { id: true },
    }),
    context.prisma.chartOfAccount.create({
      data: {
        accountCode: `TRV${suffix.slice(-8)}`.slice(0, 20),
        nameAr: `إيراد تراثي ${suffix}`.slice(0, 100),
        nameEn: `Legacy Revenue ${suffix}`.slice(0, 100),
        accountType: AccountType.REVENUE,
        hierarchyLevel: 1,
        isHeader: false,
        isBankAccount: false,
        normalBalance: NormalBalance.CREDIT,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
        branchId: journalFixture.branchId,
        createdById: context.adminUserId,
        updatedById: context.adminUserId,
      },
      select: { id: true },
    }),
    context.prisma.chartOfAccount.create({
      data: {
        accountCode: `TEX${suffix.slice(-8)}`.slice(0, 20),
        nameAr: `مصروف تراثي ${suffix}`.slice(0, 100),
        nameEn: `Legacy Expense ${suffix}`.slice(0, 100),
        accountType: AccountType.EXPENSE,
        hierarchyLevel: 1,
        isHeader: false,
        isBankAccount: false,
        normalBalance: NormalBalance.DEBIT,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
        branchId: journalFixture.branchId,
        createdById: context.adminUserId,
        updatedById: context.adminUserId,
      },
      select: { id: true },
    }),
  ]);

  createdLegacyRecordIds.accountIds.push(
    fundAccount.id,
    revenueAccount.id,
    expenseAccount.id,
  );

  const [fund, revenueCategory, expenseCategory] = await Promise.all([
    context.prisma.financialFund.create({
      data: {
        nameAr: `صندوق رئيسي ${suffix}`.slice(0, 100),
        code: `FND${suffix.slice(-8)}`.slice(0, 30),
        fundType: FinancialFundType.MAIN,
        currentBalance: 0,
        isActive: true,
        coaAccountId: fundAccount.id,
      },
      select: { id: true },
    }),
    context.prisma.financialCategory.create({
      data: {
        nameAr: `فئة إيراد ${suffix}`.slice(0, 100),
        code: `REV${suffix.slice(-8)}`.slice(0, 30),
        categoryType: FinancialCategoryType.REVENUE,
        isActive: true,
        coaAccountId: revenueAccount.id,
      },
      select: { id: true },
    }),
    context.prisma.financialCategory.create({
      data: {
        nameAr: `فئة مصروف ${suffix}`.slice(0, 100),
        code: `EXP${suffix.slice(-8)}`.slice(0, 30),
        categoryType: FinancialCategoryType.EXPENSE,
        isActive: true,
        coaAccountId: expenseAccount.id,
      },
      select: { id: true },
    }),
  ]);

  createdLegacyRecordIds.fundIds.push(fund.id);
  createdLegacyRecordIds.categoryIds.push(
    revenueCategory.id,
    expenseCategory.id,
  );

  return {
    journalFixture,
    fundId: fund.id,
    revenueCategoryId: revenueCategory.id,
    expenseCategoryId: expenseCategory.id,
    fundAccountId: fundAccount.id,
    revenueAccountId: revenueAccount.id,
    expenseAccountId: expenseAccount.id,
  };
}
