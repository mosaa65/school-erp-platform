import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateLookupOrphanStatusDto } from './dto/create-lookup-orphan-status.dto';
import { ListLookupOrphanStatusesDto } from './dto/list-lookup-orphan-statuses.dto';
import { UpdateLookupOrphanStatusDto } from './dto/update-lookup-orphan-status.dto';

const lookupOrphanStatusInclude: Prisma.LookupOrphanStatusInclude = {
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
export class LookupOrphanStatusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateLookupOrphanStatusDto, actorUserId: string) {
    const normalizedCode = this.normalizeCode(payload.code);
    const normalizedNameAr = this.normalizeRequiredText(
      payload.nameAr,
      'nameAr',
    );

    try {
      const orphanStatus = await this.prisma.lookupOrphanStatus.create({
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: lookupOrphanStatusInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ORPHAN_STATUS_CREATE',
        resource: 'lookup-orphan-statuses',
        resourceId: String(orphanStatus.id),
        details: {
          code: orphanStatus.code,
          nameAr: orphanStatus.nameAr,
        },
      });

      return orphanStatus;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ORPHAN_STATUS_CREATE_FAILED',
        resource: 'lookup-orphan-statuses',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListLookupOrphanStatusesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LookupOrphanStatusWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              code: {
                contains: query.search,
              },
            },
            {
              nameAr: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.lookupOrphanStatus.count({ where }),
      this.prisma.lookupOrphanStatus.findMany({
        where,
        include: lookupOrphanStatusInclude,
        orderBy: [{ code: 'asc' }],
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
    const orphanStatus = await this.prisma.lookupOrphanStatus.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: lookupOrphanStatusInclude,
    });

    if (!orphanStatus) {
      throw new NotFoundException('Orphan status not found');
    }

    return orphanStatus;
  }

  async update(
    id: number,
    payload: UpdateLookupOrphanStatusDto,
    actorUserId: string,
  ) {
    await this.ensureLookupItemExists(id);

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedNameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const updated = await this.prisma.lookupOrphanStatus.update({
        where: { id },
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: lookupOrphanStatusInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ORPHAN_STATUS_UPDATE',
        resource: 'lookup-orphan-statuses',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureLookupItemExists(id);

    await this.prisma.lookupOrphanStatus.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'LOOKUP_ORPHAN_STATUS_DELETE',
      resource: 'lookup-orphan-statuses',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureLookupItemExists(id: number) {
    const orphanStatus = await this.prisma.lookupOrphanStatus.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!orphanStatus) {
      throw new NotFoundException('Orphan status not found');
    }
  }

  private normalizeCode(code: string): string {
    const normalized = code.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('code cannot be empty');
    }

    return normalized;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Orphan status code already exists');
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
