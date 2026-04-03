import {
  AccountType,
  AcademicTermType,
  InvoiceStatus,
  NormalBalance,
  PaymentGatewayType,
} from '@prisma/client';
import request from 'supertest';
import {
  bootstrapFinanceE2eContext,
  cleanupFinanceBillingFixture,
  createFinanceAuthHeader,
  createFinanceBillingFixture,
  dateOnly,
  decimalToNumber,
  ensureFinancePostingAccountByCode,
  type FinanceBillingFixture,
  type FinanceE2eContext,
  teardownFinanceE2eContext,
} from './finance-test-helpers';

jest.setTimeout(45000);

type CommunityContributionBody = {
  id: string;
  receivedAmount: string | number;
  exemptionAmount: string | number;
  invoice: {
    id: string;
    status: string;
    totalAmount: string | number;
  } | null;
  journalEntry: {
    id: string;
    status: string;
  } | null;
};

type CommunityBridgeFixture = {
  termId: string;
  monthId: string;
  requiredAmountId: number;
  communityRevenueAccountId: number;
  createdRevenueAccountId: number | null;
  createdGatewayId: number | null;
};

describe('Finance Community Contributions (e2e)', () => {
  let context: FinanceE2eContext | null = null;
  let fixture: FinanceBillingFixture | null = null;
  let bridgeFixture: CommunityBridgeFixture | null = null;

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
    if (context && bridgeFixture) {
      await cleanupCommunityBridgeFixture(context, bridgeFixture, fixture);
      bridgeFixture = null;
    }

    if (context && fixture) {
      await cleanupFinanceBillingFixture(context, fixture);
      fixture = null;
    }
  });

  afterAll(async () => {
    await teardownFinanceE2eContext(context);
    context = null;
  });

  it('auto-bridges a contribution into invoice and payment journal using the community revenue account', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceBillingFixture(context);
    bridgeFixture = await createCommunityBridgeFixture(context, fixture, 500);

    const response = await request(httpServer())
      .post('/finance/community-contributions')
      .set(authHeader())
      .send({
        enrollmentId: fixture.enrollmentId,
        academicYearId: fixture.academicYearId,
        semesterId: bridgeFixture.termId,
        monthId: bridgeFixture.monthId,
        paymentDate: dateOnly(fixture.startDate),
        requiredAmountId: bridgeFixture.requiredAmountId,
        receivedAmount: 500,
        payerName: 'ولي أمر تجريبي',
        receiptNumber: `CCR-${fixture.suffix.slice(-8)}`,
        autoBridge: true,
      })
      .expect(201);

    const body = response.body as CommunityContributionBody;

    expect(decimalToNumber(body.receivedAmount)).toBe(500);
    expect(body.invoice?.id).toBeTruthy();
    expect(body.invoice?.status).toBe(InvoiceStatus.PAID);
    expect(decimalToNumber(body.invoice?.totalAmount ?? 0)).toBe(500);
    expect(body.journalEntry?.id).toBeTruthy();

    const [linkedContribution, invoice, installment, journalLines] =
      await Promise.all([
        context.prisma.communityContribution.findUniqueOrThrow({
          where: { id: BigInt(body.id) },
          select: {
            invoiceId: true,
            journalEntryId: true,
          },
        }),
        context.prisma.studentInvoice.findUniqueOrThrow({
          where: { id: BigInt(body.invoice!.id) },
          select: {
            status: true,
            paidAmount: true,
            totalAmount: true,
          },
        }),
        context.prisma.invoiceInstallment.findFirstOrThrow({
          where: { invoiceId: BigInt(body.invoice!.id) },
          select: {
            status: true,
            paidAmount: true,
          },
        }),
        context.prisma.journalEntryLine.findMany({
          where: { journalEntryId: body.journalEntry!.id },
          orderBy: { lineNumber: 'asc' },
          select: {
            lineNumber: true,
            accountId: true,
            debitAmount: true,
            creditAmount: true,
          },
        }),
      ]);

    expect(linkedContribution.invoiceId?.toString()).toBe(body.invoice?.id);
    expect(linkedContribution.journalEntryId).toBe(
      body.journalEntry?.id ?? null,
    );
    expect(invoice.status).toBe(InvoiceStatus.PAID);
    expect(decimalToNumber(invoice.paidAmount)).toBe(500);
    expect(decimalToNumber(invoice.totalAmount)).toBe(500);
    expect(installment.status).toBe('PAID');
    expect(decimalToNumber(installment.paidAmount)).toBe(500);
    expect(journalLines).toHaveLength(2);
    expect(journalLines[0]?.lineNumber).toBe(1);
    expect(decimalToNumber(journalLines[0]?.debitAmount ?? 0)).toBe(500);
    expect(journalLines[1]?.lineNumber).toBe(2);
    expect(decimalToNumber(journalLines[1]?.creditAmount ?? 0)).toBe(500);
    expect(journalLines[1]?.accountId).toBe(
      bridgeFixture.communityRevenueAccountId,
    );
  });

  it('creates only an invoice when autoBridge is enabled without a received amount', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceBillingFixture(context);
    bridgeFixture = await createCommunityBridgeFixture(context, fixture, 500);

    const response = await request(httpServer())
      .post('/finance/community-contributions')
      .set(authHeader())
      .send({
        enrollmentId: fixture.enrollmentId,
        academicYearId: fixture.academicYearId,
        semesterId: bridgeFixture.termId,
        monthId: bridgeFixture.monthId,
        paymentDate: dateOnly(fixture.startDate),
        requiredAmountId: bridgeFixture.requiredAmountId,
        receivedAmount: 0,
        exemptionAmount: 100,
        isExempt: true,
        autoBridge: true,
      })
      .expect(201);

    const body = response.body as CommunityContributionBody;

    expect(decimalToNumber(body.receivedAmount)).toBe(0);
    expect(decimalToNumber(body.exemptionAmount)).toBe(100);
    expect(body.invoice?.id).toBeTruthy();
    expect(body.invoice?.status).toBe(InvoiceStatus.ISSUED);
    expect(decimalToNumber(body.invoice?.totalAmount ?? 0)).toBe(400);
    expect(body.journalEntry).toBeNull();

    const [linkedContribution, invoice] = await Promise.all([
      context.prisma.communityContribution.findUniqueOrThrow({
        where: { id: BigInt(body.id) },
        select: {
          invoiceId: true,
          journalEntryId: true,
        },
      }),
      context.prisma.studentInvoice.findUniqueOrThrow({
        where: { id: BigInt(body.invoice!.id) },
        select: {
          status: true,
          paidAmount: true,
          totalAmount: true,
          discountAmount: true,
        },
      }),
    ]);

    expect(linkedContribution.invoiceId?.toString()).toBe(body.invoice?.id);
    expect(linkedContribution.journalEntryId).toBeNull();
    expect(invoice.status).toBe(InvoiceStatus.ISSUED);
    expect(decimalToNumber(invoice.paidAmount)).toBe(0);
    expect(decimalToNumber(invoice.totalAmount)).toBe(400);
    expect(decimalToNumber(invoice.discountAmount)).toBe(100);
  });
});

async function createCommunityBridgeFixture(
  context: FinanceE2eContext,
  fixture: FinanceBillingFixture,
  amountValue: number,
): Promise<CommunityBridgeFixture> {
  const communityRevenueAccount = await ensureFinancePostingAccountByCode(
    context,
    {
      accountCode: '4002',
      nameAr: 'إيراد المساهمة المجتمعية',
      nameEn: 'Community Contribution Revenue',
      accountType: AccountType.REVENUE,
      normalBalance: NormalBalance.CREDIT,
    },
  );

  const cashAccount = await ensureFinancePostingAccountByCode(context, {
    accountCode: '1101',
    nameAr: 'النقدية',
    nameEn: 'Cash',
    accountType: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
  });

  const existingGateway = await context.prisma.paymentGateway.findFirst({
    where: {
      providerCode: 'CASH',
      isActive: true,
    },
    select: { id: true },
  });

  let createdGatewayId: number | null = null;

  if (!existingGateway) {
    const createdGateway = await context.prisma.paymentGateway.create({
      data: {
        providerCode: 'CASH',
        nameAr: 'نقدي',
        nameEn: 'Cash',
        gatewayType: PaymentGatewayType.OFFLINE,
        settlementAccountId: cashAccount.id,
        isActive: true,
      },
      select: { id: true },
    });
    createdGatewayId = createdGateway.id;
  }

  const term = await context.prisma.academicTerm.create({
    data: {
      academicYearId: fixture.academicYearId,
      code: `TERM-${fixture.suffix.slice(-8)}`.slice(0, 40),
      name: `فصل مالي ${fixture.suffix.slice(-6)}`.slice(0, 120),
      termType: AcademicTermType.SEMESTER,
      sequence: 1,
      startDate: fixture.startDate,
      endDate: fixture.startDate,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: { id: true },
  });

  const month = await context.prisma.academicMonth.create({
    data: {
      academicYearId: fixture.academicYearId,
      academicTermId: term.id,
      code: `MON-${fixture.suffix.slice(-8)}`.slice(0, 40),
      name: `شهر مالي ${fixture.suffix.slice(-6)}`.slice(0, 120),
      sequence: 1,
      startDate: fixture.startDate,
      endDate: fixture.startDate,
      isCurrent: true,
      isActive: true,
      createdById: context.adminUserId,
      updatedById: context.adminUserId,
    },
    select: { id: true },
  });

  const requiredAmount = await context.prisma.lookupContributionAmount.create({
    data: {
      nameAr: `مساهمة ${fixture.suffix.slice(-6)}`.slice(0, 50),
      amountValue,
      isActive: true,
    },
    select: { id: true },
  });

  return {
    termId: term.id,
    monthId: month.id,
    requiredAmountId: requiredAmount.id,
    communityRevenueAccountId: communityRevenueAccount.id,
    createdRevenueAccountId: communityRevenueAccount.created
      ? communityRevenueAccount.id
      : null,
    createdGatewayId,
  };
}

async function cleanupCommunityBridgeFixture(
  context: FinanceE2eContext,
  fixture: CommunityBridgeFixture,
  billingFixture: FinanceBillingFixture | null,
) {
  const relatedTransactionIds = billingFixture
    ? (
        await context.prisma.paymentTransaction.findMany({
          where: {
            OR: [
              { enrollmentId: billingFixture.enrollmentId },
              { invoice: { enrollmentId: billingFixture.enrollmentId } },
              ...(fixture.createdGatewayId
                ? [{ gatewayId: fixture.createdGatewayId }]
                : []),
            ],
          },
          select: { id: true },
        })
      ).map((transaction) => transaction.id)
    : [];

  if (relatedTransactionIds.length > 0) {
    await context.prisma.paymentWebhookEvent.deleteMany({
      where: {
        transactionId: {
          in: relatedTransactionIds,
        },
      },
    });

    await context.prisma.paymentTransaction.deleteMany({
      where: {
        id: {
          in: relatedTransactionIds,
        },
      },
    });
  }

  await context.prisma.communityContribution.deleteMany({
    where: {
      monthId: fixture.monthId,
    },
  });

  await context.prisma.academicMonth.delete({
    where: { id: fixture.monthId },
  });

  await context.prisma.academicTerm.delete({
    where: { id: fixture.termId },
  });

  await context.prisma.lookupContributionAmount.delete({
    where: { id: fixture.requiredAmountId },
  });

  if (fixture.createdGatewayId) {
    await context.prisma.paymentGateway.delete({
      where: { id: fixture.createdGatewayId },
    });
  }

  if (fixture.createdRevenueAccountId) {
    await context.prisma.chartOfAccount.delete({
      where: { id: fixture.createdRevenueAccountId },
    });
  }
}
