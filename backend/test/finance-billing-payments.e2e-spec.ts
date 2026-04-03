import { InvoiceStatus, PaymentMethod, PaymentTransactionStatus } from '@prisma/client';
import request from 'supertest';
import {
  bootstrapFinanceE2eContext,
  cleanupFinanceBillingFixture,
  createFinanceAuthHeader,
  createFinanceBillingFixture,
  dateOnly,
  decimalToNumber,
  type FinanceBillingFixture,
  type FinanceE2eContext,
  teardownFinanceE2eContext,
} from './finance-test-helpers';

jest.setTimeout(45000);

type InvoiceInstallmentBody = {
  id: string;
  installmentNumber: number;
  amount: string | number;
  paidAmount: string | number;
  status: string;
};

type InvoiceBody = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: string | number;
  vatAmount: string | number;
  totalAmount: string | number;
  paidAmount: string | number;
  installments: InvoiceInstallmentBody[];
};

type PaymentTransactionBody = {
  id: string;
  transactionNumber: string;
  status: string;
  receiptNumber?: string | null;
  journalEntryId?: string | null;
};

type ReceiptBody = {
  receiptNumber: string;
  transactionNumber: string;
  amount: string | number;
  references: {
    invoice: {
      id: string;
      invoiceNumber: string;
      status: string;
    } | null;
    installment: {
      id: string;
      installmentNumber: number;
      status: string;
    } | null;
    enrollment: {
      id: string;
    } | null;
  };
};

type StudentStatementBody = {
  summary: {
    totalBilled: number;
    totalPaid: number;
    balance: number;
    status: string;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    paidAmount: number;
    balanceDue: number;
    installments: Array<{
      number: number;
      amount: number;
      paidAmount: number;
      status: string;
    }>;
  }>;
  payments: Array<{
    id: string;
    transactionNumber: string;
    amount: number;
    receiptNumber?: string | null;
  }>;
};

type FamilyBalanceBody = {
  summary: {
    childrenCount: number;
    totalBilled: number;
    totalPaid: number;
    balance: number;
    status: string;
  };
  children: Array<{
    studentId: string;
    totalBilled: number;
    totalPaid: number;
    balance: number;
  }>;
};

describe('Finance Billing and Payments (e2e)', () => {
  let context: FinanceE2eContext | null = null;
  let fixture: FinanceBillingFixture | null = null;

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
    if (context && fixture) {
      await cleanupFinanceBillingFixture(context, fixture);
      fixture = null;
    }
  });

  afterAll(async () => {
    await teardownFinanceE2eContext(context);
    context = null;
  });

  it('creates an invoice, reconciles a partial payment, and exposes receipt and statements', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceBillingFixture(context);

    const invoice = await createIssuedInvoice(context, fixture);
    const firstInstallment = invoice.installments[0];

    const settlementBefore = await readAccountBalance(
      context,
      fixture.debitAccountId,
    );
    const revenueBefore = await readAccountBalance(
      context,
      fixture.revenueAccountId,
    );

    const payment = await createCompletedPayment(context, fixture, {
      amount: 575,
      invoiceId: invoice.id,
      installmentId: firstInstallment.id,
      payerName: 'ولي أمر اختبار جزئي',
    });

    expect(payment.status).toBe(PaymentTransactionStatus.COMPLETED);
    expect(payment.receiptNumber).toContain('RCP-');
    expect(payment.journalEntryId ?? null).toBeNull();

    const reconcileResponse = await request(httpServer())
      .post(`/finance/payment-transactions/${payment.id}/reconcile`)
      .set(authHeader())
      .expect(201);

    const reconciledPayment = reconcileResponse.body as PaymentTransactionBody;
    expect(reconciledPayment.journalEntryId).toBeTruthy();

    const [
      invoiceAfterPayment,
      installmentAfterPayment,
      secondInstallmentAfterPayment,
      settlementAfter,
      revenueAfter,
    ] = await Promise.all([
      context.prisma.studentInvoice.findUniqueOrThrow({
        where: { id: BigInt(invoice.id) },
        select: {
          status: true,
          paidAmount: true,
          balanceDue: true,
        },
      }),
      context.prisma.invoiceInstallment.findUniqueOrThrow({
        where: { id: BigInt(firstInstallment.id) },
        select: {
          status: true,
          paidAmount: true,
          paymentDate: true,
        },
      }),
      context.prisma.invoiceInstallment.findUniqueOrThrow({
        where: { id: BigInt(invoice.installments[1].id) },
        select: {
          status: true,
          paidAmount: true,
        },
      }),
      readAccountBalance(context, fixture.debitAccountId),
      readAccountBalance(context, fixture.revenueAccountId),
    ]);

    expect(invoiceAfterPayment.status).toBe(InvoiceStatus.PARTIAL);
    expect(decimalToNumber(invoiceAfterPayment.paidAmount)).toBe(575);
    expect(decimalToNumber(invoiceAfterPayment.balanceDue)).toBe(575);
    expect(installmentAfterPayment.status).toBe('PAID');
    expect(decimalToNumber(installmentAfterPayment.paidAmount)).toBe(575);
    expect(installmentAfterPayment.paymentDate).toBeTruthy();
    expect(secondInstallmentAfterPayment.status).toBe('PENDING');
    expect(decimalToNumber(secondInstallmentAfterPayment.paidAmount)).toBe(0);
    expect(settlementAfter - settlementBefore).toBe(575);
    expect(revenueAfter - revenueBefore).toBe(-575);

    const receiptResponse = await request(httpServer())
      .get(`/finance/payment-transactions/${payment.id}/receipt`)
      .set(authHeader())
      .expect(200);

    const receipt = receiptResponse.body as ReceiptBody;
    expect(receipt.transactionNumber).toBe(payment.transactionNumber);
    expect(decimalToNumber(receipt.amount)).toBe(575);
    expect(receipt.references.invoice?.id).toBe(invoice.id);
    expect(receipt.references.invoice?.status).toBe(InvoiceStatus.PARTIAL);
    expect(receipt.references.installment?.id).toBe(firstInstallment.id);
    expect(receipt.references.installment?.status).toBe('PAID');
    expect(receipt.references.enrollment?.id).toBe(fixture.enrollmentId);

    const statementResponse = await request(httpServer())
      .get(`/finance/billing/student-statement/${fixture.enrollmentId}`)
      .set(authHeader())
      .expect(200);

    const statement = statementResponse.body as StudentStatementBody;
    expect(statement.summary.totalBilled).toBe(1150);
    expect(statement.summary.totalPaid).toBe(575);
    expect(statement.summary.balance).toBe(575);
    expect(statement.summary.status).toBe('OUTSTANDING');
    expect(statement.invoices).toHaveLength(1);
    expect(statement.invoices[0].status).toBe(InvoiceStatus.PARTIAL);
    expect(statement.invoices[0].paidAmount).toBe(575);
    expect(statement.invoices[0].balanceDue).toBe(575);
    expect(statement.invoices[0].installments[0].status).toBe('PAID');
    expect(statement.invoices[0].installments[1].status).toBe('PENDING');
    expect(statement.payments).toHaveLength(1);
    expect(statement.payments[0].amount).toBe(575);
    expect(statement.payments[0].receiptNumber).toBe(payment.receiptNumber);

    const familyBalanceResponse = await request(httpServer())
      .get(`/finance/billing/family-balance/${fixture.guardianId}`)
      .set(authHeader())
      .expect(200);

    const familyBalance = familyBalanceResponse.body as FamilyBalanceBody;
    expect(familyBalance.summary.childrenCount).toBe(1);
    expect(familyBalance.summary.totalBilled).toBe(1150);
    expect(familyBalance.summary.totalPaid).toBe(575);
    expect(familyBalance.summary.balance).toBe(575);
    expect(familyBalance.summary.status).toBe('OUTSTANDING');
    expect(familyBalance.children[0].studentId).toBe(fixture.studentId);
    expect(familyBalance.children[0].balance).toBe(575);
  });

  it('settles the remaining installment and marks the invoice and family balance as settled', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceBillingFixture(context);

    const invoice = await createIssuedInvoice(context, fixture);

    const firstPayment = await createCompletedPayment(context, fixture, {
      amount: 575,
      invoiceId: invoice.id,
      installmentId: invoice.installments[0].id,
      payerName: 'ولي أمر اختبار أول',
      dayOffset: 5,
    });

    await request(httpServer())
      .post(`/finance/payment-transactions/${firstPayment.id}/reconcile`)
      .set(authHeader())
      .expect(201);

    const secondPayment = await createCompletedPayment(context, fixture, {
      amount: 575,
      invoiceId: invoice.id,
      installmentId: invoice.installments[1].id,
      payerName: 'ولي أمر اختبار نهائي',
      dayOffset: 12,
    });

    const secondReconcileResponse = await request(httpServer())
      .post(`/finance/payment-transactions/${secondPayment.id}/reconcile`)
      .set(authHeader())
      .expect(201);

    const secondReconciledPayment =
      secondReconcileResponse.body as PaymentTransactionBody;
    expect(secondReconciledPayment.journalEntryId).toBeTruthy();

    const [invoiceAfterSettlement, installmentsAfterSettlement] =
      await Promise.all([
        context.prisma.studentInvoice.findUniqueOrThrow({
          where: { id: BigInt(invoice.id) },
          select: {
            status: true,
            paidAmount: true,
            balanceDue: true,
          },
        }),
        context.prisma.invoiceInstallment.findMany({
          where: {
            invoiceId: BigInt(invoice.id),
          },
          orderBy: { installmentNumber: 'asc' },
          select: {
            installmentNumber: true,
            status: true,
            paidAmount: true,
          },
        }),
      ]);

    expect(invoiceAfterSettlement.status).toBe(InvoiceStatus.PAID);
    expect(decimalToNumber(invoiceAfterSettlement.paidAmount)).toBe(1150);
    expect(decimalToNumber(invoiceAfterSettlement.balanceDue)).toBe(0);
    expect(installmentsAfterSettlement).toHaveLength(2);
    expect(installmentsAfterSettlement[0].status).toBe('PAID');
    expect(decimalToNumber(installmentsAfterSettlement[0].paidAmount)).toBe(575);
    expect(installmentsAfterSettlement[1].status).toBe('PAID');
    expect(decimalToNumber(installmentsAfterSettlement[1].paidAmount)).toBe(575);

    const [statementResponse, familyBalanceResponse] = await Promise.all([
      request(httpServer())
        .get(`/finance/billing/student-statement/${fixture.enrollmentId}`)
        .set(authHeader())
        .expect(200),
      request(httpServer())
        .get(`/finance/billing/family-balance/${fixture.guardianId}`)
        .set(authHeader())
        .expect(200),
    ]);

    const statement = statementResponse.body as StudentStatementBody;
    const familyBalance = familyBalanceResponse.body as FamilyBalanceBody;

    expect(statement.summary.totalBilled).toBe(1150);
    expect(statement.summary.totalPaid).toBe(1150);
    expect(statement.summary.balance).toBe(0);
    expect(statement.summary.status).toBe('SETTLED');
    expect(statement.payments).toHaveLength(2);
    expect(familyBalance.summary.totalBilled).toBe(1150);
    expect(familyBalance.summary.totalPaid).toBe(1150);
    expect(familyBalance.summary.balance).toBe(0);
    expect(familyBalance.summary.status).toBe('SETTLED');
    expect(familyBalance.children[0].balance).toBe(0);
  });

  it('completes and reconciles a pending payment in one operational step', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceBillingFixture(context);

    const invoice = await createIssuedInvoice(context, fixture);
    const firstInstallment = invoice.installments[0];

    const payment = await createPayment(context, fixture, {
      amount: 300,
      invoiceId: invoice.id,
      installmentId: firstInstallment.id,
      payerName: 'ولي أمر التشغيل اليومي',
      status: PaymentTransactionStatus.PENDING,
    });

    expect(payment.status).toBe(PaymentTransactionStatus.PENDING);
    expect(payment.receiptNumber ?? null).toBeNull();
    expect(payment.journalEntryId ?? null).toBeNull();

    const completeResponse = await request(httpServer())
      .post(`/finance/payment-transactions/${payment.id}/complete-and-reconcile`)
      .set(authHeader())
      .expect(201);

    const processedPayment = completeResponse.body as PaymentTransactionBody;
    expect(processedPayment.status).toBe(PaymentTransactionStatus.COMPLETED);
    expect(processedPayment.receiptNumber).toContain('RCP-');
    expect(processedPayment.journalEntryId).toBeTruthy();

    const [invoiceAfter, installmentAfter] = await Promise.all([
      context.prisma.studentInvoice.findUniqueOrThrow({
        where: { id: BigInt(invoice.id) },
        select: {
          status: true,
          paidAmount: true,
          balanceDue: true,
        },
      }),
      context.prisma.invoiceInstallment.findUniqueOrThrow({
        where: { id: BigInt(firstInstallment.id) },
        select: {
          status: true,
          paidAmount: true,
        },
      }),
    ]);

    expect(invoiceAfter.status).toBe(InvoiceStatus.PARTIAL);
    expect(decimalToNumber(invoiceAfter.paidAmount)).toBe(300);
    expect(decimalToNumber(invoiceAfter.balanceDue)).toBe(850);
    expect(installmentAfter.status).toBe('PARTIAL');
    expect(decimalToNumber(installmentAfter.paidAmount)).toBe(300);
  });

  async function createIssuedInvoice(
    activeContext: FinanceE2eContext,
    activeFixture: FinanceBillingFixture,
  ) {
    const invoiceDate = new Date(activeFixture.startDate);
    const firstInstallmentDate = addUtcDays(activeFixture.startDate, 30);
    const secondInstallmentDate = addUtcDays(activeFixture.startDate, 60);

    const response = await request(httpServer())
      .post('/finance/student-invoices')
      .set(authHeader())
      .send({
        enrollmentId: activeFixture.enrollmentId,
        academicYearId: activeFixture.academicYearId,
        branchId: activeFixture.branchId,
        invoiceDate: dateOnly(invoiceDate),
        dueDate: dateOnly(secondInstallmentDate),
        currencyId: activeFixture.currencyId,
        status: InvoiceStatus.ISSUED,
        notes: 'Finance billing e2e invoice',
        lines: [
          {
            feeType: 'TUITION',
            descriptionAr: 'رسوم دراسية سنوية',
            quantity: 1,
            unitPrice: 1000,
            vatRate: 15,
          },
        ],
        installments: [
          {
            installmentNumber: 1,
            dueDate: dateOnly(firstInstallmentDate),
            amount: 575,
            notes: 'القسط الأول',
          },
          {
            installmentNumber: 2,
            dueDate: dateOnly(secondInstallmentDate),
            amount: 575,
            notes: 'القسط الثاني',
          },
        ],
      })
      .expect(201);

    const invoice = response.body as InvoiceBody;
    expect(invoice.status).toBe(InvoiceStatus.ISSUED);
    expect(decimalToNumber(invoice.subtotal)).toBe(1000);
    expect(decimalToNumber(invoice.vatAmount)).toBe(150);
    expect(decimalToNumber(invoice.totalAmount)).toBe(1150);
    expect(decimalToNumber(invoice.paidAmount)).toBe(0);
    expect(invoice.invoiceNumber).toContain('INV-');
    expect(invoice.installments).toHaveLength(2);

    return invoice;
  }

  async function createCompletedPayment(
    activeContext: FinanceE2eContext,
    activeFixture: FinanceBillingFixture,
    input: {
      amount: number;
      invoiceId: string;
      installmentId: string;
      payerName: string;
      dayOffset?: number;
    },
  ) {
    return createPayment(activeContext, activeFixture, {
      ...input,
      status: PaymentTransactionStatus.COMPLETED,
    });
  }

  async function createPayment(
    activeContext: FinanceE2eContext,
    activeFixture: FinanceBillingFixture,
    input: {
      amount: number;
      invoiceId: string;
      installmentId: string;
      payerName: string;
      status: PaymentTransactionStatus;
      dayOffset?: number;
    },
  ) {
    const paidAt = addUtcDays(activeFixture.startDate, input.dayOffset ?? 1);

    const response = await request(httpServer())
      .post('/finance/payment-transactions')
      .set(authHeader())
      .send({
        gatewayId: activeFixture.gatewayId,
        enrollmentId: activeFixture.enrollmentId,
        invoiceId: input.invoiceId,
        installmentId: input.installmentId,
        currencyId: activeFixture.currencyId,
        amount: input.amount,
        paymentMethod: PaymentMethod.CARD,
        status: input.status,
        paidAt:
          input.status === PaymentTransactionStatus.COMPLETED
            ? paidAt.toISOString()
            : undefined,
        payerName: input.payerName,
        payerPhone: '500000000',
        notes: 'Finance billing e2e payment',
      })
      .expect(201);

    return response.body as PaymentTransactionBody;
  }
});

function addUtcDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

async function readAccountBalance(
  context: FinanceE2eContext,
  accountId: number,
) {
  const account = await context.prisma.chartOfAccount.findUniqueOrThrow({
    where: {
      id: accountId,
    },
    select: {
      currentBalance: true,
    },
  });

  return decimalToNumber(account.currentBalance);
}
