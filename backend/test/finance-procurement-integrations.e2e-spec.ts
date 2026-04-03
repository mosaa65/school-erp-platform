import { FinancialCategoryType, FinancialFundType } from '@prisma/client';
import request from 'supertest';
import {
  bootstrapFinanceE2eContext,
  createFinanceAuthHeader,
  decimalToNumber,
  type FinanceE2eContext,
  teardownFinanceE2eContext,
} from './finance-test-helpers';

jest.setTimeout(45000);

type InventoryAdjustmentBody = {
  journalEntryId: string;
  entryNumber: string;
  amount: number;
  adjustmentType: 'INCREASE' | 'DECREASE';
  debitAccountCode: string;
  creditAccountCode: string;
};

type VendorBalanceBody = {
  vendorKey: string;
  vendorName: string;
  summary: {
    expenseCount: number;
    approvedExpenseCount: number;
    pendingExpenseCount: number;
    approvedExpenseTotal: number;
    pendingExpenseTotal: number;
    balanceDue: number;
  };
  expenses: Array<{
    id: number;
    amount: number;
    expenseDate: string;
    isApproved: boolean;
    journalEntryId?: string | null;
    invoiceNumber?: string | null;
    description?: string | null;
  }>;
};

type ErrorEnvelope = {
  error: {
    message: string | string[];
  };
};

describe('Finance Procurement Integrations (e2e)', () => {
  let context: FinanceE2eContext | null = null;
  let balanceSnapshot: {
    procurementExpenseBalance: number;
    accountsPayableBalance: number;
  } | null = null;
  const createdExpenseIds: number[] = [];
  const createdFundIds: number[] = [];
  const createdCategoryIds: number[] = [];

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
    if (!context) {
      return;
    }

    if (balanceSnapshot) {
      await Promise.all([
        context.prisma.chartOfAccount.updateMany({
          where: { accountCode: '5004' },
          data: { currentBalance: balanceSnapshot.procurementExpenseBalance },
        }),
        context.prisma.chartOfAccount.updateMany({
          where: { accountCode: '2101' },
          data: { currentBalance: balanceSnapshot.accountsPayableBalance },
        }),
      ]);
      balanceSnapshot = null;
    }

    if (createdExpenseIds.length > 0) {
      await context.prisma.expense.deleteMany({
        where: {
          id: {
            in: createdExpenseIds,
          },
        },
      });
      createdExpenseIds.length = 0;
    }

    if (createdCategoryIds.length > 0) {
      await context.prisma.financialCategory.deleteMany({
        where: {
          id: {
            in: createdCategoryIds,
          },
        },
      });
      createdCategoryIds.length = 0;
    }

    if (createdFundIds.length > 0) {
      await context.prisma.financialFund.deleteMany({
        where: {
          id: {
            in: createdFundIds,
          },
        },
      });
      createdFundIds.length = 0;
    }
  });

  afterAll(async () => {
    await teardownFinanceE2eContext(context);
    context = null;
  });

  it('creates inventory adjustment journal entry', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const [procurementExpenseBefore, accountsPayableBefore] = await Promise.all(
      [
        context.prisma.chartOfAccount.findFirstOrThrow({
          where: { accountCode: '5004' },
          select: { currentBalance: true },
        }),
        context.prisma.chartOfAccount.findFirstOrThrow({
          where: { accountCode: '2101' },
          select: { currentBalance: true },
        }),
      ],
    );

    balanceSnapshot = {
      procurementExpenseBalance: decimalToNumber(
        procurementExpenseBefore.currentBalance,
      ),
      accountsPayableBalance: decimalToNumber(
        accountsPayableBefore.currentBalance,
      ),
    };

    const response = await request(httpServer())
      .post('/finance/inventory/adjustment-journal')
      .set(authHeader())
      .send({
        amount: 875.25,
        adjustmentType: 'INCREASE',
        description: `قيد تسوية مخزون ${Date.now()}`,
      })
      .expect(201);

    const createdEntry = response.body as InventoryAdjustmentBody;
    expect(createdEntry.amount).toBe(875.25);
    expect(createdEntry.adjustmentType).toBe('INCREASE');
    expect(createdEntry.debitAccountCode).toBe('5004');
    expect(createdEntry.creditAccountCode).toBe('2101');
    expect(createdEntry.entryNumber).toContain('JE-');

    const [procurementExpenseAfter, accountsPayableAfter] = await Promise.all([
      context.prisma.chartOfAccount.findFirstOrThrow({
        where: { accountCode: '5004' },
        select: { currentBalance: true },
      }),
      context.prisma.chartOfAccount.findFirstOrThrow({
        where: { accountCode: '2101' },
        select: { currentBalance: true },
      }),
    ]);

    expect(decimalToNumber(procurementExpenseAfter.currentBalance)).toBeCloseTo(
      balanceSnapshot.procurementExpenseBalance - 875.25,
      2,
    );
    expect(decimalToNumber(accountsPayableAfter.currentBalance)).toBeCloseTo(
      balanceSnapshot.accountsPayableBalance + 875.25,
      2,
    );
  });

  it('rejects invalid inventory adjustment payloads', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const response = await request(httpServer())
      .post('/finance/inventory/adjustment-journal')
      .set(authHeader())
      .send({
        amount: 0,
        adjustmentType: 'INVALID',
      })
      .expect(400);

    const errorBody = response.body as ErrorEnvelope;
    expect(stringifyErrorMessage(errorBody)).toContain(
      'adjustmentType must be one of the following values',
    );
  });

  it('returns vendor balance summary for matching expenses', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const [fund, category] = await ensureVendorBalanceFixture(
      context,
      createdFundIds,
      createdCategoryIds,
    );

    const vendorKey = `Vendor-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expenseDate = new Date(Date.UTC(2026, 2, 28));

    const firstExpense = await context.prisma.expense.create({
      data: {
        fundId: fund.id,
        categoryId: category.id,
        amount: 250,
        expenseDate,
        vendorName: vendorKey,
        invoiceNumber: `INV-${vendorKey.slice(-8)}-1`,
        description: 'Vendor balance test expense 1',
        createdByUserId: context.adminUserId,
      },
      select: { id: true },
    });
    createdExpenseIds.push(firstExpense.id);

    const secondExpense = await context.prisma.expense.create({
      data: {
        fundId: fund.id,
        categoryId: category.id,
        amount: 175.5,
        expenseDate,
        vendorName: vendorKey,
        invoiceNumber: `INV-${vendorKey.slice(-8)}-2`,
        description: 'Vendor balance test expense 2',
        createdByUserId: context.adminUserId,
      },
      select: { id: true },
    });
    createdExpenseIds.push(secondExpense.id);

    const response = await request(httpServer())
      .get(
        `/finance/procurement/vendor-balance/${encodeURIComponent(vendorKey)}`,
      )
      .set(authHeader())
      .expect(200);

    const body = response.body as VendorBalanceBody;
    expect(body.vendorKey).toBe(vendorKey);
    expect(body.vendorName).toBe(vendorKey);
    expect(body.summary.expenseCount).toBe(2);
    expect(body.summary.approvedExpenseCount).toBe(0);
    expect(body.summary.pendingExpenseCount).toBe(2);
    expect(body.summary.approvedExpenseTotal).toBe(0);
    expect(body.summary.pendingExpenseTotal).toBe(425.5);
    expect(body.summary.balanceDue).toBe(425.5);
    expect(body.expenses).toHaveLength(2);
    expect(body.expenses[0].invoiceNumber).toContain('INV-');
  });

  it('returns not found when vendor balance does not exist', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const response = await request(httpServer())
      .get('/finance/procurement/vendor-balance/NO-SUCH-VENDOR-XYZ')
      .set(authHeader())
      .expect(404);

    const errorBody = response.body as ErrorEnvelope;
    expect(stringifyErrorMessage(errorBody)).toContain('was not found');
  });
});

function stringifyErrorMessage(error: ErrorEnvelope) {
  return Array.isArray(error.error.message)
    ? error.error.message.join(' | ')
    : error.error.message;
}

async function ensureVendorBalanceFixture(
  context: FinanceE2eContext,
  createdFundIds: number[],
  createdCategoryIds: number[],
) {
  const existingFund = await context.prisma.financialFund.findFirst({
    where: { code: 'MAIN_FUND' },
    select: { id: true },
  });

  const existingCategory = await context.prisma.financialCategory.findFirst({
    where: { code: 'EXP_SUPPLIES' },
    select: { id: true },
  });

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const fund =
    existingFund ??
    (await context.prisma.financialFund.create({
      data: {
        nameAr: `صندوق اختبار مشتريات ${suffix}`.slice(0, 100),
        code: `PF${suffix.slice(-8)}`.slice(0, 30),
        fundType: FinancialFundType.MAIN,
        currentBalance: 0,
        isActive: true,
      },
      select: { id: true },
    }));

  const category =
    existingCategory ??
    (await context.prisma.financialCategory.create({
      data: {
        nameAr: `فئة مستلزمات ${suffix}`.slice(0, 100),
        code: `PC${suffix.slice(-8)}`.slice(0, 30),
        categoryType: FinancialCategoryType.EXPENSE,
        isActive: true,
      },
      select: { id: true },
    }));

  if (!existingFund) {
    createdFundIds.push(fund.id);
  }

  if (!existingCategory) {
    createdCategoryIds.push(category.id);
  }

  return [fund, category] as const;
}
