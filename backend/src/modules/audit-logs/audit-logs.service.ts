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
const AUDIT_LOG_RETENTION_SOFT_DELETE_GRACE_DAYS = 30;
const AUDIT_LOG_RETENTION_ROLLBACK_PROTECTION_EXTRA_DAYS = 30;

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
  branches: { delegate: 'branch', idType: 'number' },
  budgets: { delegate: 'budget', idType: 'number' },
  'chart-of-accounts': { delegate: 'chartOfAccount', idType: 'number' },
  currencies: { delegate: 'currency', idType: 'number' },
  'currency-exchange-rates': { delegate: 'currencyExchangeRate', idType: 'number' },
  'fiscal-years': { delegate: 'fiscalYear', idType: 'number' },
  'fiscal-periods': { delegate: 'fiscalPeriod', idType: 'number' },
  'cost-centers': { delegate: 'costCenter', idType: 'number' },
  expenses: { delegate: 'expense', idType: 'number' },
  'fee-structures': { delegate: 'feeStructure', idType: 'number' },
  'financial-categories': { delegate: 'financialCategory', idType: 'number' },
  'financial-funds': { delegate: 'financialFund', idType: 'number' },
  'discount-rules': { delegate: 'discountRule', idType: 'number' },
  'payment-gateways': { delegate: 'paymentGateway', idType: 'number' },
  'tax-configurations': { delegate: 'taxCode', idType: 'number' },
  revenues: { delegate: 'revenue', idType: 'number' },
  'audit-trail': { delegate: 'auditTrail', idType: 'bigint' },
  'bank-reconciliations': { delegate: 'bankReconciliation', idType: 'bigint' },
  'bank-reconciliation-items': { delegate: 'reconciliationItem', idType: 'bigint' },
  'community-contributions': { delegate: 'communityContribution', idType: 'bigint' },
  'credit-debit-notes': { delegate: 'creditDebitNote', idType: 'bigint' },
  'invoice-installments': { delegate: 'invoiceInstallment', idType: 'bigint' },
  'payment-transactions': { delegate: 'paymentTransaction', idType: 'bigint' },
  'student-invoices': { delegate: 'studentInvoice', idType: 'bigint' },
  'payment-webhooks': { delegate: 'paymentWebhookEvent', idType: 'string' },
  'recurring-journals': { delegate: 'recurringJournalTemplate', idType: 'number' },
};

const AUDIT_ROLLBACK_BLOCKED_RESOURCES: Record<string, string> = {
  'journal-entries':
    'Rollback is blocked for "journal-entries". Please use the journal reversal flow.',
};

const AUDIT_ROLLBACK_PROTECTED_RESOURCES = new Set(
  Object.keys(AUDIT_ROLLBACK_RESOURCE_MODEL_MAP),
);

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
    return this.prisma.auditLog.create({
      data: this.buildAuditLogCreateData(input),
    });
  }

  private buildAuditLogCreateData(
    input: RecordAuditLogInput,
  ): Prisma.AuditLogUncheckedCreateInput {
    const requestContext = getRequestContext();
    const details = mergeRequestContextIntoDetails(input.details);

    return {
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
    };
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
        occurredAt: true,
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
      OR: [
        {
          occurredAt: {
            lt: anchorLog.occurredAt,
          },
        },
        {
          occurredAt: anchorLog.occurredAt,
          id: {
            lte: anchorLog.id,
          },
        },
      ],
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
    this.assertTimelineItemRollbackEligible(targetItem);

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

    let rollbackPatchSnapshot: Record<string, Prisma.InputJsonValue | null> = {};
    let rollbackAuditLog:
      | {
          id: string;
          occurredAt: Date;
        }
      | undefined;
    let appliedFields: string[] = [];

    try {
      const txResult = await this.prisma.$transaction(async (tx) => {
        const txDelegate = (tx as unknown as Record<string, unknown>)[
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

        if (!txDelegate?.findUnique || !txDelegate?.update) {
          throw new BadRequestException(
            `Rollback is not supported for resource "${timeline.resource}" yet.`,
          );
        }

        const currentEntity = await txDelegate.findUnique({
          where,
        });

        if (!currentEntity) {
          throw new NotFoundException('Target resource record not found.');
        }

        const rollbackSnapshot = this.resolveRollbackSnapshot({
          targetItem,
          timelineItems: timeline.data,
        });

        let rollbackPatch = rollbackSnapshot
          ? this.extractRollbackPatchData(rollbackSnapshot, whereKey)
          : {};

        rollbackPatch = this.filterRollbackPatchByCurrentEntity(
          rollbackPatch,
          currentEntity,
          whereKey,
        );
        rollbackPatch = this.applyRollbackLifecyclePatch({
          patch: rollbackPatch,
          currentEntity,
          targetAction: targetItem.action,
        });
        const computedAppliedFields = Object.keys(rollbackPatch);

        if (computedAppliedFields.length === 0) {
          if (!rollbackSnapshot) {
            throw new BadRequestException(
              'No usable previous state found in audit details for rollback.',
            );
          }

          throw new BadRequestException(
            'Rollback snapshot does not contain editable scalar fields.',
          );
        }

        rollbackPatchSnapshot = rollbackPatch;

        const updatedEntity = await txDelegate.update({
          where,
          data: rollbackPatch as Record<string, unknown>,
        });

        const beforeSnapshot = this.toInputJsonValue(currentEntity) ?? null;
        const afterSnapshot = this.toInputJsonValue(updatedEntity) ?? null;

        const createdRollbackAuditLog = await tx.auditLog.create({
          data: this.buildAuditLogCreateData({
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
              rollbackPatch: rollbackPatchSnapshot as Prisma.InputJsonObject,
              before: beforeSnapshot,
              after: afterSnapshot,
            } satisfies Prisma.InputJsonObject,
            createdById: actorUserId,
            updatedById: actorUserId,
          }),
          select: {
            id: true,
            occurredAt: true,
          },
        });

        return {
          rollbackAuditLog: createdRollbackAuditLog,
          appliedFields: computedAppliedFields,
        };
      });

      rollbackAuditLog = txResult.rollbackAuditLog;
      appliedFields = txResult.appliedFields;
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
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
    if (!rollbackAuditLog) {
      throw new InternalServerErrorException(
        'Rollback failed due to an unexpected transaction state.',
      );
    }

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

    const rollbackRecord = this.toRecord(detailsRecord.rollback);
    if (rollbackRecord) {
      const rollbackAfterRecord = this.pickFirstRecord(rollbackRecord, [
        'after',
        'target',
        'snapshot',
        'state',
      ]);
      if (rollbackAfterRecord) {
        return rollbackAfterRecord;
      }

      const rollbackBeforeRecord = this.pickFirstRecord(rollbackRecord, [
        'before',
        'previous',
      ]);
      if (rollbackBeforeRecord) {
        return rollbackBeforeRecord;
      }
    }

    const afterRecord = this.pickFirstRecord(detailsRecord, [
      'after',
      'afterState',
      'afterData',
      'current',
      'newValue',
      'newData',
      'new',
      'dataAfter',
    ]);
    if (afterRecord) {
      return afterRecord;
    }

    return this.pickFirstRecord(detailsRecord, [
      'before',
      'beforeState',
      'beforeData',
      'previous',
      'oldValue',
      'oldData',
      'old',
      'dataBefore',
    ]) ?? detailsRecord;
  }

  private extractBeforeSnapshotFromDetails(
    details: Prisma.JsonValue | null,
  ): Record<string, unknown> | null {
    const detailsRecord = this.toRecord(details);
    if (!detailsRecord) {
      return null;
    }

    const rollbackRecord = this.toRecord(detailsRecord.rollback);
    if (rollbackRecord) {
      const rollbackBeforeRecord = this.pickFirstRecord(rollbackRecord, [
        'before',
        'previous',
      ]);
      if (rollbackBeforeRecord) {
        return rollbackBeforeRecord;
      }
    }

    return this.pickFirstRecord(detailsRecord, [
      'before',
      'beforeState',
      'beforeData',
      'previous',
      'oldValue',
      'oldData',
      'old',
      'dataBefore',
    ]);
  }

  private resolveRollbackSnapshot(input: {
    targetItem: AuditLogTimelineItem;
    timelineItems: AuditLogTimelineItem[];
  }): Record<string, unknown> | null {
    const directSnapshot = this.extractRollbackSnapshotFromDetails(
      input.targetItem.details,
    );
    if (directSnapshot) {
      return directSnapshot;
    }

    const targetIndex = input.timelineItems.findIndex(
      (item) => item.id === input.targetItem.id,
    );
    if (targetIndex > 0) {
      const newerItem = input.timelineItems[targetIndex - 1];
      const newerBeforeSnapshot = this.extractBeforeSnapshotFromDetails(
        newerItem.details,
      );
      if (newerBeforeSnapshot) {
        return newerBeforeSnapshot;
      }
    }

    return null;
  }

  private assertTimelineItemRollbackEligible(
    timelineItem: Pick<AuditLogTimelineItem, 'status' | 'action' | 'details'>,
  ): void {
    if (timelineItem.status !== AuditStatus.SUCCESS) {
      throw new BadRequestException(
        'Rollback is not allowed for failed timeline changes.',
      );
    }

    const actionVerb = this.extractActionVerb(timelineItem.action);
    const normalizedAction = timelineItem.action.trim().toUpperCase();
    if (
      actionVerb === 'FAILED' ||
      actionVerb === 'FAILURE' ||
      normalizedAction.endsWith('_FAILED')
    ) {
      throw new BadRequestException(
        'Rollback is not allowed for failed timeline changes.',
      );
    }

    const detailsRecord = this.toRecord(timelineItem.details);
    if (!detailsRecord) {
      return;
    }

    const rollbackRecord = this.toRecord(detailsRecord.rollback);
    if (!rollbackRecord) {
      return;
    }

    if (rollbackRecord.eligible === false) {
      throw new BadRequestException(
        'The selected timeline change is marked as not eligible for rollback.',
      );
    }
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

  private filterRollbackPatchByCurrentEntity(
    patch: Record<string, Prisma.InputJsonValue | null>,
    currentEntity: Record<string, unknown>,
    whereKey: string,
  ): Record<string, Prisma.InputJsonValue | null> {
    const entityKeys = new Set(Object.keys(currentEntity));
    const filteredPatch: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, value] of Object.entries(patch)) {
      if (!entityKeys.has(key)) {
        continue;
      }

      if (AUDIT_ROLLBACK_BLOCKED_FIELDS.has(key) || key === whereKey) {
        continue;
      }

      filteredPatch[key] = value;
    }

    return filteredPatch;
  }

  private applyRollbackLifecyclePatch(input: {
    patch: Record<string, Prisma.InputJsonValue | null>;
    currentEntity: Record<string, unknown>;
    targetAction: string;
  }): Record<string, Prisma.InputJsonValue | null> {
    const { patch, currentEntity, targetAction } = input;
    const actionVerb = this.extractActionVerb(targetAction);
    const nextPatch = { ...patch };

    if (
      actionVerb !== 'DELETE' &&
      Object.prototype.hasOwnProperty.call(currentEntity, 'deletedAt') &&
      currentEntity.deletedAt !== null &&
      currentEntity.deletedAt !== undefined
    ) {
      nextPatch.deletedAt = null;
    }

    if (
      actionVerb === 'CREATE' &&
      Object.prototype.hasOwnProperty.call(currentEntity, 'isActive') &&
      typeof currentEntity.isActive === 'boolean' &&
      currentEntity.isActive === false &&
      nextPatch.isActive === undefined
    ) {
      nextPatch.isActive = true;
    }

    return nextPatch;
  }

  private resolveRollbackResource(resource: string): {
    delegate: string;
    idType: 'string' | 'number' | 'bigint';
    whereKey?: string;
  } {
    const normalized = resource.trim().toLowerCase();
    const blockedReason = AUDIT_ROLLBACK_BLOCKED_RESOURCES[normalized];
    if (blockedReason) {
      throw new BadRequestException(blockedReason);
    }

    const mappedResource = AUDIT_ROLLBACK_RESOURCE_MODEL_MAP[normalized];
    if (mappedResource) {
      return mappedResource;
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

  private extractActionVerb(action: string): string {
    const normalized = action.trim().toUpperCase();
    if (!normalized) {
      return 'UNKNOWN';
    }

    const parts = normalized.split(/[_\s-]+/).filter(Boolean);
    return parts[parts.length - 1] ?? normalized;
  }

  private isSoftDeletedEntity(entity: Record<string, unknown>): boolean {
    if (!Object.prototype.hasOwnProperty.call(entity, 'deletedAt')) {
      return false;
    }

    const deletedAtValue = entity.deletedAt;
    return deletedAtValue !== null && deletedAtValue !== undefined;
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

  private resolveSoftDeleteGraceDays(): number {
    const configured = Number(
      this.configService?.get<string>(
        'AUDIT_LOG_RETENTION_SOFT_DELETE_GRACE_DAYS',
      ),
    );

    if (Number.isFinite(configured) && configured >= 1) {
      return Math.floor(configured);
    }

    return AUDIT_LOG_RETENTION_SOFT_DELETE_GRACE_DAYS;
  }

  private resolveRollbackProtectionExtraDays(): number {
    const configured = Number(
      this.configService?.get<string>(
        'AUDIT_LOG_RETENTION_ROLLBACK_PROTECTION_EXTRA_DAYS',
      ),
    );

    if (Number.isFinite(configured) && configured >= 0) {
      return Math.floor(configured);
    }

    return AUDIT_LOG_RETENTION_ROLLBACK_PROTECTION_EXTRA_DAYS;
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
          `Audit retention cleanup completed: soft-deleted ${result.softDeletedCount}, hard-deleted ${result.hardDeletedCount}, retention cutoff ${result.cutoff.toISOString()}, hard-delete cutoff ${result.hardDeleteCutoff.toISOString()}.`,
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
  ): Promise<{
    deletedCount: number;
    softDeletedCount: number;
    hardDeletedCount: number;
    cutoff: Date;
    protectedCutoff: Date;
    hardDeleteCutoff: Date;
  }> {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const rollbackProtectionExtraDays =
      this.resolveRollbackProtectionExtraDays();
    const softDeleteGraceDays = this.resolveSoftDeleteGraceDays();

    const cutoff = new Date(now - retentionDays * dayMs);
    const protectedCutoff = new Date(
      now - (retentionDays + rollbackProtectionExtraDays) * dayMs,
    );
    const hardDeleteCutoff = new Date(now - softDeleteGraceDays * dayMs);
    const rollbackProtectedResources = Array.from(
      AUDIT_ROLLBACK_PROTECTED_RESOURCES,
    );
    const softDeleteNow = new Date();

    let softDeletedCount = 0;
    let hardDeletedCount = 0;

    const softDeleteWhere: Prisma.AuditLogWhereInput = {
      deletedAt: null,
      OR: [
        {
          occurredAt: {
            lt: cutoff,
          },
          resource:
            rollbackProtectedResources.length > 0
              ? {
                  notIn: rollbackProtectedResources,
                }
              : undefined,
        },
        ...(rollbackProtectedResources.length > 0
          ? [
              {
                resource: {
                  in: rollbackProtectedResources,
                },
                occurredAt: {
                  lt: protectedCutoff,
                },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
      ],
    };

    for (
      let batchIndex = 0;
      batchIndex < AUDIT_LOG_RETENTION_DELETE_MAX_BATCHES;
      batchIndex += 1
    ) {
      const expiredRows = await this.prisma.auditLog.findMany({
        where: softDeleteWhere,
        select: {
          id: true,
        },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        take: AUDIT_LOG_RETENTION_DELETE_BATCH_SIZE,
      });

      if (expiredRows.length === 0) {
        break;
      }

      const batchSoftDeleteResult = await this.prisma.auditLog.updateMany({
        where: {
          id: {
            in: expiredRows.map((item) => item.id),
          },
          deletedAt: null,
        },
        data: {
          deletedAt: softDeleteNow,
        },
      });
      softDeletedCount += batchSoftDeleteResult.count;

      if (expiredRows.length < AUDIT_LOG_RETENTION_DELETE_BATCH_SIZE) {
        break;
      }
    }

    for (
      let batchIndex = 0;
      batchIndex < AUDIT_LOG_RETENTION_DELETE_MAX_BATCHES;
      batchIndex += 1
    ) {
      const softDeletedRows = await this.prisma.auditLog.findMany({
        where: {
          deletedAt: {
            lt: hardDeleteCutoff,
          },
        },
        select: {
          id: true,
        },
        orderBy: [{ deletedAt: 'asc' }, { id: 'asc' }],
        take: AUDIT_LOG_RETENTION_DELETE_BATCH_SIZE,
      });

      if (softDeletedRows.length === 0) {
        break;
      }

      const batchHardDeleteResult = await this.prisma.auditLog.deleteMany({
        where: {
          id: {
            in: softDeletedRows.map((item) => item.id),
          },
        },
      });
      hardDeletedCount += batchHardDeleteResult.count;

      if (softDeletedRows.length < AUDIT_LOG_RETENTION_DELETE_BATCH_SIZE) {
        break;
      }
    }

    const deletedCount = softDeletedCount + hardDeletedCount;

    return {
      deletedCount,
      softDeletedCount,
      hardDeletedCount,
      cutoff,
      protectedCutoff,
      hardDeleteCutoff,
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
