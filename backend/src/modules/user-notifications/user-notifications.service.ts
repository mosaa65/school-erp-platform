import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditStatus,
  Prisma,
  UserNotification,
  UserNotificationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ListUserNotificationsDto } from './dto/list-user-notifications.dto';
import { UpdateUserNotificationPreferencesDto } from './dto/update-user-notification-preferences.dto';

const userNotificationInclude = {
  triggeredByUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

const userNotificationPreferenceSelect = {
  userId: true,
  inAppEnabled: true,
  actionRequiredOnly: true,
  leaveNotificationsEnabled: true,
  contractNotificationsEnabled: true,
  documentNotificationsEnabled: true,
  lifecycleNotificationsEnabled: true,
  updatedAt: true,
} as const;

type UserNotificationPreferencesView = {
  userId: string;
  inAppEnabled: boolean;
  actionRequiredOnly: boolean;
  leaveNotificationsEnabled: boolean;
  contractNotificationsEnabled: boolean;
  documentNotificationsEnabled: boolean;
  lifecycleNotificationsEnabled: boolean;
  updatedAt: Date | null;
};

type CreateUserNotificationInput = {
  userId: string;
  title: string;
  message: string;
  notificationType?: UserNotificationType;
  resource?: string;
  resourceId?: string;
  actionUrl?: string;
  triggeredByUserId?: string | null;
};

@Injectable()
export class UserNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createForUser(input: CreateUserNotificationInput) {
    const normalizedInput = this.normalizeInput(input);
    const shouldSend = await this.shouldSendNotification(normalizedInput);

    if (!shouldSend) {
      return null;
    }

    try {
      const notification = await this.prisma.userNotification.create({
        data: {
          userId: normalizedInput.userId,
          title: normalizedInput.title,
          message: normalizedInput.message,
          notificationType: normalizedInput.notificationType ?? UserNotificationType.INFO,
          resource: normalizedInput.resource,
          resourceId: normalizedInput.resourceId,
          actionUrl: normalizedInput.actionUrl,
          triggeredByUserId: normalizedInput.triggeredByUserId ?? null,
        },
        include: userNotificationInclude,
      });

      await this.auditLogsService.record({
        actorUserId: normalizedInput.triggeredByUserId ?? undefined,
        action: 'USER_NOTIFICATION_CREATE',
        resource: 'user-notifications',
        resourceId: notification.id,
        details: {
          userId: notification.userId,
          notificationType: notification.notificationType,
          resource: notification.resource,
          resourceId: notification.resourceId,
        },
      });

      return notification;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId: normalizedInput.triggeredByUserId ?? undefined,
        action: 'USER_NOTIFICATION_CREATE_FAILED',
        resource: 'user-notifications',
        status: AuditStatus.FAILURE,
        details: {
          userId: normalizedInput.userId,
          notificationType: normalizedInput.notificationType ?? UserNotificationType.INFO,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async createForUsers(inputs: CreateUserNotificationInput[]) {
    const uniqueInputs = this.deduplicateInputs(inputs);

    if (uniqueInputs.length === 0) {
      return [];
    }

    const created = await Promise.all(
      uniqueInputs.map((input) => this.createForUser(input)),
    );

    return created.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
  }

  async findMine(query: ListUserNotificationsDto, actorUserId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UserNotificationWhereInput = {
      userId: actorUserId,
      deletedAt: null,
      notificationType: query.notificationType,
      isRead: query.isRead,
      OR: query.search
        ? [
            { title: { contains: query.search } },
            { message: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, unreadCount, items] = await this.prisma.$transaction([
      this.prisma.userNotification.count({ where }),
      this.prisma.userNotification.count({
        where: {
          userId: actorUserId,
          deletedAt: null,
          isRead: false,
        },
      }),
      this.prisma.userNotification.findMany({
        where,
        include: userNotificationInclude,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(actorUserId: string) {
    const unreadCount = await this.prisma.userNotification.count({
      where: {
        userId: actorUserId,
        deletedAt: null,
        isRead: false,
      },
    });

    return { unreadCount };
  }

  async getPreferences(actorUserId: string): Promise<UserNotificationPreferencesView> {
    const preferences = await (this.prisma as any).userNotificationPreference.findUnique({
      where: {
        userId: actorUserId,
      },
      select: userNotificationPreferenceSelect,
    });

    return this.toPreferencesView(actorUserId, preferences);
  }

  async updatePreferences(
    payload: UpdateUserNotificationPreferencesDto,
    actorUserId: string,
  ): Promise<UserNotificationPreferencesView> {
    const updated = await (this.prisma as any).userNotificationPreference.upsert({
      where: {
        userId: actorUserId,
      },
      create: {
        userId: actorUserId,
        inAppEnabled: payload.inAppEnabled ?? true,
        actionRequiredOnly: payload.actionRequiredOnly ?? false,
        leaveNotificationsEnabled: payload.leaveNotificationsEnabled ?? true,
        contractNotificationsEnabled:
          payload.contractNotificationsEnabled ?? true,
        documentNotificationsEnabled:
          payload.documentNotificationsEnabled ?? true,
        lifecycleNotificationsEnabled:
          payload.lifecycleNotificationsEnabled ?? true,
      },
      update: {
        inAppEnabled: payload.inAppEnabled,
        actionRequiredOnly: payload.actionRequiredOnly,
        leaveNotificationsEnabled: payload.leaveNotificationsEnabled,
        contractNotificationsEnabled: payload.contractNotificationsEnabled,
        documentNotificationsEnabled: payload.documentNotificationsEnabled,
        lifecycleNotificationsEnabled: payload.lifecycleNotificationsEnabled,
      },
      select: userNotificationPreferenceSelect,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_NOTIFICATION_PREFERENCES_UPDATE',
      resource: 'user-notifications',
      details: {
        inAppEnabled: updated.inAppEnabled,
        actionRequiredOnly: updated.actionRequiredOnly,
        leaveNotificationsEnabled: updated.leaveNotificationsEnabled,
        contractNotificationsEnabled: updated.contractNotificationsEnabled,
        documentNotificationsEnabled: updated.documentNotificationsEnabled,
        lifecycleNotificationsEnabled: updated.lifecycleNotificationsEnabled,
      },
    });

    return this.toPreferencesView(actorUserId, updated);
  }

  async markAsRead(id: string, actorUserId: string) {
    const notification = await this.ensureExistsForUser(id, actorUserId);

    if (notification.isRead) {
      return this.prisma.userNotification.findUniqueOrThrow({
        where: { id },
        include: userNotificationInclude,
      });
    }

    const updated = await this.prisma.userNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: userNotificationInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_NOTIFICATION_MARK_READ',
      resource: 'user-notifications',
      resourceId: id,
    });

    return updated;
  }

  async markAllAsRead(actorUserId: string) {
    const result = await this.prisma.userNotification.updateMany({
      where: {
        userId: actorUserId,
        deletedAt: null,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_NOTIFICATION_MARK_ALL_READ',
      resource: 'user-notifications',
      details: {
        count: result.count,
      },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureExistsForUser(id, actorUserId);

    await this.prisma.userNotification.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_NOTIFICATION_DELETE',
      resource: 'user-notifications',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureExistsForUser(
    id: string,
    actorUserId: string,
  ): Promise<UserNotification> {
    const notification = await this.prisma.userNotification.findFirst({
      where: {
        id,
        userId: actorUserId,
        deletedAt: null,
      },
    });

    if (!notification) {
      throw new NotFoundException('User notification not found');
    }

    return notification;
  }

  private deduplicateInputs(inputs: CreateUserNotificationInput[]) {
    const seen = new Set<string>();

    return inputs.filter((input) => {
      const normalized = this.normalizeInput(input);
      const key = [
        normalized.userId,
        normalized.title,
        normalized.message,
        normalized.notificationType ?? UserNotificationType.INFO,
        normalized.resource ?? '',
        normalized.resourceId ?? '',
      ].join('|');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private normalizeInput(input: CreateUserNotificationInput) {
    return {
      ...input,
      title: input.title.trim(),
      message: input.message.trim(),
      resource: input.resource?.trim() || undefined,
      resourceId: input.resourceId?.trim() || undefined,
      actionUrl: input.actionUrl?.trim() || undefined,
      triggeredByUserId: input.triggeredByUserId?.trim() || undefined,
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  private async shouldSendNotification(input: CreateUserNotificationInput) {
    const preferences = await (this.prisma as any).userNotificationPreference.findUnique({
      where: {
        userId: input.userId,
      },
      select: userNotificationPreferenceSelect,
    });

    const resolved = this.toPreferencesView(input.userId, preferences);
    if (!resolved.inAppEnabled) {
      return false;
    }

    if (
      resolved.actionRequiredOnly &&
      (input.notificationType ?? UserNotificationType.INFO) !==
        UserNotificationType.ACTION_REQUIRED
    ) {
      return false;
    }

    switch (input.resource) {
      case 'employee-leaves':
        return resolved.leaveNotificationsEnabled;
      case 'employee-contracts':
        return resolved.contractNotificationsEnabled;
      case 'employee-documents':
        return resolved.documentNotificationsEnabled;
      case 'employee-lifecycle-checklists':
        return resolved.lifecycleNotificationsEnabled;
      default:
        return true;
    }
  }

  private toPreferencesView(
    userId: string,
    preferences:
      | {
          userId: string;
          inAppEnabled: boolean;
          actionRequiredOnly: boolean;
          leaveNotificationsEnabled: boolean;
          contractNotificationsEnabled: boolean;
          documentNotificationsEnabled: boolean;
          lifecycleNotificationsEnabled: boolean;
          updatedAt: Date;
        }
      | null,
  ): UserNotificationPreferencesView {
    if (preferences) {
      return {
        ...preferences,
      };
    }

    return {
      userId,
      inAppEnabled: true,
      actionRequiredOnly: false,
      leaveNotificationsEnabled: true,
      contractNotificationsEnabled: true,
      documentNotificationsEnabled: true,
      lifecycleNotificationsEnabled: true,
      updatedAt: null,
    };
  }
}
