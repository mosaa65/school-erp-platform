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
import { CreateLookupPeriodDto } from './dto/create-lookup-period.dto';
import { ListLookupPeriodsDto } from './dto/list-lookup-periods.dto';
import { UpdateLookupPeriodDto } from './dto/update-lookup-period.dto';

const lookupPeriodInclude: Prisma.LookupPeriodInclude = {
  _count: {
    select: {
      timetableTemplateSlots: true,
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
export class LookupPeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateLookupPeriodDto, actorUserId: string) {
    const normalizedCode = payload.code
      ? this.normalizeCode(payload.code)
      : generateAutoCode('PRD', 50);
    const normalizedNameAr = this.normalizeRequiredText(
      payload.nameAr,
      'nameAr',
    );

    try {
      const period = await this.prisma.lookupPeriod.create({
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: lookupPeriodInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_PERIOD_CREATE',
        resource: 'lookup-periods',
        resourceId: String(period.id),
        details: {
          code: period.code,
          nameAr: period.nameAr,
        },
      });

      return period;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_PERIOD_CREATE_FAILED',
        resource: 'lookup-periods',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListLookupPeriodsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const deletedOnly = query.deletedOnly ?? false;

    const where: Prisma.LookupPeriodWhereInput = {
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
      this.prisma.lookupPeriod.count({ where }),
      this.prisma.lookupPeriod.findMany({
        where,
        include: lookupPeriodInclude,
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
    const period = await this.prisma.lookupPeriod.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: lookupPeriodInclude,
    });

    if (!period) {
      throw new NotFoundException('Period not found');
    }

    return period;
  }

  async update(
    id: number,
    payload: UpdateLookupPeriodDto,
    actorUserId: string,
  ) {
    await this.ensurePeriodExists(id);

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedNameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const updated = await this.prisma.lookupPeriod.update({
        where: { id },
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: lookupPeriodInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_PERIOD_UPDATE',
        resource: 'lookup-periods',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensurePeriodExists(id);

    const linkedTemplateSlots = await this.prisma.timetableTemplateSlot.count({
      where: {
        lookupPeriodId: id,
        deletedAt: null,
      },
    });

    if (linkedTemplateSlots > 0) {
      throw new ConflictException(
        'Cannot delete period linked to active timetable template slots',
      );
    }

    await this.prisma.lookupPeriod.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'LOOKUP_PERIOD_DELETE',
      resource: 'lookup-periods',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensurePeriodExists(id: number) {
    const period = await this.prisma.lookupPeriod.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!period) {
      throw new NotFoundException('Period not found');
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
      throw new ConflictException('Period code already exists');
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
