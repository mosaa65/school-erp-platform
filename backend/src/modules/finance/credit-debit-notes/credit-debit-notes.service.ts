import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountType,
  AuditStatus,
  CreditDebitNoteStatus,
  CreditDebitNoteType,
  DocumentType,
  InvoiceStatus,
  JournalEntryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import {
  findActiveFiscalYearForDate,
  findPostingFiscalPeriodForDate,
} from '../utils/posting-fiscal-period';
import { CreateCreditDebitNoteDto } from './dto/create-credit-debit-note.dto';
import { ListCreditDebitNotesDto } from './dto/list-credit-debit-notes.dto';
import { UpdateCreditDebitNoteDto } from './dto/update-credit-debit-note.dto';

const noteInclude: Prisma.CreditDebitNoteInclude = {
  originalInvoice: {
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      paidAmount: true,
      status: true,
    },
  },
  enrollment: {
    select: {
      id: true,
      student: { select: { id: true, fullName: true } },
    },
  },
  journalEntry: { select: { id: true, entryNumber: true } },
  createdByUser: { select: { id: true, email: true } },
  approvedByUser: { select: { id: true, email: true } },
};

const DEFAULT_REVENUE_ACCOUNT_NAME_EN = 'Tuition Revenue';
const DEFAULT_REVENUE_ACCOUNT_NAME_AR = 'إيراد الرسوم الدراسية';
const DEFAULT_RECEIVABLE_ACCOUNT_NAME_EN = 'Student Receivables';
const DEFAULT_RECEIVABLE_ACCOUNT_NAME_AR = 'ذمم الطلاب';
const DEFAULT_REFUND_PAYABLE_ACCOUNT_NAME_EN = 'Refunds Payable';
const DEFAULT_REFUND_PAYABLE_ACCOUNT_NAME_AR = 'مبالغ مستحقة الرد';
const DEFAULT_VAT_OUTPUT_ACCOUNT_NAME_EN = 'VAT Payable';
const DEFAULT_VAT_OUTPUT_ACCOUNT_NAME_AR = 'ضريبة القيمة المضافة المستحقة';

type PostingLineInput = {
  accountId: number;
  debitAmount: number;
  creditAmount: number;
  description: string;
  studentId?: string | null;
  branchId?: number | null;
};

@Injectable()
export class CreditDebitNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async create(payload: CreateCreditDebitNoteDto, actorUserId: string) {
    const originalInvoiceId = BigInt(payload.originalInvoiceId);
    const vatAmount = payload.vatAmount ?? 0;
    const totalAmount = payload.amount + vatAmount;

    const noteNumber = await this.documentSequencesService.reserveNextNumber(
      payload.noteType === CreditDebitNoteType.CREDIT
        ? DocumentType.CREDIT_NOTE
        : DocumentType.DEBIT_NOTE,
      { branchId: null, date: new Date() },
    );

    try {
      const note = await this.prisma.creditDebitNote.create({
        data: {
          noteNumber,
          noteType: payload.noteType,
          originalInvoiceId,
          enrollmentId: payload.enrollmentId,
          amount: payload.amount,
          vatAmount,
          totalAmount,
          reason: payload.reason,
          reasonDetails: payload.reasonDetails?.trim(),
          status: CreditDebitNoteStatus.DRAFT,
          createdByUserId: actorUserId,
        },
        include: noteInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'CREDIT_DEBIT_NOTE_CREATE',
        resource: 'credit-debit-notes',
        resourceId: note.id.toString(),
        details: {
          noteNumber: note.noteNumber,
          noteType: note.noteType,
          amount: note.amount,
        },
      });

      return note;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'CREDIT_DEBIT_NOTE_CREATE_FAILED',
        resource: 'credit-debit-notes',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListCreditDebitNotesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CreditDebitNoteWhereInput = {
      noteType: query.noteType,
      status: query.status,
      reason: query.reason,
      OR: query.search
        ? [{ noteNumber: { contains: query.search } }]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.creditDebitNote.count({ where }),
      this.prisma.creditDebitNote.findMany({
        where,
        include: noteInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const noteId = BigInt(id);
    const note = await this.prisma.creditDebitNote.findFirst({
      where: { id: noteId },
      include: noteInclude,
    });
    if (!note) throw new NotFoundException('Credit/Debit note not found');
    return note;
  }

  async update(id: string, payload: UpdateCreditDebitNoteDto, actorUserId: string) {
    const note = await this.findOne(id);
    if (note.status !== CreditDebitNoteStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT notes can be updated');
    }

    const vatAmount = payload.vatAmount ?? Number(note.vatAmount);
    const amount = payload.amount ?? Number(note.amount);

    try {
      const updated = await this.prisma.creditDebitNote.update({
        where: { id: note.id },
        data: {
          enrollmentId: payload.enrollmentId,
          amount,
          vatAmount,
          totalAmount: amount + vatAmount,
          reason: payload.reason,
          reasonDetails: payload.reasonDetails?.trim(),
        },
        include: noteInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'CREDIT_DEBIT_NOTE_UPDATE',
        resource: 'credit-debit-notes',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async approve(id: string, actorUserId: string) {
    const note = await this.findOne(id);
    if (note.status !== CreditDebitNoteStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT notes can be approved');
    }

    const updated = await this.prisma.creditDebitNote.update({
      where: { id: note.id },
      data: {
        status: CreditDebitNoteStatus.APPROVED,
        approvedByUserId: actorUserId,
        approvedAt: new Date(),
      },
      include: noteInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'CREDIT_DEBIT_NOTE_APPROVE',
      resource: 'credit-debit-notes',
      resourceId: id,
    });

    return updated;
  }

  async apply(id: string, actorUserId: string) {
    const note = await this.findOne(id);
    if (note.status !== CreditDebitNoteStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED notes can be applied');
    }

    const totalAmount = Number(note.totalAmount);
    const vatAmount = Number(note.vatAmount);
    const baseAmount = Number(note.amount);

    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.studentInvoice.findUnique({
        where: { id: note.originalInvoiceId },
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
          branchId: true,
          enrollment: {
            select: {
              id: true,
              studentId: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundException('Original invoice not found');
      }

      const branchId = invoice.branchId ?? undefined;
      const studentId = invoice.enrollment?.studentId ?? undefined;
      const entryDate = new Date();

      const fiscalYear = await this.findFiscalYearForDate(tx, entryDate);
      const fiscalPeriod = await this.findFiscalPeriodForDate(
        tx,
        fiscalYear.id,
        entryDate,
      );
      const baseCurrency = await this.findBaseCurrency(tx);

      const revenueAccountId = await this.findPostingAccountByCode(
        tx,
        DEFAULT_REVENUE_ACCOUNT_NAME_EN,
        DEFAULT_REVENUE_ACCOUNT_NAME_AR,
        AccountType.REVENUE,
      );
      const receivableAccountId = await this.findPostingAccountByCode(
        tx,
        DEFAULT_RECEIVABLE_ACCOUNT_NAME_EN,
        DEFAULT_RECEIVABLE_ACCOUNT_NAME_AR,
        AccountType.ASSET,
      );
      const refundAccountId = await this.findPostingAccountByCode(
        tx,
        DEFAULT_REFUND_PAYABLE_ACCOUNT_NAME_EN,
        DEFAULT_REFUND_PAYABLE_ACCOUNT_NAME_AR,
        AccountType.LIABILITY,
      );
      const vatAccountId =
        vatAmount > 0
          ? await this.findPostingAccountByCode(
              tx,
              DEFAULT_VAT_OUTPUT_ACCOUNT_NAME_EN,
              DEFAULT_VAT_OUTPUT_ACCOUNT_NAME_AR,
              AccountType.LIABILITY,
            )
          : null;

      const lines: PostingLineInput[] = [];

      if (note.noteType === CreditDebitNoteType.CREDIT) {
        lines.push({
          accountId: revenueAccountId,
          debitAmount: baseAmount,
          creditAmount: 0,
          description: `عكس إيراد — ${note.noteNumber}`,
          studentId,
          branchId,
        });

        if (vatAmount > 0 && vatAccountId) {
          lines.push({
            accountId: vatAccountId,
            debitAmount: vatAmount,
            creditAmount: 0,
            description: `عكس ضريبة — ${note.noteNumber}`,
            studentId,
            branchId,
          });
        }

        const outstanding = Math.max(
          0,
          Number(invoice.totalAmount) - Number(invoice.paidAmount),
        );
        const creditToReceivable = Math.min(outstanding, totalAmount);

        if (creditToReceivable > 0) {
          lines.push({
            accountId: receivableAccountId,
            debitAmount: 0,
            creditAmount: this.roundMoney(creditToReceivable),
            description: `تخفيض ذمم — ${note.noteNumber}`,
            studentId,
            branchId,
          });
        }

        const remainder = this.roundMoney(totalAmount - creditToReceivable);
        if (remainder > 0.01) {
          lines.push({
            accountId: refundAccountId,
            debitAmount: 0,
            creditAmount: remainder,
            description: `مستحقات استرداد — ${note.noteNumber}`,
            studentId,
            branchId,
          });
        }
      } else {
        lines.push({
          accountId: receivableAccountId,
          debitAmount: totalAmount,
          creditAmount: 0,
          description: `مذكرة خصم — ${note.noteNumber}`,
          studentId,
          branchId,
        });

        lines.push({
          accountId: revenueAccountId,
          debitAmount: 0,
          creditAmount: baseAmount,
          description: `إيراد إضافي — ${note.noteNumber}`,
          studentId,
          branchId,
        });

        if (vatAmount > 0 && vatAccountId) {
          lines.push({
            accountId: vatAccountId,
            debitAmount: 0,
            creditAmount: vatAmount,
            description: `ضريبة مستحقة — ${note.noteNumber}`,
            studentId,
            branchId,
          });
        }
      }

      const { totalDebit, totalCredit } = this.calculateTotals(lines);
      this.assertBalanced(totalDebit, totalCredit);

      const entryNumber = await this.documentSequencesService.reserveNextNumber(
        DocumentType.JOURNAL_ENTRY,
        {
          tx,
          fiscalYearId: fiscalYear.id,
          branchId: invoice.branchId ?? null,
          date: entryDate,
        },
      );

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate,
          fiscalYearId: fiscalYear.id,
          fiscalPeriodId: fiscalPeriod?.id,
          branchId: invoice.branchId ?? undefined,
          description: `${note.noteType === CreditDebitNoteType.CREDIT ? 'مذكرة ائتمان' : 'مذكرة خصم'} — ${note.noteNumber}`,
          referenceType:
            note.noteType === CreditDebitNoteType.CREDIT
              ? 'CREDIT_NOTE'
              : 'DEBIT_NOTE',
          referenceId: note.id.toString(),
          status: JournalEntryStatus.POSTED,
          totalDebit,
          totalCredit,
          currencyId: baseCurrency?.id,
          exchangeRate: 1,
          createdById: actorUserId,
          updatedById: actorUserId,
          approvedById: actorUserId,
          approvedAt: entryDate,
          postedById: actorUserId,
          postedAt: entryDate,
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
      });

      for (const line of lines) {
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

      await tx.creditDebitNote.update({
        where: { id: note.id },
        data: {
          status: CreditDebitNoteStatus.APPLIED,
          appliedAt: new Date(),
          journalEntryId: journalEntry.id,
        },
      });

      // Adjust the invoice based on note type
      if (note.noteType === CreditDebitNoteType.CREDIT) {
        // Credit note reduces the invoice total
        const newTotal = Number(invoice.totalAmount) - totalAmount;
        const paidAmount = Number(invoice.paidAmount);
        let newStatus: InvoiceStatus = InvoiceStatus.ISSUED;
        if (paidAmount >= newTotal) newStatus = InvoiceStatus.PAID;
        else if (paidAmount > 0) newStatus = InvoiceStatus.PARTIAL;

        await tx.studentInvoice.update({
          where: { id: note.originalInvoiceId },
          data: {
            totalAmount: Math.max(0, newTotal),
            status: newTotal <= 0 ? InvoiceStatus.CREDITED : newStatus,
          },
        });
      } else {
        // Debit note increases the invoice total
        const newTotal = Number(invoice.totalAmount) + totalAmount;
        const paidAmount = Number(invoice.paidAmount);
        let newStatus: InvoiceStatus = InvoiceStatus.ISSUED;
        if (paidAmount >= newTotal) newStatus = InvoiceStatus.PAID;
        else if (paidAmount > 0) newStatus = InvoiceStatus.PARTIAL;

        await tx.studentInvoice.update({
          where: { id: note.originalInvoiceId },
          data: {
            totalAmount: newTotal,
            status: newStatus,
          },
        });
      }
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'CREDIT_DEBIT_NOTE_APPLY',
      resource: 'credit-debit-notes',
      resourceId: id,
      details: { noteType: note.noteType, totalAmount },
    });

    return this.findOne(id);
  }

  async remove(id: string, actorUserId: string) {
    const note = await this.findOne(id);
    if (note.status !== CreditDebitNoteStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT notes can be cancelled');
    }

    await this.prisma.creditDebitNote.update({
      where: { id: note.id },
      data: { status: CreditDebitNoteStatus.CANCELLED },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'CREDIT_DEBIT_NOTE_DELETE',
      resource: 'credit-debit-notes',
      resourceId: id,
    });

    return { success: true, id };
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Credit/Debit note already exists');
    }
    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private async findFiscalYearForDate(
    tx: Prisma.TransactionClient,
    date: Date,
  ) {
    return findActiveFiscalYearForDate(tx, date, 'the note date');
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
      'the note date',
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

  private async findPostingAccountByCode(
    tx: Prisma.TransactionClient,
    accountNameEn: string,
    accountNameAr: string,
    fallbackType?: AccountType,
  ) {
    const namedAccount = await tx.chartOfAccount.findFirst({
      where: {
        OR: [{ nameEn: accountNameEn }, { nameAr: accountNameAr }],
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        isHeader: true,
      },
    });

    const account =
      namedAccount ??
      (fallbackType
        ? await tx.chartOfAccount.findFirst({
            where: {
              accountType: fallbackType,
              deletedAt: null,
              isActive: true,
              isHeader: false,
            },
            select: {
              id: true,
              isHeader: true,
            },
            orderBy: { id: 'asc' },
          })
        : null);

    if (!account) {
      throw new NotFoundException(`Posting account ${accountNameEn} was not found`);
    }

    if (account.isHeader) {
      throw new BadRequestException(
        `Posting account ${accountNameEn} cannot be a header account`,
      );
    }

    return account.id;
  }

  private calculateTotals(lines: PostingLineInput[]) {
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

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }
}
