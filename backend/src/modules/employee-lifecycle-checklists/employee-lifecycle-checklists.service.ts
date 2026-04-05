import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  EmployeeLifecycleChecklistStatus,
  EmployeeLifecycleChecklistType,
  Prisma,
  UserNotificationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';
import { CreateEmployeeLifecycleChecklistDto } from './dto/create-employee-lifecycle-checklist.dto';
import { GenerateEmployeeLifecycleChecklistDueAlertsDto } from './dto/generate-employee-lifecycle-checklist-due-alerts.dto';
import { GenerateEmployeeLifecycleChecklistTemplatesDto } from './dto/generate-employee-lifecycle-checklist-templates.dto';
import { ListEmployeeLifecycleChecklistsDto } from './dto/list-employee-lifecycle-checklists.dto';
import { UpdateEmployeeLifecycleChecklistDto } from './dto/update-employee-lifecycle-checklist.dto';

const employeeLifecycleChecklistInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
} as const;

const DEFAULT_DUE_ALERT_THRESHOLD_DAYS = 3;
const LIFECYCLE_ASSIGNMENT_TITLE = 'تم إسناد مهمة تهيئة/إنهاء خدمة';
const LIFECYCLE_COMPLETED_TITLE = 'تم إكمال مهمة تهيئة/إنهاء خدمة';
const LIFECYCLE_WAIVED_TITLE = 'تم إعفاء مهمة تهيئة/إنهاء خدمة';
const LIFECYCLE_DUE_ALERT_TITLE = 'مهمة تهيئة/إنهاء خدمة مستحقة';
const LIFECYCLE_TEMPLATE_NOTE_PREFIX = 'تم إنشاؤها من القالب الافتراضي';

const CHECKLIST_TYPE_LABELS: Record<EmployeeLifecycleChecklistType, string> = {
  [EmployeeLifecycleChecklistType.ONBOARDING]: 'تهيئة',
  [EmployeeLifecycleChecklistType.OFFBOARDING]: 'إنهاء خدمة',
};

type EmployeeLifecycleChecklistWithRelations =
  Prisma.EmployeeLifecycleChecklistGetPayload<{
    include: typeof employeeLifecycleChecklistInclude;
  }>;

type LifecycleTemplateDefinition = {
  title: string;
  dueOffsetDays: number;
  notes: string;
};

const BUILT_IN_LIFECYCLE_TEMPLATES: Record<
  EmployeeLifecycleChecklistType,
  LifecycleTemplateDefinition[]
> = {
  [EmployeeLifecycleChecklistType.ONBOARDING]: [
    {
      title: 'تفعيل البريد المؤسسي وحسابات الأنظمة',
      dueOffsetDays: 0,
      notes: `${LIFECYCLE_TEMPLATE_NOTE_PREFIX}: تنسيق الوصول إلى الأنظمة والقنوات الداخلية.`,
    },
    {
      title: 'استلام العقد والهوية الوظيفية',
      dueOffsetDays: 0,
      notes: `${LIFECYCLE_TEMPLATE_NOTE_PREFIX}: تسليم المستندات الأساسية للموظف.`,
    },
    {
      title: 'جلسة تعريف بالسياسات واللوائح',
      dueOffsetDays: 1,
      notes: `${LIFECYCLE_TEMPLATE_NOTE_PREFIX}: مراجعة السياسات التشغيلية والسلوك المهني.`,
    },
    {
      title: 'اجتماع التهيئة مع المدير المباشر وخطة الأسبوع الأول',
      dueOffsetDays: 2,
      notes: `${LIFECYCLE_TEMPLATE_NOTE_PREFIX}: ضبط الأولويات والمسؤوليات المبكرة.`,
    },
  ],
  [EmployeeLifecycleChecklistType.OFFBOARDING]: [
    {
      title: 'استلام العهدة والأجهزة المؤسسية',
      dueOffsetDays: 0,
      notes: `${LIFECYCLE_TEMPLATE_NOTE_PREFIX}: التحقق من استلام الأصول والعهد.`,
    },
    {
      title: 'إيقاف الحسابات والوصول الإلكتروني',
      dueOffsetDays: 0,
      notes: `${LIFECYCLE_TEMPLATE_NOTE_PREFIX}: إغلاق البريد والحسابات والأنظمة المرتبطة.`,
    },
    {
      title: 'إقفال المخالصة المالية والالتزامات المفتوحة',
      dueOffsetDays: 1,
      notes: `${LIFECYCLE_TEMPLATE_NOTE_PREFIX}: متابعة أي مستحقات أو تسويات مالية.`,
    },
    {
      title: 'أرشفة الملف الوظيفي وتوثيق التسليم النهائي',
      dueOffsetDays: 2,
      notes: `${LIFECYCLE_TEMPLATE_NOTE_PREFIX}: إغلاق السجل الوظيفي وتجهيز الأرشفة.`,
    },
  ],
};

@Injectable()
export class EmployeeLifecycleChecklistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  async create(
    payload: CreateEmployeeLifecycleChecklistDto,
    actorUserId: string,
  ) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(payload.employeeId);

      if (payload.assignedToEmployeeId) {
        await this.employeesService.ensureEmployeeExistsAndActive(
          payload.assignedToEmployeeId,
        );
      }

      const lifecycleItem =
        await this.prisma.employeeLifecycleChecklist.create({
          data: {
            employeeId: payload.employeeId,
            checklistType: payload.checklistType,
            title: payload.title,
            status: EmployeeLifecycleChecklistStatus.PENDING,
            assignedToEmployeeId: payload.assignedToEmployeeId,
            dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
            completedAt: null,
            notes: payload.notes,
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: employeeLifecycleChecklistInclude,
        });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_LIFECYCLE_CHECKLIST_CREATE',
        resource: 'employee-lifecycle-checklists',
        resourceId: lifecycleItem.id,
        details: {
          employeeId: lifecycleItem.employeeId,
          checklistType: lifecycleItem.checklistType,
          title: lifecycleItem.title,
        },
      });

      await this.notifyAssigneeAboutAssignment(lifecycleItem, actorUserId);

      return lifecycleItem;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_LIFECYCLE_CHECKLIST_CREATE_FAILED',
        resource: 'employee-lifecycle-checklists',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          title: payload.title,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async generateTemplates(
    payload: GenerateEmployeeLifecycleChecklistTemplatesDto,
    actorUserId: string,
  ) {
    const templates = BUILT_IN_LIFECYCLE_TEMPLATES[payload.checklistType];
    const dayStart = this.toUtcDateOnly(new Date());
    const dayEnd = this.addDays(dayStart, 1);

    try {
      await this.employeesService.ensureEmployeeExistsAndActive(payload.employeeId);

      if (payload.assignedToEmployeeId) {
        await this.employeesService.ensureEmployeeExistsAndActive(
          payload.assignedToEmployeeId,
        );
      }

      const existingItems = await this.prisma.employeeLifecycleChecklist.findMany({
        where: {
          deletedAt: null,
          employeeId: payload.employeeId,
          checklistType: payload.checklistType,
          title: {
            in: templates.map((template) => template.title),
          },
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        select: {
          title: true,
        },
      });

      const existingTitles = new Set(existingItems.map((item) => item.title));
      const createdItems: EmployeeLifecycleChecklistWithRelations[] = [];

      for (const template of templates) {
        if (existingTitles.has(template.title)) {
          continue;
        }

        const lifecycleItem = await this.createLifecycleChecklistItem(
          {
            employeeId: payload.employeeId,
            checklistType: payload.checklistType,
            title: template.title,
            assignedToEmployeeId: payload.assignedToEmployeeId,
            dueDate: this.addDays(dayStart, template.dueOffsetDays),
            notes: template.notes,
            isActive: true,
          },
          actorUserId,
        );

        createdItems.push(lifecycleItem);
      }

      await Promise.all(
        createdItems.map((item) =>
          this.notifyAssigneeAboutAssignment(item, actorUserId),
        ),
      );

      const skippedCount = templates.length - createdItems.length;

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_LIFECYCLE_CHECKLIST_TEMPLATE_GENERATE',
        resource: 'employee-lifecycle-checklists',
        details: {
          employeeId: payload.employeeId,
          checklistType: payload.checklistType,
          assignedToEmployeeId: payload.assignedToEmployeeId ?? null,
          generatedCount: createdItems.length,
          skippedCount,
          titles: createdItems.map((item) => item.title),
        },
      });

      return {
        success: true,
        employeeId: payload.employeeId,
        checklistType: payload.checklistType,
        generatedCount: createdItems.length,
        skippedCount,
        templateCount: templates.length,
        items: createdItems,
      };
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_LIFECYCLE_CHECKLIST_TEMPLATE_GENERATE_FAILED',
        resource: 'employee-lifecycle-checklists',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          checklistType: payload.checklistType,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async generateDueAlerts(
    payload: GenerateEmployeeLifecycleChecklistDueAlertsDto,
    actorUserId: string,
  ) {
    const daysThreshold =
      payload.daysThreshold ?? DEFAULT_DUE_ALERT_THRESHOLD_DAYS;
    const rangeStart = this.toUtcDateOnly(new Date());
    const rangeEnd = this.addDays(rangeStart, daysThreshold);
    const dayStart = this.toUtcDateOnly(new Date());
    const dayEnd = this.addDays(dayStart, 1);

    const items = await this.prisma.employeeLifecycleChecklist.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        status: {
          in: [
            EmployeeLifecycleChecklistStatus.PENDING,
            EmployeeLifecycleChecklistStatus.IN_PROGRESS,
          ],
        },
        dueDate: {
          not: null,
          lte: rangeEnd,
        },
      },
      include: employeeLifecycleChecklistInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    let generatedCount = 0;

    for (const item of items) {
      if (!item.dueDate) {
        continue;
      }

      const recipients = await this.resolveDueAlertRecipientIds(item, actorUserId);
      if (recipients.length === 0) {
        continue;
      }

      const existingNotifications = await this.prisma.userNotification.findMany({
        where: {
          deletedAt: null,
          userId: {
            in: recipients,
          },
          title: LIFECYCLE_DUE_ALERT_TITLE,
          resource: 'employee-lifecycle-checklists',
          resourceId: item.id,
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        select: {
          userId: true,
        },
      });

      const existingUserIds = new Set(
        existingNotifications.map((notification) => notification.userId),
      );
      const notificationUserIds = recipients.filter(
        (userId) => !existingUserIds.has(userId),
      );

      if (notificationUserIds.length === 0) {
        continue;
      }

      const remainingDays = this.calculateRemainingDays(item.dueDate, rangeStart);
      const dueState =
        remainingDays < 0
          ? `متأخرة منذ ${Math.abs(remainingDays)} يوم`
          : remainingDays === 0
            ? 'مستحقة اليوم'
            : `مستحقة خلال ${remainingDays} يوم`;
      const message = `مهمة ${CHECKLIST_TYPE_LABELS[item.checklistType]} "${item.title}" الخاصة بالموظف ${item.employee.fullName} ${dueState}.`;

      const created = await this.userNotificationsService.createForUsers(
        notificationUserIds.map((userId) => ({
          userId,
          title: LIFECYCLE_DUE_ALERT_TITLE,
          message,
          notificationType: UserNotificationType.ACTION_REQUIRED,
          resource: 'employee-lifecycle-checklists',
          resourceId: item.id,
          actionUrl: '/app/employee-lifecycle-checklists',
          triggeredByUserId: actorUserId,
        })),
      );

      generatedCount += created.length;
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_LIFECYCLE_CHECKLIST_DUE_ALERTS_GENERATE',
      resource: 'employee-lifecycle-checklists',
      details: {
        scannedCount: items.length,
        generatedCount,
        daysThreshold,
      },
    });

    return {
      success: true,
      scannedCount: items.length,
      generatedCount,
      daysThreshold,
    };
  }

  async findAll(query: ListEmployeeLifecycleChecklistsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeLifecycleChecklistWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      assignedToEmployeeId: query.assignedToEmployeeId,
      checklistType: query.checklistType,
      status: query.status,
      isActive: query.isActive,
      dueDate:
        query.dueDateFrom || query.dueDateTo
          ? {
              gte: query.dueDateFrom,
              lte: query.dueDateTo,
            }
          : undefined,
      OR: query.search
        ? [
            {
              title: {
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
      this.prisma.employeeLifecycleChecklist.count({ where }),
      this.prisma.employeeLifecycleChecklist.findMany({
        where,
        include: employeeLifecycleChecklistInclude,
        orderBy: [{ createdAt: 'desc' }],
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
    const lifecycleItem = await this.prisma.employeeLifecycleChecklist.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeLifecycleChecklistInclude,
    });

    if (!lifecycleItem) {
      throw new NotFoundException('Employee lifecycle checklist item not found');
    }

    return lifecycleItem;
  }

  async update(
    id: string,
    payload: UpdateEmployeeLifecycleChecklistDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureLifecycleChecklistExists(id);
    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    const resolvedAssignedToEmployeeId =
      payload.assignedToEmployeeId === undefined
        ? existing.assignedToEmployeeId
        : payload.assignedToEmployeeId;

    await this.employeesService.ensureEmployeeExistsAndActive(resolvedEmployeeId);
    if (resolvedAssignedToEmployeeId) {
      await this.employeesService.ensureEmployeeExistsAndActive(
        resolvedAssignedToEmployeeId,
      );
    }

    if (
      payload.dueDate !== undefined &&
      Number.isNaN(new Date(payload.dueDate).getTime())
    ) {
      throw new BadRequestException('dueDate is not valid');
    }

    const lifecycleItem = await this.prisma.employeeLifecycleChecklist.update({
      where: { id },
      data: {
        employeeId: payload.employeeId,
        checklistType: payload.checklistType,
        title: payload.title,
        assignedToEmployeeId: payload.assignedToEmployeeId,
        dueDate:
          payload.dueDate === undefined
            ? undefined
            : payload.dueDate
              ? new Date(payload.dueDate)
              : null,
        notes: payload.notes,
        isActive: payload.isActive,
        updatedById: actorUserId,
      },
      include: employeeLifecycleChecklistInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_LIFECYCLE_CHECKLIST_UPDATE',
      resource: 'employee-lifecycle-checklists',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    const assigneeChanged =
      lifecycleItem.assignedToEmployeeId !== existing.assignedToEmployeeId;
    if (assigneeChanged) {
      await this.notifyAssigneeAboutAssignment(lifecycleItem, actorUserId);
    }

    return lifecycleItem;
  }

  async start(id: string, actorUserId: string) {
    return this.transitionChecklist(
      id,
      EmployeeLifecycleChecklistStatus.IN_PROGRESS,
      actorUserId,
      'EMPLOYEE_LIFECYCLE_CHECKLIST_START',
    );
  }

  async complete(id: string, actorUserId: string) {
    return this.transitionChecklist(
      id,
      EmployeeLifecycleChecklistStatus.COMPLETED,
      actorUserId,
      'EMPLOYEE_LIFECYCLE_CHECKLIST_COMPLETE',
    );
  }

  async waive(id: string, actorUserId: string) {
    return this.transitionChecklist(
      id,
      EmployeeLifecycleChecklistStatus.WAIVED,
      actorUserId,
      'EMPLOYEE_LIFECYCLE_CHECKLIST_WAIVE',
    );
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureLifecycleChecklistExists(id);

    await this.prisma.employeeLifecycleChecklist.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_LIFECYCLE_CHECKLIST_DELETE',
      resource: 'employee-lifecycle-checklists',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async transitionChecklist(
    id: string,
    targetStatus: EmployeeLifecycleChecklistStatus,
    actorUserId: string,
    action: string,
  ) {
    const existing = await this.ensureLifecycleChecklistExists(id);
    this.ensureTransitionAllowed(existing.status, targetStatus);

    const lifecycleItem = await this.prisma.employeeLifecycleChecklist.update({
      where: { id },
      data: {
        status: targetStatus,
        completedAt:
          targetStatus === EmployeeLifecycleChecklistStatus.COMPLETED
            ? existing.completedAt ?? new Date()
            : null,
        updatedById: actorUserId,
      },
      include: employeeLifecycleChecklistInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action,
      resource: 'employee-lifecycle-checklists',
      resourceId: id,
      details: {
        fromStatus: existing.status,
        toStatus: targetStatus,
      },
    });

    await this.notifyStatusTransition(lifecycleItem, actorUserId, targetStatus);

    return lifecycleItem;
  }

  private async createLifecycleChecklistItem(
    payload: {
      employeeId: string;
      checklistType: EmployeeLifecycleChecklistType;
      title: string;
      assignedToEmployeeId?: string;
      dueDate?: Date | null;
      notes?: string;
      isActive?: boolean;
    },
    actorUserId: string,
  ) {
    return this.prisma.employeeLifecycleChecklist.create({
      data: {
        employeeId: payload.employeeId,
        checklistType: payload.checklistType,
        title: payload.title,
        status: EmployeeLifecycleChecklistStatus.PENDING,
        assignedToEmployeeId: payload.assignedToEmployeeId,
        dueDate: payload.dueDate ?? undefined,
        completedAt: null,
        notes: payload.notes,
        isActive: payload.isActive ?? true,
        createdById: actorUserId,
        updatedById: actorUserId,
      },
      include: employeeLifecycleChecklistInclude,
    });
  }

  private ensureTransitionAllowed(
    currentStatus: EmployeeLifecycleChecklistStatus,
    targetStatus: EmployeeLifecycleChecklistStatus,
  ) {
    if (targetStatus === EmployeeLifecycleChecklistStatus.IN_PROGRESS) {
      if (currentStatus !== EmployeeLifecycleChecklistStatus.PENDING) {
        throw new BadRequestException(
          'Only pending lifecycle checklist items can be started',
        );
      }

      return;
    }

    if (
      targetStatus === EmployeeLifecycleChecklistStatus.COMPLETED ||
      targetStatus === EmployeeLifecycleChecklistStatus.WAIVED
    ) {
      if (
        currentStatus !== EmployeeLifecycleChecklistStatus.PENDING &&
        currentStatus !== EmployeeLifecycleChecklistStatus.IN_PROGRESS
      ) {
        throw new BadRequestException(
          'Only pending or in-progress lifecycle checklist items can be transitioned',
        );
      }
    }
  }

  private async notifyAssigneeAboutAssignment(
    lifecycleItem: EmployeeLifecycleChecklistWithRelations,
    actorUserId: string,
  ) {
    if (!lifecycleItem.assignedToEmployeeId) {
      return;
    }

    const assigneeUser = await this.prisma.user.findFirst({
      where: {
        employeeId: lifecycleItem.assignedToEmployeeId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!assigneeUser || assigneeUser.id === actorUserId) {
      return;
    }

    await this.userNotificationsService.createForUser({
      userId: assigneeUser.id,
      title: LIFECYCLE_ASSIGNMENT_TITLE,
      message: `تم إسناد مهمة ${CHECKLIST_TYPE_LABELS[lifecycleItem.checklistType]} "${lifecycleItem.title}" الخاصة بالموظف ${lifecycleItem.employee.fullName} إليك.`,
      notificationType: UserNotificationType.ACTION_REQUIRED,
      resource: 'employee-lifecycle-checklists',
      resourceId: lifecycleItem.id,
      actionUrl: '/app/employee-lifecycle-checklists',
      triggeredByUserId: actorUserId,
    });
  }

  private async notifyStatusTransition(
    lifecycleItem: EmployeeLifecycleChecklistWithRelations,
    actorUserId: string,
    targetStatus: EmployeeLifecycleChecklistStatus,
  ) {
    const recipientUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        id: {
          not: actorUserId,
        },
        OR: [
          {
            employeeId: lifecycleItem.employeeId,
          },
          lifecycleItem.assignedToEmployeeId
            ? {
                employeeId: lifecycleItem.assignedToEmployeeId,
              }
            : undefined,
        ].filter(Boolean) as Prisma.UserWhereInput[],
      },
      select: {
        id: true,
      },
    });

    if (recipientUsers.length === 0) {
      return;
    }

    const title =
      targetStatus === EmployeeLifecycleChecklistStatus.COMPLETED
        ? LIFECYCLE_COMPLETED_TITLE
        : LIFECYCLE_WAIVED_TITLE;
    const message =
      targetStatus === EmployeeLifecycleChecklistStatus.COMPLETED
        ? `تم إكمال مهمة ${CHECKLIST_TYPE_LABELS[lifecycleItem.checklistType]} "${lifecycleItem.title}" الخاصة بالموظف ${lifecycleItem.employee.fullName}.`
        : `تم إعفاء مهمة ${CHECKLIST_TYPE_LABELS[lifecycleItem.checklistType]} "${lifecycleItem.title}" الخاصة بالموظف ${lifecycleItem.employee.fullName}.`;

    await this.userNotificationsService.createForUsers(
      recipientUsers.map((user) => ({
        userId: user.id,
        title,
        message,
        notificationType:
          targetStatus === EmployeeLifecycleChecklistStatus.COMPLETED
            ? UserNotificationType.SUCCESS
            : UserNotificationType.INFO,
        resource: 'employee-lifecycle-checklists',
        resourceId: lifecycleItem.id,
        actionUrl: '/app/employee-lifecycle-checklists',
        triggeredByUserId: actorUserId,
      })),
    );
  }

  private async resolveDueAlertRecipientIds(
    lifecycleItem: EmployeeLifecycleChecklistWithRelations,
    actorUserId: string,
  ) {
    const watcherIds = await this.findUsersWithPermission(
      'employee-lifecycle-checklists.notify-due',
      actorUserId,
    );

    const employeeLinkedUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        id: {
          not: actorUserId,
        },
        OR: [
          {
            employeeId: lifecycleItem.employeeId,
          },
          lifecycleItem.assignedToEmployeeId
            ? {
                employeeId: lifecycleItem.assignedToEmployeeId,
              }
            : undefined,
        ].filter(Boolean) as Prisma.UserWhereInput[],
      },
      select: {
        id: true,
      },
    });

    return Array.from(
      new Set([
        ...watcherIds,
        ...employeeLinkedUsers.map((user) => user.id),
      ]),
    );
  }

  private async findUsersWithPermission(
    permissionCode: string,
    excludedUserId?: string,
  ) {
    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        id: excludedUserId
          ? {
              not: excludedUserId,
            }
          : undefined,
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
                        code: permissionCode,
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
                  code: permissionCode,
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

  private async ensureLifecycleChecklistExists(id: string) {
    const lifecycleItem =
      await this.prisma.employeeLifecycleChecklist.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: employeeLifecycleChecklistInclude,
      });

    if (!lifecycleItem) {
      throw new NotFoundException('Employee lifecycle checklist item not found');
    }

    return lifecycleItem;
  }

  private calculateRemainingDays(dueDate: Date, fromDate: Date) {
    return Math.floor((dueDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
  }

  private toUtcDateOnly(value: Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private addDays(value: Date, days: number) {
    return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
