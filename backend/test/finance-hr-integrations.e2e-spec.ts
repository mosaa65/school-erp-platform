import { AccountType, EmployeeGender, NormalBalance } from '@prisma/client';
import request from 'supertest';
import {
  bootstrapFinanceE2eContext,
  createFinanceAuthHeader,
  ensureFinancePostingAccountByCode,
  type FinanceE2eContext,
  teardownFinanceE2eContext,
} from './finance-test-helpers';

jest.setTimeout(30000);

type PayrollSummaryBody = {
  month: number;
  year: number;
  gross: number | string;
  deductions: number | string;
  net: number | string;
  deductionsBreakdown: Array<{
    accountCode: string;
    accountName: string;
    amount: number | string;
    entryCount: number;
  }>;
  entryCount: number;
};

type EmployeeBalanceBody = {
  employeeId: string;
  employeeName: string;
  advances: number | string;
  deductions: number | string;
  netDue: number | string;
  breakdown: Array<{
    entryNumber: string;
    entryDate: string;
    referenceType: string | null;
    accountCode: string;
    accountName: string;
    debitAmount: number | string;
    creditAmount: number | string;
    netAmount: number | string;
  }>;
};

describe('Finance HR Integrations (e2e)', () => {
  let context: FinanceE2eContext | null = null;
  let createdFiscalYearId: number | null = null;
  let createdReferenceIds: string[] = [];

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

    if (createdReferenceIds.length > 0) {
      await context.prisma.journalEntry.deleteMany({
        where: {
          referenceId: {
            in: createdReferenceIds,
          },
          referenceType: {
            in: ['HR_PAYROLL', 'HR_DEDUCTION'],
          },
        },
      });

      createdReferenceIds = [];
    }
  });

  afterAll(async () => {
    if (context && createdFiscalYearId) {
      await context.prisma.fiscalYear.delete({
        where: {
          id: createdFiscalYearId,
        },
      });
    }

    await teardownFinanceE2eContext(context);
    context = null;
  });

  it('returns a payroll summary for the target month', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    await ensureHrPostingAccounts(context);
    const fiscalYearId = await ensureCurrentFiscalYear(context);
    createdFiscalYearId = fiscalYearId.created ? fiscalYearId.id : createdFiscalYearId;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    await request(httpServer())
      .post('/finance/hr/payroll-journal')
      .set(authHeader())
      .send({
        month,
        year,
        totalSalaries: 5000,
        totalDeductions: 700,
        description: 'Payroll summary e2e',
      })
      .expect(201);

    createdReferenceIds.push(`${year}-${month}`);

    const response = await request(httpServer())
      .get(`/finance/hr/payroll-summary/${month}`)
      .query({ year })
      .set(authHeader())
      .expect(200);

    const body = response.body as PayrollSummaryBody;
    expect(body.month).toBe(month);
    expect(body.year).toBe(year);
    expect(body.entryCount).toBe(1);
    expect(Number(body.gross)).toBe(5000);
    expect(Number(body.deductions)).toBe(700);
    expect(Number(body.net)).toBe(4300);
    expect(body.deductionsBreakdown).toHaveLength(1);
    expect(body.deductionsBreakdown[0].accountCode).toBe('1104');
    expect(Number(body.deductionsBreakdown[0].amount)).toBe(700);
    expect(body.deductionsBreakdown[0].entryCount).toBe(1);
  });

  it('returns an employee balance and rejects unknown employees', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    await ensureHrPostingAccounts(context);
    const fiscalYearId = await ensureCurrentFiscalYear(context);
    createdFiscalYearId = fiscalYearId.created ? fiscalYearId.id : createdFiscalYearId;

    const employee = await context.prisma.employee.create({
      data: {
        fullName: 'موظف اختبار مالي',
        gender: EmployeeGender.MALE,
        salaryApproved: true,
        isActive: true,
        createdById: context.adminUserId,
        updatedById: context.adminUserId,
      },
      select: {
        id: true,
        fullName: true,
      },
    });

    await request(httpServer())
      .post('/finance/hr/deduction-journal')
      .set(authHeader())
      .send({
        employeeId: employee.id,
        amount: 1250,
        reason: 'خصم مالي تجريبي',
      })
      .expect(201);

    createdReferenceIds.push(employee.id);

    const response = await request(httpServer())
      .get(`/finance/hr/employee-balance/${employee.id}`)
      .set(authHeader())
      .expect(200);

    const body = response.body as EmployeeBalanceBody;
    expect(body.employeeId).toBe(employee.id);
    expect(body.employeeName).toBe(employee.fullName);
    expect(Number(body.advances)).toBe(0);
    expect(Number(body.deductions)).toBe(1250);
    expect(Number(body.netDue)).toBe(1250);
    expect(body.breakdown).toHaveLength(1);
    expect(body.breakdown[0].accountCode).toBe('1104');
    expect(Number(body.breakdown[0].debitAmount)).toBe(1250);
    expect(Number(body.breakdown[0].creditAmount)).toBe(0);

    const notFoundResponse = await request(httpServer())
      .get('/finance/hr/employee-balance/cmj-not-found')
      .set(authHeader())
      .expect(404);

    expect(notFoundResponse.body.message ?? notFoundResponse.body.error).toBeDefined();

    await context.prisma.employee.delete({
      where: {
        id: employee.id,
      },
    });
  });
});

async function ensureCurrentFiscalYear(context: FinanceE2eContext) {
  const now = new Date();
  const existing = await context.prisma.fiscalYear.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return {
      id: existing.id,
      created: false,
    };
  }

  const startDate = new Date(now.getFullYear(), 0, 1);
  const endDate = new Date(now.getFullYear(), 11, 31);
  const created = await context.prisma.fiscalYear.create({
    data: {
      nameAr: `السنة المالية ${now.getFullYear()}`,
      startDate,
      endDate,
      isClosed: false,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: {
      id: true,
    },
  });

  return {
    id: created.id,
    created: true,
  };
}

async function ensureHrPostingAccounts(context: FinanceE2eContext) {
  await ensureFinancePostingAccountByCode(context, {
    accountCode: '5001',
    nameAr: 'مصروف الرواتب',
    nameEn: 'Salary Expense',
    accountType: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
  });

  await ensureFinancePostingAccountByCode(context, {
    accountCode: '2102',
    nameAr: 'رواتب مستحقة',
    nameEn: 'Salary Payable',
    accountType: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
  });

  await ensureFinancePostingAccountByCode(context, {
    accountCode: '1104',
    nameAr: 'ذمم الموظفين',
    nameEn: 'Employee Receivable',
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  });
}
