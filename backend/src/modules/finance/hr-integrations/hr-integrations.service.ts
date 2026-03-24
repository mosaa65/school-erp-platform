import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, DocumentType, JournalEntryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DocumentSequencesService } from '../document-sequences/document-sequences.service';
import { DeductionJournalDto } from './dto/deduction-journal.dto';
import { PayrollJournalDto } from './dto/payroll-journal.dto';

const DEFAULT_SALARY_EXPENSE_ACCOUNT_CODE = '5001';
const DEFAULT_SALARY_PAYABLE_ACCOUNT_CODE = '2102';
const DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_CODE = '1104';

type PostingLineInput = {
  accountId: number;
  debitAmount: number;
  creditAmount: number;
  description: string;
  employeeId?: string | null;
  branchId?: number | null;
};

@Injectable()
export class HrIntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {}

  async createPayrollJournal(payload: PayrollJournalDto, actorUserId: string) {
    const totalDeductions = payload.totalDeductions ?? 0;

    if (totalDeductions > payload.totalSalaries) {
      throw new BadRequestException('Total deductions cannot exceed total salaries');
    }

    const netSalaries = this.roundMoney(payload.totalSalaries - totalDeductions);
    const entryDate = new Date(payload.year, payload.month - 1, 1);

    const salaryExpenseAccountId = await this.findPostingAccountByCode(
      DEFAULT_SALARY_EXPENSE_ACCOUNT_CODE,
    );
    const salaryPayableAccountId = await this.findPostingAccountByCode(
      DEFAULT_SALARY_PAYABLE_ACCOUNT_CODE,
    );
    const employeeReceivableAccountId = await this.findPostingAccountByCode(
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_CODE,
    );

    const lines: PostingLineInput[] = [
      {
        accountId: salaryExpenseAccountId,
        debitAmount: this.roundMoney(payload.totalSalaries),
        creditAmount: 0,
        description: 'مصروف الرواتب',
        branchId: payload.branchId,
      },
    ];

    if (netSalaries > 0) {
      lines.push({
        accountId: salaryPayableAccountId,
        debitAmount: 0,
        creditAmount: netSalaries,
        description: 'رواتب مستحقة',
        branchId: payload.branchId,
      });
    }

    if (totalDeductions > 0) {
      lines.push({
        accountId: employeeReceivableAccountId,
        debitAmount: 0,
        creditAmount: this.roundMoney(totalDeductions),
        description: 'خصومات الموظفين',
        branchId: payload.branchId,
      });
    }

    const description = payload.description?.trim() ?? `قيد رواتب ${payload.month}/${payload.year}`;

    const entry = await this.createPostedJournalEntry({
      entryDate,
      description,
      referenceType: 'HR_PAYROLL',
      referenceId: `${payload.year}-${payload.month}`,
      branchId: payload.branchId,
      actorUserId,
      lines,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'HR_PAYROLL_JOURNAL',
      resource: 'finance-hr',
      resourceId: entry.id,
      details: {
        entryNumber: entry.entryNumber,
        month: payload.month,
        year: payload.year,
        totalSalaries: payload.totalSalaries,
        totalDeductions,
      },
    });

    return {
      journalEntryId: entry.id,
      entryNumber: entry.entryNumber,
      totalSalaries: this.roundMoney(payload.totalSalaries),
      totalDeductions: this.roundMoney(totalDeductions),
      netSalaries,
    };
  }

  async createDeductionJournal(payload: DeductionJournalDto, actorUserId: string) {
    const entryDate = new Date();

    const salaryPayableAccountId = await this.findPostingAccountByCode(
      DEFAULT_SALARY_PAYABLE_ACCOUNT_CODE,
    );
    const employeeReceivableAccountId = await this.findPostingAccountByCode(
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_CODE,
    );

    const lines: PostingLineInput[] = [
      {
        accountId: employeeReceivableAccountId,
        debitAmount: this.roundMoney(payload.amount),
        creditAmount: 0,
        description: payload.reason?.trim() ?? 'خصم موظف',
        employeeId: payload.employeeId,
        branchId: payload.branchId,
      },
      {
        accountId: salaryPayableAccountId,
        debitAmount: 0,
        creditAmount: this.roundMoney(payload.amount),
        description: 'تخفيض رواتب مستحقة',
        employeeId: payload.employeeId,
        branchId: payload.branchId,
      },
    ];

    const entry = await this.createPostedJournalEntry({
      entryDate,
      description: payload.reason?.trim() ?? 'قيد خصم موظف',
      referenceType: 'HR_DEDUCTION',
      referenceId: payload.employeeId,
      branchId: payload.branchId,
      actorUserId,
      lines,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'HR_DEDUCTION_JOURNAL',
      resource: 'finance-hr',
      resourceId: entry.id,
      status: AuditStatus.SUCCESS,
      details: {
        employeeId: payload.employeeId,
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

  private async createPostedJournalEntry(input: {
    entryDate: Date;
    description: string;
    referenceType: string;
    referenceId?: string;
    branchId?: number;
    actorUserId: string;
    lines: PostingLineInput[];
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
              employeeId: line.employeeId ?? undefined,
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
    const fiscalYear = await tx.fiscalYear.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { startDate: 'desc' },
    });

    if (!fiscalYear) {
      throw new BadRequestException('No fiscal year configured for the entry date');
    }

    return fiscalYear;
  }

  private async findFiscalPeriodForDate(
    tx: Prisma.TransactionClient,
    fiscalYearId: number,
    date: Date,
  ) {
    return tx.fiscalPeriod.findFirst({
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
