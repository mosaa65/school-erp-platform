import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditStatus, Prisma, SystemSettingType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getRequestContext,
  mergeRequestContextIntoDetails,
} from '../../common/request-context/request-context';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import {
  AuditRollbackMode,
  RollbackAuditLogDto,
} from './dto/rollback-audit-log.dto';
import { UpdateAuditLogRetentionPolicyDto } from './dto/update-audit-log-retention-policy.dto';

const AUDIT_LOG_DOMAIN_RESOURCE_KEYWORDS: Record<string, string[]> = {
  attendance: ['attendance', 'absen', 'presence'],
  grades: ['grade', 'grading', 'assessment', 'exam', 'score', 'subject'],
  fees: ['fee', 'invoice', 'installment', 'billing', 'payment', 'finance'],
  students: ['student', 'enrollment', 'guardian'],
  teachers: ['teacher', 'employee', 'staff'],
  permissions: ['permission', 'role', 'auth'],
  notifications: ['notification', 'reminder'],
  system: ['setting', 'audit', 'catalog'],
};

const AUDIT_LOG_ACTION_TYPE_ALIASES: Record<string, string[]> = {
  REJECT: ['REJECT', 'UNAPPROVE', 'REVOKE'],
};

const AUDIT_LOG_ACTOR_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  userRoles: {
    where: {
      deletedAt: null,
    },
    select: {
      role: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

const AUDIT_TIMELINE_LIMIT = 10;
const AUDIT_LOG_RETENTION_SETTING_KEY = 'audit_logs_retention_days';
const AUDIT_LOG_RETENTION_MIN_DAYS = 7;
const AUDIT_LOG_RETENTION_MAX_DAYS = 3650;
const AUDIT_LOG_RETENTION_DEFAULT_DAYS = 365;
const AUDIT_LOG_RETENTION_CLEANUP_DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const AUDIT_LOG_RETENTION_CLEANUP_MIN_INTERVAL_MS = 60 * 1000;
const AUDIT_LOG_RETENTION_DELETE_BATCH_SIZE = 500;
const AUDIT_LOG_RETENTION_DELETE_MAX_BATCHES = 20;

const AUDIT_ROLLBACK_BLOCKED_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'createdById',
  'updatedById',
  'passwordHash',
  'occurredAt',
]);

const AUDIT_ROLLBACK_RESOURCE_MODEL_MAP: Record<
  string,
  { delegate: string; idType: 'string' | 'number' | 'bigint'; whereKey?: string }
> = {
  users: { delegate: 'user', idType: 'string' },
  roles: { delegate: 'role', idType: 'string' },
  permissions: { delegate: 'permission', idType: 'string' },
  students: { delegate: 'student', idType: 'string' },
  employees: { delegate: 'employee', idType: 'string' },
  guardians: { delegate: 'guardian', idType: 'string' },
  'student-enrollments': { delegate: 'studentEnrollment', idType: 'string' },
  'student-attendance': { delegate: 'studentAttendance', idType: 'string' },
  'student-books': { delegate: 'studentBook', idType: 'string' },
  'parent-notifications': { delegate: 'parentNotification', idType: 'string' },
  'academic-years': { delegate: 'academicYear', idType: 'string' },
  'academic-terms': { delegate: 'academicTerm', idType: 'string' },
  'academic-months': { delegate: 'academicMonth', idType: 'string' },
  'grade-levels': { delegate: 'gradeLevel', idType: 'string' },
  sections: { delegate: 'section', idType: 'string' },
  subjects: { delegate: 'subject', idType: 'string' },
  homeworks: { delegate: 'homework', idType: 'string' },
  'global-settings': { delegate: 'globalSetting', idType: 'string' },
  'system-settings': { delegate: 'systemSetting', idType: 'number' },
};

export interface RecordAuditLogInput {
  actorUserId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  status?: AuditStatus;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  createdById?: string;
  updatedById?: string;
}

export interface AuditLogTimelineItem {
  id: string;
  actorUserId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  status: AuditStatus;
  ipAddress: string | null;
  userAgent: string | null;
  details: Prisma.JsonValue | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  actorUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userRoles: Array<{
      role: {
        id: string;
        code: string;
        name: string;
      };
    }>;
  } | null;
  timelineOrder: number;
  isLatest: boolean;
}

export interface AuditLogTimelineMeta {
  totalChanges: number;
  previousChanges: number;
  displayedChanges: number;
  hasPreviousChanges: boolean;
}

export interface RollbackAuditLogResult {
  success: true;
  mode: AuditRollbackMode;
  anchorAuditLogId: string;
  targetAuditLogId: string;
  rollbackAuditLogId: string;
  resource: string;
  resourceId: string;
  rolledBackAt: string;
  appliedFields: string[];
}

export interface AuditLogRetentionPolicy {
  settingKey: string;
  retentionDays: number | null;
  autoDeleteEnabled: boolean;
  minRetentionDays: number;
  maxRetentionDays: number;
  recommendedRetentionDays: number;
  cleanupIntervalMinutes: number;
  updatedAt: string | null;
}

type AuditLogListEntity = Prisma.AuditLogGetPayload<{
  include: {
    actorUser: {
      select: typeof AUDIT_LOG_ACTOR_USER_SELECT;
    };
  };
}>;

@Injectable()
export class AuditLogsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditLogsService.name);
  private retentionCleanupTimer: NodeJS.Timeout | null = null;
  private retentionCleanupRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  onModuleInit() {
    if (!this.isRetentionCleanupEnabled()) {
      return;
    }

    const cleanupIntervalMs = this.resolveRetentionCleanupInterval();
    this.retentionCleanupTimer = setInterval(() => {
      void this.runRetentionCleanupCycle();
    }, cleanupIntervalMs);

    void this.runRetentionCleanupCycle();
    this.logger.log(
      `Audit log retention cleanup scheduler started (interval ${cleanupIntervalMs}ms).`,
    );
  }

  onModuleDestroy() {
    if (!this.retentionCleanupTimer) {
      return;
    }

    clearInterval(this.retentionCleanupTimer);
    this.retentionCleanupTimer = null;
  }

  async createManual(
    createAuditLogDto: CreateAuditLogDto,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.record({
      actorUserId,
      action: createAuditLogDto.action,
      resource: createAuditLogDto.resource,
      resourceId: createAuditLogDto.resourceId,
      status: createAuditLogDto.status ?? AuditStatus.SUCCESS,
      details: createAuditLogDto.details as Prisma.InputJsonValue | undefined,
      ipAddress,
      userAgent,
      createdById: actorUserId,
      updatedById: actorUserId,
    });
  }

  async record(input: RecordAuditLogInput) {
    const requestContext = getRequestContext();
    const details = mergeRequestContextIntoDetails(input.details);

    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        status: input.status ?? AuditStatus.SUCCESS,
        details,
        ipAddress: input.ipAddress ?? requestContext?.ip,
        userAgent: input.userAgent ?? requestContext?.userAgent,
        createdById: input.createdById ?? input.actorUserId,
        updatedById: input.updatedById ?? input.actorUserId,
      },
    });
  }

  async findAll(query: ListAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = this.buildWhereClause(query);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: {
          occurredAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actorUser: {
            select: AUDIT_LOG_ACTOR_USER_SELECT,
          },
        },
      }),
    ]);

    const timelineCountMap = await this.buildTimelineCountMap(items);
    const enrichedItems = items.map((item) => {
      const timelineMeta = this.buildTimelineMetaForItem(item, timelineCountMap);
      return {
        ...item,
        timeline: timelineMeta,
      };
    });

    return {
      data: enrichedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const auditLog = await this.prisma.auditLog.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        actorUser: {
          select: AUDIT_LOG_ACTOR_USER_SELECT,
        },
      },
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log not found');
    }

    return auditLog;
  }

  async findTimelineByAuditLogId(id: string, limit?: number) {
    const resolvedLimit = this.resolveTimelineLimit(limit);

    const anchorLog = await this.prisma.auditLog.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        resource: true,
        resourceId: true,
      },
    });

    if (!anchorLog) {
      throw new NotFoundException('Audit log not found');
    }

    if (!anchorLog.resourceId) {
      const currentItem = await this.prisma.auditLog.findFirst({
        where: {
          id: anchorLog.id,
          deletedAt: null,
        },
        include: {
          actorUser: {
            select: AUDIT_LOG_ACTOR_USER_SELECT,
          },
        },
      });

      if (!currentItem) {
        throw new NotFoundException('Audit log not found');
      }

      return {
        resource: anchorLog.resource,
        resourceId: null,
        anchorAuditLogId: anchorLog.id,
        limit: resolvedLimit,
        total: 1,
        data: [
          {
            ...currentItem,
            timelineOrder: 1,
            isLatest: true,
          } satisfies AuditLogTimelineItem,
        ],
      };
    }

    const timelineWhere: Prisma.AuditLogWhereInput = {
      deletedAt: null,
      resource: anchorLog.resource,
      resourceId: anchorLog.resourceId,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({
        where: timelineWhere,
      }),
      this.prisma.auditLog.findMany({
        where: timelineWhere,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: resolvedLimit,
        include: {
          actorUser: {
            select: AUDIT_LOG_ACTOR_USER_SELECT,
          },
        },
      }),
    ]);

    return {
      resource: anchorLog.resource,
      resourceId: anchorLog.resourceId,
      anchorAuditLogId: anchorLog.id,
      limit: resolvedLimit,
      total,
      data: items.map((item, index) => ({
        ...item,
        timelineOrder: index + 1,
        isLatest: index === 0,
      })),
    };
  }

  async rollbackFromTimeline(
    id: string,
    actorUserId: string,
    payload: RollbackAuditLogDto = {},
  ): Promise<RollbackAuditLogResult> {
    const mode = payload.mode ?? AuditRollbackMode.PREVIOUS;
    const timeline = await this.findTimelineByAuditLogId(id, AUDIT_TIMELINE_LIMIT);

    if (!timeline.resourceId) {
      throw new BadRequestException(
        'Rollback requires a resourceId to identify the target record.',
      );
    }

    const targetItem = this.resolveRollbackTarget({
      mode,
      targetAuditLogId: payload.targetAuditLogId,
      timelineItems: timeline.data,
    });
    const rollbackSnapshot = this.extractRollbackSnapshotFromDetails(
      targetItem.details,
    );

    if (!rollbackSnapshot) {
      throw new BadRequestException(
        'No usable previous state found in audit details for rollback.',
      );
    }

    const resourceResolver = this.resolveRollbackResource(timeline.resource);
    const prismaDelegate = (this.prisma as unknown as Record<string, unknown>)[
      resourceResolver.delegate
    ] as
      | {
          findUnique: (args: {
            where: Record<string, string | number | bigint>;
          }) => Promise<Record<string, unknown> | null>;
          update: (args: {
            where: Record<string, string | number | bigint>;
            data: Record<string, unknown>;
          }) => Promise<Record<string, unknown>>;
        }
      | undefined;

    if (!prismaDelegate?.findUnique || !prismaDelegate?.update) {
      throw new BadRequestException(
        `Rollback is not supported for resource "${timeline.resource}" yet.`,
      );
    }

    const whereKey = resourceResolver.whereKey ?? 'id';
    const parsedResourceId = this.parseRollbackResourceId(
      timeline.resourceId,
      resourceResolver.idType,
    );
    const where = {
      [whereKey]: parsedResourceId,
    } satisfies Record<string, string | number | bigint>;

    const rollbackPatch = this.extractRollbackPatchData(
      rollbackSnapshot,
      whereKey,
    );
    const appliedFields = Object.keys(rollbackPatch);

    if (appliedFields.length === 0) {
      throw new BadRequestException(
        'Rollback snapshot does not contain editable scalar fields.',
      );
    }

    let currentEntity: Record<string, unknown> | null = null;
    let updatedEntity: Record<string, unknown> | null = null;

    try {
      currentEntity = await prismaDelegate.findUnique({
        where,
      });

      if (!currentEntity) {
        throw new NotFoundException('Target resource record not found.');
      }

      updatedEntity = await prismaDelegate.update({
        where,
        data: rollbackPatch as Record<string, unknown>,
      });
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      const rollbackPatchSnapshot = rollbackPatch;
      try {
        await this.record({
          actorUserId,
          action: 'ROLLBACK',
          resource: timeline.resource,
          resourceId: timeline.resourceId,
          status: AuditStatus.FAILURE,
          details: {
            description: 'Rollback attempt failed',
            rollbackMode: mode,
            anchorAuditLogId: id,
            targetAuditLogId: targetItem.id,
            rollbackPatch: rollbackPatchSnapshot as Prisma.InputJsonObject,
            errorMessage,
          } satisfies Prisma.InputJsonObject,
          createdById: actorUserId,
          updatedById: actorUserId,
        });
      } catch {
        // Do not override the primary rollback failure because audit logging failed.
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to rollback the target resource: ${errorMessage}`,
      );
    }

    const beforeSnapshot = this.toInputJsonValue(currentEntity) ?? null;
    const afterSnapshot = this.toInputJsonValue(updatedEntity) ?? null;

    const rollbackAuditLog = await this.record({
      actorUserId,
      action: 'ROLLBACK',
      resource: timeline.resource,
      resourceId: timeline.resourceId,
      status: AuditStatus.SUCCESS,
      details: {
        description: 'Rollback completed successfully',
        rollbackMode: mode,
        anchorAuditLogId: id,
        targetAuditLogId: targetItem.id,
        rollbackPatch: rollbackPatch as Prisma.InputJsonObject,
        before: beforeSnapshot,
        after: afterSnapshot,
      } satisfies Prisma.InputJsonObject,
      createdById: actorUserId,
      updatedById: actorUserId,
    });

    return {
      success: true,
      mode,
      anchorAuditLogId: id,
      targetAuditLogId: targetItem.id,
      rollbackAuditLogId: rollbackAuditLog.id,
      resource: timeline.resource,
      resourceId: timeline.resourceId,
      rolledBackAt: rollbackAuditLog.occurredAt.toISOString(),
      appliedFields,
    };
  }

  async getRetentionPolicy(): Promise<AuditLogRetentionPolicy> {
    const setting = await this.prisma.systemSetting.findFirst({
      where: {
        settingKey: AUDIT_LOG_RETENTION_SETTING_KEY,
        deletedAt: null,
      },
      select: {
        settingValue: true,
        updatedAt: true,
      },
    });

    const retentionDays = this.parseRetentionDays(setting?.settingValue);
    return this.buildRetentionPolicyResponse(retentionDays, setting?.updatedAt ?? null);
  }

  async updateRetentionPolicy(
    payload: UpdateAuditLogRetentionPolicyDto,
    actorUserId: string,
  ): Promise<AuditLogRetentionPolicy> {
    const previousSetting = await this.prisma.systemSetting.findFirst({
      where: {
        settingKey: AUDIT_LOG_RETENTION_SETTING_KEY,
        deletedAt: null,
      },
      select: {
        settingValue: true,
      },
    });
    const previousRetentionDays = this.parseRetentionDays(
      previousSetting?.settingValue,
    );

    const retentionDays = payload.retentionDays;
    const settingValue = retentionDays === null ? null : String(retentionDays);

    const savedSetting = await this.prisma.systemSetting.upsert({
      where: {
        settingKey: AUDIT_LOG_RETENTION_SETTING_KEY,
      },
      create: {
        settingKey: AUDIT_LOG_RETENTION_SETTING_KEY,
        settingValue,
        settingType: SystemSettingType.NUMBER,
        category: 'audit',
        description: 'Audit log automatic cleanup retention in days',
        isEditable: true,
        createdById: actorUserId,
        updatedById: actorUserId,
      },
      update: {
        settingValue,
        settingType: SystemSettingType.NUMBER,
        category: 'audit',
        description: 'Audit log automatic cleanup retention in days',
        isEditable: true,
        deletedAt: null,
        updatedById: actorUserId,
      },
      select: {
        id: true,
        settingValue: true,
        updatedAt: true,
      },
    });

    const currentRetentionDays = this.parseRetentionDays(savedSetting.settingValue);

    await this.record({
      actorUserId,
      action: 'AUDIT_LOG_RETENTION_POLICY_UPDATE',
      resource: 'audit-logs',
      resourceId: String(savedSetting.id),
      details: {
        settingKey: AUDIT_LOG_RETENTION_SETTING_KEY,
        beforeRetentionDays: previousRetentionDays,
        afterRetentionDays: currentRetentionDays,
        autoDeleteEnabled: currentRetentionDays !== null,
      } satisfies Prisma.InputJsonObject,
      createdById: actorUserId,
      updatedById: actorUserId,
    });

    if (currentRetentionDays !== null) {
      void this.runRetentionCleanupCycle();
    }

    return this.buildRetentionPolicyResponse(
      currentRetentionDays,
      savedSetting.updatedAt,
    );
  }

  async remove(id: string, actorUserId: string) {
    const result = await this.prisma.auditLog.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    if (!result.count) {
      throw new NotFoundException('Audit log not found');
    }

    return {
      success: true,
      id,
    };
  }

  private buildWhereClause(query: ListAuditLogsDto): Prisma.AuditLogWhereInput {
    const andConditions: Prisma.AuditLogWhereInput[] = [
      {
        deletedAt: null,
      },
    ];

    if (query.resource) {
      andConditions.push({
        resource: query.resource,
      });
    }

    if (query.action) {
      andConditions.push({
        action: query.action,
      });
    }

    if (query.status) {
      andConditions.push({
        status: query.status,
      });
    }

    if (query.actorUserId) {
      andConditions.push({
        actorUserId: query.actorUserId,
      });
    }

    if (query.from || query.to) {
      andConditions.push({
        occurredAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      });
    }

    const normalizedActionType = query.actionType?.trim().toUpperCase();
    if (normalizedActionType) {
      const actionVariants =
        AUDIT_LOG_ACTION_TYPE_ALIASES[normalizedActionType] ?? [
          normalizedActionType,
        ];
      andConditions.push({
        OR: actionVariants.flatMap((actionVariant) => [
          {
            action: actionVariant,
          },
          {
            action: {
              endsWith: `_${actionVariant}`,
            },
          },
        ]),
      });
    }

    const normalizedDomain = query.domain?.trim().toLowerCase();
    const domainKeywords = normalizedDomain
      ? AUDIT_LOG_DOMAIN_RESOURCE_KEYWORDS[normalizedDomain] ?? []
      : [];
    if (domainKeywords.length > 0) {
      andConditions.push({
        OR: domainKeywords.map((keyword) => ({
          resource: {
            contains: keyword,
          },
        })),
      });
    }

    const userSearch = query.user?.trim();
    if (userSearch) {
      andConditions.push({
        OR: [
          {
            actorUserId: userSearch,
          },
          {
            actorUserId: {
              contains: userSearch,
            },
          },
          {
            actorUser: {
              is: {
                email: {
                  contains: userSearch,
                },
              },
            },
          },
          {
            actorUser: {
              is: {
                firstName: {
                  contains: userSearch,
                },
              },
            },
          },
          {
            actorUser: {
              is: {
                lastName: {
                  contains: userSearch,
                },
              },
            },
          },
        ],
      });
    }

    const textSearch = query.search?.trim();
    if (textSearch) {
      andConditions.push({
        OR: [
          {
            action: {
              contains: textSearch,
            },
          },
          {
            resource: {
              contains: textSearch,
            },
          },
          {
            resourceId: {
              contains: textSearch,
            },
          },
          {
            ipAddress: {
              contains: textSearch,
            },
          },
          {
            userAgent: {
              contains: textSearch,
            },
          },
          {
            actorUserId: {
              contains: textSearch,
            },
          },
          {
            actorUser: {
              is: {
                email: {
                  contains: textSearch,
                },
              },
            },
          },
          {
            actorUser: {
              is: {
                firstName: {
                  contains: textSearch,
                },
              },
            },
          },
          {
            actorUser: {
              is: {
                lastName: {
                  contains: textSearch,
                },
              },
            },
          },
        ],
      });
    }

    return {
      AND: andConditions,
    };
  }

  private async buildTimelineCountMap(items: AuditLogListEntity[]) {
    const uniqueGroups = new Map<string, { resource: string; resourceId: string }>();
    for (const item of items) {
      if (!item.resourceId) {
        continue;
      }

      const groupKey = this.buildTimelineGroupKey(item.resource, item.resourceId);
      if (!uniqueGroups.has(groupKey)) {
        uniqueGroups.set(groupKey, {
          resource: item.resource,
          resourceId: item.resourceId,
        });
      }
    }

    if (uniqueGroups.size === 0) {
      return new Map<string, number>();
    }

    const groupedCounts = await this.prisma.auditLog.groupBy({
      by: ['resource', 'resourceId'],
      where: {
        deletedAt: null,
        OR: Array.from(uniqueGroups.values()).map((group) => ({
          resource: group.resource,
          resourceId: group.resourceId,
        })),
      },
      _count: {
        _all: true,
      },
    });

    const countMap = new Map<string, number>();
    for (const groupedItem of groupedCounts) {
      if (!groupedItem.resourceId) {
        continue;
      }

      const key = this.buildTimelineGroupKey(
        groupedItem.resource,
        groupedItem.resourceId,
      );
      countMap.set(key, groupedItem._count._all);
    }

    return countMap;
  }

  private buildTimelineMetaForItem(
    item: AuditLogListEntity,
    timelineCountMap: Map<string, number>,
  ): AuditLogTimelineMeta {
    const defaultMeta: AuditLogTimelineMeta = {
      totalChanges: 1,
      previousChanges: 0,
      displayedChanges: 1,
      hasPreviousChanges: false,
    };

    if (!item.resourceId) {
      return defaultMeta;
    }

    const groupKey = this.buildTimelineGroupKey(item.resource, item.resourceId);
    const totalChanges = timelineCountMap.get(groupKey) ?? 1;
    const previousChanges = Math.max(totalChanges - 1, 0);
    const displayedChanges = Math.min(totalChanges, AUDIT_TIMELINE_LIMIT);

    return {
      totalChanges,
      previousChanges,
      displayedChanges,
      hasPreviousChanges: previousChanges > 0,
    };
  }

  private buildTimelineGroupKey(resource: string, resourceId: string) {
    return `${resource}::${resourceId}`;
  }

  private resolveRollbackTarget(input: {
    mode: AuditRollbackMode;
    targetAuditLogId?: string;
    timelineItems: AuditLogTimelineItem[];
  }): AuditLogTimelineItem {
    const { mode, targetAuditLogId, timelineItems } = input;

    if (timelineItems.length === 0) {
      throw new NotFoundException('No timeline items were found.');
    }

    if (mode === AuditRollbackMode.PREVIOUS) {
      const previousItem = timelineItems[1];
      if (!previousItem) {
        throw new BadRequestException(
          'No previous change available to rollback to.',
        );
      }

      return previousItem;
    }

    if (!targetAuditLogId) {
      throw new BadRequestException(
        'targetAuditLogId is required for TARGET rollback mode.',
      );
    }

    const targetItem = timelineItems.find((item) => item.id === targetAuditLogId);
    if (!targetItem) {
      throw new BadRequestException(
        'The selected rollback target is not in the latest timeline window (last 10 changes).',
      );
    }

    return targetItem;
  }

  private extractRollbackSnapshotFromDetails(
    details: Prisma.JsonValue | null,
  ): Record<string, unknown> | null {
    const detailsRecord = this.toRecord(details);
    if (!detailsRecord) {
      return null;
    }

    const afterRecord = this.pickFirstRecord(detailsRecord, [
      'after',
      'afterData',
      'current',
      'newValue',
      'new',
      'dataAfter',
    ]);
    if (afterRecord) {
      return afterRecord;
    }

    return this.pickFirstRecord(detailsRecord, [
      'before',
      'beforeData',
      'previous',
      'oldValue',
      'old',
      'dataBefore',
    ]);
  }

  private extractRollbackPatchData(
    snapshot: Record<string, unknown>,
    whereKey: string,
  ): Record<string, Prisma.InputJsonValue | null> {
    const patch: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, value] of Object.entries(snapshot)) {
      if (AUDIT_ROLLBACK_BLOCKED_FIELDS.has(key) || key === whereKey) {
        continue;
      }

      if (!this.isAllowedRollbackValue(value)) {
        continue;
      }

      patch[key] = value as Prisma.InputJsonValue;
    }

    return patch;
  }

  private resolveRollbackResource(resource: string): {
    delegate: string;
    idType: 'string' | 'number' | 'bigint';
    whereKey?: string;
  } {
    const normalized = resource.trim().toLowerCase();
    const mappedResource = AUDIT_ROLLBACK_RESOURCE_MODEL_MAP[normalized];
    if (mappedResource) {
      return mappedResource;
    }

    const tailResourceSegment = normalized.split('/').filter(Boolean).pop();
    if (tailResourceSegment) {
      const guessedDelegate = this.toPrismaDelegateName(tailResourceSegment);
      const delegateValue = (this.prisma as unknown as Record<string, unknown>)[
        guessedDelegate
      ] as { update?: unknown } | undefined;
      if (delegateValue?.update) {
        return {
          delegate: guessedDelegate,
          idType: 'string',
        };
      }
    }

    throw new BadRequestException(
      `Rollback is not supported for resource "${resource}" yet.`,
    );
  }

  private parseRollbackResourceId(
    value: string,
    idType: 'string' | 'number' | 'bigint',
  ): string | number | bigint {
    if (idType === 'string') {
      return value;
    }

    if (idType === 'number') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        throw new BadRequestException(
          `Resource ID "${value}" is not a valid integer ID.`,
        );
      }

      return parsed;
    }

    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(
        `Resource ID "${value}" is not a valid bigint ID.`,
      );
    }
  }

  private toPrismaDelegateName(segment: string): string {
    const normalized = segment
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const singular = normalized.endsWith('s')
      ? normalized.slice(0, -1)
      : normalized;
    const parts = singular.split('-').filter(Boolean);

    return parts
      .map((part, index) =>
        index === 0
          ? part.toLowerCase()
          : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`,
      )
      .join('');
  }

  private pickFirstRecord(
    source: Record<string, unknown>,
    keys: string[],
  ): Record<string, unknown> | null {
    for (const key of keys) {
      const value = source[key];
      const asRecord = this.toRecord(value);
      if (asRecord) {
        return asRecord;
      }
    }

    return null;
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private isAllowedRollbackValue(value: unknown): boolean {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    return Array.isArray(value) || this.toRecord(value) !== null;
  }

  private buildRetentionPolicyResponse(
    retentionDays: number | null,
    updatedAt: Date | null,
  ): AuditLogRetentionPolicy {
    return {
      settingKey: AUDIT_LOG_RETENTION_SETTING_KEY,
      retentionDays,
      autoDeleteEnabled: retentionDays !== null,
      minRetentionDays: AUDIT_LOG_RETENTION_MIN_DAYS,
      maxRetentionDays: AUDIT_LOG_RETENTION_MAX_DAYS,
      recommendedRetentionDays: AUDIT_LOG_RETENTION_DEFAULT_DAYS,
      cleanupIntervalMinutes: Math.floor(
        this.resolveRetentionCleanupInterval() / (60 * 1000),
      ),
      updatedAt: updatedAt ? updatedAt.toISOString() : null,
    };
  }

  private parseRetentionDays(
    value: string | null | undefined,
  ): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      return null;
    }

    if (
      parsed < AUDIT_LOG_RETENTION_MIN_DAYS ||
      parsed > AUDIT_LOG_RETENTION_MAX_DAYS
    ) {
      return null;
    }

    return parsed;
  }

  private isRetentionCleanupEnabled(): boolean {
    const explicit = this.configService?.get<string>(
      'AUDIT_LOG_RETENTION_CLEANUP_ENABLED',
    );
    const parsedExplicit = this.parseBooleanConfig(explicit);
    if (parsedExplicit !== null) {
      return parsedExplicit;
    }

    return process.env.NODE_ENV !== 'test';
  }

  private parseBooleanConfig(value: string | undefined): boolean | null {
    if (value === undefined) {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }

    return null;
  }

  private resolveRetentionCleanupInterval(): number {
    const configured = Number(
      this.configService?.get<string>(
        'AUDIT_LOG_RETENTION_CLEANUP_INTERVAL_MS',
      ),
    );

    if (
      Number.isFinite(configured) &&
      configured >= AUDIT_LOG_RETENTION_CLEANUP_MIN_INTERVAL_MS
    ) {
      return configured;
    }

    return AUDIT_LOG_RETENTION_CLEANUP_DEFAULT_INTERVAL_MS;
  }

  private async runRetentionCleanupCycle() {
    if (this.retentionCleanupRunning) {
      return;
    }

    this.retentionCleanupRunning = true;
    try {
      const retentionDays = await this.loadConfiguredRetentionDays();
      if (retentionDays === null) {
        return;
      }

      const result = await this.purgeExpiredAuditLogs(retentionDays);
      if (result.deletedCount > 0) {
        this.logger.log(
          `Deleted ${result.deletedCount} audit logs older than ${retentionDays} days (cutoff ${result.cutoff.toISOString()}).`,
        );
      }
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(`Audit retention cleanup failed: ${message}`);
    } finally {
      this.retentionCleanupRunning = false;
    }
  }

  private async loadConfiguredRetentionDays(): Promise<number | null> {
    const setting = await this.prisma.systemSetting.findFirst({
      where: {
        settingKey: AUDIT_LOG_RETENTION_SETTING_KEY,
        deletedAt: null,
      },
      select: {
        settingValue: true,
      },
    });

    return this.parseRetentionDays(setting?.settingValue);
  }

  private async purgeExpiredAuditLogs(
    retentionDays: number,
  ): Promise<{ deletedCount: number; cutoff: Date }> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (
      let batchIndex = 0;
      batchIndex < AUDIT_LOG_RETENTION_DELETE_MAX_BATCHES;
      batchIndex += 1
    ) {
      const expiredRows = await this.prisma.auditLog.findMany({
        where: {
          deletedAt: null,
          occurredAt: {
            lt: cutoff,
          },
        },
        select: {
          id: true,
        },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        take: AUDIT_LOG_RETENTION_DELETE_BATCH_SIZE,
      });

      if (expiredRows.length === 0) {
        break;
      }

      const batchDeleteResult = await this.prisma.auditLog.deleteMany({
        where: {
          id: {
            in: expiredRows.map((item) => item.id),
          },
        },
      });
      deletedCount += batchDeleteResult.count;

      if (expiredRows.length < AUDIT_LOG_RETENTION_DELETE_BATCH_SIZE) {
        break;
      }
    }

    return {
      deletedCount,
      cutoff,
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown rollback failure';
  }

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
      return undefined;
    }
  }

  private resolveTimelineLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) {
      return AUDIT_TIMELINE_LIMIT;
    }

    if (limit < 1) {
      return 1;
    }

    return Math.min(limit, AUDIT_TIMELINE_LIMIT);
  }
}
