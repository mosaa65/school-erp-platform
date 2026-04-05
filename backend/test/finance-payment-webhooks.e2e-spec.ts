import { createHmac } from 'crypto';
import {
  AccountType,
  DocumentType,
  NormalBalance,
  PaymentGatewayType,
  PaymentMethod,
  PaymentTransactionStatus,
} from '@prisma/client';
import request from 'supertest';
import {
  bootstrapFinanceE2eContext,
  cleanupFinanceJournalFixture,
  createFinanceJournalFixture,
  decimalToNumber,
  ensureFinancePostingAccountByCode,
  type FinanceE2eContext,
  type FinanceJournalFixture,
  teardownFinanceE2eContext,
} from './finance-test-helpers';

jest.setTimeout(30000);

const WEBHOOK_SECRET = 'finance-webhook-test-secret';

type WebhookResponseBody = {
  success: boolean;
  duplicate: boolean;
  transactionId: string;
  journalEntryId?: string;
};

describe('Finance Payment Webhooks (e2e)', () => {
  let context: FinanceE2eContext | null = null;
  let fixture: FinanceJournalFixture | null = null;
  const createdGatewayIds: number[] = [];
  const createdTransactionIds: bigint[] = [];
  const createdAccountIds: number[] = [];

  beforeAll(async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = WEBHOOK_SECRET;
    delete process.env.PAYMENT_WEBHOOK_IP_WHITELIST;

    context = await bootstrapFinanceE2eContext();
  });

  afterEach(async () => {
    if (!context) {
      return;
    }

    if (fixture) {
      await context.prisma.paymentWebhookEvent.deleteMany({
        where: {
          OR: [
            createdTransactionIds.length
              ? {
                  transactionId: {
                    in: createdTransactionIds,
                  },
                }
              : undefined,
            createdGatewayIds.length
              ? {
                  gatewayId: {
                    in: createdGatewayIds,
                  },
                }
              : undefined,
          ].filter(Boolean),
        },
      });

      if (createdTransactionIds.length > 0) {
        await context.prisma.paymentTransaction.deleteMany({
          where: {
            id: {
              in: createdTransactionIds,
            },
          },
        });
      }

      if (createdGatewayIds.length > 0) {
        await context.prisma.paymentGateway.deleteMany({
          where: {
            id: {
              in: createdGatewayIds,
            },
          },
        });
      }

      await context.prisma.journalEntry.deleteMany({
        where: {
          fiscalYearId: fixture.fiscalYearId,
        },
      });

      await context.prisma.documentSequence.deleteMany({
        where: {
          documentType: DocumentType.JOURNAL_ENTRY,
          fiscalYearId: fixture.fiscalYearId,
        },
      });

      if (createdAccountIds.length > 0) {
        await context.prisma.chartOfAccount.deleteMany({
          where: {
            id: {
              in: createdAccountIds,
            },
          },
        });
      }

      await cleanupFinanceJournalFixture(context, fixture);
      fixture = null;
    }

    createdGatewayIds.length = 0;
    createdTransactionIds.length = 0;
    createdAccountIds.length = 0;
  });

  afterAll(async () => {
    await teardownFinanceE2eContext(context);
    context = null;
    delete process.env.PAYMENT_WEBHOOK_SECRET;
  });

  it('processes payment success and ignores a duplicate success webhook', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const paymentFixture = await createPendingPaymentFixture(context);
    const beforeSettlement = await readAccountBalance(
      context,
      paymentFixture.gateway.settlementAccountId!,
    );
    const beforeRevenue = await readAccountBalance(
      context,
      paymentFixture.revenueAccountId,
    );

    const payload = {
      transactionId: paymentFixture.transaction.id.toString(),
      amount: paymentFixture.amount,
      providerCode: paymentFixture.gateway.providerCode,
      gatewayTransactionId: `GW-${fixture?.suffix ?? 'success'}`,
      paidAt: paymentFixture.paidAt.toISOString(),
      receiptNumber: `RCP-${fixture?.suffix?.slice(-8) ?? '00000000'}`,
      payerName: 'Webhook Parent',
      payerPhone: '500000000',
      eventId: `evt-success-${fixture?.suffix ?? 'x'}`,
      idempotencyKey: `idem-success-${fixture?.suffix ?? 'x'}`,
    };

    const successResponse = await request(context.httpServer())
      .post('/webhooks/payment/success')
      .set(buildWebhookHeaders(payload))
      .send(payload)
      .expect(201);

    const successBody = successResponse.body as WebhookResponseBody;
    expect(successBody.success).toBe(true);
    expect(successBody.duplicate).toBe(false);
    expect(successBody.transactionId).toBe(
      paymentFixture.transaction.id.toString(),
    );
    expect(successBody.journalEntryId).toBeTruthy();

    const [transactionAfterSuccess, webhookEvent, afterSettlement, afterRevenue] =
      await Promise.all([
        context.prisma.paymentTransaction.findUniqueOrThrow({
          where: { id: paymentFixture.transaction.id },
          select: {
            status: true,
            journalEntryId: true,
            gatewayTransactionId: true,
          },
        }),
        context.prisma.paymentWebhookEvent.findFirstOrThrow({
          where: {
            idempotencyKey: payload.idempotencyKey,
          },
          select: {
            status: true,
          },
        }),
        readAccountBalance(context, paymentFixture.gateway.settlementAccountId!),
        readAccountBalance(context, paymentFixture.revenueAccountId),
      ]);

    expect(transactionAfterSuccess.status).toBe(
      PaymentTransactionStatus.COMPLETED,
    );
    expect(transactionAfterSuccess.journalEntryId).toBe(successBody.journalEntryId);
    expect(transactionAfterSuccess.gatewayTransactionId).toBe(
      payload.gatewayTransactionId,
    );
    expect(webhookEvent.status).toBe('PROCESSED');
    expect(afterSettlement - beforeSettlement).toBe(paymentFixture.amount);
    expect(afterRevenue - beforeRevenue).toBe(-paymentFixture.amount);

    const duplicateResponse = await request(context.httpServer())
      .post('/webhooks/payment/success')
      .set(buildWebhookHeaders(payload))
      .send(payload)
      .expect(201);

    const duplicateBody = duplicateResponse.body as WebhookResponseBody;
    expect(duplicateBody.success).toBe(true);
    expect(duplicateBody.duplicate).toBe(true);

    const duplicateEventCount = await context.prisma.paymentWebhookEvent.count({
      where: {
        idempotencyKey: payload.idempotencyKey,
      },
    });

    expect(duplicateEventCount).toBe(1);
  });

  it('marks a pending payment transaction as failed from failure webhook', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const paymentFixture = await createPendingPaymentFixture(context);

    const payload = {
      transactionId: paymentFixture.transaction.id.toString(),
      providerCode: paymentFixture.gateway.providerCode,
      gatewayTransactionId: `GW-FAIL-${fixture?.suffix ?? 'x'}`,
      reason: 'Insufficient funds',
      eventId: `evt-failure-${fixture?.suffix ?? 'x'}`,
      idempotencyKey: `idem-failure-${fixture?.suffix ?? 'x'}`,
    };

    const response = await request(context.httpServer())
      .post('/webhooks/payment/failure')
      .set(buildWebhookHeaders(payload))
      .send(payload)
      .expect(201);

    const body = response.body as WebhookResponseBody;
    expect(body.success).toBe(true);
    expect(body.duplicate).toBe(false);

    const [transactionAfterFailure, eventAfterFailure] = await Promise.all([
      context.prisma.paymentTransaction.findUniqueOrThrow({
        where: { id: paymentFixture.transaction.id },
        select: {
          status: true,
          notes: true,
          gatewayTransactionId: true,
        },
      }),
      context.prisma.paymentWebhookEvent.findFirstOrThrow({
        where: {
          idempotencyKey: payload.idempotencyKey,
        },
        select: {
          status: true,
        },
      }),
    ]);

    expect(transactionAfterFailure.status).toBe(PaymentTransactionStatus.FAILED);
    expect(transactionAfterFailure.gatewayTransactionId).toBe(
      payload.gatewayTransactionId,
    );
    expect(transactionAfterFailure.notes).toContain('Webhook: Insufficient funds');
    expect(eventAfterFailure.status).toBe('PROCESSED');
  });

  it('refunds a completed payment and creates a reversal journal entry', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    const paymentFixture = await createPendingPaymentFixture(context);
    const beforeSettlement = await readAccountBalance(
      context,
      paymentFixture.gateway.settlementAccountId!,
    );
    const beforeRevenue = await readAccountBalance(
      context,
      paymentFixture.revenueAccountId,
    );

    const successPayload = {
      transactionId: paymentFixture.transaction.id.toString(),
      amount: paymentFixture.amount,
      providerCode: paymentFixture.gateway.providerCode,
      gatewayTransactionId: `GW-REFUND-${fixture?.suffix ?? 'x'}`,
      paidAt: paymentFixture.paidAt.toISOString(),
      eventId: `evt-refund-success-${fixture?.suffix ?? 'x'}`,
      idempotencyKey: `idem-refund-success-${fixture?.suffix ?? 'x'}`,
    };

    await request(context.httpServer())
      .post('/webhooks/payment/success')
      .set(buildWebhookHeaders(successPayload))
      .send(successPayload)
      .expect(201);

    const transactionAfterSuccess = await context.prisma.paymentTransaction.findUniqueOrThrow(
      {
        where: { id: paymentFixture.transaction.id },
        select: {
          journalEntryId: true,
        },
      },
    );

    const originalJournalEntryId = transactionAfterSuccess.journalEntryId;
    expect(originalJournalEntryId).toBeTruthy();

    const refundPayload = {
      transactionId: paymentFixture.transaction.id.toString(),
      amount: paymentFixture.amount,
      providerCode: paymentFixture.gateway.providerCode,
      gatewayTransactionId: successPayload.gatewayTransactionId,
      refundedAt: new Date(paymentFixture.paidAt.getTime() + 60_000).toISOString(),
      reason: 'Guardian refund request',
      eventId: `evt-refund-${fixture?.suffix ?? 'x'}`,
      idempotencyKey: `idem-refund-${fixture?.suffix ?? 'x'}`,
    };

    const refundResponse = await request(context.httpServer())
      .post('/webhooks/payment/refund')
      .set(buildWebhookHeaders(refundPayload))
      .send(refundPayload)
      .expect(201);

    const refundBody = refundResponse.body as WebhookResponseBody;
    expect(refundBody.success).toBe(true);
    expect(refundBody.duplicate).toBe(false);
    expect(refundBody.journalEntryId).toBeTruthy();
    expect(refundBody.journalEntryId).not.toBe(originalJournalEntryId);

    const [
      transactionAfterRefund,
      originalJournalEntry,
      reversalJournalEntry,
      eventAfterRefund,
      settlementAfterRefund,
      revenueAfterRefund,
    ] = await Promise.all([
      context.prisma.paymentTransaction.findUniqueOrThrow({
        where: { id: paymentFixture.transaction.id },
        select: {
          status: true,
        },
      }),
      context.prisma.journalEntry.findUniqueOrThrow({
        where: { id: originalJournalEntryId! },
        select: {
          status: true,
          reversalReason: true,
        },
      }),
      context.prisma.journalEntry.findUniqueOrThrow({
        where: { id: refundBody.journalEntryId! },
        select: {
          isReversal: true,
          reversalOfId: true,
          status: true,
        },
      }),
      context.prisma.paymentWebhookEvent.findFirstOrThrow({
        where: {
          idempotencyKey: refundPayload.idempotencyKey,
        },
        select: {
          status: true,
        },
      }),
      readAccountBalance(context, paymentFixture.gateway.settlementAccountId!),
      readAccountBalance(context, paymentFixture.revenueAccountId),
    ]);

    expect(transactionAfterRefund.status).toBe(
      PaymentTransactionStatus.REFUNDED,
    );
    expect(originalJournalEntry.status).toBe('REVERSED');
    expect(originalJournalEntry.reversalReason).toBe('Guardian refund request');
    expect(reversalJournalEntry.isReversal).toBe(true);
    expect(reversalJournalEntry.reversalOfId).toBe(originalJournalEntryId);
    expect(reversalJournalEntry.status).toBe('POSTED');
    expect(eventAfterRefund.status).toBe('PROCESSED');
    expect(settlementAfterRefund).toBe(beforeSettlement);
    expect(revenueAfterRefund).toBe(beforeRevenue);
  });

  async function createPendingPaymentFixture(activeContext: FinanceE2eContext) {
    fixture = await createFinanceJournalFixture(activeContext);

    const revenueAccount = await ensureFinancePostingAccountByCode(activeContext, {
      accountCode: '4001',
      nameAr: 'إيراد الرسوم الافتراضي',
      nameEn: 'Default Tuition Revenue',
      accountType: AccountType.REVENUE,
      normalBalance: NormalBalance.CREDIT,
    });

    if (revenueAccount.created) {
      createdAccountIds.push(revenueAccount.id);
    }

    const gateway = await activeContext.prisma.paymentGateway.create({
      data: {
        nameAr: `بوابة اختبار ${fixture.suffix}`,
        nameEn: `Webhook Test Gateway ${fixture.suffix}`,
        providerCode: `GW${fixture.suffix.slice(-8)}`.slice(0, 20),
        gatewayType: PaymentGatewayType.ONLINE,
        settlementAccountId: fixture.debitAccountId,
        isActive: true,
      },
      select: {
        id: true,
        providerCode: true,
        settlementAccountId: true,
      },
    });
    createdGatewayIds.push(gateway.id);

    const transaction = await activeContext.prisma.paymentTransaction.create({
      data: {
        transactionNumber: `PTX${fixture.suffix.slice(-10)}`.slice(0, 30),
        gatewayId: gateway.id,
        amount: 175,
        paymentMethod: PaymentMethod.CARD,
        status: PaymentTransactionStatus.PENDING,
        notes: 'Webhook e2e transaction',
        createdByUserId: activeContext.adminUserId,
      },
      select: {
        id: true,
      },
    });
    createdTransactionIds.push(transaction.id);

    return {
      gateway,
      transaction,
      revenueAccountId: revenueAccount.id,
      amount: 175,
      paidAt: new Date(fixture.startDate),
    };
  }
});

function buildWebhookHeaders(payload: Record<string, unknown>) {
  const rawBody = JSON.stringify(payload);
  const signature = createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return {
    'x-payment-signature': `sha256=${signature}`,
  };
}

async function readAccountBalance(
  context: FinanceE2eContext,
  accountId: number,
) {
  const account = await context.prisma.chartOfAccount.findUniqueOrThrow({
    where: { id: accountId },
    select: {
      currentBalance: true,
    },
  });

  return decimalToNumber(account.currentBalance);
}
