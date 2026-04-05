import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  DocumentType,
  JournalEntryStatus,
  PaymentMethod,
  PaymentTransactionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { ListPaymentTransactionsDto } from './dto/list-payment-transactions.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { UpdatePaymentTransactionDto } from './dto/update-payment-transaction.dto';

const paymentTransactionInclude: Prisma.PaymentTransactionInclude = {
  gateway: true,
  enrollment: {
    select: {
      id: true,
      studentId: true,
      academicYearId: true,
      sectionId: true,
    },
  },
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
    },
  },
  installment: {
    select: {
      id: true,
      installmentNumber: true,
      dueDate: true,
      status: true,
    },
  },
  journalEntry: {
    select: {
      id: true,
      entryNumber: true,
      status: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
};

const DEFAULT_CASH_ACCOUNT_CODE = '1101';
const DEFAULT_GATEWAY_ACCOUNT_CODE = '1102';
const DEFAULT_REVENUE_ACCOUNT_CODE = '4001';
const PAYMENT_REFERENCE_TYPE = 'PAYMENT_TRANSACTION';

@Injectable()
export class PaymentTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async create(payload: CreatePaymentTransactionDto, actorUserId: string) {
    const gateway = await this.resolveGateway(payload.gatewayId, payload.providerCode);
    const invoiceId = this.parseOptionalBigInt(payload.invoiceId, 'invoiceId');
    const installmentId = this.parseOptionalBigInt(payload.installmentId, 'installmentId');

    const status = payload.status ?? PaymentTransactionStatus.PENDING;
    const paidAt =
      status === PaymentTransactionStatus.COMPLETED
        ? payload.paidAt
          ? new Date(payload.paidAt)
          : new Date()
        : payload.paidAt
          ? new Date(payload.paidAt)
          : null;

    const referenceDate = paidAt ?? new Date();
    const transactionNumber = await this.documentSequencesService.reserveNextNumber(
      DocumentType.PAYMENT,
      {
        date: referenceDate,
      },
    );
    const receiptNumber =
      payload.receiptNumber ??
      (status === PaymentTransactionStatus.COMPLETED
        ? await this.documentSequencesService.reserveNextNumber(
            DocumentType.RECEIPT,
            {
              date: referenceDate,
            },
          )
        : undefined);

    try {
      const transaction = await this.prisma.paymentTransaction.create({
        data: {
          transactionNumber,
          gatewayId: gateway.id,
          enrollmentId: payload.enrollmentId,
          invoiceId,
          installmentId,
          amount: payload.amount,
          currencyId: payload.currencyId,
          paymentMethod: payload.paymentMethod,
          status,
          paidAt,
          receiptNumber,
          payerName: payload.payerName?.trim(),
          payerPhone: payload.payerPhone?.trim(),
          gatewayTransactionId: payload.gatewayTransactionId?.trim(),
          notes: payload.notes?.trim(),
          createdByUserId: actorUserId,
        },
        include: paymentTransactionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_TRANSACTION_CREATE',
        resource: 'payment-transactions',
        resourceId: transaction.id.toString(),
        details: {
          transactionNumber: transaction.transactionNumber,
          status: transaction.status,
          gatewayId: transaction.gatewayId,
        },
      });

      return transaction;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_TRANSACTION_CREATE_FAILED',
        resource: 'payment-transactions',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async simulate(payload: SimulatePaymentDto, actorUserId: string) {
    const gateway = await this.resolveGateway(payload.gatewayId, payload.providerCode);
    const invoiceId = this.parseOptionalBigInt(payload.invoiceId, 'invoiceId');
    const installmentId = this.parseOptionalBigInt(payload.installmentId, 'installmentId');

    const paidAt = new Date();
    const transactionNumber = await this.documentSequencesService.reserveNextNumber(
      DocumentType.PAYMENT,
      {
        date: paidAt,
      },
    );
    const receiptNumber = await this.documentSequencesService.reserveNextNumber(
      DocumentType.RECEIPT,
      {
        date: paidAt,
      },
    );

    try {
      const transaction = await this.prisma.paymentTransaction.create({
        data: {
          transactionNumber,
          gatewayId: gateway.id,
          enrollmentId: payload.enrollmentId,
          invoiceId,
          installmentId,
          amount: payload.amount,
          currencyId: payload.currencyId,
          paymentMethod: payload.paymentMethod ?? PaymentMethod.CARD,
          status: PaymentTransactionStatus.COMPLETED,
          paidAt,
          receiptNumber,
          payerName: payload.payerName?.trim(),
          payerPhone: payload.payerPhone?.trim(),
          gatewayTransactionId: payload.gatewayTransactionId?.trim(),
          notes: payload.notes?.trim() ?? 'Internal payment simulation',
          createdByUserId: actorUserId,
        },
        include: paymentTransactionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_TRANSACTION_SIMULATE',
        resource: 'payment-transactions',
        resourceId: transaction.id.toString(),
        details: {
          transactionNumber: transaction.transactionNumber,
          gatewayId: transaction.gatewayId,
          amount: transaction.amount,
        },
      });

      return transaction;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_TRANSACTION_SIMULATE_FAILED',
        resource: 'payment-transactions',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async reconcile(id: string, actorUserId: string) {
    const transactionId = this.parseRequiredBigInt(id, 'id');
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        id: transactionId,
      },
      include: paymentTransactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (transaction.journalEntryId) {
      return transaction;
    }

    if (transaction.status !== PaymentTransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed transactions can be reconciled',
      );
    }

    const entryDate = transaction.paidAt ?? transaction.createdAt ?? new Date();
    const fiscalYear = await this.findFiscalYearForDate(entryDate);
    const fiscalPeriod = await this.findFiscalPeriodForDate(
      fiscalYear.id,
      entryDate,
    );
    const baseCurrency = await this.findBaseCurrency();

    const debitAccount = transaction.gateway?.settlementAccountId
      ? await this.findPostingAccountById(
          transaction.gateway.settlementAccountId,
        )
      : await this.findPostingAccount(
          this.resolveDebitAccountCode(transaction.paymentMethod),
        );
    const creditAccount =
      await this.resolveCreditAccountForTransaction(transaction);

    const now = new Date();
    const description = `Payment ${transaction.transactionNumber}`;
    const amount = Number(transaction.amount);

    try {
      const updatedTransaction = await this.prisma.$transaction(
        async (tx) => {
          const entryNumber =
            await this.documentSequencesService.reserveNextNumber(
              DocumentType.JOURNAL_ENTRY,
              {
                tx,
                fiscalYearId: fiscalYear.id,
                date: entryDate,
              },
            );
          const journalEntry = await tx.journalEntry.create({
            data: {
              entryNumber,
              entryDate,
              fiscalYearId: fiscalYear.id,
              fiscalPeriodId: fiscalPeriod?.id,
              description,
              referenceType: PAYMENT_REFERENCE_TYPE,
              referenceId: transaction.id.toString(),
              status: JournalEntryStatus.POSTED,
              totalDebit: amount,
              totalCredit: amount,
              currencyId: baseCurrency?.id,
              exchangeRate: 1,
              createdById: actorUserId,
              updatedById: actorUserId,
              approvedById: actorUserId,
              approvedAt: now,
              postedById: actorUserId,
              postedAt: now,
              lines: {
                create: [
                  {
                    lineNumber: 1,
                    accountId: debitAccount.id,
                    description,
                    debitAmount: amount,
                    creditAmount: 0,
                    isActive: true,
                    createdById: actorUserId,
                    updatedById: actorUserId,
                  },
                  {
                    lineNumber: 2,
                    accountId: creditAccount.id,
                    description,
                    debitAmount: 0,
                    creditAmount: amount,
                    isActive: true,
                    createdById: actorUserId,
                    updatedById: actorUserId,
                  },
                ],
              },
            },
          });

          await tx.chartOfAccount.update({
            where: { id: debitAccount.id },
            data: {
              currentBalance: {
                increment: amount,
              },
            },
          });

          await tx.chartOfAccount.update({
            where: { id: creditAccount.id },
            data: {
              currentBalance: {
                increment: -amount,
              },
            },
          });

          const updateResult = await tx.paymentTransaction.updateMany({
            where: {
              id: transaction.id,
              journalEntryId: null,
            },
            data: {
              journalEntryId: journalEntry.id,
            },
          });

          if (updateResult.count === 0) {
            throw new BadRequestException(
              'Payment transaction already reconciled',
            );
          }

          // تحديث القسط إن وُجد
          if (transaction.installmentId) {
            const installment = await tx.invoiceInstallment.findFirst({
              where: { id: transaction.installmentId },
              select: { id: true, amount: true, paidAmount: true },
            });

            if (installment) {
              const newPaidAmount = Number(installment.paidAmount) + amount;
              const installmentTotal = Number(installment.amount);
              const installmentStatus =
                newPaidAmount >= installmentTotal
                  ? 'PAID'
                  : newPaidAmount > 0
                    ? 'PARTIAL'
                    : 'PENDING';

              await tx.invoiceInstallment.update({
                where: { id: transaction.installmentId },
                data: {
                  paidAmount: newPaidAmount,
                  paymentDate: new Date(),
                  status: installmentStatus as any,
                },
              });
            }
          }

          // تحديث الفاتورة إن وُجدت
          if (transaction.invoiceId) {
            const invoice = await tx.studentInvoice.findFirst({
              where: { id: transaction.invoiceId },
              select: { id: true, totalAmount: true, paidAmount: true },
            });

            if (invoice) {
              const newPaidAmount = Number(invoice.paidAmount) + amount;
              const invoiceTotal = Number(invoice.totalAmount);
              const invoiceStatus =
                newPaidAmount >= invoiceTotal
                  ? 'PAID'
                  : newPaidAmount > 0
                    ? 'PARTIAL'
                    : 'ISSUED';

              await tx.studentInvoice.update({
                where: { id: transaction.invoiceId },
                data: {
                  paidAmount: newPaidAmount,
                  status: invoiceStatus as any,
                },
              });
            }
          }

          return tx.paymentTransaction.findFirst({
            where: { id: transaction.id },
            include: paymentTransactionInclude,
          });
        },
      );

      if (!updatedTransaction) {
        throw new NotFoundException('Payment transaction not found');
      }

      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_TRANSACTION_RECONCILE',
        resource: 'payment-transactions',
        resourceId: transaction.id.toString(),
        details: {
          journalEntryId: updatedTransaction.journalEntryId,
          transactionNumber: updatedTransaction.transactionNumber,
        },
      });

      return updatedTransaction;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_TRANSACTION_RECONCILE_FAILED',
        resource: 'payment-transactions',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListPaymentTransactionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PaymentTransactionWhereInput = {
      gatewayId: query.gatewayId,
      enrollmentId: query.enrollmentId,
      status: query.status,
      OR: query.search
        ? [
            {
              transactionNumber: {
                contains: query.search,
              },
            },
            {
              payerName: {
                contains: query.search,
              },
            },
            {
              payerPhone: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.findMany({
        where,
        include: paymentTransactionInclude,
        orderBy: [{ createdAt: 'desc' }],
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
    const transactionId = this.parseRequiredBigInt(id, 'id');
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        id: transactionId,
      },
      include: paymentTransactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    return transaction;
  }

  async getReceipt(id: string) {
    const transactionId = this.parseRequiredBigInt(id, 'id');

    const receiptInclude = {
      gateway: {
        select: {
          id: true,
          providerCode: true,
          nameAr: true,
          nameEn: true,
        },
      },
      currency: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          symbol: true,
          decimalPlaces: true,
        },
      },
      enrollment: {
        select: {
          id: true,
          academicYearId: true,
          sectionId: true,
          student: {
            select: {
              id: true,
              fullName: true,
              admissionNo: true,
            },
          },
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
        },
      },
      installment: {
        select: {
          id: true,
          installmentNumber: true,
          dueDate: true,
          status: true,
        },
      },
      journalEntry: {
        select: {
          id: true,
          entryNumber: true,
          status: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
    } as const satisfies Prisma.PaymentTransactionInclude;

    type ReceiptTransaction = Prisma.PaymentTransactionGetPayload<{
      include: typeof receiptInclude;
    }>;

    const transaction = (await this.prisma.paymentTransaction.findFirst({
      where: {
        id: transactionId,
      },
      include: receiptInclude,
    })) as ReceiptTransaction | null;

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    const receiptNumber = transaction.receiptNumber ?? transaction.transactionNumber;
    const issuedAt = transaction.paidAt ?? transaction.createdAt;

    return {
      receiptNumber,
      transactionNumber: transaction.transactionNumber,
      status: transaction.status,
      issuedAt,
      paymentMethod: transaction.paymentMethod,
      amount: transaction.amount.toString(),
      payer: {
        name: transaction.payerName,
        phone: transaction.payerPhone,
      },
      gateway: transaction.gateway,
      currency: transaction.currency,
      references: {
        invoice: transaction.invoice,
        installment: transaction.installment,
        journalEntry: transaction.journalEntry,
        enrollment: transaction.enrollment,
      },
      meta: {
        gatewayTransactionId: transaction.gatewayTransactionId,
        notes: transaction.notes,
        createdBy: transaction.createdBy,
        createdAt: transaction.createdAt,
      },
    };
  }

  async update(
    id: string,
    payload: UpdatePaymentTransactionDto,
    actorUserId: string,
  ) {
    const transactionId = this.parseRequiredBigInt(id, 'id');
    await this.ensureTransactionExists(transactionId);

    const gateway =
      payload.gatewayId || payload.providerCode
        ? await this.resolveGateway(payload.gatewayId, payload.providerCode)
        : null;

    const status = payload.status;
    const paidAt =
      status === PaymentTransactionStatus.COMPLETED
        ? payload.paidAt
          ? new Date(payload.paidAt)
          : new Date()
        : payload.paidAt
          ? new Date(payload.paidAt)
          : undefined;

    const invoiceId = this.parseOptionalBigInt(payload.invoiceId, 'invoiceId');
    const installmentId = this.parseOptionalBigInt(payload.installmentId, 'installmentId');

    try {
      const updated = await this.prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          gatewayId: gateway?.id,
          enrollmentId: payload.enrollmentId,
          invoiceId,
          installmentId,
          amount: payload.amount,
          currencyId: payload.currencyId,
          paymentMethod: payload.paymentMethod,
          status,
          paidAt,
          receiptNumber: payload.receiptNumber?.trim(),
          payerName: payload.payerName?.trim(),
          payerPhone: payload.payerPhone?.trim(),
          gatewayTransactionId: payload.gatewayTransactionId?.trim(),
          notes: payload.notes?.trim(),
        },
        include: paymentTransactionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_TRANSACTION_UPDATE',
        resource: 'payment-transactions',
        resourceId: transactionId.toString(),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async completeAndReconcile(id: string, actorUserId: string) {
    const transactionId = this.parseRequiredBigInt(id, 'id');
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        id: transactionId,
      },
      include: paymentTransactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (
      transaction.status === PaymentTransactionStatus.CANCELLED ||
      transaction.status === PaymentTransactionStatus.REFUNDED
    ) {
      throw new BadRequestException(
        'Cancelled or refunded transactions cannot be completed and reconciled',
      );
    }

    let preparedTransaction = transaction;

    if (
      transaction.status !== PaymentTransactionStatus.COMPLETED ||
      !transaction.receiptNumber ||
      !transaction.paidAt
    ) {
      const paidAt = transaction.paidAt ?? new Date();
      const receiptNumber =
        transaction.receiptNumber ??
        (await this.documentSequencesService.reserveNextNumber(
          DocumentType.RECEIPT,
          {
            date: paidAt,
          },
        ));

      preparedTransaction = await this.prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status: PaymentTransactionStatus.COMPLETED,
          paidAt,
          receiptNumber,
        },
        include: paymentTransactionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PAYMENT_TRANSACTION_COMPLETE_FOR_RECONCILIATION',
        resource: 'payment-transactions',
        resourceId: transactionId.toString(),
        details: {
          transactionNumber: preparedTransaction.transactionNumber,
          paidAt: preparedTransaction.paidAt,
          receiptNumber: preparedTransaction.receiptNumber,
        },
      });
    }

    if (preparedTransaction.journalEntryId) {
      return preparedTransaction;
    }

    return this.reconcile(id, actorUserId);
  }

  async remove(id: string, actorUserId: string) {
    const transactionId = this.parseRequiredBigInt(id, 'id');
    await this.ensureTransactionExists(transactionId);

    await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: PaymentTransactionStatus.CANCELLED,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'PAYMENT_TRANSACTION_DELETE',
      resource: 'payment-transactions',
      resourceId: transactionId.toString(),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureTransactionExists(id: bigint) {
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

  private async findPostingAccount(accountCode: string) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        accountCode,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        isHeader: true,
      },
    });

    if (!account) {
      throw new NotFoundException(
        `Posting account ${accountCode} was not found`,
      );
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountCode} cannot be a header account`,
      );
    }

    return account;
  }

  private async findPostingAccountById(accountId: number) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        id: accountId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        isHeader: true,
      },
    });

    if (!account) {
      throw new NotFoundException(
        `Posting account ${accountId} was not found`,
      );
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountId} cannot be a header account`,
      );
    }

    return account;
  }

  private async findFiscalYearForDate(date: Date) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { startDate: 'desc' },
    });

    if (!fiscalYear) {
      throw new BadRequestException(
        'No fiscal year configured for the payment date',
      );
    }

    return fiscalYear;
  }

  private async findFiscalPeriodForDate(fiscalYearId: number, date: Date) {
    return this.prisma.fiscalPeriod.findFirst({
      where: {
        fiscalYearId,
        deletedAt: null,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  private async findBaseCurrency() {
    return this.prisma.currency.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        isBase: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  private async resolveCreditAccountForTransaction(
    transaction: Pick<Prisma.PaymentTransactionGetPayload<{ include: typeof paymentTransactionInclude }>, 'invoiceId'>,
  ) {
    if (transaction.invoiceId) {
      const groupedAccounts = await this.prisma.invoiceLineItem.groupBy({
        by: ['accountId'],
        where: {
          invoiceId: transaction.invoiceId,
          accountId: {
            not: null,
          },
        },
      });

      if (groupedAccounts.length === 1 && groupedAccounts[0]?.accountId) {
        return this.findPostingAccountById(groupedAccounts[0].accountId);
      }
    }

    return this.findPostingAccount(DEFAULT_REVENUE_ACCOUNT_CODE);
  }

  private resolveDebitAccountCode(paymentMethod: PaymentMethod) {
    switch (paymentMethod) {
      case PaymentMethod.CASH:
      case PaymentMethod.CHEQUE:
        return DEFAULT_CASH_ACCOUNT_CODE;
      case PaymentMethod.CARD:
      case PaymentMethod.BANK_TRANSFER:
      case PaymentMethod.MOBILE_WALLET:
        return DEFAULT_GATEWAY_ACCOUNT_CODE;
      default:
        return DEFAULT_CASH_ACCOUNT_CODE;
    }
  }

  private async resolveGateway(gatewayId?: number, providerCode?: string) {
    if (!gatewayId && !providerCode) {
      providerCode = 'ONLINE_GW';
    }

    const gateway = await this.prisma.paymentGateway.findFirst({
      where: {
        id: gatewayId,
        providerCode: providerCode ? this.normalizeCode(providerCode) : undefined,
        isActive: true,
      },
    });

    if (!gateway) {
      throw new BadRequestException('Payment gateway not found');
    }

    return gateway;
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

  private normalizeCode(code: string): string {
    const normalized = code.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('providerCode cannot be empty');
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Payment transaction already exists');
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
