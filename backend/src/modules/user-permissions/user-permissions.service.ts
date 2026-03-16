import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, type UserPermission } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateUserPermissionDto } from './dto/create-user-permission.dto';
import { ListUserPermissionsDto } from './dto/list-user-permissions.dto';
import { RevokeUserPermissionDto } from './dto/revoke-user-permission.dto';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';

const userPermissionInclude: Prisma.UserPermissionInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  },
  permission: {
    select: {
      id: true,
      code: true,
      resource: true,
      action: true,
      deletedAt: true,
    },
  },
  grantedBy: {
    select: {
      id: true,
      email: true,
    },
  },
  revokedBy: {
    select: {
      id: true,
      email: true,
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
};

@Injectable()
export class UserPermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateUserPermissionDto, actorUserId: string) {
    this.ensureDateRange(payload.validFrom, payload.validUntil);
    await this.ensureUserExists(payload.userId);
    await this.ensurePermissionExists(payload.permissionId);

    const now = new Date();

    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId: payload.userId,
          permissionId: payload.permissionId,
        },
      },
    });

    if (existing && !existing.deletedAt && !existing.revokedAt) {
      throw new ConflictException(
        'Direct permission already granted and not revoked',
      );
    }

    if (existing) {
      const regranted = await this.prisma.userPermission.update({
        where: {
          id: existing.id,
        },
        data: {
          validFrom: payload.validFrom ? new Date(payload.validFrom) : now,
          validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
          grantReason: payload.grantReason.trim(),
          notes: payload.notes,
          grantedById: actorUserId,
          grantedAt: now,
          revokedAt: null,
          revokedById: null,
          revokeReason: null,
          deletedAt: null,
          updatedById: actorUserId,
        },
        include: userPermissionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'USER_PERMISSION_REGRANT',
        resource: 'user-permissions',
        resourceId: String(regranted.id),
        details: {
          userId: regranted.userId,
          permissionId: regranted.permissionId,
        },
      });

      return regranted;
    }

    try {
      const created = await this.prisma.userPermission.create({
        data: {
          userId: payload.userId,
          permissionId: payload.permissionId,
          validFrom: payload.validFrom ? new Date(payload.validFrom) : now,
          validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
          grantReason: payload.grantReason.trim(),
          notes: payload.notes,
          grantedById: actorUserId,
          grantedAt: now,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: userPermissionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'USER_PERMISSION_CREATE',
        resource: 'user-permissions',
        resourceId: String(created.id),
        details: {
          userId: created.userId,
          permissionId: created.permissionId,
          validUntil: created.validUntil,
        },
      });

      return created;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'USER_PERMISSION_CREATE_FAILED',
        resource: 'user-permissions',
        status: AuditStatus.FAILURE,
        details: {
          userId: payload.userId,
          permissionId: payload.permissionId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListUserPermissionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const now = new Date();

    const where: Prisma.UserPermissionWhereInput = {
      deletedAt: null,
      userId: query.userId,
      permissionId: query.permissionId,
      revokedAt:
        query.isRevoked === undefined
          ? undefined
          : query.isRevoked
            ? { not: null }
            : null,
      AND:
        query.isCurrent === undefined
          ? undefined
          : query.isCurrent
            ? [
                { revokedAt: null },
                { validFrom: { lte: now } },
                {
                  OR: [{ validUntil: null }, { validUntil: { gte: now } }],
                },
              ]
            : [
                {
                  OR: [
                    { revokedAt: { not: null } },
                    { validFrom: { gt: now } },
                    { validUntil: { lt: now } },
                  ],
                },
              ],
      OR: query.search
        ? [
            { grantReason: { contains: query.search } },
            { notes: { contains: query.search } },
            { user: { email: { contains: query.search } } },
            { permission: { code: { contains: query.search } } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.userPermission.count({ where }),
      this.prisma.userPermission.findMany({
        where,
        include: userPermissionInclude,
        orderBy: [{ grantedAt: 'desc' }],
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

  async findOne(id: number) {
    const item = await this.prisma.userPermission.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: userPermissionInclude,
    });

    if (!item) {
      throw new NotFoundException('User direct permission not found');
    }

    return item;
  }

  async update(
    id: number,
    payload: UpdateUserPermissionDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureExists(id);

    const resolvedValidFrom =
      payload.validFrom ?? existing.validFrom.toISOString();
    const resolvedValidUntil =
      payload.validUntil ?? this.toIsoOrUndefined(existing.validUntil);
    this.ensureDateRange(resolvedValidFrom, resolvedValidUntil);

    const updated = await this.prisma.userPermission.update({
      where: { id },
      data: {
        validFrom:
          payload.validFrom === undefined
            ? undefined
            : new Date(payload.validFrom),
        validUntil:
          payload.validUntil === undefined
            ? undefined
            : payload.validUntil
              ? new Date(payload.validUntil)
              : null,
        grantReason: payload.grantReason?.trim(),
        notes: payload.notes,
        updatedById: actorUserId,
      },
      include: userPermissionInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_PERMISSION_UPDATE',
      resource: 'user-permissions',
      resourceId: String(id),
      details: payload as Prisma.InputJsonValue,
    });

    return updated;
  }

  async revoke(
    id: number,
    payload: RevokeUserPermissionDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureExists(id);

    if (existing.revokedAt) {
      throw new ConflictException('User direct permission already revoked');
    }

    const revoked = await this.prisma.userPermission.update({
      where: {
        id,
      },
      data: {
        revokedAt: new Date(),
        revokedById: actorUserId,
        revokeReason: payload.revokeReason?.trim(),
        updatedById: actorUserId,
      },
      include: userPermissionInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_PERMISSION_REVOKE',
      resource: 'user-permissions',
      resourceId: String(id),
      details: {
        revokeReason: payload.revokeReason,
      },
    });

    return revoked;
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureExists(id);

    await this.prisma.userPermission.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_PERMISSION_DELETE',
      resource: 'user-permissions',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureExists(id: number): Promise<UserPermission> {
    const item = await this.prisma.userPermission.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!item) {
      throw new NotFoundException('User direct permission not found');
    }

    return item;
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new BadRequestException('userId is invalid or deleted');
    }
  }

  private async ensurePermissionExists(permissionId: string) {
    const permission = await this.prisma.permission.findFirst({
      where: {
        id: permissionId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!permission) {
      throw new BadRequestException('permissionId is invalid or deleted');
    }
  }

  private ensureDateRange(
    validFrom?: string | null,
    validUntil?: string | null,
  ) {
    if (!validFrom || !validUntil) {
      return;
    }

    const from = new Date(validFrom);
    const until = new Date(validUntil);

    if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) {
      throw new BadRequestException('Invalid datetime format');
    }

    if (until < from) {
      throw new BadRequestException(
        'validUntil must be after or equal to validFrom',
      );
    }
  }

  private toIsoOrUndefined(value?: Date | null): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.toISOString();
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('User permission pair must be unique');
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
