import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateAuditTrailDto } from './dto/create-audit-trail.dto';
import { ListAuditTrailDto } from './dto/list-audit-trail.dto';
import { UpdateAuditTrailDto } from './dto/update-audit-trail.dto';

const auditTrailInclude: Prisma.AuditTrailInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
};

@Injectable()
export class AuditTrailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    payload: CreateAuditTrailDto,
    actorUserId: string,
    userIp?: string,
    userAgent?: string,
  ) {
    const tableName = this.normalizeRequiredText(payload.tableName, 'tableName');
    const recordId = this.parseRequiredBigInt(payload.recordId, 'recordId');

    try {
      const entry = await this.prisma.auditTrail.create({
        data: {
          tableName,
          recordId,
          action: payload.action,
          fieldName: payload.fieldName?.trim(),
          oldValue: payload.oldValue?.trim(),
          newValue: payload.newValue?.trim(),
          changeSummary: payload.changeSummary?.trim(),
          userId: actorUserId,
          userIp,
          userAgent,
        },
        include: auditTrailInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'AUDIT_TRAIL_CREATE',
        resource: 'audit-trail',
        resourceId: entry.id.toString(),
        details: {
          tableName: entry.tableName,
          recordId: entry.recordId.toString(),
          action: entry.action,
        },
      });

      return entry;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'AUDIT_TRAIL_CREATE_FAILED',
        resource: 'audit-trail',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListAuditTrailDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const recordId = query.recordId
      ? this.parseOptionalBigInt(query.recordId, 'recordId')
      : null;

    const where: Prisma.AuditTrailWhereInput = {
      tableName: query.tableName,
      recordId: recordId ?? undefined,
      action: query.action,
      userId: query.userId,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            { tableName: { contains: query.search } },
            { fieldName: { contains: query.search } },
            { oldValue: { contains: query.search } },
            { newValue: { contains: query.search } },
            { changeSummary: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditTrail.count({ where }),
      this.prisma.auditTrail.findMany({
        where,
        include: auditTrailInclude,
        orderBy: { createdAt: 'desc' },
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
    const auditId = this.parseRequiredBigInt(id, 'id');
    const entry = await this.prisma.auditTrail.findFirst({
      where: { id: auditId },
      include: auditTrailInclude,
    });

    if (!entry) {
      throw new NotFoundException('Audit trail entry not found');
    }

    return entry;
  }

  async update(id: string, payload: UpdateAuditTrailDto, actorUserId: string) {
    const auditId = this.parseRequiredBigInt(id, 'id');
    await this.ensureExists(auditId);

    const recordId =
      payload.recordId === undefined
        ? undefined
        : this.parseRequiredBigInt(payload.recordId, 'recordId');

    const tableName =
      payload.tableName === undefined
        ? undefined
        : this.normalizeRequiredText(payload.tableName, 'tableName');

    try {
      const updated = await this.prisma.auditTrail.update({
        where: { id: auditId },
        data: {
          tableName,
          recordId,
          action: payload.action,
          fieldName: payload.fieldName?.trim(),
          oldValue: payload.oldValue?.trim(),
          newValue: payload.newValue?.trim(),
          changeSummary: payload.changeSummary?.trim(),
        },
        include: auditTrailInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'AUDIT_TRAIL_UPDATE',
        resource: 'audit-trail',
        resourceId: auditId.toString(),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const auditId = this.parseRequiredBigInt(id, 'id');
    await this.ensureExists(auditId);

    await this.prisma.auditTrail.delete({
      where: { id: auditId },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'AUDIT_TRAIL_DELETE',
      resource: 'audit-trail',
      resourceId: auditId.toString(),
    });

    return { success: true, id };
  }

  private async ensureExists(id: bigint) {
    const entry = await this.prisma.auditTrail.findFirst({
      where: { id },
      select: { id: true },
    });

    if (!entry) {
      throw new NotFoundException('Audit trail entry not found');
    }
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private parseOptionalBigInt(value?: string, fieldName = 'id'): bigint | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (!/^\d+$/.test(value)) {
      throw new NotFoundException(`${fieldName} must be a numeric string`);
    }

    try {
      return BigInt(value);
    } catch {
      throw new NotFoundException(`${fieldName} is invalid`);
    }
  }

  private parseRequiredBigInt(value: string, fieldName = 'id'): bigint {
    const parsed = this.parseOptionalBigInt(value, fieldName);

    if (parsed === null) {
      throw new NotFoundException(`${fieldName} is required`);
    }

    return parsed;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Audit trail entry already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
