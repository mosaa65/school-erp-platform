import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  EmployeeContract,
  Prisma,
  UserNotificationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeContractDto } from './dto/create-employee-contract.dto';
import { GenerateEmployeeContractExpiryAlertsDto } from './dto/generate-employee-contract-expiry-alerts.dto';
import { ListEmployeeContractsDto } from './dto/list-employee-contracts.dto';
import { UpdateEmployeeContractDto } from './dto/update-employee-contract.dto';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';

const employeeContractInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
} as const;

const DEFAULT_EXPIRY_ALERT_THRESHOLD_DAYS = 30;
const EXPIRY_ALERT_TITLE = 'العقد قريب من الانتهاء';
const RENEWAL_DRAFT_NOTE_PREFIX = 'مسودة تجديد منشأة من العقد السابق';

@Injectable()
export class EmployeeContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  async create(payload: CreateEmployeeContractDto, actorUserId: string) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.employeeId,
      );
      this.validateContractDates(
        payload.contractStartDate,
        payload.contractEndDate,
      );
      this.validateSalaryAmount(payload.salaryAmount);

      const employeeContract = await this.prisma.employeeContract.create({
        data: {
          employeeId: payload.employeeId,
          contractTitle: payload.contractTitle,
          contractNumber: payload.contractNumber,
          contractStartDate: payload.contractStartDate,
          contractEndDate: payload.contractEndDate,
          salaryAmount: payload.salaryAmount,
          notes: payload.notes,
          isCurrent: payload.isCurrent ?? true,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: employeeContractInclude,
      });

      if (employeeContract.isCurrent) {
        await this.demoteOtherCurrentContracts(
          employeeContract.employeeId,
          employeeContract.id,
          actorUserId,
        );
      }

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_CONTRACT_CREATE',
        resource: 'employee-contracts',
        resourceId: employeeContract.id,
        details: {
          employeeId: employeeContract.employeeId,
          contractTitle: employeeContract.contractTitle,
        },
      });

      return employeeContract;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_CONTRACT_CREATE_FAILED',
        resource: 'employee-contracts',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          contractTitle: payload.contractTitle,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListEmployeeContractsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeContractWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      isCurrent: query.isCurrent,
      isActive: query.isActive,
      contractStartDate:
        query.fromDate || query.toDate
          ? {
              gte: query.fromDate,
              lte: query.toDate,
            }
          : undefined,
      OR: query.search
        ? [
            {
              contractTitle: {
                contains: query.search,
              },
            },
            {
              contractNumber: {
                contains: query.search,
              },
            },
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
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employeeContract.count({ where }),
      this.prisma.employeeContract.findMany({
        where,
        include: employeeContractInclude,
        orderBy: [
          {
            contractStartDate: 'desc',
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
    const employeeContract = await this.prisma.employeeContract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeContractInclude,
    });

    if (!employeeContract) {
      throw new NotFoundException('Employee contract not found');
    }

    return employeeContract;
  }

  async createRenewalDraft(sourceContractId: string, actorUserId: string) {
    const sourceContract = await this.ensureEmployeeContractExists(sourceContractId);

    if (!sourceContract.isActive) {
      throw new BadRequestException(
        'Only active contracts can be renewed into a draft',
      );
    }

    if (!sourceContract.isCurrent) {
      throw new BadRequestException(
        'Only current contracts can be renewed into a draft',
      );
    }

    if (!sourceContract.contractEndDate) {
      throw new BadRequestException(
        'Contract end date is required to create a renewal draft',
      );
    }

    const renewalDraft = await this.prisma.employeeContract.create({
      data: {
        employeeId: sourceContract.employeeId,
        contractTitle: sourceContract.contractTitle,
        contractNumber: null,
        contractStartDate: this.buildRenewalDraftStartDate(
          sourceContract.contractEndDate,
        ),
        contractEndDate: null,
        salaryAmount: sourceContract.salaryAmount?.toString(),
        notes: this.buildRenewalDraftNotes(sourceContract),
        isCurrent: false,
        isActive: true,
        createdById: actorUserId,
        updatedById: actorUserId,
      },
      include: employeeContractInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_CONTRACT_RENEWAL_DRAFT_CREATE',
      resource: 'employee-contracts',
      resourceId: renewalDraft.id,
      details: {
        sourceContractId,
        employeeId: sourceContract.employeeId,
        contractTitle: sourceContract.contractTitle,
      },
    });

    return renewalDraft;
  }

  async update(
    id: string,
    payload: UpdateEmployeeContractDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureEmployeeContractExists(id);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    await this.employeesService.ensureEmployeeExistsAndActive(
      resolvedEmployeeId,
    );
    this.validateContractDates(
      payload.contractStartDate ?? existing.contractStartDate.toISOString(),
      payload.contractEndDate ?? existing.contractEndDate?.toISOString(),
    );
    this.validateSalaryAmount(payload.salaryAmount);

    const employeeContract = await this.prisma.employeeContract.update({
      where: {
        id,
      },
      data: {
        employeeId: payload.employeeId,
        contractTitle: payload.contractTitle,
        contractNumber: payload.contractNumber,
        contractStartDate: payload.contractStartDate,
        contractEndDate: payload.contractEndDate,
        salaryAmount: payload.salaryAmount,
        notes: payload.notes,
        isCurrent: payload.isCurrent,
        isActive: payload.isActive,
        updatedById: actorUserId,
      },
      include: employeeContractInclude,
    });

    if (employeeContract.isCurrent) {
      await this.demoteOtherCurrentContracts(
        employeeContract.employeeId,
        employeeContract.id,
        actorUserId,
      );
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_CONTRACT_UPDATE',
      resource: 'employee-contracts',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return employeeContract;
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEmployeeContractExists(id);

    await this.prisma.employeeContract.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        isCurrent: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_CONTRACT_DELETE',
      resource: 'employee-contracts',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async generateExpiryAlerts(
    payload: GenerateEmployeeContractExpiryAlertsDto,
    actorUserId: string,
  ) {
    const daysThreshold =
      payload.daysThreshold ?? DEFAULT_EXPIRY_ALERT_THRESHOLD_DAYS;
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfThreshold = new Date(now);
    endOfThreshold.setUTCHours(23, 59, 59, 999);
    endOfThreshold.setUTCDate(endOfThreshold.getUTCDate() + daysThreshold);

    const contracts = await this.prisma.employeeContract.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        isCurrent: true,
        contractEndDate: {
          not: null,
          gte: now,
          lte: endOfThreshold,
        },
      },
      include: employeeContractInclude,
      orderBy: [{ contractEndDate: 'asc' }, { createdAt: 'desc' }],
    });

    const managers = await this.findContractManagers(actorUserId, now);
    let generatedCount = 0;

    for (const contract of contracts) {
      const contractEndDate = contract.contractEndDate;
      if (!contractEndDate) {
        continue;
      }

      const recipients = await this.resolveContractAlertRecipients(
        contract.employeeId,
        managers,
      );

      if (recipients.length === 0) {
        continue;
      }

      const remainingDays = this.calculateRemainingDays(contractEndDate, now);
      const message = `العقد الحالي للموظف ${contract.employee.fullName} (${contract.contractTitle}) سينتهي بتاريخ ${this.formatDateForNotification(contractEndDate)} خلال ${remainingDays} يوم.`;

      const pendingNotifications = await Promise.all(
        recipients.map(async (userId) => {
          const alreadyExists = await this.prisma.userNotification.findFirst({
            where: {
              userId,
              deletedAt: null,
              resource: 'employee-contracts',
              resourceId: contract.id,
              title: EXPIRY_ALERT_TITLE,
              createdAt: {
                gte: startOfToday,
              },
            },
            select: {
              id: true,
            },
          });

          if (alreadyExists) {
            return null;
          }

          return {
            userId,
            title: EXPIRY_ALERT_TITLE,
            message,
            notificationType: UserNotificationType.WARNING,
            resource: 'employee-contracts',
            resourceId: contract.id,
            actionUrl: '/app/employee-contracts',
            triggeredByUserId: actorUserId,
          };
        }),
      );

      const notificationsToCreate = pendingNotifications.filter(
        (item): item is NonNullable<typeof item> => item !== null,
      );

      if (notificationsToCreate.length === 0) {
        continue;
      }

      await this.userNotificationsService.createForUsers(notificationsToCreate);
      generatedCount += notificationsToCreate.length;
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_CONTRACT_EXPIRY_ALERTS_GENERATE',
      resource: 'employee-contracts',
      details: {
        daysThreshold,
        scannedCount: contracts.length,
        generatedCount,
      },
    });

    return {
      success: true,
      scannedCount: contracts.length,
      generatedCount,
      daysThreshold,
    };
  }

  private async ensureEmployeeContractExists(
    id: string,
  ): Promise<EmployeeContract> {
    const employeeContract = await this.prisma.employeeContract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employeeContract) {
      throw new NotFoundException('Employee contract not found');
    }

    return employeeContract;
  }

  private validateContractDates(startDate: string, endDate?: string) {
    if (!endDate) {
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid contract dates supplied');
    }

    if (end < start) {
      throw new BadRequestException(
        'Contract end date cannot be earlier than start date',
      );
    }
  }

  private validateSalaryAmount(salaryAmount?: string) {
    if (!salaryAmount) {
      return;
    }

    const numericValue = Number(salaryAmount);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new BadRequestException(
        'Salary amount must be a valid non-negative number',
      );
    }
  }

  private async demoteOtherCurrentContracts(
    employeeId: string,
    activeContractId: string,
    actorUserId: string,
  ) {
    await this.prisma.employeeContract.updateMany({
      where: {
        employeeId,
        deletedAt: null,
        isCurrent: true,
        id: {
          not: activeContractId,
        },
      },
      data: {
        isCurrent: false,
        updatedById: actorUserId,
      },
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  private async findContractManagers(actorUserId: string, now: Date) {
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          not: actorUserId,
        },
        isActive: true,
        deletedAt: null,
        OR: [
          {
            userRoles: {
              some: {
                deletedAt: null,
                role: {
                  isActive: true,
                  deletedAt: null,
                  rolePermissions: {
                    some: {
                      deletedAt: null,
                      permission: {
                        code: 'employee-contracts.notify-expiring',
                        deletedAt: null,
                      },
                    },
                  },
                },
              },
            },
          },
          {
            directPermissions: {
              some: {
                deletedAt: null,
                revokedAt: null,
                validFrom: {
                  lte: now,
                },
                OR: [
                  {
                    validUntil: null,
                  },
                  {
                    validUntil: {
                      gte: now,
                    },
                  },
                ],
                permission: {
                  code: 'employee-contracts.notify-expiring',
                  deletedAt: null,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return users.map((user) => user.id);
  }

  private async resolveContractAlertRecipients(
    employeeId: string,
    managerIds: string[],
  ) {
    const employeeUser = await this.prisma.user.findFirst({
      where: {
        employeeId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return Array.from(
      new Set([
        ...managerIds,
        ...(employeeUser ? [employeeUser.id] : []),
      ]),
    );
  }

  private calculateRemainingDays(endDate: Date, now: Date) {
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfContractDay = new Date(
      Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
      ),
    );

    return Math.max(
      0,
      Math.floor((endOfContractDay.getTime() - startOfToday.getTime()) / millisecondsInDay),
    );
  }

  private formatDateForNotification(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private buildRenewalDraftStartDate(contractEndDate: Date) {
    const nextDate = new Date(
      Date.UTC(
        contractEndDate.getUTCFullYear(),
        contractEndDate.getUTCMonth(),
        contractEndDate.getUTCDate() + 1,
      ),
    );

    return nextDate.toISOString();
  }

  private buildRenewalDraftNotes(sourceContract: EmployeeContract) {
    const sourceReference =
      sourceContract.contractNumber?.trim() || sourceContract.contractTitle;
    const clonedNotes = sourceContract.notes?.trim();

    return clonedNotes
      ? `${RENEWAL_DRAFT_NOTE_PREFIX}: ${sourceReference}. ${clonedNotes}`
      : `${RENEWAL_DRAFT_NOTE_PREFIX}: ${sourceReference}.`;
  }
}
