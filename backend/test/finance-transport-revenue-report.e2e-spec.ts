import {
  AccountType,
  FeeType,
  InvoiceStatus,
  NormalBalance,
  PaymentMethod,
  PaymentTransactionStatus,
} from '@prisma/client';
import request from 'supertest';
import {
  bootstrapFinanceE2eContext,
  cleanupFinanceBillingFixture,
  createFinanceAuthHeader,
  createFinanceBillingFixture,
  dateOnly,
  ensureFinancePostingAccountByCode,
  type FinanceBillingFixture,
  type FinanceE2eContext,
  teardownFinanceE2eContext,
} from './finance-test-helpers';

jest.setTimeout(45000);

type RevenueReportBody = {
  filters: {
    branchId: number | null;
    dateFrom: string | null;
    dateTo: string | null;
  };
  summary: {
    invoiceCount: number;
    transactionCount: number;
    totalRevenue: number;
    collectedRevenue: number;
    outstandingRevenue: number;
  };
};

describe('Finance Transport Revenue Report (e2e)', () => {
  let context: FinanceE2eContext | null = null;
  let fixture: FinanceBillingFixture | null = null;
  let alternateBranchId: number | null = null;

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

    if (fixture) {
      await cleanupFinanceBillingFixture(context, fixture);
      fixture = null;
    }

    if (alternateBranchId) {
      await context.prisma.branch.delete({
        where: { id: alternateBranchId },
      });
      alternateBranchId = null;
    }
  });

  afterAll(async () => {
    await teardownFinanceE2eContext(context);
    context = null;
  });

  it('returns transport revenue totals and supports branch and date filters', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceBillingFixture(context);
    alternateBranchId = (
      await context.prisma.branch.create({
        data: {
          code: `T${fixture.suffix.slice(-8)}`.slice(0, 10),
          nameAr: `فرع نقل ${fixture.suffix}`.slice(0, 100),
          nameEn: `Transport Branch ${fixture.suffix}`.slice(0, 100),
          isHeadquarters: false,
          isActive: true,
          createdById: context.adminUserId,
          updatedById: context.adminUserId,
        },
        select: {
          id: true,
        },
      })
    ).id;

    await ensureFinancePostingAccountByCode(context, {
      accountCode: '4003',
      nameAr: 'إيراد نقل',
      nameEn: 'Transport Revenue',
      accountType: AccountType.REVENUE,
      normalBalance: NormalBalance.CREDIT,
    });

    const firstInvoice = await context.prisma.studentInvoice.create({
      data: {
        invoiceNumber: `TR-${fixture.suffix.slice(-8)}-1`.slice(0, 30),
        enrollmentId: fixture.enrollmentId,
        academicYearId: fixture.academicYearId,
        branchId: fixture.branchId,
        invoiceDate: fixture.startDate,
        dueDate: addUtcDays(fixture.startDate, 30),
        subtotal: 1000,
        discountAmount: 0,
        vatAmount: 150,
        totalAmount: 1150,
        paidAmount: 1150,
        currencyId: fixture.currencyId,
        status: InvoiceStatus.PAID,
        createdByUserId: context.adminUserId,
        lines: {
          create: {
            descriptionAr: 'رسوم نقل أساسية',
            feeType: FeeType.TRANSPORT,
            quantity: 1,
            unitPrice: 1000,
            discountAmount: 0,
            vatRate: 15,
            vatAmount: 150,
            lineTotal: 1150,
          },
        },
      },
      select: {
        id: true,
      },
    });

    await context.prisma.paymentTransaction.create({
      data: {
        transactionNumber: `PTX-${fixture.suffix.slice(-8)}-1`.slice(0, 30),
        gatewayId: fixture.gatewayId,
        invoiceId: firstInvoice.id,
        enrollmentId: fixture.enrollmentId,
        amount: 1150,
        currencyId: fixture.currencyId,
        paymentMethod: PaymentMethod.CARD,
        status: PaymentTransactionStatus.COMPLETED,
        paidAt: addUtcDays(fixture.startDate, 1),
        receiptNumber: `RCP-${fixture.suffix.slice(-8)}-1`.slice(0, 50),
        payerName: 'ولي أمر النقل',
        payerPhone: '500000001',
        createdByUserId: context.adminUserId,
      },
    });

    await context.prisma.studentInvoice.create({
      data: {
        invoiceNumber: `TR-${fixture.suffix.slice(-8)}-2`.slice(0, 30),
        enrollmentId: fixture.enrollmentId,
        academicYearId: fixture.academicYearId,
        branchId: alternateBranchId,
        invoiceDate: addUtcDays(fixture.startDate, 10),
        dueDate: addUtcDays(fixture.startDate, 40),
        subtotal: 800,
        discountAmount: 0,
        vatAmount: 0,
        totalAmount: 800,
        paidAmount: 0,
        currencyId: fixture.currencyId,
        status: InvoiceStatus.ISSUED,
        createdByUserId: context.adminUserId,
        lines: {
          create: {
            descriptionAr: 'رسوم نقل إضافية',
            feeType: FeeType.TRANSPORT,
            quantity: 1,
            unitPrice: 800,
            discountAmount: 0,
            vatRate: 0,
            vatAmount: 0,
            lineTotal: 800,
          },
        },
      },
    });

    await context.prisma.studentInvoice.create({
      data: {
        invoiceNumber: `TR-${fixture.suffix.slice(-8)}-3`.slice(0, 30),
        enrollmentId: fixture.enrollmentId,
        academicYearId: fixture.academicYearId,
        branchId: null,
        invoiceDate: addUtcDays(fixture.startDate, 2),
        dueDate: addUtcDays(fixture.startDate, 32),
        subtotal: 500,
        discountAmount: 0,
        vatAmount: 0,
        totalAmount: 500,
        paidAmount: 0,
        currencyId: fixture.currencyId,
        status: InvoiceStatus.ISSUED,
        createdByUserId: context.adminUserId,
        lines: {
          create: {
            descriptionAr: 'رسوم نقل مشتركة',
            feeType: FeeType.TRANSPORT,
            quantity: 1,
            unitPrice: 500,
            discountAmount: 0,
            vatRate: 0,
            vatAmount: 0,
            lineTotal: 500,
          },
        },
      },
    });

    const allResponse = await request(httpServer())
      .get('/finance/transport/revenue-report')
      .set(authHeader())
      .expect(200);

    const allReport = allResponse.body as RevenueReportBody;
    expect(allReport.filters.branchId).toBeNull();
    expect(allReport.summary.invoiceCount).toBe(3);
    expect(allReport.summary.transactionCount).toBe(1);
    expect(allReport.summary.totalRevenue).toBe(2450);
    expect(allReport.summary.collectedRevenue).toBe(1150);
    expect(allReport.summary.outstandingRevenue).toBe(1300);

    const branchResponse = await request(httpServer())
      .get(`/finance/transport/revenue-report?branchId=${fixture.branchId}`)
      .set(authHeader())
      .expect(200);

    const branchReport = branchResponse.body as RevenueReportBody;
    expect(branchReport.filters.branchId).toBe(fixture.branchId);
    expect(branchReport.summary.invoiceCount).toBe(2);
    expect(branchReport.summary.transactionCount).toBe(1);
    expect(branchReport.summary.totalRevenue).toBe(1650);
    expect(branchReport.summary.collectedRevenue).toBe(1150);
    expect(branchReport.summary.outstandingRevenue).toBe(500);

    const dateResponse = await request(httpServer())
      .get(`/finance/transport/revenue-report?dateTo=${dateOnly(fixture.startDate)}`)
      .set(authHeader())
      .expect(200);

    const dateReport = dateResponse.body as RevenueReportBody;
    expect(dateReport.filters.dateTo).toBe(dateOnly(fixture.startDate));
    expect(dateReport.summary.invoiceCount).toBe(1);
    expect(dateReport.summary.totalRevenue).toBe(1150);
  });
});

function addUtcDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);

  return result;
}
