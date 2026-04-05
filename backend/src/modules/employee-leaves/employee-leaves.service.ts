import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  EmployeeLeaveRequest,
  EmployeeLeaveRequestStatus,
  EmployeeLeaveType,
  Prisma,
  UserNotificationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';
import { CreateEmployeeLeaveDto } from './dto/create-employee-leave.dto';
import { ListEmployeeLeavesDto } from './dto/list-employee-leaves.dto';
import { UpdateEmployeeLeaveDto } from './dto/update-employee-leave.dto';

const employeeLeaveInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

const BALANCE_MANAGED_LEAVE_TYPES = new Set<EmployeeLeaveType>([
  EmployeeLeaveType.ANNUAL,
  EmployeeLeaveType.SICK,
  EmployeeLeaveType.EMERGENCY,
  EmployeeLeaveType.MATERNITY,
]);

const LEAVE_TYPE_LABELS: Record<EmployeeLeaveType, string> = {
  [EmployeeLeaveType.ANNUAL]: 'سنوية',
  [EmployeeLeaveType.SICK]: 'مرضية',
  [EmployeeLeaveType.EMERGENCY]: 'طارئة',
  [EmployeeLeaveType.UNPAID]: 'بدون راتب',
  [EmployeeLeaveType.MATERNITY]: 'أمومة',
  [EmployeeLeaveType.OTHER]: 'أخرى',
};

@Injectable()
export class EmployeeLeavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  async create(payload: CreateEmployeeLeaveDto, actorUserId: string) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(payload.employeeId);

      const totalDays = this.calculateTotalDays(payload.startDate, payload.endDate);

      const employeeLeave = await this.prisma.employeeLeaveRequest.create({
        data: {
          employeeId: payload.employeeId,
          leaveType: payload.leaveType,
          startDate: payload.startDate,
          endDate: payload.endDate,
          totalDays,
          status: EmployeeLeaveRequestStatus.PENDING,
          reason: payload.reason,
          notes: payload.notes,
          approvedByUserId: null,
          approvedAt: null,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: employeeLeaveInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_LEAVE_CREATE',
        resource: 'employee-leaves',
        resourceId: employeeLeave.id,
        details: {
          employeeId: employeeLeave.employeeId,
          leaveType: employeeLeave.leaveType,
          totalDays: employeeLeave.totalDays,
        },
      });

      await this.notifyApproversAboutSubmittedLeave(employeeLeave, actorUserId);

      return employeeLeave;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_LEAVE_CREATE_FAILED',
        resource: 'employee-leaves',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          leaveType: payload.leaveType,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListEmployeeLeavesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeLeaveRequestWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      leaveType: query.leaveType,
      status: query.status,
      isActive: query.isActive,
      startDate:
        query.fromDate || query.toDate
          ? {
              gte: query.fromDate,
              lte: query.toDate,
            }
          : undefined,
      OR: query.search
        ? [
            {
              reason: {
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
      this.prisma.employeeLeaveRequest.count({ where }),
      this.prisma.employeeLeaveRequest.findMany({
        where,
        include: employeeLeaveInclude,
        orderBy: [
          {
            startDate: 'desc',
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
    const employeeLeave = await this.prisma.employeeLeaveRequest.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeLeaveInclude,
    });

    if (!employeeLeave) {
      throw new NotFoundException('Employee leave request not found');
    }

    return employeeLeave;
  }

  async update(
    id: string,
    payload: UpdateEmployeeLeaveDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureEmployeeLeaveExists(id);
    this.ensureLeaveRequestIsMutable(existing);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    await this.employeesService.ensureEmployeeExistsAndActive(resolvedEmployeeId);

    const resolvedStartDate = payload.startDate ?? existing.startDate.toISOString();
    const resolvedEndDate = payload.endDate ?? existing.endDate.toISOString();
    const totalDays = this.calculateTotalDays(resolvedStartDate, resolvedEndDate);

    const employeeLeave = await this.prisma.employeeLeaveRequest.update({
      where: {
        id,
      },
      data: {
        employeeId: payload.employeeId,
        leaveType: payload.leaveType,
        startDate: payload.startDate,
        endDate: payload.endDate,
        totalDays,
        reason: payload.reason,
        notes: payload.notes,
        isActive: payload.isActive,
        updatedById: actorUserId,
      },
      include: employeeLeaveInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_LEAVE_UPDATE',
      resource: 'employee-leaves',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return employeeLeave;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureEmployeeLeaveExists(id);
    this.ensureLeaveRequestIsMutable(existing);

    await this.prisma.employeeLeaveRequest.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_LEAVE_DELETE',
      resource: 'employee-leaves',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async approve(id: string, actorUserId: string) {
    const existing = await this.ensureEmployeeLeaveExists(id);
    this.ensureLeaveRequestIsPending(existing, 'approve');
    await this.ensureLeaveRequestHasSufficientBalance(existing);

    const employeeLeave = await this.prisma.employeeLeaveRequest.update({
      where: { id },
      data: {
        status: EmployeeLeaveRequestStatus.APPROVED,
        approvedByUserId: actorUserId,
        approvedAt: new Date(),
        updatedById: actorUserId,
      },
      include: employeeLeaveInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_LEAVE_APPROVE',
      resource: 'employee-leaves',
      resourceId: id,
      details: {
        employeeId: employeeLeave.employeeId,
        totalDays: employeeLeave.totalDays,
      },
    });

    await this.notifyEmployeeAboutDecision(
      employeeLeave,
      actorUserId,
      EmployeeLeaveRequestStatus.APPROVED,
    );

    return employeeLeave;
  }

  async reject(id: string, actorUserId: string) {
    const existing = await this.ensureEmployeeLeaveExists(id);
    this.ensureLeaveRequestIsPending(existing, 'reject');

    const employeeLeave = await this.prisma.employeeLeaveRequest.update({
      where: { id },
      data: {
        status: EmployeeLeaveRequestStatus.REJECTED,
        approvedByUserId: actorUserId,
        approvedAt: new Date(),
        updatedById: actorUserId,
      },
      include: employeeLeaveInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_LEAVE_REJECT',
      resource: 'employee-leaves',
      resourceId: id,
      details: {
        employeeId: employeeLeave.employeeId,
        totalDays: employeeLeave.totalDays,
      },
    });

    await this.notifyEmployeeAboutDecision(
      employeeLeave,
      actorUserId,
      EmployeeLeaveRequestStatus.REJECTED,
    );

    return employeeLeave;
  }

  async cancel(id: string, actorUser: AuthUser) {
    const existing = await this.ensureEmployeeLeaveExists(id);
    this.ensureLeaveRequestCanBeCancelled(existing, actorUser);
    this.ensureLeaveRequestIsPending(existing, 'cancel');

    const employeeLeave = await this.prisma.employeeLeaveRequest.update({
      where: { id },
      data: {
        status: EmployeeLeaveRequestStatus.CANCELLED,
        approvedByUserId: null,
        approvedAt: null,
        updatedById: actorUser.userId,
      },
      include: employeeLeaveInclude,
    });

    await this.auditLogsService.record({
      actorUserId: actorUser.userId,
      action: 'EMPLOYEE_LEAVE_CANCEL',
      resource: 'employee-leaves',
      resourceId: id,
      details: {
        employeeId: employeeLeave.employeeId,
        totalDays: employeeLeave.totalDays,
      },
    });

    await this.notifyEmployeeAboutDecision(
      employeeLeave,
      actorUser.userId,
      EmployeeLeaveRequestStatus.CANCELLED,
    );

    return employeeLeave;
  }

  private async notifyApproversAboutSubmittedLeave(
    employeeLeave: Prisma.EmployeeLeaveRequestGetPayload<{
      include: typeof employeeLeaveInclude;
    }>,
    actorUserId: string,
  ) {
    const now = new Date();
    const approverUsers = await this.prisma.user.findMany({
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
                        code: 'employee-leaves.approve',
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
                  code: 'employee-leaves.approve',
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

    if (approverUsers.length === 0) {
      return;
    }

    await this.safelyCreateNotifications(
      approverUsers.map((user) => ({
        userId: user.id,
        title: 'طلب إجازة جديد بانتظار الاعتماد',
        message: `تم تقديم طلب إجازة ${this.getLeaveTypeLabel(employeeLeave.leaveType)} للموظف ${employeeLeave.employee.fullName} من ${this.formatDateForNotification(employeeLeave.startDate)} إلى ${this.formatDateForNotification(employeeLeave.endDate)}.`,
        notificationType: UserNotificationType.ACTION_REQUIRED,
        resource: 'employee-leaves',
        resourceId: employeeLeave.id,
        actionUrl: '/app/employee-leaves',
        triggeredByUserId: actorUserId,
      })),
      actorUserId,
      'EMPLOYEE_LEAVE_SUBMISSION_NOTIFY_APPROVERS_FAILED',
      employeeLeave.id,
    );
  }

  private async notifyEmployeeAboutDecision(
    employeeLeave: Prisma.EmployeeLeaveRequestGetPayload<{
      include: typeof employeeLeaveInclude;
    }>,
    actorUserId: string,
    status: EmployeeLeaveRequestStatus,
  ) {
    const employeeUser = await this.prisma.user.findFirst({
      where: {
        employeeId: employeeLeave.employeeId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!employeeUser) {
      return;
    }

    let decisionLabel = 'اعتماد';
    let notificationType: UserNotificationType = UserNotificationType.SUCCESS;

    if (status === EmployeeLeaveRequestStatus.REJECTED) {
      decisionLabel = 'رفض';
      notificationType = UserNotificationType.WARNING;
    } else if (status === EmployeeLeaveRequestStatus.CANCELLED) {
      if (employeeUser.id === actorUserId) {
        return;
      }

      decisionLabel = 'إلغاء';
      notificationType = UserNotificationType.INFO;
    }

    await this.safelyCreateNotifications(
      [
        {
          userId: employeeUser.id,
          title: `تم ${decisionLabel} طلب الإجازة`,
          message: `تم ${decisionLabel} طلب إجازتك من نوع ${this.getLeaveTypeLabel(employeeLeave.leaveType)} للفترة من ${this.formatDateForNotification(employeeLeave.startDate)} إلى ${this.formatDateForNotification(employeeLeave.endDate)}.`,
          notificationType,
          resource: 'employee-leaves',
          resourceId: employeeLeave.id,
          actionUrl: '/app/employee-leaves',
          triggeredByUserId: actorUserId,
        },
      ],
      actorUserId,
      'EMPLOYEE_LEAVE_DECISION_NOTIFY_EMPLOYEE_FAILED',
      employeeLeave.id,
    );
  }

  private async ensureEmployeeLeaveExists(
    id: string,
  ): Promise<EmployeeLeaveRequest> {
    const employeeLeave = await this.prisma.employeeLeaveRequest.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employeeLeave) {
      throw new NotFoundException('Employee leave request not found');
    }

    return employeeLeave;
  }

  private calculateTotalDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid leave dates supplied');
    }

    if (end < start) {
      throw new BadRequestException(
        'Leave end date cannot be earlier than start date',
      );
    }

    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.floor((end.getTime() - start.getTime()) / millisecondsInDay) + 1;

    if (totalDays < 1 || totalDays > 365) {
      throw new BadRequestException('Leave total days must be between 1 and 365');
    }

    return totalDays;
  }

  private ensureLeaveRequestIsPending(
    leaveRequest: EmployeeLeaveRequest,
    action: 'approve' | 'reject' | 'cancel',
  ) {
    if (leaveRequest.status !== EmployeeLeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Only pending leave requests can be ${action}d`,
      );
    }
  }

  private ensureLeaveRequestIsMutable(leaveRequest: EmployeeLeaveRequest) {
    if (leaveRequest.status !== EmployeeLeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending leave requests can be updated or deleted',
      );
    }
  }

  private ensureLeaveRequestCanBeCancelled(
    leaveRequest: EmployeeLeaveRequest,
    actorUser: AuthUser,
  ) {
    const isRequester = leaveRequest.createdById === actorUser.userId;
    const isApprover = actorUser.permissionCodes.includes(
      'employee-leaves.approve',
    );
    const isSuperAdmin = actorUser.roleCodes.includes('super_admin');

    if (isRequester || isApprover || isSuperAdmin) {
      return;
    }

    throw new ForbiddenException(
      'Only the requester or an authorized approver can cancel this leave request',
    );
  }

  private async ensureLeaveRequestHasSufficientBalance(
    leaveRequest: EmployeeLeaveRequest,
  ) {
    if (!BALANCE_MANAGED_LEAVE_TYPES.has(leaveRequest.leaveType)) {
      return;
    }

    const balanceYear = leaveRequest.startDate.getUTCFullYear();
    const endYear = leaveRequest.endDate.getUTCFullYear();

    if (endYear !== balanceYear) {
      throw new BadRequestException(
        'Leave approvals that span multiple balance years are not supported yet',
      );
    }

    const balance = await this.prisma.employeeLeaveBalance.findFirst({
      where: {
        employeeId: leaveRequest.employeeId,
        leaveType: leaveRequest.leaveType,
        balanceYear,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!balance) {
      throw new BadRequestException(
        `No active leave balance found for ${leaveRequest.leaveType} in ${balanceYear}`,
      );
    }

    const approvedDays = await this.prisma.employeeLeaveRequest.aggregate({
      _sum: {
        totalDays: true,
      },
      where: {
        deletedAt: null,
        employeeId: leaveRequest.employeeId,
        leaveType: leaveRequest.leaveType,
        status: EmployeeLeaveRequestStatus.APPROVED,
        startDate: {
          gte: new Date(Date.UTC(balanceYear, 0, 1)),
          lt: new Date(Date.UTC(balanceYear + 1, 0, 1)),
        },
        id: {
          not: leaveRequest.id,
        },
      },
    });

    const totalEntitledDays =
      balance.allocatedDays +
      balance.carriedForwardDays +
      balance.manualAdjustmentDays;
    const usedDays = approvedDays._sum.totalDays ?? 0;
    const remainingDays = totalEntitledDays - usedDays;

    if (leaveRequest.totalDays > remainingDays) {
      throw new BadRequestException(
        `Insufficient leave balance for approval. Remaining days: ${remainingDays}, requested days: ${leaveRequest.totalDays}`,
      );
    }
  }

  private async safelyCreateNotifications(
    inputs: Array<Parameters<UserNotificationsService['createForUsers']>[0][number]>,
    actorUserId: string,
    failureAction: string,
    leaveId: string,
  ) {
    try {
      await this.userNotificationsService.createForUsers(inputs);
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: failureAction,
        resource: 'employee-leaves',
        resourceId: leaveId,
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });
    }
  }

  private getLeaveTypeLabel(leaveType: EmployeeLeaveType) {
    return LEAVE_TYPE_LABELS[leaveType] ?? leaveType;
  }

  private formatDateForNotification(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
