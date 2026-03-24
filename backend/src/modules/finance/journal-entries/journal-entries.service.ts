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
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import { CreateJournalEntryDto, JournalEntryLineInputDto } from './dto/create-journal-entry.dto';
import { ListJournalEntriesDto } from './dto/list-journal-entries.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';

const journalEntrySummaryInclude: Prisma.JournalEntryInclude = {
  fiscalYear: {
    select: {
      id: true,
      nameAr: true,
      startDate: true,
      endDate: true,
    },
  },
  fiscalPeriod: {
    select: {
      id: true,
      nameAr: true,
      startDate: true,
      endDate: true,
    },
  },
  branch: {
    select: {
      id: true,
      code: true,
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
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      email: true,
    },
  },
  postedBy: {
    select: {
      id: true,
      email: true,
    },
  },
  reversedBy: {
    select: {
      id: true,
      email: true,
    },
  },
  reversalOf: {
    select: {
      id: true,
      entryNumber: true,
    },
  },
};

const journalEntryDetailInclude: Prisma.JournalEntryInclude = {
  ...journalEntrySummaryInclude,
  lines: {
    orderBy: {
      lineNumber: 'asc',
    },
    include: {
      account: {
        select: {
          id: true,
          accountCode: true,
          nameAr: true,
          nameEn: true,
          accountType: true,
        },
      },
      student: {
        select: {
          id: true,
          fullName: true,
        },
      },
      employee: {
        select: {
          id: true,
          fullName: true,
        },
      },
      branch: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          nameEn: true,
        },
      },
    },
  },
};

@Injectable()
export class JournalEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async create(payload: CreateJournalEntryDto, actorUserId: string) {
    const description = this.normalizeRequiredText(payload.description, 'description');
    const entryDate = new Date(payload.entryDate);

    await this.ensureFiscalYearExists(payload.fiscalYearId);

    if (payload.fiscalPeriodId) {
      await this.ensureFiscalPeriodMatchesYear(
        payload.fiscalPeriodId,
        payload.fiscalYearId,
      );
    }

    if (payload.branchId) {
      await this.ensureBranchExists(payload.branchId);
    }

    if (payload.currencyId) {
      await this.ensureCurrencyExists(payload.currencyId);
    }

    const lines = this.normalizeLines(payload.lines);
    const { totalDebit, totalCredit } = this.calculateTotals(lines);
    this.assertBalanced(totalDebit, totalCredit);

    await this.ensureAccountsExist(lines);

    const status = payload.status ?? JournalEntryStatus.DRAFT;

    if (status === JournalEntryStatus.REVERSED) {
      throw new BadRequestException('Cannot create a reversed entry');
    }

    const entryNumber = await this.documentSequencesService.reserveNextNumber(
      DocumentType.JOURNAL_ENTRY,
      {
        fiscalYearId: payload.fiscalYearId,
        branchId: payload.branchId ?? null,
        date: entryDate,
      },
    );
    const approvedAt =
      status === JournalEntryStatus.APPROVED || status === JournalEntryStatus.POSTED
        ? new Date()
        : null;
    const approvedById =
      status === JournalEntryStatus.APPROVED || status === JournalEntryStatus.POSTED
        ? actorUserId
        : null;
    const postedAt = status === JournalEntryStatus.POSTED ? new Date() : null;
    const postedById = status === JournalEntryStatus.POSTED ? actorUserId : null;

    try {
      const entry = await this.prisma.journalEntry.create({
        data: {
          entryNumber,
          entryDate,
          fiscalYearId: payload.fiscalYearId,
          fiscalPeriodId: payload.fiscalPeriodId,
          branchId: payload.branchId,
          description,
          referenceType: payload.referenceType?.trim(),
          referenceId: payload.referenceId?.trim(),
          status,
          totalDebit,
          totalCredit,
          currencyId: payload.currencyId,
          exchangeRate: payload.exchangeRate ?? 1,
          createdById: actorUserId,
          updatedById: actorUserId,
          approvedById,
          approvedAt,
          postedById,
          postedAt,
          isActive: payload.isActive ?? true,
          lines: {
            create: this.buildLineCreates(lines, actorUserId),
          },
        },
        include: journalEntryDetailInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'JOURNAL_ENTRY_CREATE',
        resource: 'journal-entries',
        resourceId: entry.id,
        details: {
          entryNumber: entry.entryNumber,
          status: entry.status,
        },
      });

      return entry;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'JOURNAL_ENTRY_CREATE_FAILED',
        resource: 'journal-entries',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListJournalEntriesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.JournalEntryWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      status: query.status,
      fiscalYearId: query.fiscalYearId,
      fiscalPeriodId: query.fiscalPeriodId,
      branchId: query.branchId,
      entryDate: query.dateFrom || query.dateTo
        ? {
            gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
            lte: query.dateTo ? new Date(query.dateTo) : undefined,
          }
        : undefined,
      OR: query.search
        ? [
            {
              entryNumber: {
                contains: query.search,
              },
            },
            {
              description: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.journalEntry.count({ where }),
      this.prisma.journalEntry.findMany({
        where,
        include: journalEntrySummaryInclude,
        orderBy: [{ entryDate: 'desc' }],
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
    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: journalEntryDetailInclude,
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    return entry;
  }

  async update(id: string, payload: UpdateJournalEntryDto, actorUserId: string) {
    const existing = await this.ensureEntryExists(id);

    if (payload.fiscalYearId) {
      await this.ensureFiscalYearExists(payload.fiscalYearId);
    }

    if (payload.fiscalPeriodId) {
      await this.ensureFiscalPeriodMatchesYear(
        payload.fiscalPeriodId,
        payload.fiscalYearId ?? existing.fiscalYearId,
      );
    }

    if (payload.branchId) {
      await this.ensureBranchExists(payload.branchId);
    }

    if (payload.currencyId) {
      await this.ensureCurrencyExists(payload.currencyId);
    }

    const description =
      payload.description === undefined
        ? undefined
        : this.normalizeRequiredText(payload.description, 'description');

    const entryDate = payload.entryDate ? new Date(payload.entryDate) : undefined;

    let totals: { totalDebit?: number; totalCredit?: number } = {};
    let lineCreates: Prisma.JournalEntryLineCreateManyJournalEntryInput[] | undefined;

    if (payload.lines) {
      const lines = this.normalizeLines(payload.lines);
      const { totalDebit, totalCredit } = this.calculateTotals(lines);
      this.assertBalanced(totalDebit, totalCredit);
      await this.ensureAccountsExist(lines);
      totals = { totalDebit, totalCredit };
      lineCreates = this.buildLineCreates(lines, actorUserId);
    }

    const status = payload.status;
    const approvedAt =
      status === undefined
        ? undefined
        : status === JournalEntryStatus.APPROVED ||
            status === JournalEntryStatus.POSTED
          ? new Date()
          : null;
    const approvedById =
      status === undefined
        ? undefined
        : status === JournalEntryStatus.APPROVED ||
            status === JournalEntryStatus.POSTED
          ? actorUserId
          : null;
    const postedAt =
      status === undefined
        ? undefined
        : status === JournalEntryStatus.POSTED
          ? new Date()
          : null;
    const postedById =
      status === undefined
        ? undefined
        : status === JournalEntryStatus.POSTED
          ? actorUserId
          : null;
    const reversedById =
      status === undefined
        ? undefined
        : status === JournalEntryStatus.REVERSED
          ? actorUserId
          : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lineCreates) {
          await tx.journalEntryLine.deleteMany({
            where: { journalEntryId: id },
          });
        }

        return tx.journalEntry.update({
          where: { id },
          data: {
            entryDate,
            fiscalYearId: payload.fiscalYearId,
            fiscalPeriodId: payload.fiscalPeriodId,
            branchId: payload.branchId,
            description,
            referenceType: payload.referenceType?.trim(),
            referenceId: payload.referenceId?.trim(),
            status,
            totalDebit: totals.totalDebit,
            totalCredit: totals.totalCredit,
            currencyId: payload.currencyId,
            exchangeRate: payload.exchangeRate,
            approvedById,
            approvedAt,
            postedById,
            postedAt,
            reversedById,
            reversalReason: payload.reversalReason?.trim(),
            isActive: payload.isActive,
            updatedById: actorUserId,
            lines: lineCreates
              ? {
                  create: lineCreates,
                }
              : undefined,
          },
          include: journalEntryDetailInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'JOURNAL_ENTRY_UPDATE',
        resource: 'journal-entries',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEntryExists(id);

    await this.prisma.journalEntry.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'JOURNAL_ENTRY_DELETE',
      resource: 'journal-entries',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // دورة اعتماد القيود (Approve → Post → Reverse)
  // ═══════════════════════════════════════════════════════════════

  async approve(id: string, actorUserId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, entryNumber: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot approve entry with status '${entry.status}'. Only DRAFT entries can be approved.`,
      );
    }

    const updated = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: JournalEntryStatus.APPROVED,
        approvedById: actorUserId,
        approvedAt: new Date(),
        updatedById: actorUserId,
      },
      include: journalEntryDetailInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'JOURNAL_ENTRY_APPROVE',
      resource: 'journal-entries',
      resourceId: id,
      details: { entryNumber: entry.entryNumber },
    });

    return updated;
  }

  async post(id: string, actorUserId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        status: true,
        entryNumber: true,
        fiscalPeriodId: true,
        lines: {
          select: {
            accountId: true,
            debitAmount: true,
            creditAmount: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status !== JournalEntryStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot post entry with status '${entry.status}'. Only APPROVED entries can be posted.`,
      );
    }

    // التحقق من أن الفترة المالية مفتوحة
    if (entry.fiscalPeriodId) {
      const period = await this.prisma.fiscalPeriod.findFirst({
        where: { id: entry.fiscalPeriodId, deletedAt: null },
        select: { id: true, status: true },
      });

      if (period && period.status !== 'OPEN' && period.status !== 'REOPENED') {
        throw new BadRequestException(
          'Cannot post to a closed fiscal period',
        );
      }
    }

    // ترحيل القيد + تحديث أرصدة الحسابات
    const updated = await this.prisma.$transaction(async (tx) => {
      // تحديث أرصدة الحسابات
      for (const line of entry.lines) {
        const debit = Number(line.debitAmount);
        const credit = Number(line.creditAmount);
        const balanceChange = debit - credit;

        await tx.chartOfAccount.update({
          where: { id: line.accountId },
          data: {
            currentBalance: {
              increment: balanceChange,
            },
          },
        });
      }

      // تحديث حالة القيد إلى POSTED
      return tx.journalEntry.update({
        where: { id },
        data: {
          status: JournalEntryStatus.POSTED,
          postedById: actorUserId,
          postedAt: new Date(),
          updatedById: actorUserId,
        },
        include: journalEntryDetailInclude,
      });
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'JOURNAL_ENTRY_POST',
      resource: 'journal-entries',
      resourceId: id,
      details: {
        entryNumber: entry.entryNumber,
        accountsUpdated: entry.lines.length,
      },
    });

    return updated;
  }

  async reverse(id: string, reason: string, actorUserId: string) {
    const reasonText = reason?.trim();
    if (!reasonText) {
      throw new BadRequestException('Reversal reason is required');
    }

    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        status: true,
        entryNumber: true,
        entryDate: true,
        fiscalYearId: true,
        fiscalPeriodId: true,
        branchId: true,
        currencyId: true,
        exchangeRate: true,
        description: true,
        totalDebit: true,
        totalCredit: true,
        lines: {
          select: {
            accountId: true,
            description: true,
            debitAmount: true,
            creditAmount: true,
            costCenter: true,
            studentId: true,
            employeeId: true,
            branchId: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status !== JournalEntryStatus.POSTED) {
      throw new BadRequestException(
        `Cannot reverse entry with status '${entry.status}'. Only POSTED entries can be reversed.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const reversalEntryNumber =
        await this.documentSequencesService.reserveNextNumber(
          DocumentType.JOURNAL_ENTRY,
          {
            tx,
            fiscalYearId: entry.fiscalYearId,
            branchId: entry.branchId ?? null,
            date: new Date(),
            prefixOverride: 'REV',
          },
        );
      // عكس أرصدة الحسابات
      for (const line of entry.lines) {
        const debit = Number(line.debitAmount);
        const credit = Number(line.creditAmount);
        const balanceChange = credit - debit; // عكس الاتجاه

        await tx.chartOfAccount.update({
          where: { id: line.accountId },
          data: {
            currentBalance: {
              increment: balanceChange,
            },
          },
        });
      }

      // تحديث القيد الأصلي إلى REVERSED
      await tx.journalEntry.update({
        where: { id },
        data: {
          status: JournalEntryStatus.REVERSED,
          reversedById: actorUserId,
          reversalReason: reasonText,
          updatedById: actorUserId,
        },
      });

      // إنشاء قيد عكسي جديد (المدين يصبح دائن والعكس)
      const reversalEntry = await tx.journalEntry.create({
        data: {
          entryNumber: reversalEntryNumber,
          entryDate: new Date(),
          fiscalYearId: entry.fiscalYearId,
          fiscalPeriodId: entry.fiscalPeriodId,
          branchId: entry.branchId,
          description: `عكس قيد: ${entry.entryNumber} — ${reasonText}`,
          referenceType: 'REVERSAL',
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
          approvedAt: new Date(),
          postedById: actorUserId,
          postedAt: new Date(),
          isActive: true,
          lines: {
            create: entry.lines.map((line, index) => ({
              lineNumber: index + 1,
              accountId: line.accountId,
              description: `عكس: ${line.description ?? ''}`.trim(),
              debitAmount: Number(line.creditAmount), // عكس
              creditAmount: Number(line.debitAmount), // عكس
              costCenter: line.costCenter,
              studentId: line.studentId,
              employeeId: line.employeeId,
              branchId: line.branchId,
              isActive: true,
              createdById: actorUserId,
              updatedById: actorUserId,
            })),
          },
        },
        include: journalEntryDetailInclude,
      });

      return reversalEntry;
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'JOURNAL_ENTRY_REVERSE',
      resource: 'journal-entries',
      resourceId: id,
      details: {
        originalEntryNumber: entry.entryNumber,
        reversalEntryNumber: result.entryNumber,
        reason: reasonText,
      },
    });

    return result;
  }

  private async ensureEntryExists(id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        fiscalYearId: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    return entry;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private normalizeLines(lines: JournalEntryLineInputDto[]) {
    if (!lines || lines.length === 0) {
      throw new BadRequestException('Journal entry must include at least one line');
    }

    return lines.map((line) => {
      const debitAmount = line.debitAmount ?? 0;
      const creditAmount = line.creditAmount ?? 0;

      if ((debitAmount <= 0 && creditAmount <= 0) ||
          (debitAmount > 0 && creditAmount > 0)) {
        throw new BadRequestException(
          'Each line must have either debit or credit amount',
        );
      }

      return {
        ...line,
        debitAmount,
        creditAmount,
      };
    });
  }

  private calculateTotals(lines: { debitAmount: number; creditAmount: number }[]) {
    const totalDebit = lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.creditAmount, 0);

    return {
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
    };
  }

  private assertBalanced(totalDebit: number, totalCredit: number) {
    if (totalDebit <= 0 || totalCredit <= 0) {
      throw new BadRequestException('Total debit and credit must be greater than zero');
    }

    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new BadRequestException('Journal entry is not balanced');
    }
  }

  private async ensureAccountsExist(lines: { accountId: number }[]) {
    const accountIds = Array.from(new Set(lines.map((line) => line.accountId)));

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        id: { in: accountIds },
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        isHeader: true,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new NotFoundException('One or more accounts were not found');
    }

    if (accounts.some((account) => account.isHeader)) {
      throw new BadRequestException('Header accounts cannot be posted to');
    }
  }

  private buildLineCreates(
    lines: JournalEntryLineInputDto[],
    actorUserId: string,
  ): Prisma.JournalEntryLineCreateManyJournalEntryInput[] {
    return lines.map((line, index) => ({
      lineNumber: index + 1,
      accountId: line.accountId,
      description: line.description?.trim(),
      debitAmount: line.debitAmount ?? 0,
      creditAmount: line.creditAmount ?? 0,
      costCenter: line.costCenter?.trim(),
      studentId: line.studentId,
      employeeId: line.employeeId,
      branchId: line.branchId,
      isActive: true,
      createdById: actorUserId,
      updatedById: actorUserId,
    }));
  }

  private async ensureFiscalYearExists(id: number) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!fiscalYear) {
      throw new NotFoundException('Fiscal year not found');
    }
  }

  private async ensureFiscalPeriodMatchesYear(
    fiscalPeriodId: number,
    fiscalYearId: number,
  ) {
    const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({
      where: { id: fiscalPeriodId, deletedAt: null },
      select: { id: true, fiscalYearId: true },
    });

    if (!fiscalPeriod) {
      throw new NotFoundException('Fiscal period not found');
    }

    if (fiscalPeriod.fiscalYearId !== fiscalYearId) {
      throw new BadRequestException('Fiscal period does not belong to fiscal year');
    }
  }

  private async ensureBranchExists(id: number) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  private async ensureCurrencyExists(id: number) {
    const currency = await this.prisma.currency.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Journal entry already exists');
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
