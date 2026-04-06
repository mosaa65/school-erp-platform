import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountType,
  AuditStatus,
  DocumentType,
  EmployeeLeaveRequestStatus,
  EmployeeLeaveType,
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
import { DeductionJournalDto } from './dto/deduction-journal.dto';
import { PayrollPreviewQueryDto } from './dto/payroll-preview-query.dto';
import { PayrollJournalDto } from './dto/payroll-journal.dto';

const DEFAULT_SALARY_EXPENSE_ACCOUNT_NAME_EN = 'Salaries Expense';
const DEFAULT_SALARY_EXPENSE_ACCOUNT_NAME_AR = 'مصروف الرواتب';
const DEFAULT_SALARY_PAYABLE_ACCOUNT_NAME_EN = 'Salaries Payable';
const DEFAULT_SALARY_PAYABLE_ACCOUNT_NAME_AR = 'رواتب مستحقة';
const DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_EN = 'Employee Receivables';
const DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_AR = 'ذمم الموظفين';

type PostingLineInput = {
  accountId: number;
  debitAmount: number;
  creditAmount: number;
  description: string;
  employeeId?: string | null;
  branchId?: number | null;
};

type PayrollSummaryBreakdownItem = {
  accountId: number;
  accountName: string;
  amount: number;
  entryCount: number;
};

type EmployeeBalanceBreakdownItem = {
  entryNumber: string;
  entryDate: string;
  referenceType: string | null;
  accountId: number;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  netAmount: number;
};

type EmployeePayrollPreviewAccumulator = {
  employeeId: string;
  employeeName: string;
  jobNumber: string | null;
  branchId: number | null;
  grossSalary: number;
  activeDateKeys: Set<string>;
  unpaidLeaveDateKeys: Set<string>;
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
      DEFAULT_SALARY_EXPENSE_ACCOUNT_NAME_EN,
      DEFAULT_SALARY_EXPENSE_ACCOUNT_NAME_AR,
      AccountType.EXPENSE,
    );
    const salaryPayableAccountId = await this.findPostingAccountByCode(
      DEFAULT_SALARY_PAYABLE_ACCOUNT_NAME_EN,
      DEFAULT_SALARY_PAYABLE_ACCOUNT_NAME_AR,
      AccountType.LIABILITY,
    );
    const employeeReceivableAccountId = await this.findPostingAccountByCode(
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_EN,
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_AR,
      AccountType.ASSET,
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
      DEFAULT_SALARY_PAYABLE_ACCOUNT_NAME_EN,
      DEFAULT_SALARY_PAYABLE_ACCOUNT_NAME_AR,
      AccountType.LIABILITY,
    );
    const employeeReceivableAccountId = await this.findPostingAccountByCode(
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_EN,
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_AR,
      AccountType.ASSET,
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

  async getPayrollSummary(month: number, year?: number) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    const effectiveYear = year ?? new Date().getFullYear();

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        status: JournalEntryStatus.POSTED,
        referenceType: 'HR_PAYROLL',
        referenceId: `${effectiveYear}-${month}`,
      },
      select: {
        id: true,
        entryNumber: true,
        totalDebit: true,
        totalCredit: true,
        lines: {
          select: {
            debitAmount: true,
            creditAmount: true,
            account: {
              select: {
                id: true,
                nameAr: true,
                accountType: true,
              },
            },
          },
        },
      },
      orderBy: [{ entryNumber: 'asc' }],
    });

    const employeeReceivableAccountId = await this.findPostingAccountByCode(
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_EN,
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_AR,
      AccountType.ASSET,
    );
    const breakdown = new Map<string, PayrollSummaryBreakdownItem>();
    let gross = 0;
    let deductions = 0;

    for (const entry of entries) {
      gross += Number(entry.totalDebit);

      for (const line of entry.lines) {
        if (line.account.id !== employeeReceivableAccountId) {
          continue;
        }

        const lineAmount = this.roundMoney(Number(line.creditAmount));
        if (lineAmount <= 0) {
          continue;
        }

        deductions += lineAmount;

        const existing = breakdown.get(String(line.account.id));
        if (existing) {
          existing.amount = this.roundMoney(existing.amount + lineAmount);
          existing.entryCount += 1;
          continue;
        }

        breakdown.set(String(line.account.id), {
          accountId: line.account.id,
          accountName: line.account.nameAr,
          amount: lineAmount,
          entryCount: 1,
        });
      }
    }

    const roundedGross = this.roundMoney(gross);
    const roundedDeductions = this.roundMoney(deductions);
    const net = this.roundMoney(roundedGross - roundedDeductions);

    return {
      month,
      year: effectiveYear,
      gross: roundedGross,
      deductions: roundedDeductions,
      net,
      deductionsBreakdown: Array.from(breakdown.values()),
      entryCount: entries.length,
    };
  }

  async getPayrollPreview(month: number, query: PayrollPreviewQueryDto) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    const effectiveYear = query.year ?? new Date().getUTCFullYear();
    const monthBounds = this.getMonthBounds(effectiveYear, month);
    const daysInMonth = monthBounds.totalDays;

    const contracts = await this.prisma.employeeContract.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        isCurrent: true,
        salaryAmount: {
          not: null,
        },
        contractStartDate: {
          lte: monthBounds.end,
        },
        OR: [
          {
            contractEndDate: null,
          },
          {
            contractEndDate: {
              gte: monthBounds.start,
            },
          },
        ],
        employee: {
          deletedAt: null,
          isActive: true,
          branchId: query.branchId,
        },
      },
      select: {
        employeeId: true,
        contractStartDate: true,
        contractEndDate: true,
        salaryAmount: true,
        employee: {
          select: {
            fullName: true,
            jobNumber: true,
            branchId: true,
          },
        },
      },
    });

    const employeeMap = new Map<string, EmployeePayrollPreviewAccumulator>();

    for (const contract of contracts) {
      const salaryAmount = Number(contract.salaryAmount ?? 0);
      if (salaryAmount <= 0) {
        continue;
      }

      const activeStart = this.maxDate(contract.contractStartDate, monthBounds.start);
      const activeEnd = this.minDate(
        contract.contractEndDate ?? monthBounds.end,
        monthBounds.end,
      );

      if (activeStart > activeEnd) {
        continue;
      }

      const activeDays = this.calculateDaysInclusive(activeStart, activeEnd);
      const proratedGross = this.roundMoney((salaryAmount * activeDays) / daysInMonth);

      const existing = employeeMap.get(contract.employeeId);
      if (existing) {
        existing.grossSalary = this.roundMoney(existing.grossSalary + proratedGross);
        for (const dateKey of this.enumerateDateKeys(activeStart, activeEnd)) {
          existing.activeDateKeys.add(dateKey);
        }
        continue;
      }

      employeeMap.set(contract.employeeId, {
        employeeId: contract.employeeId,
        employeeName: contract.employee.fullName,
        jobNumber: contract.employee.jobNumber,
        branchId: contract.employee.branchId,
        grossSalary: proratedGross,
        activeDateKeys: new Set(this.enumerateDateKeys(activeStart, activeEnd)),
        unpaidLeaveDateKeys: new Set<string>(),
      });
    }

    if (employeeMap.size > 0) {
      const leaves = await this.prisma.employeeLeaveRequest.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          leaveType: EmployeeLeaveType.UNPAID,
          status: EmployeeLeaveRequestStatus.APPROVED,
          employeeId: {
            in: Array.from(employeeMap.keys()),
          },
          startDate: {
            lte: monthBounds.end,
          },
          endDate: {
            gte: monthBounds.start,
          },
        },
        select: {
          employeeId: true,
          startDate: true,
          endDate: true,
        },
      });

      for (const leave of leaves) {
        const accumulator = employeeMap.get(leave.employeeId);
        if (!accumulator) {
          continue;
        }

        const overlapStart = this.maxDate(leave.startDate, monthBounds.start);
        const overlapEnd = this.minDate(leave.endDate, monthBounds.end);
        if (overlapStart > overlapEnd) {
          continue;
        }

        for (const dateKey of this.enumerateDateKeys(overlapStart, overlapEnd)) {
          accumulator.unpaidLeaveDateKeys.add(dateKey);
        }
      }
    }

    const employeeBreakdown = Array.from(employeeMap.values())
      .map((item) => {
        const activeDays = item.activeDateKeys.size;
        const unpaidLeaveDays = Array.from(item.unpaidLeaveDateKeys).filter((dateKey) =>
          item.activeDateKeys.has(dateKey),
        ).length;
        const dailyRate =
          activeDays > 0
            ? this.roundMoney(item.grossSalary / activeDays)
            : this.roundMoney(item.grossSalary / daysInMonth);
        const estimatedDeductions = this.roundMoney(dailyRate * unpaidLeaveDays);
        const estimatedNetSalary = this.roundMoney(item.grossSalary - estimatedDeductions);

        return {
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          jobNumber: item.jobNumber,
          branchId: item.branchId,
          grossSalary: item.grossSalary,
          activeDays,
          unpaidLeaveDays,
          estimatedDeductions,
          estimatedNetSalary,
        };
      })
      .sort((left, right) => {
        if (right.estimatedNetSalary !== left.estimatedNetSalary) {
          return right.estimatedNetSalary - left.estimatedNetSalary;
        }

        return left.employeeName.localeCompare(right.employeeName);
      });

    const totalGrossSalaries = this.roundMoney(
      employeeBreakdown.reduce((sum, item) => sum + item.grossSalary, 0),
    );
    const totalEstimatedDeductions = this.roundMoney(
      employeeBreakdown.reduce((sum, item) => sum + item.estimatedDeductions, 0),
    );
    const estimatedNetSalaries = this.roundMoney(
      totalGrossSalaries - totalEstimatedDeductions,
    );
    const totalUnpaidLeaveDays = employeeBreakdown.reduce(
      (sum, item) => sum + item.unpaidLeaveDays,
      0,
    );

    return {
      month,
      year: effectiveYear,
      branchId: query.branchId ?? null,
      totals: {
        grossSalaries: totalGrossSalaries,
        estimatedDeductions: totalEstimatedDeductions,
        estimatedNetSalaries,
      },
      assumptions: {
        daysInMonth,
        deductionSource: 'APPROVED_UNPAID_LEAVES',
        contractsIncluded: contracts.length,
        employeesIncluded: employeeBreakdown.length,
        employeesWithUnpaidLeave: employeeBreakdown.filter(
          (item) => item.unpaidLeaveDays > 0,
        ).length,
        totalUnpaidLeaveDays,
      },
      recommendedJournal: {
        month,
        year: effectiveYear,
        totalSalaries: totalGrossSalaries,
        totalDeductions: totalEstimatedDeductions,
        netSalaries: estimatedNetSalaries,
        description: `قيد رواتب تقديري ${month}/${effectiveYear}`,
      },
      employeeBreakdown,
    };
  }

  async getEmployeeBalance(employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        jobNumber: true,
        financialNumber: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} was not found`);
    }

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        employeeId,
        deletedAt: null,
        isActive: true,
        journalEntry: {
          deletedAt: null,
          isActive: true,
          status: JournalEntryStatus.POSTED,
        },
      },
      select: {
        debitAmount: true,
        creditAmount: true,
        account: {
          select: {
            id: true,
            nameAr: true,
            accountType: true,
          },
        },
        journalEntry: {
          select: {
            entryNumber: true,
            entryDate: true,
            referenceType: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { lineNumber: 'asc' }],
    });

    const breakdown: EmployeeBalanceBreakdownItem[] = [];
    let advances = 0;
    let deductions = 0;

    const employeeReceivableAccountId = await this.findPostingAccountByCode(
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_EN,
      DEFAULT_EMPLOYEE_RECEIVABLE_ACCOUNT_NAME_AR,
      AccountType.ASSET,
    );

    for (const line of lines) {
      if (line.account.id !== employeeReceivableAccountId) {
        continue;
      }

      const debitAmount = this.roundMoney(Number(line.debitAmount));
      const creditAmount = this.roundMoney(Number(line.creditAmount));

      if (debitAmount > 0) {
        deductions += debitAmount;
      }

      if (creditAmount > 0) {
        advances += creditAmount;
      }

      if (debitAmount > 0 || creditAmount > 0) {
        breakdown.push({
          entryNumber: line.journalEntry.entryNumber,
          entryDate: line.journalEntry.entryDate.toISOString().slice(0, 10),
          referenceType: line.journalEntry.referenceType,
          accountId: line.account.id,
          accountName: line.account.nameAr,
          debitAmount,
          creditAmount,
          netAmount: this.roundMoney(debitAmount - creditAmount),
        });
      }
    }

    const netDue = this.roundMoney(deductions - advances);

    return {
      employeeId: employee.id,
      employeeName: employee.fullName,
      jobNumber: employee.jobNumber,
      financialNumber: employee.financialNumber,
      advances: this.roundMoney(advances),
      deductions: this.roundMoney(deductions),
      netDue,
      breakdown,
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
    accountNameEn: string,
    accountNameAr: string,
    fallbackType?: AccountType,
  ) {
    const namedAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        OR: [{ nameEn: accountNameEn }, { nameAr: accountNameAr }],
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, isHeader: true },
    });

    const account =
      namedAccount ??
      (fallbackType
        ? await this.prisma.chartOfAccount.findFirst({
            where: {
              accountType: fallbackType,
              deletedAt: null,
              isActive: true,
              isHeader: false,
            },
            select: { id: true, isHeader: true },
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

  private getMonthBounds(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return {
      start,
      end,
      totalDays: end.getUTCDate(),
    };
  }

  private calculateDaysInclusive(start: Date, end: Date) {
    const startUtc = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    );
    const endUtc = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
    );

    return Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1;
  }

  private enumerateDateKeys(start: Date, end: Date) {
    const keys: string[] = [];
    const cursor = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
    );
    const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

    while (cursor.getTime() <= endUtc) {
      keys.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return keys;
  }

  private minDate(left: Date, right: Date) {
    return left.getTime() <= right.getTime() ? left : right;
  }

  private maxDate(left: Date, right: Date) {
    return left.getTime() >= right.getTime() ? left : right;
  }
}
