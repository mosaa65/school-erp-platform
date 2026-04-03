import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditStatus,
  FileAttachment,
  Prisma,
  UserNotificationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';
import { GenerateEmployeeDocumentExpiryAlertsDto } from './dto/generate-employee-document-expiry-alerts.dto';
import { ListEmployeeDocumentsDto } from './dto/list-employee-documents.dto';
import { UpdateEmployeeDocumentDto } from './dto/update-employee-document.dto';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';

const EMPLOYEE_DOCUMENT_ENTITY_TYPE = 'employee';
const DEFAULT_DOCUMENT_EXPIRY_ALERT_THRESHOLD_DAYS = 30;
const DOCUMENT_EXPIRY_ALERT_TITLE = 'مستند قريب من انتهاء الصلاحية';
const DOCUMENT_CATEGORY_ALIASES: Record<string, string> = {
  'الهوية الوطنية': 'هوية',
  'هوية وطنية': 'هوية',
  هوية: 'هوية',
  إقامة: 'إقامة',
  اقامة: 'إقامة',
  'جواز سفر': 'جواز سفر',
  جواز: 'جواز سفر',
  شهادة: 'شهادة',
  شهادة_علمية: 'شهادة',
  رخصة: 'رخصة',
};
const EXPIRY_REQUIRED_CATEGORIES = new Set([
  'هوية',
  'إقامة',
  'جواز سفر',
  'شهادة',
  'رخصة',
]);

const employeeDocumentSelect = {
  id: true,
  entityId: true,
  fileName: true,
  filePath: true,
  fileType: true,
  fileSize: true,
  fileCategory: true,
  description: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class EmployeeDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  async create(payload: CreateEmployeeDocumentDto, actorUserId: string) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(payload.employeeId);
      const normalizedCategory = this.normalizeDocumentCategory(payload.fileCategory);
      this.validateExpiryRequirement(normalizedCategory, payload.expiresAt);

      const employeeDocument = await this.prisma.fileAttachment.create({
        data: {
          entityType: EMPLOYEE_DOCUMENT_ENTITY_TYPE,
          entityId: payload.employeeId,
          fileName: payload.fileName,
          filePath: payload.filePath,
          fileType: payload.fileType,
          fileSize: payload.fileSize,
          fileCategory: normalizedCategory,
          description: payload.description,
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
          uploadedById: actorUserId,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        select: employeeDocumentSelect,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_DOCUMENT_CREATE',
        resource: 'employee-documents',
        resourceId: employeeDocument.id.toString(),
        details: {
          employeeId: payload.employeeId,
          fileName: payload.fileName,
          fileCategory: payload.fileCategory,
        },
      });

      return this.enrichDocument(employeeDocument);
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_DOCUMENT_CREATE_FAILED',
        resource: 'employee-documents',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          fileName: payload.fileName,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListEmployeeDocumentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.FileAttachmentWhereInput = {
      entityType: EMPLOYEE_DOCUMENT_ENTITY_TYPE,
      deletedAt: null,
      entityId: query.employeeId,
      fileCategory: query.fileCategory,
      fileType: query.fileType,
      OR: query.search
        ? [
            {
              fileName: {
                contains: query.search,
              },
            },
            {
              filePath: {
                contains: query.search,
              },
            },
            {
              fileCategory: {
                contains: query.search,
              },
            },
            {
              description: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.fileAttachment.count({ where }),
      this.prisma.fileAttachment.findMany({
        where,
        select: employeeDocumentSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const employeeIds = Array.from(new Set(items.map((item) => item.entityId)));
    const employees = employeeIds.length
      ? await this.prisma.employee.findMany({
          where: {
            id: {
              in: employeeIds,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            fullName: true,
            jobNumber: true,
            jobTitle: true,
          },
        })
      : [];

    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

    return {
      data: items.map((item) => this.enrichDocument(item, employeeMap)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const documentId = this.parseRequiredBigInt(id);
    const employeeDocument = await this.prisma.fileAttachment.findFirst({
      where: {
        id: documentId,
        entityType: EMPLOYEE_DOCUMENT_ENTITY_TYPE,
        deletedAt: null,
      },
      select: employeeDocumentSelect,
    });

    if (!employeeDocument) {
      throw new NotFoundException('Employee document not found');
    }

    return this.enrichDocument(employeeDocument);
  }

  async update(
    id: string,
    payload: UpdateEmployeeDocumentDto,
    actorUserId: string,
  ) {
    const documentId = this.parseRequiredBigInt(id);
    const existing = await this.ensureEmployeeDocumentExists(documentId);

    const resolvedEmployeeId = payload.employeeId ?? existing.entityId;
    await this.employeesService.ensureEmployeeExistsAndActive(resolvedEmployeeId);
    const normalizedCategory =
      payload.fileCategory === undefined
        ? undefined
        : this.normalizeDocumentCategory(payload.fileCategory);
    const resolvedCategory = normalizedCategory ?? existing.fileCategory ?? undefined;
    const resolvedExpiry =
      payload.expiresAt === undefined
        ? existing.expiresAt?.toISOString()
        : payload.expiresAt;
    this.validateExpiryRequirement(resolvedCategory, resolvedExpiry);

    const employeeDocument = await this.prisma.fileAttachment.update({
      where: {
        id: documentId,
      },
      data: {
        entityId: payload.employeeId,
        fileName: payload.fileName,
        filePath: payload.filePath,
        fileType: payload.fileType,
        fileSize: payload.fileSize,
        fileCategory: normalizedCategory,
        description: payload.description,
        expiresAt:
          payload.expiresAt === undefined
            ? undefined
            : payload.expiresAt
              ? new Date(payload.expiresAt)
              : null,
        updatedById: actorUserId,
      },
      select: employeeDocumentSelect,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_DOCUMENT_UPDATE',
      resource: 'employee-documents',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return this.enrichDocument(employeeDocument);
  }

  async remove(id: string, actorUserId: string) {
    const documentId = this.parseRequiredBigInt(id);
    await this.ensureEmployeeDocumentExists(documentId);

    await this.prisma.fileAttachment.update({
      where: {
        id: documentId,
      },
      data: {
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_DOCUMENT_DELETE',
      resource: 'employee-documents',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async generateExpiryAlerts(
    payload: GenerateEmployeeDocumentExpiryAlertsDto,
    actorUserId: string,
  ) {
    const daysThreshold =
      payload.daysThreshold ?? DEFAULT_DOCUMENT_EXPIRY_ALERT_THRESHOLD_DAYS;
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfThreshold = new Date(startOfToday);
    endOfThreshold.setUTCHours(23, 59, 59, 999);
    endOfThreshold.setUTCDate(endOfThreshold.getUTCDate() + daysThreshold);

    const items = await this.prisma.fileAttachment.findMany({
      where: {
        entityType: EMPLOYEE_DOCUMENT_ENTITY_TYPE,
        deletedAt: null,
        expiresAt: {
          not: null,
          lte: endOfThreshold,
        },
      },
      select: employeeDocumentSelect,
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });

    const employeeIds = Array.from(new Set(items.map((item) => item.entityId)));
    const employees = employeeIds.length
      ? await this.prisma.employee.findMany({
          where: {
            id: {
              in: employeeIds,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            fullName: true,
            jobNumber: true,
          },
        })
      : [];
    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

    const managers = await this.findDocumentManagers(actorUserId, now);
    let generatedCount = 0;

    for (const item of items) {
      if (!item.expiresAt) {
        continue;
      }

      const employee = employeeMap.get(item.entityId);
      const recipients = await this.resolveDocumentAlertRecipients(
        item.entityId,
        managers,
      );

      if (recipients.length === 0) {
        continue;
      }

      const remainingDays = this.calculateRemainingDays(item.expiresAt, now);
      const timingMessage =
        remainingDays < 0
          ? `انتهت صلاحيته بتاريخ ${this.formatDateForNotification(item.expiresAt)} منذ ${Math.abs(remainingDays)} يوم`
          : remainingDays === 0
            ? `تنتهي صلاحيته اليوم ${this.formatDateForNotification(item.expiresAt)}`
            : `سينتهي بتاريخ ${this.formatDateForNotification(item.expiresAt)} خلال ${remainingDays} يوم`;
      const message = `المستند ${item.fileName} للموظف ${employee?.fullName ?? item.entityId} ${timingMessage}.`;

      const pendingNotifications = await Promise.all(
        recipients.map(async (userId) => {
          const existing = await this.prisma.userNotification.findFirst({
            where: {
              userId,
              deletedAt: null,
              resource: 'employee-documents',
              resourceId: item.id.toString(),
              title: DOCUMENT_EXPIRY_ALERT_TITLE,
              createdAt: {
                gte: startOfToday,
              },
            },
            select: {
              id: true,
            },
          });

          if (existing) {
            return null;
          }

          return {
            userId,
            title: DOCUMENT_EXPIRY_ALERT_TITLE,
            message,
            notificationType: UserNotificationType.WARNING,
            resource: 'employee-documents',
            resourceId: item.id.toString(),
            actionUrl: '/app/employee-documents',
            triggeredByUserId: actorUserId,
          };
        }),
      );

      const notificationsToCreate = pendingNotifications.filter(
        (value): value is NonNullable<typeof value> => value !== null,
      );

      if (notificationsToCreate.length === 0) {
        continue;
      }

      await this.userNotificationsService.createForUsers(notificationsToCreate);
      generatedCount += notificationsToCreate.length;
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_DOCUMENT_EXPIRY_ALERTS_GENERATE',
      resource: 'employee-documents',
      details: {
        daysThreshold,
        scannedCount: items.length,
        generatedCount,
      },
    });

    return {
      success: true,
      scannedCount: items.length,
      generatedCount,
      daysThreshold,
    };
  }

  private async ensureEmployeeDocumentExists(id: bigint): Promise<FileAttachment> {
    const employeeDocument = await this.prisma.fileAttachment.findFirst({
      where: {
        id,
        entityType: EMPLOYEE_DOCUMENT_ENTITY_TYPE,
        deletedAt: null,
      },
    });

    if (!employeeDocument) {
      throw new NotFoundException('Employee document not found');
    }

    return employeeDocument;
  }

  private enrichDocument(
    item: {
      id: bigint;
      entityId: string;
      fileName: string;
      filePath: string;
      fileType: string | null;
      fileSize: number | null;
      fileCategory: string | null;
      description: string | null;
      expiresAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    employeeMap?: Map<
      string,
      {
        id: string;
        fullName: string;
        jobNumber: string | null;
        jobTitle: string | null;
      }
    >,
  ) {
    return {
      id: item.id.toString(),
      employeeId: item.entityId,
      fileName: item.fileName,
      filePath: item.filePath,
      fileType: item.fileType,
      fileSize: item.fileSize,
      fileCategory: item.fileCategory,
      description: item.description,
      expiresAt: item.expiresAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      employee: employeeMap?.get(item.entityId) ?? null,
    };
  }

  private parseRequiredBigInt(value: string, fieldName = 'id'): bigint {
    try {
      return BigInt(value);
    } catch {
      throw new NotFoundException(`Invalid ${fieldName}`);
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  private normalizeDocumentCategory(fileCategory?: string | null) {
    if (!fileCategory) {
      return fileCategory ?? undefined;
    }

    const normalized = fileCategory.trim();
    if (!normalized) {
      return undefined;
    }

    return DOCUMENT_CATEGORY_ALIASES[normalized] ?? normalized;
  }

  private validateExpiryRequirement(
    fileCategory?: string | null,
    expiresAt?: string | null,
  ) {
    if (!fileCategory) {
      return;
    }

    if (EXPIRY_REQUIRED_CATEGORIES.has(fileCategory) && !expiresAt) {
      throw new BadRequestException(
        'Expiry date is required for identity, residence, passport, certificate, and license documents',
      );
    }
  }

  private async findDocumentManagers(actorUserId: string, now: Date) {
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
                        code: 'employee-documents.notify-expiring',
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
                  code: 'employee-documents.notify-expiring',
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

  private async resolveDocumentAlertRecipients(
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

  private calculateRemainingDays(expiryDate: Date, now: Date) {
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfExpiryDay = new Date(
      Date.UTC(
        expiryDate.getUTCFullYear(),
        expiryDate.getUTCMonth(),
        expiryDate.getUTCDate(),
      ),
    );

    return Math.floor((endOfExpiryDay.getTime() - startOfToday.getTime()) / millisecondsInDay);
  }

  private formatDateForNotification(value: Date) {
    return value.toISOString().slice(0, 10);
  }
}
