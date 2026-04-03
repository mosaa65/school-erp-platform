import {
  AccountType,
  BankReconciliationStatus,
  NormalBalance,
  PaymentGatewayType,
  PaymentMethod,
  PaymentTransactionStatus,
  ReconciliationItemType,
} from '@prisma/client';
import request from 'supertest';
import {
  bootstrapFinanceE2eContext,
  cleanupFinanceJournalFixture,
  createFinanceAuthHeader,
  createFinanceJournalFixture,
  dateOnly,
  deleteJournalEntriesForAccounts,
  type FinanceE2eContext,
  type FinanceJournalFixture,
  teardownFinanceE2eContext,
} from './finance-test-helpers';

jest.setTimeout(45000);

type JournalEntryBody = {
  id: string;
  status: string;
};

type PaymentTransactionBody = {
  id: string;
  transactionNumber: string;
  status: string;
  receiptNumber?: string | null;
};

type BankReconciliationBody = {
  id: string;
  status: string;
  statementReference?: string | null;
  reconciledAt?: string | null;
  reconciledByUser?: {
    id: string;
    email: string;
  } | null;
  items: Array<{
    id: string;
    itemType: string;
    bankReference?: string | null;
    paymentTransaction?: {
      id: string;
      transactionNumber: string;
    } | null;
    journalEntry?: {
      id: string;
      entryNumber: string;
    } | null;
  }>;
};

type ErrorEnvelope = {
  error: {
    message: string | string[];
  };
};

describe('Finance Bank Reconciliations (e2e)', () => {
  let context: FinanceE2eContext | null = null;
  let fixture: FinanceJournalFixture | null = null;
  const createdBankAccountIds: number[] = [];
  const createdGatewayIds: number[] = [];
  const createdTransactionIds: bigint[] = [];
  const createdReconciliationIds: bigint[] = [];

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

    if (createdReconciliationIds.length > 0) {
      await context.prisma.bankReconciliation.deleteMany({
        where: {
          id: {
            in: createdReconciliationIds,
          },
        },
      });
    }

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

    if (fixture) {
      await context.prisma.documentSequence.deleteMany({
        where: {
          fiscalYearId: fixture.fiscalYearId,
          documentType: {
            in: ['PAYMENT', 'RECEIPT'],
          },
        },
      });
    }

    if (createdBankAccountIds.length > 0) {
      await deleteJournalEntriesForAccounts(context, createdBankAccountIds);

      await context.prisma.chartOfAccount.deleteMany({
        where: {
          id: {
            in: createdBankAccountIds,
          },
        },
      });
    }

    if (fixture) {
      await cleanupFinanceJournalFixture(context, fixture);
      fixture = null;
    }

    createdBankAccountIds.length = 0;
    createdGatewayIds.length = 0;
    createdTransactionIds.length = 0;
    createdReconciliationIds.length = 0;
  });

  afterAll(async () => {
    await teardownFinanceE2eContext(context);
    context = null;
  });

  it('creates reconciliation items, prevents duplicate matches, and closes the reconciliation', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceJournalFixture(context);

    const bankAccountId = await createBankAccount(context, fixture);
    const paymentTransaction = await createCompletedPaymentTransaction(
      context,
      fixture,
    );
    const postedJournalEntry = await createPostedJournalEntry(context, fixture);

    const reconciliationResponse = await request(httpServer())
      .post('/finance/bank-reconciliations')
      .set(authHeader())
      .send({
        bankAccountId,
        statementDate: dateOnly(fixture.startDate),
        statementReference: `STMT-${fixture.suffix.slice(-8)}`,
        bankBalance: 1250,
        bookBalance: 1000,
        notes: 'Monthly bank reconciliation test',
      })
      .expect(201);

    const reconciliation = reconciliationResponse.body as BankReconciliationBody;
    createdReconciliationIds.push(BigInt(reconciliation.id));

    expect(reconciliation.status).toBe(BankReconciliationStatus.OPEN);
    expect(reconciliation.statementReference).toContain('STMT-');
    expect(reconciliation.items).toHaveLength(0);

    const matchedTransactionResponse = await request(httpServer())
      .post(`/finance/bank-reconciliations/${reconciliation.id}/items`)
      .set(authHeader())
      .send({
        transactionId: paymentTransaction.id,
        amount: 300,
        itemType: ReconciliationItemType.MATCHED,
      })
      .expect(201);

    const matchedTransactionItem = matchedTransactionResponse.body as
      BankReconciliationBody['items'][number];
    expect(matchedTransactionItem.itemType).toBe(ReconciliationItemType.MATCHED);
    expect(matchedTransactionItem.paymentTransaction?.id).toBe(
      paymentTransaction.id,
    );

    const unmatchedBankResponse = await request(httpServer())
      .post(`/finance/bank-reconciliations/${reconciliation.id}/items`)
      .set(authHeader())
      .send({
        bankReference: `BANK-${fixture.suffix.slice(-8)}`,
        amount: 250,
        itemType: ReconciliationItemType.UNMATCHED_BANK,
      })
      .expect(201);

    const unmatchedBankItem = unmatchedBankResponse.body as
      BankReconciliationBody['items'][number];
    expect(unmatchedBankItem.itemType).toBe(
      ReconciliationItemType.UNMATCHED_BANK,
    );
    expect(unmatchedBankItem.bankReference).toContain('BANK-');

    const matchedJournalResponse = await request(httpServer())
      .post(`/finance/bank-reconciliations/${reconciliation.id}/items`)
      .set(authHeader())
      .send({
        journalEntryId: postedJournalEntry.id,
        amount: 450,
        itemType: ReconciliationItemType.MATCHED,
      })
      .expect(201);

    const matchedJournalItem = matchedJournalResponse.body as
      BankReconciliationBody['items'][number];
    expect(matchedJournalItem.itemType).toBe(ReconciliationItemType.MATCHED);
    expect(matchedJournalItem.journalEntry?.id).toBe(postedJournalEntry.id);

    const duplicateResponse = await request(httpServer())
      .post(`/finance/bank-reconciliations/${reconciliation.id}/items`)
      .set(authHeader())
      .send({
        transactionId: paymentTransaction.id,
        amount: 300,
        itemType: ReconciliationItemType.MATCHED,
      })
      .expect(409);

    const duplicateError = duplicateResponse.body as ErrorEnvelope;
    expect(stringifyErrorMessage(duplicateError)).toContain(
      'Transaction already matched',
    );

    const closeResponse = await request(httpServer())
      .patch(`/finance/bank-reconciliations/${reconciliation.id}`)
      .set(authHeader())
      .send({
        status: BankReconciliationStatus.RECONCILED,
        notes: 'Closed after review',
      })
      .expect(200);

    const closedReconciliation = closeResponse.body as BankReconciliationBody;
    expect(closedReconciliation.status).toBe(
      BankReconciliationStatus.RECONCILED,
    );
    expect(closedReconciliation.reconciledAt).toBeTruthy();
    expect(closedReconciliation.reconciledByUser?.email).toBe(
      'admin@school.local',
    );

    const closedAddItemResponse = await request(httpServer())
      .post(`/finance/bank-reconciliations/${reconciliation.id}/items`)
      .set(authHeader())
      .send({
        bankReference: 'BANK-CLOSED',
        amount: 100,
        itemType: ReconciliationItemType.UNMATCHED_BANK,
      })
      .expect(400);

    const closedAddItemError = closedAddItemResponse.body as ErrorEnvelope;
    expect(stringifyErrorMessage(closedAddItemError)).toContain(
      'Reconciliation is already closed',
    );

    const detailResponse = await request(httpServer())
      .get(`/finance/bank-reconciliations/${reconciliation.id}`)
      .set(authHeader())
      .expect(200);

    const detail = detailResponse.body as BankReconciliationBody;
    expect(detail.status).toBe(BankReconciliationStatus.RECONCILED);
    expect(detail.items).toHaveLength(3);
    expect(detail.items.some((item) => item.paymentTransaction?.id === paymentTransaction.id)).toBe(true);
    expect(detail.items.some((item) => item.journalEntry?.id === postedJournalEntry.id)).toBe(true);
    expect(detail.items.some((item) => item.itemType === ReconciliationItemType.UNMATCHED_BANK)).toBe(true);
  });

  it('rejects creating a reconciliation against a non-bank account', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceJournalFixture(context);

    const response = await request(httpServer())
      .post('/finance/bank-reconciliations')
      .set(authHeader())
      .send({
        bankAccountId: fixture.debitAccountId,
        statementDate: dateOnly(fixture.startDate),
        bankBalance: 500,
        bookBalance: 500,
      })
      .expect(400);

    const errorBody = response.body as ErrorEnvelope;
    expect(stringifyErrorMessage(errorBody)).toContain(
      'Account is not marked as a bank account',
    );
  });

  it('auto-matches eligible completed payment transactions and moves the reconciliation to in-progress', async () => {
    if (!context) {
      throw new Error('Finance e2e context is not initialized.');
    }

    fixture = await createFinanceJournalFixture(context);

    const bankAccountId = await createBankAccount(context, fixture);
    const gateway = await createGatewayForBankAccount(context, fixture, bankAccountId);
    const firstTransaction = await createCompletedPaymentTransaction(
      context,
      fixture,
      gateway.id,
      420,
    );
    const secondTransaction = await createCompletedPaymentTransaction(
      context,
      fixture,
      gateway.id,
      180,
    );

    await reconcilePaymentTransaction(context, firstTransaction.id);
    await reconcilePaymentTransaction(context, secondTransaction.id);

    const reconciliationResponse = await request(httpServer())
      .post('/finance/bank-reconciliations')
      .set(authHeader())
      .send({
        bankAccountId,
        statementDate: dateOnly(fixture.startDate),
        statementReference: `AUTO-${fixture.suffix.slice(-8)}`,
        bankBalance: 600,
        bookBalance: 600,
      })
      .expect(201);

    const reconciliation = reconciliationResponse.body as BankReconciliationBody;
    createdReconciliationIds.push(BigInt(reconciliation.id));

    const autoMatchResponse = await request(httpServer())
      .post(`/finance/bank-reconciliations/${reconciliation.id}/auto-match-transactions`)
      .set(authHeader())
      .expect(201);

    const autoMatchBody = autoMatchResponse.body as {
      matchedCount: number;
      totalMatchedAmount: number;
      reconciliation: BankReconciliationBody;
    };

    expect(autoMatchBody.matchedCount).toBe(2);
    expect(autoMatchBody.totalMatchedAmount).toBe(600);
    expect(autoMatchBody.reconciliation.status).toBe(
      BankReconciliationStatus.IN_PROGRESS,
    );
    expect(autoMatchBody.reconciliation.items).toHaveLength(2);
    expect(
      autoMatchBody.reconciliation.items.every(
        (item) => item.itemType === ReconciliationItemType.MATCHED,
      ),
    ).toBe(true);

    const secondAutoMatchResponse = await request(httpServer())
      .post(`/finance/bank-reconciliations/${reconciliation.id}/auto-match-transactions`)
      .set(authHeader())
      .expect(201);

    const secondAutoMatchBody = secondAutoMatchResponse.body as {
      matchedCount: number;
      totalMatchedAmount: number;
    };

    expect(secondAutoMatchBody.matchedCount).toBe(0);
    expect(secondAutoMatchBody.totalMatchedAmount).toBe(0);
  });

  async function createBankAccount(
    activeContext: FinanceE2eContext,
    activeFixture: FinanceJournalFixture,
  ) {
    const bankAccount = await activeContext.prisma.chartOfAccount.create({
      data: {
        accountCode: `BNK${activeFixture.suffix.slice(-8)}`.slice(0, 20),
        nameAr: `حساب بنك اختبار ${activeFixture.suffix}`.slice(0, 100),
        nameEn: `Finance Test Bank ${activeFixture.suffix}`.slice(0, 100),
        accountType: AccountType.ASSET,
        hierarchyLevel: 1,
        isHeader: false,
        isBankAccount: true,
        normalBalance: NormalBalance.DEBIT,
        currentBalance: 0,
        isSystem: false,
        isActive: true,
        branchId: activeFixture.branchId,
        createdById: activeContext.adminUserId,
        updatedById: activeContext.adminUserId,
      },
      select: {
        id: true,
      },
    });

    createdBankAccountIds.push(bankAccount.id);

    return bankAccount.id;
  }

  async function createGatewayForBankAccount(
    activeContext: FinanceE2eContext,
    activeFixture: FinanceJournalFixture,
    bankAccountId: number,
  ) {
    const gateway = await activeContext.prisma.paymentGateway.create({
      data: {
        nameAr: `بوابة تسوية ${activeFixture.suffix}`,
        nameEn: `Reconciliation Gateway ${activeFixture.suffix}`.slice(0, 100),
        providerCode: `RCN${activeFixture.suffix.slice(-8)}`.slice(0, 20),
        gatewayType: PaymentGatewayType.ONLINE,
        settlementAccountId: bankAccountId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    createdGatewayIds.push(gateway.id);

    return gateway;
  }

  async function createCompletedPaymentTransaction(
    activeContext: FinanceE2eContext,
    activeFixture: FinanceJournalFixture,
    gatewayId?: number,
    amount = 300,
  ) {
    const gateway =
      gatewayId !== undefined
        ? { id: gatewayId }
        : await createGatewayForBankAccount(
            activeContext,
            activeFixture,
            activeFixture.debitAccountId,
          );

    const response = await request(httpServer())
      .post('/finance/payment-transactions')
      .set(authHeader())
      .send({
        gatewayId: gateway.id,
        amount,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: PaymentTransactionStatus.COMPLETED,
        paidAt: activeFixture.startDate.toISOString(),
        payerName: 'Parent Reconciliation',
        payerPhone: '500000001',
        notes: 'Bank reconciliation e2e payment',
      })
      .expect(201);

    const paymentTransaction = response.body as PaymentTransactionBody;
    createdTransactionIds.push(BigInt(paymentTransaction.id));

    expect(paymentTransaction.status).toBe(PaymentTransactionStatus.COMPLETED);
    expect(paymentTransaction.receiptNumber).toContain('RCP-');

    return paymentTransaction;
  }

  async function reconcilePaymentTransaction(
    activeContext: FinanceE2eContext,
    transactionId: string,
  ) {
    const response = await request(activeContext.httpServer())
      .post(`/finance/payment-transactions/${transactionId}/reconcile`)
      .set(authHeader())
      .expect(201);

    return response.body as PaymentTransactionBody;
  }

  async function createPostedJournalEntry(
    activeContext: FinanceE2eContext,
    activeFixture: FinanceJournalFixture,
  ) {
    const createResponse = await request(httpServer())
      .post('/finance/journal-entries')
      .set(authHeader())
      .send({
        entryDate: dateOnly(activeFixture.startDate),
        fiscalYearId: activeFixture.fiscalYearId,
        fiscalPeriodId: activeFixture.fiscalPeriodId,
        branchId: activeFixture.branchId,
        description: `قيد تسوية ${activeFixture.suffix}`,
        lines: [
          {
            accountId: activeFixture.debitAccountId,
            description: 'Debit bank reconciliation line',
            debitAmount: 450,
          },
          {
            accountId: activeFixture.creditAccountId,
            description: 'Credit bank reconciliation line',
            creditAmount: 450,
          },
        ],
      })
      .expect(201);

    const createdEntry = createResponse.body as JournalEntryBody;

    await request(httpServer())
      .patch(`/finance/journal-entries/${createdEntry.id}/approve`)
      .set(authHeader())
      .expect(200);

    const postResponse = await request(httpServer())
      .patch(`/finance/journal-entries/${createdEntry.id}/post`)
      .set(authHeader())
      .expect(200);

    const postedEntry = postResponse.body as JournalEntryBody;
    expect(postedEntry.status).toBe('POSTED');

    return postedEntry;
  }
});

function stringifyErrorMessage(error: ErrorEnvelope) {
  return Array.isArray(error.error.message)
    ? error.error.message.join(' | ')
    : error.error.message;
}
