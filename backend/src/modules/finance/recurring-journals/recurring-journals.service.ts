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
  RecurringFrequency,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import {
  findActiveFiscalYearForDate,
  findPostingFiscalPeriodForDate,
} from '../utils/posting-fiscal-period';
import { CreateRecurringJournalDto } from './dto/create-recurring-journal.dto';
import { ListRecurringJournalsDto } from './dto/list-recurring-journals.dto';
import { UpdateRecurringJournalDto } from './dto/update-recurring-journal.dto';

const templateInclude: Prisma.RecurringJournalTemplateInclude = {
  branch: { select: { id: true, nameAr: true } },
  currency: { select: { id: true, nameAr: true } },
  createdByUser: { select: { id: true, email: true } },
  lastGeneratedJournalEntry: { select: { id: true, entryNumber: true } },
  lines: {
    orderBy: { lineNumber: 'asc' },
    include: {
      account: { select: { id: true, nameAr: true } },
      costCenter: { select: { id: true, nameAr: true } },
    },
  },
};

const templateSummaryInclude: Prisma.RecurringJournalTemplateInclude = {
  branch: { select: { id: true, nameAr: true } },
  createdByUser: { select: { id: true, email: true } },
};

@Injectable()
export class RecurringJournalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async create(payload: CreateRecurringJournalDto, actorUserId: string) {
    const templateName = this.normalizeRequiredText(payload.templateName, 'templateName');

    if (!payload.lines || payload.lines.length === 0) {
      throw new BadRequestException('Template must include at least one line');
    }

    // Validate debit/credit balance
    const totalDebit = payload.lines.reduce((s, l) => s + l.debitAmount, 0);
    const totalCredit = payload.lines.reduce((s, l) => s + l.creditAmount, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Total debit must equal total credit');
    }

    const startDate = new Date(payload.startDate);

    try {
      const template = await this.prisma.recurringJournalTemplate.create({
        data: {
          templateName,
          description: payload.description?.trim(),
          frequency: payload.frequency ?? RecurringFrequency.MONTHLY,
          startDate,
          endDate: payload.endDate ? new Date(payload.endDate) : null,
          nextRunDate: startDate,
          branchId: payload.branchId,
          currencyId: payload.currencyId,
          entryDescription: payload.entryDescription.trim(),
          referenceType: payload.referenceType?.trim(),
          totalAmount: totalDebit,
          autoPost: payload.autoPost ?? false,
          createdByUserId: actorUserId,
          lines: {
            create: payload.lines.map((line) => ({
              lineNumber: line.lineNumber,
              accountId: line.accountId,
              description: line.description?.trim(),
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              costCenterId: line.costCenterId,
            })),
          },
        },
        include: templateInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'RECURRING_JOURNAL_CREATE',
        resource: 'recurring-journals',
        resourceId: String(template.id),
        details: { templateName: template.templateName, frequency: template.frequency },
      });

      return template;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'RECURRING_JOURNAL_CREATE_FAILED',
        resource: 'recurring-journals',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListRecurringJournalsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.RecurringJournalTemplateWhereInput = {
      isActive: query.isActive,
      frequency: query.frequency,
      OR: query.search
        ? [
            { templateName: { contains: query.search } },
            { entryDescription: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.recurringJournalTemplate.count({ where }),
      this.prisma.recurringJournalTemplate.findMany({
        where,
        include: templateSummaryInclude,
        orderBy: [{ nextRunDate: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const template = await this.prisma.recurringJournalTemplate.findFirst({
      where: { id },
      include: templateInclude,
    });
    if (!template) throw new NotFoundException('Recurring journal template not found');
    return template;
  }

  async update(id: number, payload: UpdateRecurringJournalDto, actorUserId: string) {
    await this.ensureExists(id);

    try {
      const updated = await this.prisma.recurringJournalTemplate.update({
        where: { id },
        data: {
          templateName: payload.templateName?.trim(),
          description: payload.description?.trim(),
          frequency: payload.frequency,
          startDate: payload.startDate ? new Date(payload.startDate) : undefined,
          endDate: payload.endDate ? new Date(payload.endDate) : undefined,
          branchId: payload.branchId,
          currencyId: payload.currencyId,
          entryDescription: payload.entryDescription?.trim(),
          referenceType: payload.referenceType?.trim(),
          autoPost: payload.autoPost,
        },
        include: templateInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'RECURRING_JOURNAL_UPDATE',
        resource: 'recurring-journals',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  /**
   * Generate a journal entry from this template
   */
  async generate(id: number, actorUserId: string) {
    const template = await this.findOne(id);

    if (!template.isActive) {
      throw new BadRequestException('Template is inactive');
    }
    if (template.endDate && new Date() > template.endDate) {
      throw new BadRequestException('Template has passed its end date');
    }

    // Generate entry number
    const entryNumber = await this.documentSequencesService.reserveNextNumber(
      DocumentType.JOURNAL_ENTRY,
      { branchId: template.branchId, date: new Date() },
    );

    const journalEntry = await this.prisma.$transaction(async (tx) => {
      const entryDate = new Date();
      const fiscalYear = await this.findFiscalYearForDate(tx, entryDate);
      const fiscalPeriod = await this.findFiscalPeriodForDate(
        tx,
        fiscalYear.id,
        entryDate,
      );

      // Create the journal entry from template
      const je = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate,
          fiscalYearId: fiscalYear.id,
          fiscalPeriodId: fiscalPeriod?.id ?? null,
          description: template.entryDescription,
          referenceType: template.referenceType,
          referenceId: `RJ-${template.id}-${template.totalGenerated + 1}`,
          branchId: template.branchId,
          currencyId: template.currencyId ?? 1,
          exchangeRate: 1,
          totalDebit: template.totalAmount,
          totalCredit: template.totalAmount,
          status: template.autoPost
            ? JournalEntryStatus.POSTED
            : JournalEntryStatus.DRAFT,
          createdById: actorUserId,
          lines: {
            create: template.lines.map((line: any) => ({
              lineNumber: line.lineNumber,
              accountId: line.accountId,
              description: line.description,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              costCenterId: line.costCenterId,
              createdById: actorUserId,
            })),
          },
        },
        select: {
          id: true,
          entryNumber: true,
          entryDate: true,
          status: true,
          totalDebit: true,
          totalCredit: true,
        },
      });

      // Update template metadata
      const nextRunDate = this.calculateNextRunDate(
        template.nextRunDate,
        template.frequency,
      );

      await tx.recurringJournalTemplate.update({
        where: { id: template.id },
        data: {
          lastGeneratedAt: new Date(),
          lastGeneratedJeId: je.id,
          totalGenerated: { increment: 1 },
          nextRunDate,
        },
      });

      return je;
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'RECURRING_JOURNAL_GENERATE',
      resource: 'recurring-journals',
      resourceId: String(id),
      details: {
        journalEntryId: journalEntry.id,
        entryNumber: journalEntry.entryNumber,
      },
    });

    return {
      success: true,
      journalEntry,
      message: `Journal entry ${journalEntry.entryNumber} generated successfully`,
    };
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureExists(id);

    await this.prisma.recurringJournalTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'RECURRING_JOURNAL_DELETE',
      resource: 'recurring-journals',
      resourceId: String(id),
    });

    return { success: true, id };
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

  private calculateNextRunDate(currentDate: Date, frequency: RecurringFrequency): Date {
    const next = new Date(currentDate);
    switch (frequency) {
      case RecurringFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case RecurringFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case RecurringFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case RecurringFrequency.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case RecurringFrequency.SEMI_ANNUAL:
        next.setMonth(next.getMonth() + 6);
        break;
      case RecurringFrequency.ANNUAL:
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  private async ensureExists(id: number) {
    const item = await this.prisma.recurringJournalTemplate.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Recurring journal template not found');
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${fieldName} cannot be empty`);
    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Recurring journal template already exists');
    }
    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
