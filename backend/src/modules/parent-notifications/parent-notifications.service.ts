import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  ParentNotification,
  ParentNotificationSendMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StudentsService } from '../students/students.service';
import { CreateParentNotificationDto } from './dto/create-parent-notification.dto';
import { ListParentNotificationsDto } from './dto/list-parent-notifications.dto';
import { UpdateParentNotificationDto } from './dto/update-parent-notification.dto';

const parentNotificationInclude = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      isActive: true,
    },
  },
  guardianTitleLookup: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      gender: true,
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class ParentNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly studentsService: StudentsService,
  ) {}

  async create(payload: CreateParentNotificationDto, actorUserId: string) {
    await this.studentsService.ensureStudentExistsAndActive(payload.studentId);

    if (
      payload.guardianTitleId !== undefined &&
      payload.guardianTitleId !== null
    ) {
      await this.ensureRelationshipTypeExists(payload.guardianTitleId);
    }

    const sentFields = this.resolveSentFields({
      isSent: payload.isSent,
      sentDate: payload.sentDate,
      defaultSendWhenSent: true,
    });

    try {
      const parentNotification = await this.prisma.$transaction(async (tx) => {
        const notificationNumber = await this.getNextNotificationNumber(tx);

        return tx.parentNotification.create({
          data: {
            notificationNumber,
            studentId: payload.studentId,
            notificationType: payload.notificationType,
            guardianTitleId:
              payload.guardianTitleId === undefined
                ? undefined
                : payload.guardianTitleId,
            behaviorType: payload.behaviorType,
            behaviorDescription: payload.behaviorDescription,
            requiredAction: payload.requiredAction,
            sendMethod:
              payload.sendMethod ?? ParentNotificationSendMethod.PAPER,
            messengerName: payload.messengerName,
            isSent: sentFields.isSent,
            sentDate: sentFields.sentDate,
            results: payload.results,
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: parentNotificationInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PARENT_NOTIFICATION_CREATE',
        resource: 'parent-notifications',
        resourceId: parentNotification.id,
        details: {
          notificationNumber: parentNotification.notificationNumber,
          studentId: parentNotification.studentId,
          notificationType: parentNotification.notificationType,
        },
      });

      return parentNotification;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'PARENT_NOTIFICATION_CREATE_FAILED',
        resource: 'parent-notifications',
        status: AuditStatus.FAILURE,
        details: {
          studentId: payload.studentId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListParentNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ParentNotificationWhereInput = {
      deletedAt: null,
      studentId: query.studentId,
      notificationType: query.notificationType,
      guardianTitleId: query.guardianTitleId,
      sendMethod: query.sendMethod,
      isSent: query.isSent,
      isActive: query.isActive,
      sentDate:
        query.fromSentDate || query.toSentDate
          ? {
              gte: query.fromSentDate,
              lte: query.toSentDate,
            }
          : undefined,
      OR: query.search
        ? [
            {
              student: {
                fullName: {
                  contains: query.search,
                },
              },
            },
            {
              student: {
                admissionNo: {
                  contains: query.search,
                },
              },
            },
            {
              behaviorType: {
                contains: query.search,
              },
            },
            {
              behaviorDescription: {
                contains: query.search,
              },
            },
            {
              requiredAction: {
                contains: query.search,
              },
            },
            {
              messengerName: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.parentNotification.count({ where }),
      this.prisma.parentNotification.findMany({
        where,
        include: parentNotificationInclude,
        orderBy: [{ notificationNumber: 'desc' }, { createdAt: 'desc' }],
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
    const parentNotification = await this.prisma.parentNotification.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: parentNotificationInclude,
    });

    if (!parentNotification) {
      throw new NotFoundException('Parent notification not found');
    }

    return parentNotification;
  }

  async update(
    id: string,
    payload: UpdateParentNotificationDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureParentNotificationExists(id);

    const resolvedStudentId = payload.studentId ?? existing.studentId;
    await this.studentsService.ensureStudentExistsAndActive(resolvedStudentId);

    if (
      payload.guardianTitleId !== undefined &&
      payload.guardianTitleId !== null
    ) {
      await this.ensureRelationshipTypeExists(payload.guardianTitleId);
    }

    const sentFields = this.resolveSentFields({
      isSent: payload.isSent ?? existing.isSent,
      sentDate: payload.sentDate ?? existing.sentDate,
      defaultSendWhenSent: false,
    });

    try {
      const parentNotification = await this.prisma.parentNotification.update({
        where: {
          id,
        },
        data: {
          studentId: payload.studentId,
          notificationType: payload.notificationType,
          guardianTitleId:
            payload.guardianTitleId === undefined
              ? undefined
              : payload.guardianTitleId,
          behaviorType: payload.behaviorType,
          behaviorDescription: payload.behaviorDescription,
          requiredAction: payload.requiredAction,
          sendMethod: payload.sendMethod,
          messengerName: payload.messengerName,
          isSent: sentFields.isSent,
          sentDate: sentFields.sentDate,
          results: payload.results,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: parentNotificationInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'PARENT_NOTIFICATION_UPDATE',
        resource: 'parent-notifications',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return parentNotification;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureParentNotificationExists(id);

    await this.prisma.parentNotification.update({
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
      action: 'PARENT_NOTIFICATION_DELETE',
      resource: 'parent-notifications',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureParentNotificationExists(
    id: string,
  ): Promise<ParentNotification> {
    const parentNotification = await this.prisma.parentNotification.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!parentNotification) {
      throw new NotFoundException('Parent notification not found');
    }

    return parentNotification;
  }

  private async ensureRelationshipTypeExists(relationshipTypeId: number) {
    const relationshipType = await this.prisma.lookupRelationshipType.findFirst(
      {
        where: {
          id: relationshipTypeId,
          deletedAt: null,
        },
        select: {
          id: true,
          isActive: true,
        },
      },
    );

    if (!relationshipType) {
      throw new BadRequestException('guardianTitleId is not valid');
    }

    if (!relationshipType.isActive) {
      throw new BadRequestException('guardianTitleId is inactive');
    }
  }

  private async getNextNotificationNumber(
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const aggregate = await tx.parentNotification.aggregate({
      _max: {
        notificationNumber: true,
      },
    });

    return (aggregate._max.notificationNumber ?? 0) + 1;
  }

  private resolveSentFields(params: {
    isSent: boolean | undefined;
    sentDate: Date | string | null | undefined;
    defaultSendWhenSent: boolean;
  }) {
    const isSent = params.isSent ?? false;

    if (!isSent && params.sentDate) {
      throw new BadRequestException(
        'sentDate can only be set when isSent is true',
      );
    }

    if (!isSent) {
      return {
        isSent: false,
        sentDate: null,
      };
    }

    if (params.sentDate) {
      return {
        isSent: true,
        sentDate: params.sentDate,
      };
    }

    if (!params.defaultSendWhenSent) {
      return {
        isSent: true,
        sentDate: null,
      };
    }

    return {
      isSent: true,
      sentDate: new Date(),
    };
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Parent notification number must be unique');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
