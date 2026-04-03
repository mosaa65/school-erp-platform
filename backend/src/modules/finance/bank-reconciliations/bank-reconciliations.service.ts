import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  BankReconciliationStatus,
  PaymentTransactionStatus,
  Prisma,
  ReconciliationItemType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto';
import { CreateReconciliationItemDto } from './dto/create-reconciliation-item.dto';
import { ListBankReconciliationsDto } from './dto/list-bank-reconciliations.dto';
import { UpdateBankReconciliationDto } from './dto/update-bank-reconciliation.dto';

const reconciliationItemInclude: Prisma.ReconciliationItemInclude = {
  paymentTransaction: {
    select: {
      id: true,
      transactionNumber: true,
      status: true,
      amount: true,
      paidAt: true,
      paymentMethod: true,
    },
  },
  journalEntry: {
    select: {
      id: true,
      entryNumber: true,
      status: true,
      entryDate: true,
    },
  },
};

const bankReconciliationSummaryInclude: Prisma.BankReconciliationInclude = {
  bankAccount: {
    select: {
      id: true,
      accountCode: true,
      nameAr: true,
      nameEn: true,
      accountType: true,
      isBankAccount: true,
    },
  },
  reconciledByUser: {
    select: {
      id: true,
      email: true,
    },
  },
};

const bankReconciliationDetailInclude: Prisma.BankReconciliationInclude = {
  ...bankReconciliationSummaryInclude,
  items: {
    orderBy: {
      id: 'asc',
    },
    include: reconciliationItemInclude,
  },
};

@Injectable()
export class BankReconciliationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateBankReconciliationDto, actorUserId: string) {
    await this.ensureBankAccount(payload.bankAccountId);

    const statementDate = new Date(payload.statementDate);
    const status = payload.status ?? BankReconciliationStatus.OPEN;
    const reconciledAt =
      status === BankReconciliationStatus.RECONCILED ? new Date() : null;
    const reconciledByUserId =
      status === BankReconciliationStatus.RECONCILED ? actorUserId : null;

    try {
      const reconciliation = await this.prisma.bankReconciliation.create({
        data: {
          bankAccountId: payload.bankAccountId,
          statementDate,
          statementReference: payload.statementReference?.trim(),
          bankBalance: payload.bankBalance,
          bookBalance: payload.bookBalance,
          status,
          reconciledAt,
          reconciledByUserId,
          notes: payload.notes?.trim(),
        },
        include: bankReconciliationDetailInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'BANK_RECONCILIATION_CREATE',
        resource: 'bank-reconciliations',
        resourceId: String(reconciliation.id),
        details: {
          bankAccountId: reconciliation.bankAccountId,
          statementDate: reconciliation.statementDate,
          status: reconciliation.status,
        },
      });

      return reconciliation;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'BANK_RECONCILIATION_CREATE_FAILED',
        resource: 'bank-reconciliations',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListBankReconciliationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.BankReconciliationWhereInput = {
      bankAccountId: query.bankAccountId,
      status: query.status,
      statementDate: query.dateFrom || query.dateTo
        ? {
            gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
            lte: query.dateTo ? new Date(query.dateTo) : undefined,
          }
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.bankReconciliation.count({ where }),
      this.prisma.bankReconciliation.findMany({
        where,
        include: bankReconciliationSummaryInclude,
        orderBy: [{ statementDate: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const reconciliationId = this.parseRequiredBigInt(id, 'id');
    const reconciliation = await this.prisma.bankReconciliation.findFirst({
      where: {
        id: reconciliationId,
      },
      include: bankReconciliationDetailInclude,
    });

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found');
    }

    return reconciliation;
  }

  async update(
    id: string,
    payload: UpdateBankReconciliationDto,
    actorUserId: string,
  ) {
    const reconciliationId = this.parseRequiredBigInt(id, 'id');
    await this.ensureBankReconciliationExists(reconciliationId);

    if (payload.bankAccountId) {
      await this.ensureBankAccount(payload.bankAccountId);
    }

    const statementDate = payload.statementDate
      ? new Date(payload.statementDate)
      : undefined;

    const reconciledAt =
      payload.status === undefined
        ? undefined
        : payload.status === BankReconciliationStatus.RECONCILED
          ? new Date()
          : null;
    const reconciledByUserId =
      payload.status === undefined
        ? undefined
        : payload.status === BankReconciliationStatus.RECONCILED
          ? actorUserId
          : null;

    try {
      const updated = await this.prisma.bankReconciliation.update({
        where: { id: reconciliationId },
        data: {
          bankAccountId: payload.bankAccountId,
          statementDate,
          statementReference: payload.statementReference?.trim(),
          bankBalance: payload.bankBalance,
          bookBalance: payload.bookBalance,
          status: payload.status,
          reconciledAt,
          reconciledByUserId,
          notes: payload.notes?.trim(),
        },
        include: bankReconciliationDetailInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'BANK_RECONCILIATION_UPDATE',
        resource: 'bank-reconciliations',
        resourceId: reconciliationId.toString(),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const reconciliationId = this.parseRequiredBigInt(id, 'id');
    await this.ensureBankReconciliationExists(reconciliationId);

    await this.prisma.bankReconciliation.delete({
      where: { id: reconciliationId },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'BANK_RECONCILIATION_DELETE',
      resource: 'bank-reconciliations',
      resourceId: reconciliationId.toString(),
    });

    return {
      success: true,
      id,
    };
  }

  async addItem(
    reconciliationId: string,
    payload: CreateReconciliationItemDto,
    actorUserId: string,
  ) {
    const reconciliationKey = this.parseRequiredBigInt(reconciliationId, 'reconciliationId');
    const reconciliation = await this.ensureBankReconciliationExists(
      reconciliationKey,
    );

    if (reconciliation.status === BankReconciliationStatus.RECONCILED) {
      throw new BadRequestException('Reconciliation is already closed');
    }

    const transactionIdRaw = payload.transactionId?.trim();
    const transactionId = this.parseOptionalBigInt(transactionIdRaw, 'transactionId');
    const journalEntryId = payload.journalEntryId?.trim();
    const bankReference = payload.bankReference?.trim();

    this.assertItemReferences(
      payload.itemType,
      transactionId,
      journalEntryId,
      bankReference,
    );

    if (transactionId !== null) {
      await this.ensurePaymentTransactionExists(transactionId);
      await this.ensureTransactionNotMatched(reconciliationKey, transactionId);
    }

    if (journalEntryId) {
      await this.ensureJournalEntryExists(journalEntryId);
      await this.ensureJournalEntryNotMatched(reconciliationKey, journalEntryId);
    }

    const matchedAt = payload.matchedAt
      ? new Date(payload.matchedAt)
      : payload.itemType === ReconciliationItemType.MATCHED
        ? new Date()
        : null;

    const item = await this.prisma.reconciliationItem.create({
      data: {
        reconciliationId: reconciliationKey,
        transactionId,
        journalEntryId,
        bankReference,
        amount: payload.amount,
        itemType: payload.itemType,
        matchedAt,
      },
      include: reconciliationItemInclude,
    });

      await this.auditLogsService.record({
        actorUserId,
        action: 'RECONCILIATION_ITEM_CREATE',
        resource: 'bank-reconciliation-items',
        resourceId: String(item.id),
        details: {
          reconciliationId: reconciliationKey.toString(),
          itemType: item.itemType,
          amount: item.amount,
        },
      });

    return item;
  }

  async autoMatchTransactions(id: string, actorUserId: string) {
    const reconciliationId = this.parseRequiredBigInt(id, 'id');
    const reconciliation = await this.prisma.bankReconciliation.findFirst({
      where: {
        id: reconciliationId,
      },
      include: bankReconciliationDetailInclude,
    });

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found');
    }

    if (reconciliation.status === BankReconciliationStatus.RECONCILED) {
      throw new BadRequestException('Reconciliation is already closed');
    }

    const statementCutoff = new Date(reconciliation.statementDate);
    statementCutoff.setHours(23, 59, 59, 999);

    const candidates = await this.prisma.paymentTransaction.findMany({
      where: {
        status: PaymentTransactionStatus.COMPLETED,
        journalEntryId: {
          not: null,
        },
        gateway: {
          settlementAccountId: reconciliation.bankAccountId,
        },
        reconciliationItems: {
          none: {},
        },
        OR: [
          {
            paidAt: {
              lte: statementCutoff,
            },
          },
          {
            paidAt: null,
            createdAt: {
              lte: statementCutoff,
            },
          },
        ],
      },
      select: {
        id: true,
        amount: true,
        transactionNumber: true,
      },
      orderBy: [
        {
          paidAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    if (candidates.length === 0) {
      return {
        matchedCount: 0,
        totalMatchedAmount: 0,
        reconciliation,
      };
    }

    const matchedAt = new Date();
    const totalMatchedAmount = candidates.reduce(
      (sum, candidate) => sum + Number(candidate.amount),
      0,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.reconciliationItem.createMany({
        data: candidates.map((candidate) => ({
          reconciliationId,
          transactionId: candidate.id,
          amount: candidate.amount,
          itemType: ReconciliationItemType.MATCHED,
          matchedAt,
        })),
      });

      if (reconciliation.status === BankReconciliationStatus.OPEN) {
        await tx.bankReconciliation.update({
          where: { id: reconciliationId },
          data: {
            status: BankReconciliationStatus.IN_PROGRESS,
          },
        });
      }
    });

    const updatedReconciliation = await this.prisma.bankReconciliation.findFirst({
      where: {
        id: reconciliationId,
      },
      include: bankReconciliationDetailInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'BANK_RECONCILIATION_AUTO_MATCH_TRANSACTIONS',
      resource: 'bank-reconciliations',
      resourceId: reconciliationId.toString(),
      details: {
        matchedCount: candidates.length,
        totalMatchedAmount,
        transactionNumbers: candidates.map(
          (candidate) => candidate.transactionNumber,
        ),
      },
    });

    return {
      matchedCount: candidates.length,
      totalMatchedAmount,
      reconciliation: updatedReconciliation,
    };
  }

  private async ensureBankReconciliationExists(id: bigint) {
    const reconciliation = await this.prisma.bankReconciliation.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
        bankBalance: true,
        bookBalance: true,
      },
    });

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found');
    }

    return reconciliation;
  }

  private async ensureBankAccount(id: number) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        id,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        isHeader: true,
        isBankAccount: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    if (account.isHeader) {
      throw new BadRequestException('Bank account cannot be a header account');
    }

    if (!account.isBankAccount) {
      throw new BadRequestException('Account is not marked as a bank account');
    }
  }

  private async ensurePaymentTransactionExists(id: bigint) {
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        id,
      },
      select: { id: true },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }
  }

  private async ensureJournalEntryExists(id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }
  }

  private async ensureTransactionNotMatched(
    reconciliationId: bigint,
    transactionId: bigint,
  ) {
    const existing = await this.prisma.reconciliationItem.findFirst({
      where: {
        reconciliationId,
        transactionId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Transaction already matched in this reconciliation');
    }
  }

  private async ensureJournalEntryNotMatched(
    reconciliationId: bigint,
    journalEntryId: string,
  ) {
    const existing = await this.prisma.reconciliationItem.findFirst({
      where: {
        reconciliationId,
        journalEntryId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Journal entry already matched in this reconciliation');
    }
  }

  private assertItemReferences(
    itemType: ReconciliationItemType,
    transactionId?: bigint | null,
    journalEntryId?: string,
    bankReference?: string,
  ) {
    if (!transactionId && !journalEntryId && !bankReference) {
      throw new BadRequestException(
        'Reconciliation item must reference a transaction, journal entry, or bank reference',
      );
    }

    if (
      itemType === ReconciliationItemType.MATCHED &&
      !transactionId &&
      !journalEntryId
    ) {
      throw new BadRequestException(
        'Matched items must reference a payment transaction or journal entry',
      );
    }
  }

  private parseOptionalBigInt(value?: string, fieldName = 'id'): bigint | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${fieldName} must be a numeric string`);
    }

    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(`${fieldName} is invalid`);
    }
  }

  private parseRequiredBigInt(value: string, fieldName = 'id'): bigint {
    const parsed = this.parseOptionalBigInt(value, fieldName);

    if (parsed === null) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return parsed;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Bank reconciliation already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
