import request from 'supertest';
import {
  cleanupFinanceJournalFixture,
  createFinanceAuthHeader,
  createFinanceJournalFixture,
  dateOnly,
  decimalToNumber,
  type FinanceE2eContext,
  type FinanceJournalFixture,
  bootstrapFinanceE2eContext,
  teardownFinanceE2eContext,
} from './finance-test-helpers';

jest.setTimeout(30000);

type JournalEntryBody = {
  id: string;
  entryNumber: string;
  status: string;
  totalDebit: string | number;
  totalCredit: string | number;
  isReversal?: boolean;
  reversalOfId?: string | null;
};

type ErrorEnvelope = {
  error: {
    message: string | string[];
  };
};

describe('Finance Journal Entries (e2e)', () => {
  let context: FinanceE2eContext | null = null;
  let fixture: FinanceJournalFixture | null = null;

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
      await cleanupFinanceJournalFixture(context, fixture);
      fixture = null;
    }
  });

  afterAll(async () => {
    await teardownFinanceE2eContext(context);
    context = null;
  });

  it('creates, approves, posts, and reverses a balanced journal entry', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceJournalFixture(context);

    const createResponse = await request(httpServer())
      .post('/finance/journal-entries')
      .set(authHeader())
      .send({
        entryDate: dateOnly(new Date(Date.UTC(2040, 1, 1))),
        fiscalYearId: fixture.fiscalYearId,
        fiscalPeriodId: fixture.fiscalPeriodId,
        branchId: fixture.branchId,
        description: `قيد اختبار ${fixture.suffix}`,
        lines: [
          {
            accountId: fixture.debitAccountId,
            description: 'Debit line',
            debitAmount: 250,
          },
          {
            accountId: fixture.creditAccountId,
            description: 'Credit line',
            creditAmount: 250,
          },
        ],
      })
      .expect(201);

    const createdEntry = createResponse.body as JournalEntryBody;
    expect(createdEntry.status).toBe('DRAFT');
    expect(decimalToNumber(createdEntry.totalDebit)).toBe(250);
    expect(decimalToNumber(createdEntry.totalCredit)).toBe(250);
    expect(createdEntry.entryNumber).toContain('JE-');

    const approvedResponse = await request(httpServer())
      .patch(`/finance/journal-entries/${createdEntry.id}/approve`)
      .set(authHeader())
      .expect(200);

    const approvedEntry = approvedResponse.body as JournalEntryBody;
    expect(approvedEntry.status).toBe('APPROVED');

    const postedResponse = await request(httpServer())
      .patch(`/finance/journal-entries/${createdEntry.id}/post`)
      .set(authHeader())
      .expect(200);

    const postedEntry = postedResponse.body as JournalEntryBody;
    expect(postedEntry.status).toBe('POSTED');

    const [debitAfterPost, creditAfterPost] = await Promise.all([
      context.prisma.chartOfAccount.findUniqueOrThrow({
        where: { id: fixture.debitAccountId },
        select: { currentBalance: true },
      }),
      context.prisma.chartOfAccount.findUniqueOrThrow({
        where: { id: fixture.creditAccountId },
        select: { currentBalance: true },
      }),
    ]);

    expect(decimalToNumber(debitAfterPost.currentBalance)).toBe(250);
    expect(decimalToNumber(creditAfterPost.currentBalance)).toBe(-250);

    const reverseResponse = await request(httpServer())
      .post(`/finance/journal-entries/${createdEntry.id}/reverse`)
      .set(authHeader())
      .send({
        reason: 'Audit reversal',
      })
      .expect(201);

    const reversalEntry = reverseResponse.body as JournalEntryBody;
    expect(reversalEntry.status).toBe('POSTED');
    expect(reversalEntry.isReversal).toBe(true);
    expect(reversalEntry.reversalOfId).toBe(createdEntry.id);
    expect(reversalEntry.entryNumber).toContain('REV-');

    const [originalEntryAfterReverse, debitAfterReverse, creditAfterReverse] =
      await Promise.all([
        context.prisma.journalEntry.findUniqueOrThrow({
          where: { id: createdEntry.id },
          select: {
            status: true,
            reversalReason: true,
          },
        }),
        context.prisma.chartOfAccount.findUniqueOrThrow({
          where: { id: fixture.debitAccountId },
          select: { currentBalance: true },
        }),
        context.prisma.chartOfAccount.findUniqueOrThrow({
          where: { id: fixture.creditAccountId },
          select: { currentBalance: true },
        }),
      ]);

    expect(originalEntryAfterReverse.status).toBe('REVERSED');
    expect(originalEntryAfterReverse.reversalReason).toBe('Audit reversal');
    expect(decimalToNumber(debitAfterReverse.currentBalance)).toBe(0);
    expect(decimalToNumber(creditAfterReverse.currentBalance)).toBe(0);
  });

  it('rejects posting a draft journal entry before approval', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceJournalFixture(context);

    const createResponse = await request(httpServer())
      .post('/finance/journal-entries')
      .set(authHeader())
      .send({
        entryDate: dateOnly(new Date(Date.UTC(2040, 2, 1))),
        fiscalYearId: fixture.fiscalYearId,
        fiscalPeriodId: fixture.fiscalPeriodId,
        branchId: fixture.branchId,
        description: `قيد Draft ${fixture.suffix}`,
        lines: [
          {
            accountId: fixture.debitAccountId,
            description: 'Debit line',
            debitAmount: 125,
          },
          {
            accountId: fixture.creditAccountId,
            description: 'Credit line',
            creditAmount: 125,
          },
        ],
      })
      .expect(201);

    const createdEntry = createResponse.body as JournalEntryBody;

    const postResponse = await request(httpServer())
      .patch(`/finance/journal-entries/${createdEntry.id}/post`)
      .set(authHeader())
      .expect(400);

    const errorBody = postResponse.body as ErrorEnvelope;
    const message = Array.isArray(errorBody.error.message)
      ? errorBody.error.message.join(' | ')
      : errorBody.error.message;

    expect(message).toContain("Only APPROVED entries can be posted");
  });
});
