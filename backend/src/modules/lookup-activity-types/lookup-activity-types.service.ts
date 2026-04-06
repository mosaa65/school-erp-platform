import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { generateAutoCode } from '../../common/utils/auto-code';
import { CreateLookupActivityTypeDto } from './dto/create-lookup-activity-type.dto';
import { ListLookupActivityTypesDto } from './dto/list-lookup-activity-types.dto';
import { UpdateLookupActivityTypeDto } from './dto/update-lookup-activity-type.dto';

const lookupActivityTypeInclude: Prisma.LookupActivityTypeInclude = {
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
export class LookupActivityTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateLookupActivityTypeDto, actorUserId: string) {
    const normalizedCode = payload.code
      ? this.normalizeCode(payload.code)
      : generateAutoCode('ACT', 50);
    const normalizedNameAr = this.normalizeRequiredText(
      payload.nameAr,
      'nameAr',
    );

    try {
      const activityType = await this.prisma.lookupActivityType.create({
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: lookupActivityTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ACTIVITY_TYPE_CREATE',
        resource: 'lookup-activity-types',
        resourceId: String(activityType.id),
        details: {
          code: activityType.code,
          nameAr: activityType.nameAr,
        },
      });

      return activityType;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ACTIVITY_TYPE_CREATE_FAILED',
        resource: 'lookup-activity-types',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListLookupActivityTypesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const deletedOnly = query.deletedOnly ?? false;

    const where: Prisma.LookupActivityTypeWhereInput = {
      deletedAt: deletedOnly ? { not: null } : null,
      isActive: deletedOnly ? undefined : query.isActive,
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
      this.prisma.lookupActivityType.count({ where }),
      this.prisma.lookupActivityType.findMany({
        where,
        include: lookupActivityTypeInclude,
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
    const activityType = await this.prisma.lookupActivityType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: lookupActivityTypeInclude,
    });

    if (!activityType) {
      throw new NotFoundException('Activity type not found');
    }

    return activityType;
  }

  async update(
    id: number,
    payload: UpdateLookupActivityTypeDto,
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
      const updated = await this.prisma.lookupActivityType.update({
        where: { id },
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: lookupActivityTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ACTIVITY_TYPE_UPDATE',
        resource: 'lookup-activity-types',
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

    await this.prisma.lookupActivityType.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'LOOKUP_ACTIVITY_TYPE_DELETE',
      resource: 'lookup-activity-types',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureLookupItemExists(id: number) {
    const activityType = await this.prisma.lookupActivityType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!activityType) {
      throw new NotFoundException('Activity type not found');
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
      throw new ConflictException('Activity type code already exists');
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
