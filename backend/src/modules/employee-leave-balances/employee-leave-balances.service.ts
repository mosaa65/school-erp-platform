import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  EmployeeLeaveRequestStatus,
  EmployeeLeaveType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeLeaveBalanceDto } from './dto/create-employee-leave-balance.dto';
import { GenerateEmployeeLeaveBalancesDto } from './dto/generate-employee-leave-balances.dto';
import { ListEmployeeLeaveBalancesDto } from './dto/list-employee-leave-balances.dto';
import { UpdateEmployeeLeaveBalanceDto } from './dto/update-employee-leave-balance.dto';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const GENERATED_LEAVE_TYPES: EmployeeLeaveType[] = [
  EmployeeLeaveType.ANNUAL,
  EmployeeLeaveType.SICK,
  EmployeeLeaveType.EMERGENCY,
  EmployeeLeaveType.MATERNITY,
];
const LEAVE_DEFAULT_ALLOCATIONS: Record<EmployeeLeaveType, number> = {
  [EmployeeLeaveType.ANNUAL]: 21,
  [EmployeeLeaveType.SICK]: 30,
  [EmployeeLeaveType.EMERGENCY]: 5,
  [EmployeeLeaveType.UNPAID]: 0,
  [EmployeeLeaveType.MATERNITY]: 70,
  [EmployeeLeaveType.OTHER]: 0,
};
const CARRY_FORWARD_ENABLED_TYPES = new Set<EmployeeLeaveType>([
  EmployeeLeaveType.ANNUAL,
]);

const employeeLeaveBalanceInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
} as const;

type EmployeeLeaveBalanceWithEmployee = Prisma.EmployeeLeaveBalanceGetPayload<{
  include: typeof employeeLeaveBalanceInclude;
}>;

type EmployeeLeaveBalanceResponse = EmployeeLeaveBalanceWithEmployee & {
  totalEntitledDays: number;
  usedDays: number;
  remainingDays: number;
};

@Injectable()
export class EmployeeLeaveBalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(payload: CreateEmployeeLeaveBalanceDto, actorUserId: string) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(payload.employeeId);
      this.validateDayValues(
        payload.allocatedDays,
        payload.carriedForwardDays,
        payload.manualAdjustmentDays,
      );

      const balance = await this.prisma.employeeLeaveBalance.create({
        data: {
          employeeId: payload.employeeId,
          leaveType: payload.leaveType,
          balanceYear: payload.balanceYear,
          allocatedDays: payload.allocatedDays,
          carriedForwardDays: payload.carriedForwardDays ?? 0,
          manualAdjustmentDays: payload.manualAdjustmentDays ?? 0,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: employeeLeaveBalanceInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_LEAVE_BALANCE_CREATE',
        resource: 'employee-leave-balances',
        resourceId: balance.id,
        details: {
          employeeId: balance.employeeId,
          leaveType: balance.leaveType,
          balanceYear: balance.balanceYear,
        },
      });

      return this.enrichBalance(balance);
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_LEAVE_BALANCE_CREATE_FAILED',
        resource: 'employee-leave-balances',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          leaveType: payload.leaveType,
          balanceYear: payload.balanceYear,
          reason: this.extractErrorMessage(error),
        },
      });

      throw this.transformPersistenceError(error);
    }
  }

  async findAll(query: ListEmployeeLeaveBalancesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeLeaveBalanceWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      leaveType: query.leaveType,
      balanceYear: query.balanceYear,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              notes: {
                contains: query.search,
              },
            },
            {
              employee: {
                fullName: {
                  contains: query.search,
                },
              },
            },
            {
              employee: {
                jobNumber: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employeeLeaveBalance.count({ where }),
      this.prisma.employeeLeaveBalance.findMany({
        where,
        include: employeeLeaveBalanceInclude,
        orderBy: [
          {
            balanceYear: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: await this.enrichBalances(items),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const balance = await this.prisma.employeeLeaveBalance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeLeaveBalanceInclude,
    });

    if (!balance) {
      throw new NotFoundException('Employee leave balance not found');
    }

    return this.enrichBalance(balance);
  }

  async generate(
    payload: GenerateEmployeeLeaveBalancesDto,
    actorUserId: string,
  ) {
    const targetLeaveTypes = payload.leaveType
      ? [payload.leaveType]
      : GENERATED_LEAVE_TYPES;

    if (targetLeaveTypes.length === 0) {
      throw new BadRequestException('No leave types selected for generation');
    }

    if (payload.employeeId) {
      await this.employeesService.ensureEmployeeExistsAndActive(payload.employeeId);
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        id: payload.employeeId,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    let generatedCount = 0;
    let skippedExistingCount = 0;

    for (const employee of employees) {
      for (const leaveType of targetLeaveTypes) {
        const existingBalance = await this.prisma.employeeLeaveBalance.findFirst({
          where: {
            deletedAt: null,
            employeeId: employee.id,
            leaveType,
            balanceYear: payload.balanceYear,
          },
          select: {
            id: true,
          },
        });

        if (existingBalance) {
          skippedExistingCount += 1;
          continue;
        }

        const carriedForwardDays = await this.calculateCarryForwardDays(
          employee.id,
          leaveType,
          payload.balanceYear,
        );

        await this.prisma.employeeLeaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveType,
            balanceYear: payload.balanceYear,
            allocatedDays: LEAVE_DEFAULT_ALLOCATIONS[leaveType],
            carriedForwardDays,
            manualAdjustmentDays: 0,
            notes: `Generated automatically for ${payload.balanceYear}`,
            isActive: true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
        });

        generatedCount += 1;
      }
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_LEAVE_BALANCE_GENERATE',
      resource: 'employee-leave-balances',
      details: {
        balanceYear: payload.balanceYear,
        employeeId: payload.employeeId ?? null,
        leaveType: payload.leaveType ?? null,
        employeesScanned: employees.length,
        generatedCount,
        skippedExistingCount,
      },
    });

    return {
      success: true,
      balanceYear: payload.balanceYear,
      employeesScanned: employees.length,
      generatedCount,
      skippedExistingCount,
      leaveTypes: targetLeaveTypes,
    };
  }

  async update(
    id: string,
    payload: UpdateEmployeeLeaveBalanceDto,
    actorUserId: string,
  ) {
    try {
      const existing = await this.ensureEmployeeLeaveBalanceExists(id);
      const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
      const resolvedAllocatedDays = payload.allocatedDays ?? existing.allocatedDays;
      const resolvedCarriedForwardDays =
        payload.carriedForwardDays ?? existing.carriedForwardDays;
      const resolvedManualAdjustmentDays =
        payload.manualAdjustmentDays ?? existing.manualAdjustmentDays;

      await this.employeesService.ensureEmployeeExistsAndActive(resolvedEmployeeId);
      this.validateDayValues(
        resolvedAllocatedDays,
        resolvedCarriedForwardDays,
        resolvedManualAdjustmentDays,
      );

      const balance = await this.prisma.employeeLeaveBalance.update({
        where: { id },
        data: {
          employeeId: payload.employeeId,
          leaveType: payload.leaveType,
          balanceYear: payload.balanceYear,
          allocatedDays: payload.allocatedDays,
          carriedForwardDays: payload.carriedForwardDays,
          manualAdjustmentDays: payload.manualAdjustmentDays,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: employeeLeaveBalanceInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_LEAVE_BALANCE_UPDATE',
        resource: 'employee-leave-balances',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return this.enrichBalance(balance);
    } catch (error) {
      throw this.transformPersistenceError(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEmployeeLeaveBalanceExists(id);

    await this.prisma.employeeLeaveBalance.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_LEAVE_BALANCE_DELETE',
      resource: 'employee-leave-balances',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEmployeeLeaveBalanceExists(id: string) {
    const balance = await this.prisma.employeeLeaveBalance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeLeaveBalanceInclude,
    });

    if (!balance) {
      throw new NotFoundException('Employee leave balance not found');
    }

    return balance;
  }

  private async enrichBalances(
    balances: EmployeeLeaveBalanceWithEmployee[],
  ): Promise<EmployeeLeaveBalanceResponse[]> {
    const usageByKey = new Map<string, number>();
    const uniqueKeys = Array.from(
      new Set(
        balances.map((balance) =>
          this.buildBalanceKey(
            balance.employeeId,
            balance.leaveType,
            balance.balanceYear,
          ),
        ),
      ),
    );

    await Promise.all(
      uniqueKeys.map(async (key) => {
        const [employeeId, leaveType, balanceYearValue] = key.split('|');
        const balanceYear = Number(balanceYearValue);
        const approvedDays = await this.calculateApprovedLeaveDays(
          employeeId,
          leaveType as EmployeeLeaveType,
          balanceYear,
        );

        usageByKey.set(key, approvedDays);
      }),
    );

    return balances.map((balance) => {
      const totalEntitledDays =
        balance.allocatedDays +
        balance.carriedForwardDays +
        balance.manualAdjustmentDays;
      const usedDays =
        usageByKey.get(
          this.buildBalanceKey(
            balance.employeeId,
            balance.leaveType,
            balance.balanceYear,
          ),
        ) ?? 0;

      return {
        ...balance,
        totalEntitledDays,
        usedDays,
        remainingDays: totalEntitledDays - usedDays,
      };
    });
  }

  private async enrichBalance(balance: EmployeeLeaveBalanceWithEmployee) {
    const [enriched] = await this.enrichBalances([balance]);
    return enriched;
  }

  private async calculateApprovedLeaveDays(
    employeeId: string,
    leaveType: EmployeeLeaveType,
    balanceYear: number,
  ) {
    const { yearStart, yearEnd } = this.getYearRange(balanceYear);
    const requests = await this.prisma.employeeLeaveRequest.findMany({
      where: {
        deletedAt: null,
        employeeId,
        leaveType,
        status: EmployeeLeaveRequestStatus.APPROVED,
        startDate: {
          lte: yearEnd,
        },
        endDate: {
          gte: yearStart,
        },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    return requests.reduce((sum, request) => {
      return (
        sum +
        this.calculateOverlappingDays(
          request.startDate,
          request.endDate,
          yearStart,
          yearEnd,
        )
      );
    }, 0);
  }

  private async calculateCarryForwardDays(
    employeeId: string,
    leaveType: EmployeeLeaveType,
    balanceYear: number,
  ) {
    if (!CARRY_FORWARD_ENABLED_TYPES.has(leaveType)) {
      return 0;
    }

    const previousBalance = await this.prisma.employeeLeaveBalance.findFirst({
      where: {
        deletedAt: null,
        employeeId,
        leaveType,
        balanceYear: balanceYear - 1,
      },
      include: employeeLeaveBalanceInclude,
    });

    if (!previousBalance) {
      return 0;
    }

    const enrichedPreviousBalance = await this.enrichBalance(previousBalance);
    return Math.max(enrichedPreviousBalance.remainingDays, 0);
  }

  private calculateOverlappingDays(
    startDate: Date,
    endDate: Date,
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    const start = Math.max(this.toUtcDateOnly(startDate), this.toUtcDateOnly(rangeStart));
    const end = Math.min(this.toUtcDateOnly(endDate), this.toUtcDateOnly(rangeEnd));

    if (end < start) {
      return 0;
    }

    return Math.floor((end - start) / DAY_IN_MS) + 1;
  }

  private getYearRange(balanceYear: number) {
    return {
      yearStart: new Date(Date.UTC(balanceYear, 0, 1, 0, 0, 0, 0)),
      yearEnd: new Date(Date.UTC(balanceYear, 11, 31, 0, 0, 0, 0)),
    };
  }

  private toUtcDateOnly(value: Date) {
    return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  }

  private validateDayValues(
    allocatedDays: number,
    carriedForwardDays: number | undefined,
    manualAdjustmentDays: number | undefined,
  ) {
    const totalEntitledDays =
      allocatedDays + (carriedForwardDays ?? 0) + (manualAdjustmentDays ?? 0);

    if (totalEntitledDays < 0) {
      throw new BadRequestException(
        'The resulting leave entitlement cannot be negative',
      );
    }
  }

  private buildBalanceKey(
    employeeId: string,
    leaveType: EmployeeLeaveType,
    balanceYear: number,
  ) {
    return `${employeeId}|${leaveType}|${balanceYear}`;
  }

  private transformPersistenceError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new BadRequestException(
        'A leave balance for this employee, type, and year already exists',
      );
    }

    return error;
  }

  private extractErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
