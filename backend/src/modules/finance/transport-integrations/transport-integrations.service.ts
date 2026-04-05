import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  DocumentType,
  FeeType,
  InstallmentStatus,
  InvoiceStatus,
  JournalEntryStatus,
  PaymentMethod,
  PaymentTransactionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import { buildHybridBranchClause } from '../utils/hybrid-branch-scope';
import {
  findActiveFiscalYearForDate,
  findPostingFiscalPeriodForDate,
} from '../utils/posting-fiscal-period';
import { GenerateTransportInvoicesDto } from './dto/generate-transport-invoices.dto';
import { TransportMaintenanceExpenseDto } from './dto/transport-maintenance-expense.dto';
import { TransportRevenueReportQueryDto } from './dto/transport-revenue-report-query.dto';
import { TransportSubscriptionFeeDto } from './dto/transport-subscription-fee.dto';

const DEFAULT_TRANSPORT_REVENUE_ACCOUNT_CODE = '4003';
const DEFAULT_TRANSPORT_EXPENSE_ACCOUNT_CODE = '5003';
const DEFAULT_CASH_ACCOUNT_CODE = '1101';
const DEFAULT_GATEWAY_ACCOUNT_CODE = '1102';

@Injectable()
export class TransportIntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async getRevenueReport(query: TransportRevenueReportQueryDto) {
    if (query.dateFrom && query.dateTo) {
      const from = new Date(`${query.dateFrom}T00:00:00.000Z`);
      const to = new Date(`${query.dateTo}T23:59:59.999Z`);
      if (from > to) {
        throw new BadRequestException('dateFrom must be less than or equal to dateTo');
      }
    }

    const invoiceWhere: Prisma.StudentInvoiceWhereInput = {
      lines: {
        some: {
          feeType: FeeType.TRANSPORT,
        },
      },
      ...(buildHybridBranchClause(query.branchId) ?? {}),
      ...(query.dateFrom || query.dateTo
        ? {
            invoiceDate: {
              ...(query.dateFrom
                ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) }
                : {}),
              ...(query.dateTo
                ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
    };

    const invoices = await this.prisma.studentInvoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        invoiceNumber: true,
        branchId: true,
        invoiceDate: true,
        dueDate: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        balanceDue: true,
      },
      orderBy: [{ invoiceDate: 'desc' }, { invoiceNumber: 'desc' }],
    });

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const paymentTransactions = invoiceIds.length
      ? await this.prisma.paymentTransaction.findMany({
          where: {
            invoiceId: { in: invoiceIds },
            status: PaymentTransactionStatus.COMPLETED,
          },
          select: {
            amount: true,
          },
        })
      : [];

    const summary = {
      invoiceCount: invoices.length,
      transactionCount: paymentTransactions.length,
      totalRevenue: this.roundMoney(
        invoices.reduce((total, invoice) => total + Number(invoice.totalAmount), 0),
      ),
      collectedRevenue: this.roundMoney(
        paymentTransactions.reduce((total, transaction) => total + Number(transaction.amount), 0),
      ),
      outstandingRevenue: this.roundMoney(
        invoices.reduce((total, invoice) => total + Number(invoice.balanceDue), 0),
      ),
    };

    return {
      filters: {
        branchId: query.branchId ?? null,
        dateFrom: query.dateFrom ?? null,
        dateTo: query.dateTo ?? null,
      },
      summary,
    };
  }

  async generateInvoices(payload: GenerateTransportInvoicesDto, actorUserId: string) {
    const invoiceDate = payload.invoiceDate
      ? new Date(payload.invoiceDate)
      : new Date();
    const dueDate = payload.dueDate
      ? new Date(payload.dueDate)
      : new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const baseCurrency = await this.findBaseCurrency();
    const revenueAccountId = await this.findPostingAccountByCode(
      DEFAULT_TRANSPORT_REVENUE_ACCOUNT_CODE,
    );

    const results: Array<{ enrollmentId: string; invoiceNumber: string; totalAmount: number }> = [];
    const errors: Array<{ enrollmentId: string; error: string }> = [];

    for (const enrollmentId of payload.enrollmentIds) {
      try {
        const enrollment = await this.prisma.studentEnrollment.findFirst({
          where: {
            id: enrollmentId,
            academicYearId: payload.academicYearId,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (!enrollment) {
          throw new NotFoundException('Enrollment not found for academic year');
        }

        const vatRate = payload.vatRate ?? 0;
        const subtotal = this.roundMoney(payload.amount);
        const vatAmount = this.roundMoney((subtotal * vatRate) / 100);
        const totalAmount = this.roundMoney(subtotal + vatAmount);

        const invoiceNumber = await this.documentSequencesService.reserveNextNumber(
          DocumentType.INVOICE,
          { date: invoiceDate },
        );

        await this.prisma.studentInvoice.create({
          data: {
            invoiceNumber,
            enrollmentId,
            academicYearId: payload.academicYearId,
            branchId: payload.branchId,
            invoiceDate,
            dueDate,
            subtotal,
            discountAmount: 0,
            vatAmount,
            totalAmount,
            paidAmount: 0,
            currencyId: baseCurrency?.id,
            status: InvoiceStatus.ISSUED,
            createdByUserId: actorUserId,
            lines: {
              create: {
                descriptionAr: payload.description?.trim() ?? 'رسوم النقل',
                feeType: FeeType.TRANSPORT,
                quantity: 1,
                unitPrice: subtotal,
                discountAmount: 0,
                vatRate,
                vatAmount,
                lineTotal: totalAmount,
                accountId: revenueAccountId,
              },
            },
            installments: {
              create: {
                installmentNumber: 1,
                dueDate,
                amount: totalAmount,
                status: InstallmentStatus.PENDING,
              },
            },
          },
        });

        results.push({
          enrollmentId,
          invoiceNumber,
          totalAmount,
        });
      } catch (error) {
        errors.push({
          enrollmentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'TRANSPORT_GENERATE_INVOICES',
      resource: 'finance-transport',
      details: {
        academicYearId: payload.academicYearId,
        generated: results.length,
        errors: errors.length,
      },
    });

    return {
      generated: results.length,
      errors,
      invoices: results,
    };
  }

  async addSubscriptionFee(
    payload: TransportSubscriptionFeeDto,
    actorUserId: string,
  ) {
    const invoiceId = this.parseBigInt(payload.invoiceId, 'invoiceId');
    const invoice = await this.prisma.studentInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (
      invoice.status === InvoiceStatus.CANCELLED ||
      invoice.status === InvoiceStatus.CREDITED
    ) {
      throw new BadRequestException('Cannot add fee to cancelled/credited invoice');
    }

    const vatRate = payload.vatRate ?? 0;
    const subtotal = this.roundMoney(payload.amount);
    const vatAmount = this.roundMoney((subtotal * vatRate) / 100);
    const lineTotal = this.roundMoney(subtotal + vatAmount);

    const revenueAccountId = await this.findPostingAccountByCode(
      DEFAULT_TRANSPORT_REVENUE_ACCOUNT_CODE,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          descriptionAr: payload.description?.trim() ?? 'رسوم نقل إضافية',
          feeType: FeeType.TRANSPORT,
          quantity: 1,
          unitPrice: subtotal,
          discountAmount: 0,
          vatRate,
          vatAmount,
          lineTotal,
          accountId: revenueAccountId,
        },
      });

      const newTotal = this.roundMoney(Number(invoice.totalAmount) + lineTotal);
      const newVat = this.roundMoney(Number(invoice.vatAmount) + vatAmount);
      const newSubtotal = this.roundMoney(Number(invoice.subtotal) + subtotal);
      const paidAmount = Number(invoice.paidAmount);
      let newStatus: InvoiceStatus = InvoiceStatus.ISSUED;
      if (paidAmount >= newTotal) newStatus = InvoiceStatus.PAID;
      else if (paidAmount > 0) newStatus = InvoiceStatus.PARTIAL;

      await tx.studentInvoice.update({
        where: { id: invoice.id },
        data: {
          subtotal: newSubtotal,
          vatAmount: newVat,
          totalAmount: newTotal,
          status: newStatus,
        },
      });

      if (invoice.installments.length > 0) {
        const lastInstallment = invoice.installments[invoice.installments.length - 1];
        await tx.invoiceInstallment.update({
          where: { id: lastInstallment.id },
          data: {
            amount: this.roundMoney(Number(lastInstallment.amount) + lineTotal),
          },
        });
      } else {
        await tx.invoiceInstallment.create({
          data: {
            invoiceId: invoice.id,
            installmentNumber: 1,
            dueDate: invoice.dueDate,
            amount: newTotal,
            status: InstallmentStatus.PENDING,
          },
        });
      }
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'TRANSPORT_SUBSCRIPTION_FEE',
      resource: 'finance-transport',
      resourceId: payload.invoiceId,
      status: AuditStatus.SUCCESS,
      details: {
        amount: payload.amount,
        vatRate,
      },
    });

    return { success: true, invoiceId: payload.invoiceId };
  }

  async recordMaintenanceExpense(
    payload: TransportMaintenanceExpenseDto,
    actorUserId: string,
  ) {
    const expenseAccountId = await this.findPostingAccountByCode(
      DEFAULT_TRANSPORT_EXPENSE_ACCOUNT_CODE,
    );
    const creditAccountId = await this.findPostingAccountByCode(
      this.resolveCreditAccountCode(payload.paymentMethod),
    );

    const lines = [
      {
        accountId: expenseAccountId,
        debitAmount: this.roundMoney(payload.amount),
        creditAmount: 0,
        description: payload.description?.trim() ?? 'مصروف صيانة نقل',
        branchId: payload.branchId,
      },
      {
        accountId: creditAccountId,
        debitAmount: 0,
        creditAmount: this.roundMoney(payload.amount),
        description: 'دفع صيانة نقل',
        branchId: payload.branchId,
      },
    ];

    const entry = await this.createPostedJournalEntry({
      entryDate: new Date(),
      description: payload.description?.trim() ?? 'قيد صيانة نقل',
      referenceType: 'TRANSPORT_MAINTENANCE',
      branchId: payload.branchId,
      actorUserId,
      lines,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'TRANSPORT_MAINTENANCE_JOURNAL',
      resource: 'finance-transport',
      resourceId: entry.id,
      details: {
        amount: payload.amount,
        entryNumber: entry.entryNumber,
      },
    });

    return {
      journalEntryId: entry.id,
      entryNumber: entry.entryNumber,
      amount: this.roundMoney(payload.amount),
    };
  }

  private resolveCreditAccountCode(paymentMethod?: PaymentMethod) {
    if (!paymentMethod) return DEFAULT_CASH_ACCOUNT_CODE;

    if (paymentMethod === PaymentMethod.CARD || paymentMethod === PaymentMethod.MOBILE_WALLET) {
      return DEFAULT_GATEWAY_ACCOUNT_CODE;
    }

    return DEFAULT_CASH_ACCOUNT_CODE;
  }

  private async createPostedJournalEntry(input: {
    entryDate: Date;
    description: string;
    referenceType: string;
    referenceId?: string;
    branchId?: number;
    actorUserId: string;
    lines: Array<{
      accountId: number;
      debitAmount: number;
      creditAmount: number;
      description: string;
      branchId?: number | null;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const fiscalYear = await this.findFiscalYearForDate(tx, input.entryDate);
      const fiscalPeriod = await this.findFiscalPeriodForDate(
        tx,
        fiscalYear.id,
        input.entryDate,
      );
      const baseCurrency = await this.findBaseCurrency(tx);

      const { totalDebit, totalCredit } = this.calculateTotals(input.lines);
      this.assertBalanced(totalDebit, totalCredit);

      const entryNumber = await this.documentSequencesService.reserveNextNumber(
        DocumentType.JOURNAL_ENTRY,
        {
          tx,
          fiscalYearId: fiscalYear.id,
          branchId: input.branchId ?? null,
          date: input.entryDate,
        },
      );

      const entry = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: input.entryDate,
          fiscalYearId: fiscalYear.id,
          fiscalPeriodId: fiscalPeriod?.id,
          branchId: input.branchId,
          description: input.description,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          status: JournalEntryStatus.POSTED,
          totalDebit,
          totalCredit,
          currencyId: baseCurrency?.id,
          exchangeRate: 1,
          createdById: input.actorUserId,
          updatedById: input.actorUserId,
          approvedById: input.actorUserId,
          approvedAt: input.entryDate,
          postedById: input.actorUserId,
          postedAt: input.entryDate,
          isActive: true,
          lines: {
            create: input.lines.map((line, index) => ({
              lineNumber: index + 1,
              accountId: line.accountId,
              description: line.description,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              branchId: line.branchId ?? undefined,
              isActive: true,
              createdById: input.actorUserId,
              updatedById: input.actorUserId,
            })),
          },
        },
        select: { id: true, entryNumber: true },
      });

      for (const line of input.lines) {
        const balanceChange = Number(line.creditAmount) - Number(line.debitAmount);
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
    });
  }

  private async findFiscalYearForDate(tx: Prisma.TransactionClient, date: Date) {
    return findActiveFiscalYearForDate(tx, date, 'the entry date');
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
      'the entry date',
    );
  }

  private async findBaseCurrency(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.currency.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        isBase: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  private async findPostingAccountByCode(accountCode: string) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        accountCode,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, isHeader: true },
    });

    if (!account) {
      throw new NotFoundException(`Posting account ${accountCode} was not found`);
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountCode} cannot be a header account`,
      );
    }

    return account.id;
  }

  private calculateTotals(
    lines: Array<{ debitAmount: number; creditAmount: number }>,
  ) {
    const totals = lines.reduce(
      (acc, line) => ({
        totalDebit: acc.totalDebit + Number(line.debitAmount),
        totalCredit: acc.totalCredit + Number(line.creditAmount),
      }),
      { totalDebit: 0, totalCredit: 0 },
    );

    return {
      totalDebit: this.roundMoney(totals.totalDebit),
      totalCredit: this.roundMoney(totals.totalCredit),
    };
  }

  private assertBalanced(totalDebit: number, totalCredit: number) {
    if (totalDebit <= 0 || totalCredit <= 0) {
      throw new BadRequestException('Total debit and credit must be greater than zero');
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Journal entry is not balanced');
    }
  }

  private parseBigInt(value: string, fieldName: string) {
    if (!/^[0-9]+$/.test(value)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return BigInt(value);
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
