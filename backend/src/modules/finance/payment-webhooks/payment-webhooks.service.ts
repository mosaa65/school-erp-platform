import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AuditStatus,
  DocumentType,
  FeeType,
  InstallmentStatus,
  InvoiceStatus,
  JournalEntryStatus,
  PaymentMethod,
  PaymentTransactionStatus,
  PaymentWebhookEventStatus,
  PaymentWebhookEventType,
  Prisma,
} from '@prisma/client';
import { createHmac, timingSafeEqual, createHash } from 'crypto';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import {
  findActiveFiscalYearForDate,
  findPostingFiscalPeriodForDate,
} from '../utils/posting-fiscal-period';
import { PaymentWebhookFailureDto } from './dto/payment-webhook-failure.dto';
import { PaymentWebhookRefundDto } from './dto/payment-webhook-refund.dto';
import { PaymentWebhookSuccessDto } from './dto/payment-webhook-success.dto';

interface WebhookContext {
  rawBody: string;
  signature: string | null;
  eventId: string;
  idempotencyKey?: string;
  ipAddress?: string;
  userAgent?: string;
}

const DEFAULT_CASH_ACCOUNT_CODE = '1101';
const DEFAULT_GATEWAY_ACCOUNT_CODE = '1102';
const DEFAULT_REVENUE_ACCOUNT_CODE = '4001';
const DEFAULT_VAT_OUTPUT_ACCOUNT_CODE = '2104';
const DEFAULT_DISCOUNT_ACCOUNT_CODE = '5007';
const PAYMENT_REFERENCE_TYPE = 'PAYMENT';

const FEE_TYPE_REVENUE_ACCOUNT_CODE: Record<FeeType, string> = {
  [FeeType.TUITION]: '4001',
  [FeeType.TRANSPORT]: '4003',
  [FeeType.UNIFORM]: '4004',
  [FeeType.REGISTRATION]: '4005',
  [FeeType.ACTIVITY]: '4006',
  [FeeType.PENALTY]: '4007',
  [FeeType.OTHER]: '4006',
};

type InvoiceForPosting = Prisma.StudentInvoiceGetPayload<{
  include: {
    lines: { include: { taxCode: true } };
    installments: true;
  };
}>;

type PaymentTransactionForPosting = Prisma.PaymentTransactionGetPayload<{
  include: {
    gateway: { select: { id: true; providerCode: true; settlementAccountId: true } };
    enrollment: { select: { id: true; studentId: true } };
    invoice: {
      include: {
        lines: { include: { taxCode: true } };
        installments: true;
      };
    };
    installment: {
      include: {
        invoice: {
          include: {
            lines: { include: { taxCode: true } };
            installments: true;
          };
        };
      };
    };
    journalEntry: { include: { lines: true } };
  };
}>;

type PostingLineInput = {
  accountId: number;
  debitAmount: number;
  creditAmount: number;
  description: string;
  studentId?: string | null;
  branchId?: number | null;
};

@Injectable()
export class PaymentWebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly configService: ConfigService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async handleSuccess(payload: PaymentWebhookSuccessDto, req: Request) {
    const context = this.buildContext(payload, req);
    this.verifySignature(context);
    this.verifyIp(context.ipAddress);

    const transaction = await this.findTransaction(payload.transactionId);
    this.ensureProviderCodeMatches(transaction, payload.providerCode);
    this.assertAmountMatches(payload.amount, transaction.amount);
    this.assertGatewayTransactionId(transaction.gatewayTransactionId, payload.gatewayTransactionId);

    const event = await this.createEvent({
      context,
      payload,
      eventType: PaymentWebhookEventType.SUCCESS,
      gatewayId: transaction.gatewayId,
      transactionId: transaction.id,
    });

    if (!event) {
      return {
        success: true,
        duplicate: true,
        transactionId: transaction.id.toString(),
      };
    }

    const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();

    try {
      const actorUserId = this.resolveActorUserId(transaction.createdByUserId);
      const result = await this.applyPaymentSuccess({
        transactionId: transaction.id,
        paidAt,
        payload,
        actorUserId,
      });

      await this.finalizeEvent(event.id, !result.duplicate);

      await this.auditLogsService.record({
        action: 'PAYMENT_WEBHOOK_SUCCESS',
        resource: 'payment-webhooks',
        resourceId: event.id,
        status: AuditStatus.SUCCESS,
        details: {
          transactionId: transaction.id.toString(),
          eventId: event.eventId,
          idempotencyKey: context.idempotencyKey,
          duplicate: result.duplicate,
          journalEntryId: result.journalEntryId,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        success: true,
        duplicate: result.duplicate,
        transactionId: transaction.id.toString(),
        journalEntryId: result.journalEntryId,
      };
    } catch (error) {
      await this.failEvent(event.id, error);
      throw error;
    }
  }

  async handleFailure(payload: PaymentWebhookFailureDto, req: Request) {
    const context = this.buildContext(payload, req);
    this.verifySignature(context);
    this.verifyIp(context.ipAddress);

    const transaction = await this.findTransaction(payload.transactionId);
    this.ensureProviderCodeMatches(transaction, payload.providerCode);
    this.assertGatewayTransactionId(transaction.gatewayTransactionId, payload.gatewayTransactionId);

    const event = await this.createEvent({
      context,
      payload,
      eventType: PaymentWebhookEventType.FAILURE,
      gatewayId: transaction.gatewayId,
      transactionId: transaction.id,
    });

    if (!event) {
      return {
        success: true,
        duplicate: true,
        transactionId: transaction.id.toString(),
      };
    }

    try {
      const updateResult = await this.prisma.paymentTransaction.updateMany({
        where: {
          id: transaction.id,
          status: PaymentTransactionStatus.PENDING,
        },
        data: {
          status: PaymentTransactionStatus.FAILED,
          gatewayTransactionId: payload.gatewayTransactionId?.trim(),
          notes: this.appendNote(transaction.notes, payload.reason),
        },
      });

      const duplicate = updateResult.count === 0;

      await this.finalizeEvent(event.id, !duplicate);

      await this.auditLogsService.record({
        action: 'PAYMENT_WEBHOOK_FAILURE',
        resource: 'payment-webhooks',
        resourceId: event.id,
        status: AuditStatus.SUCCESS,
        details: {
          transactionId: transaction.id.toString(),
          eventId: event.eventId,
          idempotencyKey: context.idempotencyKey,
          duplicate,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        success: true,
        duplicate,
        transactionId: transaction.id.toString(),
      };
    } catch (error) {
      await this.failEvent(event.id, error);
      throw error;
    }
  }

  async handleRefund(payload: PaymentWebhookRefundDto, req: Request) {
    const context = this.buildContext(payload, req);
    this.verifySignature(context);
    this.verifyIp(context.ipAddress);

    const transaction = await this.findTransaction(payload.transactionId);
    this.ensureProviderCodeMatches(transaction, payload.providerCode);
    this.assertAmountMatches(payload.amount, transaction.amount);
    this.assertGatewayTransactionId(transaction.gatewayTransactionId, payload.gatewayTransactionId);

    if (transaction.status !== PaymentTransactionStatus.COMPLETED &&
        transaction.status !== PaymentTransactionStatus.REFUNDED) {
      throw new BadRequestException('Refund can only be applied to completed payments');
    }

    const event = await this.createEvent({
      context,
      payload,
      eventType: PaymentWebhookEventType.REFUND,
      gatewayId: transaction.gatewayId,
      transactionId: transaction.id,
    });

    if (!event) {
      return {
        success: true,
        duplicate: true,
        transactionId: transaction.id.toString(),
      };
    }

    try {
      const actorUserId = this.resolveActorUserId(transaction.createdByUserId);
      const result = await this.applyPaymentRefund({
        transactionId: transaction.id,
        refundedAt: payload.refundedAt ? new Date(payload.refundedAt) : new Date(),
        payload,
        actorUserId,
        existingNotes: transaction.notes,
      });

      await this.finalizeEvent(event.id, !result.duplicate);

      await this.auditLogsService.record({
        action: 'PAYMENT_WEBHOOK_REFUND',
        resource: 'payment-webhooks',
        resourceId: event.id,
        status: AuditStatus.SUCCESS,
        details: {
          transactionId: transaction.id.toString(),
          eventId: event.eventId,
          idempotencyKey: context.idempotencyKey,
          duplicate: result.duplicate,
          journalEntryId: result.journalEntryId,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        success: true,
        duplicate: result.duplicate,
        transactionId: transaction.id.toString(),
        journalEntryId: result.journalEntryId,
      };
    } catch (error) {
      await this.failEvent(event.id, error);
      throw error;
    }
  }

  private resolveActorUserId(createdByUserId?: string | null) {
    if (createdByUserId) {
      return createdByUserId;
    }

    const systemUserId = this.configService.get<string>('FINANCE_SYSTEM_USER_ID');

    if (!systemUserId) {
      throw new BadRequestException('FINANCE_SYSTEM_USER_ID is not configured');
    }

    return systemUserId;
  }

  private async applyPaymentSuccess(input: {
    transactionId: bigint;
    paidAt: Date;
    payload: PaymentWebhookSuccessDto;
    actorUserId: string;
  }): Promise<{ duplicate: boolean; journalEntryId?: string | null }> {
    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.paymentTransaction.updateMany({
        where: {
          id: input.transactionId,
          status: {
            in: [PaymentTransactionStatus.PENDING, PaymentTransactionStatus.FAILED],
          },
        },
        data: {
          status: PaymentTransactionStatus.COMPLETED,
          paidAt: input.paidAt,
          receiptNumber: input.payload.receiptNumber?.trim(),
          payerName: input.payload.payerName?.trim(),
          payerPhone: input.payload.payerPhone?.trim(),
          gatewayTransactionId: input.payload.gatewayTransactionId?.trim(),
        },
      });

      if (!updateResult.count) {
        const existing = await tx.paymentTransaction.findFirst({
          where: { id: input.transactionId },
          select: { journalEntryId: true },
        });

        return {
          duplicate: true,
          journalEntryId: existing?.journalEntryId ?? undefined,
        };
      }

      const transaction = await this.loadTransactionForPosting(tx, input.transactionId);
      const invoice = this.resolveInvoiceFromTransaction(transaction);

      if (invoice) {
        await this.applyPaymentToInvoice(tx, invoice, transaction, input.paidAt);
      }

      let journalEntryId = transaction.journalEntryId ?? null;

      if (!journalEntryId) {
        const entry = await this.createPaymentJournalEntry(
          tx,
          transaction,
          invoice,
          input.paidAt,
          input.actorUserId,
        );
        journalEntryId = entry.id;

        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: { journalEntryId },
        });
      }

      return {
        duplicate: false,
        journalEntryId,
      };
    });
  }

  private async applyPaymentRefund(input: {
    transactionId: bigint;
    refundedAt: Date;
    payload: PaymentWebhookRefundDto;
    actorUserId: string;
    existingNotes?: string | null;
  }): Promise<{ duplicate: boolean; journalEntryId?: string | null }> {
    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.paymentTransaction.updateMany({
        where: {
          id: input.transactionId,
          status: PaymentTransactionStatus.COMPLETED,
        },
        data: {
          status: PaymentTransactionStatus.REFUNDED,
          gatewayTransactionId: input.payload.gatewayTransactionId?.trim(),
          notes: this.appendNote(input.existingNotes ?? null, input.payload.reason),
        },
      });

      if (!updateResult.count) {
        const existing = await tx.paymentTransaction.findFirst({
          where: { id: input.transactionId },
          select: { journalEntryId: true },
        });

        return {
          duplicate: true,
          journalEntryId: existing?.journalEntryId ?? undefined,
        };
      }

      const transaction = await this.loadTransactionForPosting(tx, input.transactionId);
      const invoice = this.resolveInvoiceFromTransaction(transaction);

      if (invoice) {
        await this.applyRefundToInvoice(tx, invoice, transaction);
      }

      let journalEntryId = transaction.journalEntryId ?? null;

      if (journalEntryId) {
        const reversal = await this.reverseJournalEntry(
          tx,
          journalEntryId,
          input.payload.reason ?? 'Payment refund',
          input.actorUserId,
          input.refundedAt,
        );
        journalEntryId = reversal.id;
      }

      return {
        duplicate: false,
        journalEntryId,
      };
    });
  }

  private async loadTransactionForPosting(
    tx: Prisma.TransactionClient,
    transactionId: bigint,
  ): Promise<PaymentTransactionForPosting> {
    const transaction = await tx.paymentTransaction.findFirst({
      where: { id: transactionId },
      include: {
        gateway: {
          select: {
            id: true,
            providerCode: true,
            settlementAccountId: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            studentId: true,
          },
        },
        invoice: {
          include: {
            lines: {
              include: {
                taxCode: true,
              },
            },
            installments: true,
          },
        },
        installment: {
          include: {
            invoice: {
              include: {
                lines: {
                  include: {
                    taxCode: true,
                  },
                },
                installments: true,
              },
            },
          },
        },
        journalEntry: {
          include: {
            lines: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    return transaction;
  }

  private resolveInvoiceFromTransaction(
    transaction: PaymentTransactionForPosting,
  ): InvoiceForPosting | null {
    if (transaction.invoice) {
      return transaction.invoice;
    }

    if (transaction.installment?.invoice) {
      return transaction.installment.invoice;
    }

    return null;
  }

  private async applyPaymentToInvoice(
    tx: Prisma.TransactionClient,
    invoice: InvoiceForPosting,
    transaction: PaymentTransactionForPosting,
    paidAt: Date,
  ) {
    if (
      invoice.status === InvoiceStatus.CANCELLED ||
      invoice.status === InvoiceStatus.CREDITED
    ) {
      throw new BadRequestException(
        'Cannot apply payment to a cancelled or credited invoice',
      );
    }

    const amount = this.roundMoney(Number(transaction.amount));

    if (transaction.installmentId) {
      const installment = invoice.installments.find(
        (item) => item.id === transaction.installmentId,
      );

      if (!installment) {
        throw new NotFoundException('Invoice installment not found');
      }

      const update = this.buildInstallmentPaymentUpdate(
        installment,
        amount,
        paidAt,
      );

      await tx.invoiceInstallment.update({
        where: { id: installment.id },
        data: update,
      });
    } else if (invoice.installments.length > 0) {
      const allocations = this.allocatePaymentAcrossInstallments(
        invoice.installments,
        amount,
        paidAt,
      );

      for (const allocation of allocations) {
        await tx.invoiceInstallment.update({
          where: { id: allocation.id },
          data: allocation.data,
        });
      }
    }

    const currentPaid = Number(invoice.paidAmount);
    const totalAmount = Number(invoice.totalAmount);
    const nextPaid = this.roundMoney(currentPaid + amount);

    if (nextPaid - totalAmount > 0.01) {
      throw new BadRequestException('Payment exceeds invoice balance');
    }

    const nextStatus =
      nextPaid >= totalAmount - 0.01
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIAL;

    await tx.studentInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: nextPaid,
        status: nextStatus,
      },
    });
  }

  private async applyRefundToInvoice(
    tx: Prisma.TransactionClient,
    invoice: InvoiceForPosting,
    transaction: PaymentTransactionForPosting,
  ) {
    const amount = this.roundMoney(Number(transaction.amount));
    const currentPaid = Number(invoice.paidAmount);

    if (amount - currentPaid > 0.01) {
      throw new BadRequestException('Refund exceeds invoice paid amount');
    }

    if (transaction.installmentId) {
      const installment = invoice.installments.find(
        (item) => item.id === transaction.installmentId,
      );

      if (!installment) {
        throw new NotFoundException('Invoice installment not found');
      }

      const update = this.buildInstallmentRefundUpdate(
        installment,
        amount,
      );

      await tx.invoiceInstallment.update({
        where: { id: installment.id },
        data: {
          ...update,
          paymentDate: update.paidAmount > 0 ? installment.paymentDate : null,
        },
      });
    } else if (invoice.installments.length > 0) {
      const allocations = this.allocateRefundAcrossInstallments(
        invoice.installments,
        amount,
      );

      for (const allocation of allocations) {
        await tx.invoiceInstallment.update({
          where: { id: allocation.id },
          data: allocation.data,
        });
      }
    }

    const nextPaid = this.roundMoney(currentPaid - amount);
    const totalAmount = Number(invoice.totalAmount);
    const nextStatus =
      nextPaid <= 0
        ? InvoiceStatus.ISSUED
        : nextPaid >= totalAmount - 0.01
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIAL;

    await tx.studentInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: nextPaid,
        status: nextStatus,
      },
    });
  }

  private buildInstallmentPaymentUpdate(
    installment: InvoiceForPosting['installments'][number],
    amount: number,
    paidAt: Date,
  ) {
    if (installment.status === InstallmentStatus.CANCELLED) {
      throw new BadRequestException('Installment is cancelled');
    }

    const paid = Number(installment.paidAmount);
    const total = Number(installment.amount);
    const remaining = this.roundMoney(total - paid);

    if (amount - remaining > 0.01) {
      throw new BadRequestException('Payment exceeds installment balance');
    }

    const nextPaid = this.roundMoney(paid + amount);
    const nextStatus =
      nextPaid >= total - 0.01
        ? InstallmentStatus.PAID
        : nextPaid > 0
          ? InstallmentStatus.PARTIAL
          : InstallmentStatus.PENDING;

    return {
      paidAmount: nextPaid,
      status: nextStatus,
      paymentDate: paidAt,
    };
  }

  private buildInstallmentRefundUpdate(
    installment: InvoiceForPosting['installments'][number],
    amount: number,
  ) {
    const paid = Number(installment.paidAmount);

    if (amount - paid > 0.01) {
      throw new BadRequestException('Refund exceeds installment paid amount');
    }

    const nextPaid = this.roundMoney(paid - amount);
    const total = Number(installment.amount);
    const nextStatus =
      nextPaid >= total - 0.01
        ? InstallmentStatus.PAID
        : nextPaid > 0
          ? InstallmentStatus.PARTIAL
          : InstallmentStatus.PENDING;

    return {
      paidAmount: nextPaid,
      status: nextStatus,
    };
  }

  private allocatePaymentAcrossInstallments(
    installments: InvoiceForPosting['installments'],
    amount: number,
    paidAt: Date,
  ) {
    const sorted = [...installments].sort(
      (a, b) => a.installmentNumber - b.installmentNumber,
    );
    let remaining = this.roundMoney(amount);
    const updates: Array<{ id: bigint; data: { paidAmount: number; status: InstallmentStatus; paymentDate: Date } }> = [];

    for (const installment of sorted) {
      if (remaining <= 0) {
        break;
      }

      if (installment.status === InstallmentStatus.CANCELLED) {
        continue;
      }

      const paid = Number(installment.paidAmount);
      const total = Number(installment.amount);
      const due = this.roundMoney(total - paid);

      if (due <= 0) {
        continue;
      }

      const applied = Math.min(remaining, due);
      const nextPaid = this.roundMoney(paid + applied);
      const nextStatus =
        nextPaid >= total - 0.01
          ? InstallmentStatus.PAID
          : InstallmentStatus.PARTIAL;

      updates.push({
        id: installment.id,
        data: {
          paidAmount: nextPaid,
          status: nextStatus,
          paymentDate: paidAt,
        },
      });

      remaining = this.roundMoney(remaining - applied);
    }

    if (remaining > 0.01) {
      throw new BadRequestException('Payment exceeds outstanding installments');
    }

    return updates;
  }

  private allocateRefundAcrossInstallments(
    installments: InvoiceForPosting['installments'],
    amount: number,
  ) {
    const sorted = [...installments].sort(
      (a, b) => b.installmentNumber - a.installmentNumber,
    );
    let remaining = this.roundMoney(amount);
    const updates: Array<{ id: bigint; data: { paidAmount: number; status: InstallmentStatus; paymentDate: Date | null } }> = [];

    for (const installment of sorted) {
      if (remaining <= 0) {
        break;
      }

      if (installment.status === InstallmentStatus.CANCELLED) {
        continue;
      }

      const paid = Number(installment.paidAmount);
      if (paid <= 0) {
        continue;
      }

      const refund = Math.min(remaining, paid);
      const nextPaid = this.roundMoney(paid - refund);
      const total = Number(installment.amount);
      const nextStatus =
        nextPaid >= total - 0.01
          ? InstallmentStatus.PAID
          : nextPaid > 0
            ? InstallmentStatus.PARTIAL
            : InstallmentStatus.PENDING;

      updates.push({
        id: installment.id,
        data: {
          paidAmount: nextPaid,
          status: nextStatus,
          paymentDate: nextPaid > 0 ? installment.paymentDate : null,
        },
      });

      remaining = this.roundMoney(remaining - refund);
    }

    if (remaining > 0.01) {
      throw new BadRequestException('Refund exceeds installment paid amounts');
    }

    return updates;
  }

  private async createPaymentJournalEntry(
    tx: Prisma.TransactionClient,
    transaction: PaymentTransactionForPosting,
    invoice: InvoiceForPosting | null,
    paidAt: Date,
    actorUserId: string,
  ) {
    const entryDate = paidAt;
    const fiscalYear = await this.findFiscalYearForDate(tx, entryDate);
    const fiscalPeriod = await this.findFiscalPeriodForDate(
      tx,
      fiscalYear.id,
      entryDate,
    );
    const baseCurrency = await this.findBaseCurrency(tx);

    const paymentAmount = this.roundMoney(Number(transaction.amount));
    const { lines, totalDebit, totalCredit } =
      await this.buildPaymentJournalLines(
        tx,
        transaction,
        invoice,
        paymentAmount,
      );

    this.assertBalanced(totalDebit, totalCredit);

    const now = new Date();
    const description = invoice
      ? `سداد فاتورة ${invoice.invoiceNumber}`
      : `سداد عملية ${transaction.transactionNumber}`;

    const entryNumber = await this.documentSequencesService.reserveNextNumber(
      DocumentType.JOURNAL_ENTRY,
      {
        tx,
        fiscalYearId: fiscalYear.id,
        branchId: invoice?.branchId ?? null,
        date: entryDate,
      },
    );

    const entry = await tx.journalEntry.create({
      data: {
        entryNumber,
        entryDate,
        fiscalYearId: fiscalYear.id,
        fiscalPeriodId: fiscalPeriod?.id,
        branchId: invoice?.branchId ?? null,
        description,
        referenceType: PAYMENT_REFERENCE_TYPE,
        referenceId: transaction.id.toString(),
        status: JournalEntryStatus.POSTED,
        totalDebit,
        totalCredit,
        currencyId: transaction.currencyId ?? invoice?.currencyId ?? baseCurrency?.id,
        exchangeRate: 1,
        createdById: actorUserId,
        updatedById: actorUserId,
        approvedById: actorUserId,
        approvedAt: now,
        postedById: actorUserId,
        postedAt: now,
        isActive: true,
        lines: {
          create: lines.map((line, index) => ({
            lineNumber: index + 1,
            accountId: line.accountId,
            description: line.description,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
            studentId: line.studentId ?? undefined,
            branchId: line.branchId ?? undefined,
            isActive: true,
            createdById: actorUserId,
            updatedById: actorUserId,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    for (const line of lines) {
      const balanceChange = this.roundMoney(
        Number(line.debitAmount) - Number(line.creditAmount),
      );

      await tx.chartOfAccount.update({
        where: { id: line.accountId },
        data: {
          currentBalance: {
            increment: balanceChange,
          },
        },
      });
    }

    return entry;
  }

  private async buildPaymentJournalLines(
    tx: Prisma.TransactionClient,
    transaction: PaymentTransactionForPosting,
    invoice: InvoiceForPosting | null,
    paymentAmount: number,
  ): Promise<{ lines: PostingLineInput[]; totalDebit: number; totalCredit: number }> {
    const studentId = transaction.enrollment?.studentId ?? null;
    const branchId = invoice?.branchId ?? null;
    const description = invoice
      ? `سداد فاتورة ${invoice.invoiceNumber}`
      : `سداد عملية ${transaction.transactionNumber}`;

    const debitAccountId = await this.resolveDebitAccountId(tx, transaction);
    const lines: PostingLineInput[] = [
      {
        accountId: debitAccountId,
        debitAmount: paymentAmount,
        creditAmount: 0,
        description,
        studentId,
        branchId,
      },
    ];

    if (!invoice || invoice.lines.length === 0) {
      const revenueAccountId = await this.findPostingAccountByCode(
        tx,
        DEFAULT_REVENUE_ACCOUNT_CODE,
      );
      lines.push({
        accountId: revenueAccountId.id,
        debitAmount: 0,
        creditAmount: paymentAmount,
        description,
        studentId,
        branchId,
      });
    } else {
      const invoiceTotal = Number(invoice.totalAmount);
      if (invoiceTotal <= 0) {
        throw new BadRequestException('Invoice total amount must be positive');
      }

      const ratio = paymentAmount / invoiceTotal;
      if (ratio - 1 > 0.001) {
        throw new BadRequestException('Payment exceeds invoice total');
      }

      const totals = invoice.lines.reduce(
        (acc, line) => {
          acc.base += Number(line.quantity) * Number(line.unitPrice);
          acc.discount += Number(line.discountAmount);
          acc.vat += Number(line.vatAmount);
          return acc;
        },
        { base: 0, discount: 0, vat: 0 },
      );

      let allocatedBase = 0;
      let allocatedDiscount = 0;
      let allocatedVat = 0;

      for (let index = 0; index < invoice.lines.length; index += 1) {
        const line = invoice.lines[index];
        const isLast = index === invoice.lines.length - 1;

        let base = this.roundMoney(
          Number(line.quantity) * Number(line.unitPrice) * ratio,
        );
        let discount = this.roundMoney(Number(line.discountAmount) * ratio);
        let vat = this.roundMoney(Number(line.vatAmount) * ratio);

        if (isLast) {
          base = this.roundMoney(totals.base * ratio - allocatedBase);
          discount = this.roundMoney(totals.discount * ratio - allocatedDiscount);
          vat = this.roundMoney(totals.vat * ratio - allocatedVat);
        } else {
          allocatedBase = this.roundMoney(allocatedBase + base);
          allocatedDiscount = this.roundMoney(allocatedDiscount + discount);
          allocatedVat = this.roundMoney(allocatedVat + vat);
        }

        if (discount > 0) {
          const discountAccountId = await this.resolveDiscountAccountId(
            tx,
            line.discountGlAccountId ?? null,
          );
          lines.push({
            accountId: discountAccountId,
            debitAmount: discount,
            creditAmount: 0,
            description: `خصم ${line.descriptionAr}`,
            studentId,
            branchId,
          });
        }

        if (base > 0) {
          const revenueAccountId = await this.resolveRevenueAccountId(tx, line);
          lines.push({
            accountId: revenueAccountId,
            debitAmount: 0,
            creditAmount: base,
            description: line.descriptionAr,
            studentId,
            branchId,
          });
        }

        if (vat > 0) {
          const vatAccountId = await this.resolveVatAccountId(tx, line);
          lines.push({
            accountId: vatAccountId,
            debitAmount: 0,
            creditAmount: vat,
            description: `ضريبة ${line.descriptionAr}`,
            studentId,
            branchId,
          });
        }
      }
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      totalDebit += Number(line.debitAmount);
      totalCredit += Number(line.creditAmount);
    }

    totalDebit = this.roundMoney(totalDebit);
    totalCredit = this.roundMoney(totalCredit);

    const diff = this.roundMoney(totalDebit - totalCredit);
    if (Math.abs(diff) > 0.01) {
      const lastCreditLine = [...lines].reverse().find(
        (line) => line.creditAmount > 0,
      );

      if (!lastCreditLine) {
        throw new BadRequestException('Journal entry is not balanced');
      }

      lastCreditLine.creditAmount = this.roundMoney(
        Number(lastCreditLine.creditAmount) + diff,
      );
      totalCredit = this.roundMoney(totalCredit + diff);
    }

    return {
      lines,
      totalDebit,
      totalCredit,
    };
  }

  private async reverseJournalEntry(
    tx: Prisma.TransactionClient,
    entryId: string,
    reason: string,
    actorUserId: string,
    reversalDate: Date,
  ) {
    const entry = await tx.journalEntry.findFirst({
      where: { id: entryId },
      include: {
        lines: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status !== JournalEntryStatus.POSTED) {
      throw new BadRequestException('Only posted entries can be reversed');
    }

    for (const line of entry.lines) {
      const balanceChange =
        Number(line.creditAmount) - Number(line.debitAmount);

      await tx.chartOfAccount.update({
        where: { id: line.accountId },
        data: {
          currentBalance: {
            increment: balanceChange,
          },
        },
      });
    }

    await tx.journalEntry.update({
      where: { id: entryId },
      data: {
        status: JournalEntryStatus.REVERSED,
        reversedById: actorUserId,
        reversalReason: reason.trim() || 'Reversal',
        updatedById: actorUserId,
      },
    });

    const now = new Date();
    const reversalEntryNumber =
      await this.documentSequencesService.reserveNextNumber(
        DocumentType.JOURNAL_ENTRY,
        {
          tx,
          fiscalYearId: entry.fiscalYearId,
          branchId: entry.branchId ?? null,
          date: reversalDate,
          prefixOverride: 'REV',
        },
      );

    return tx.journalEntry.create({
      data: {
        entryNumber: reversalEntryNumber,
        entryDate: reversalDate,
        fiscalYearId: entry.fiscalYearId,
        fiscalPeriodId: entry.fiscalPeriodId,
        branchId: entry.branchId,
        description: `عكس قيد: ${entry.entryNumber} — ${reason}`.trim(),
        referenceType: 'REFUND',
        referenceId: entry.id,
        status: JournalEntryStatus.POSTED,
        totalDebit: Number(entry.totalCredit),
        totalCredit: Number(entry.totalDebit),
        currencyId: entry.currencyId,
        exchangeRate: Number(entry.exchangeRate),
        isReversal: true,
        reversalOfId: entry.id,
        createdById: actorUserId,
        updatedById: actorUserId,
        approvedById: actorUserId,
        approvedAt: now,
        postedById: actorUserId,
        postedAt: now,
        isActive: true,
        lines: {
          create: entry.lines.map((line, index) => ({
            lineNumber: index + 1,
            accountId: line.accountId,
            description: `عكس: ${line.description ?? ''}`.trim(),
            debitAmount: Number(line.creditAmount),
            creditAmount: Number(line.debitAmount),
            costCenter: line.costCenter ?? undefined,
            studentId: line.studentId ?? undefined,
            employeeId: line.employeeId ?? undefined,
            branchId: line.branchId ?? undefined,
            isActive: true,
            createdById: actorUserId,
            updatedById: actorUserId,
          })),
        },
      },
      include: {
        lines: true,
      },
    });
  }

  private async resolveDebitAccountId(
    tx: Prisma.TransactionClient,
    transaction: PaymentTransactionForPosting,
  ) {
    if (transaction.gateway?.settlementAccountId) {
      const account = await this.findPostingAccountById(
        tx,
        transaction.gateway.settlementAccountId,
      );
      return account.id;
    }

    const accountCode =
      transaction.paymentMethod === PaymentMethod.CASH ||
      transaction.paymentMethod === PaymentMethod.CHEQUE
        ? DEFAULT_CASH_ACCOUNT_CODE
        : DEFAULT_GATEWAY_ACCOUNT_CODE;

    const account = await this.findPostingAccountByCode(tx, accountCode);
    return account.id;
  }

  private async resolveRevenueAccountId(
    tx: Prisma.TransactionClient,
    line: InvoiceForPosting['lines'][number],
  ) {
    if (line.accountId) {
      const account = await this.findPostingAccountById(tx, line.accountId);
      return account.id;
    }

    const accountCode =
      FEE_TYPE_REVENUE_ACCOUNT_CODE[line.feeType] ?? DEFAULT_REVENUE_ACCOUNT_CODE;
    const account = await this.findPostingAccountByCode(tx, accountCode);
    return account.id;
  }

  private async resolveVatAccountId(
    tx: Prisma.TransactionClient,
    line: InvoiceForPosting['lines'][number],
  ) {
    if (line.taxCode?.outputGlAccountId) {
      const account = await this.findPostingAccountById(
        tx,
        line.taxCode.outputGlAccountId,
      );
      return account.id;
    }

    const account = await this.findPostingAccountByCode(
      tx,
      DEFAULT_VAT_OUTPUT_ACCOUNT_CODE,
    );
    return account.id;
  }

  private async resolveDiscountAccountId(
    tx: Prisma.TransactionClient,
    discountGlAccountId: number | null,
  ) {
    if (discountGlAccountId) {
      const account = await this.findPostingAccountById(tx, discountGlAccountId);
      return account.id;
    }

    const account = await this.findPostingAccountByCode(
      tx,
      DEFAULT_DISCOUNT_ACCOUNT_CODE,
    );
    return account.id;
  }

  private async findPostingAccountByCode(
    tx: Prisma.TransactionClient,
    accountCode: string,
  ) {
    const account = await tx.chartOfAccount.findFirst({
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
      throw new NotFoundException(`Posting account ${accountCode} was not found`);
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountCode} cannot be a header account`,
      );
    }

    return account;
  }

  private async findPostingAccountById(
    tx: Prisma.TransactionClient,
    accountId: number,
  ) {
    const account = await tx.chartOfAccount.findFirst({
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
      throw new NotFoundException(`Posting account ${accountId} was not found`);
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountId} cannot be a header account`,
      );
    }

    return account;
  }

  private async findFiscalYearForDate(
    tx: Prisma.TransactionClient,
    date: Date,
  ) {
    return findActiveFiscalYearForDate(tx, date, 'the payment date');
  }

  private async findFiscalPeriodForDate(
    tx: Prisma.TransactionClient,
    fiscalYearId: number,
    date: Date,
  ) {
    return findPostingFiscalPeriodForDate(
      tx,
      fiscalYearId,
      date,
      'the payment date',
    );
  }

  private async findBaseCurrency(tx: Prisma.TransactionClient) {
    return tx.currency.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        isBase: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  private assertBalanced(totalDebit: number, totalCredit: number) {
    if (totalDebit <= 0 || totalCredit <= 0) {
      throw new BadRequestException('Total debit and credit must be greater than zero');
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Journal entry is not balanced');
    }
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private buildContext(
    payload:
      | PaymentWebhookSuccessDto
      | PaymentWebhookFailureDto
      | PaymentWebhookRefundDto,
    req: Request,
  ): WebhookContext {
    const rawBody = this.getRawBody(req, payload);
    const signature = this.getSignature(req);
    const idempotencyKey = this.getIdempotencyKey(req, payload);
    const eventId = this.getEventId(req, payload, rawBody);

    return {
      rawBody,
      signature,
      eventId,
      idempotencyKey,
      ipAddress: this.extractIp(req),
      userAgent: req.get('user-agent') ?? undefined,
    };
  }

  private getRawBody(req: Request, payload: unknown) {
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;

    if (raw && raw.length > 0) {
      return raw.toString('utf8');
    }

    return JSON.stringify(payload ?? {});
  }

  private getSignature(req: Request) {
    return (
      req.get('x-payment-signature') ||
      req.get('x-webhook-signature') ||
      req.get('x-signature')
    ) ?? null;
  }

  private getIdempotencyKey(
    req: Request,
    payload:
      | PaymentWebhookSuccessDto
      | PaymentWebhookFailureDto
      | PaymentWebhookRefundDto,
  ) {
    return (
      payload.idempotencyKey?.trim() ||
      req.get('idempotency-key') ||
      req.get('x-idempotency-key') ||
      undefined
    );
  }

  private getEventId(
    req: Request,
    payload:
      | PaymentWebhookSuccessDto
      | PaymentWebhookFailureDto
      | PaymentWebhookRefundDto,
    rawBody: string,
  ) {
    const fromPayload = payload.eventId?.trim();
    const fromHeader = req.get('x-webhook-event-id') || req.get('x-event-id');

    if (fromPayload) {
      return fromPayload;
    }

    if (fromHeader) {
      return fromHeader;
    }

    return createHash('sha256').update(rawBody).digest('hex');
  }

  private verifySignature(context: WebhookContext) {
    const secret = this.configService.get<string>('PAYMENT_WEBHOOK_SECRET');

    if (!secret) {
      throw new BadRequestException('Webhook secret is not configured');
    }

    if (!context.signature) {
      throw new UnauthorizedException('Webhook signature is missing');
    }

    const normalized = context.signature.replace(/^sha256=/i, '').trim().toLowerCase();
    const expected = createHmac('sha256', secret).update(context.rawBody).digest('hex');

    if (!/^[0-9a-f]{64}$/.test(normalized)) {
      throw new UnauthorizedException('Webhook signature is invalid');
    }

    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(normalized, 'hex');

    if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
      throw new UnauthorizedException('Webhook signature is invalid');
    }
  }

  private verifyIp(ipAddress?: string) {
    const allowList = this.configService
      .get<string>('PAYMENT_WEBHOOK_IP_WHITELIST')
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!allowList || allowList.length === 0) {
      return;
    }

    const normalizedIp = this.normalizeIp(ipAddress);

    if (!normalizedIp || !allowList.includes(normalizedIp)) {
      throw new UnauthorizedException('Webhook IP address is not allowed');
    }
  }

  private extractIp(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return this.normalizeIp(forwarded.split(',')[0]?.trim());
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return this.normalizeIp(forwarded[0].trim());
    }

    return this.normalizeIp(req.ip || req.socket?.remoteAddress);
  }

  private normalizeIp(ip?: string | null) {
    if (!ip) {
      return undefined;
    }

    const trimmed = ip.trim();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed.startsWith('::ffff:')) {
      return trimmed.slice('::ffff:'.length);
    }

    return trimmed;
  }

  private async findTransaction(transactionId: string) {
    const parsedId = this.parseTransactionId(transactionId);
    const orFilters: Prisma.PaymentTransactionWhereInput[] = [
      { transactionNumber: transactionId },
    ];

    if (parsedId !== null) {
      orFilters.push({ id: parsedId });
    }

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        OR: orFilters,
      },
      include: {
        gateway: {
          select: {
            id: true,
            providerCode: true,
            settlementAccountId: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    return transaction;
  }

  private ensureProviderCodeMatches(
    transaction: { gateway?: { providerCode: string } | null },
    providerCode?: string,
  ) {
    if (!providerCode || !transaction.gateway?.providerCode) {
      return;
    }

    if (transaction.gateway.providerCode !== providerCode.trim().toUpperCase()) {
      throw new BadRequestException('Payment gateway does not match the transaction');
    }
  }

  private assertAmountMatches(expected: number, actual: Prisma.Decimal) {
    const actualAmount = Number(actual);
    const diff = Math.abs(expected - actualAmount);

    if (diff > 0.01) {
      throw new BadRequestException('Payment amount does not match transaction');
    }
  }

  private assertGatewayTransactionId(
    current: string | null,
    incoming?: string,
  ) {
    if (!incoming) {
      return;
    }

    if (current && current !== incoming.trim()) {
      throw new ConflictException('Gateway transaction ID mismatch');
    }
  }

  private appendNote(existing: string | null, reason?: string) {
    const trimmed = reason?.trim();

    if (!trimmed) {
      return existing ?? undefined;
    }

    if (!existing) {
      return `Webhook: ${trimmed}`;
    }

    return `${existing}\nWebhook: ${trimmed}`;
  }

  private parseTransactionId(value: string) {
    if (!value) {
      return null;
    }

    if (!/^\d+$/.test(value)) {
      return null;
    }

    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }

  private async createEvent(input: {
    context: WebhookContext;
    payload: unknown;
    eventType: PaymentWebhookEventType;
    gatewayId?: number | null;
    transactionId?: bigint | null;
  }) {
    if (input.context.idempotencyKey) {
      const existing = await this.prisma.paymentWebhookEvent.findFirst({
        where: {
          idempotencyKey: input.context.idempotencyKey,
          gatewayId: input.gatewayId ?? undefined,
        },
        select: {
          id: true,
          status: true,
          eventId: true,
        },
      });

      if (existing) {
        return null;
      }
    }

    try {
      return await this.prisma.paymentWebhookEvent.create({
        data: {
          eventId: input.context.eventId,
          eventType: input.eventType,
          status: PaymentWebhookEventStatus.RECEIVED,
          idempotencyKey: input.context.idempotencyKey,
          gatewayId: input.gatewayId ?? undefined,
          transactionId: input.transactionId ?? undefined,
          payload: input.payload as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }

      throw error;
    }
  }

  private async finalizeEvent(eventId: string, processed: boolean) {
    await this.prisma.paymentWebhookEvent.update({
      where: { id: eventId },
      data: {
        status: processed
          ? PaymentWebhookEventStatus.PROCESSED
          : PaymentWebhookEventStatus.IGNORED,
        processedAt: new Date(),
      },
    });
  }

  private async failEvent(eventId: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    await this.prisma.paymentWebhookEvent.update({
      where: { id: eventId },
      data: {
        status: PaymentWebhookEventStatus.FAILED,
        processedAt: new Date(),
        errorMessage: message,
      },
    });
  }
}
