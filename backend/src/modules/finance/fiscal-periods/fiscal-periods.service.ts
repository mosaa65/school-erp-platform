import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, FiscalPeriodStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateFiscalPeriodDto } from './dto/create-fiscal-period.dto';
import { ListFiscalPeriodsDto } from './dto/list-fiscal-periods.dto';
import { UpdateFiscalPeriodDto } from './dto/update-fiscal-period.dto';

const fiscalPeriodInclude: Prisma.FiscalPeriodInclude = {
  fiscalYear: {
    select: {
      id: true,
      nameAr: true,
      startDate: true,
      endDate: true,
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
  closedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
  reopenedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
};

@Injectable()
export class FiscalPeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateFiscalPeriodDto, actorUserId: string) {
    const fiscalYear = await this.ensureFiscalYearExists(payload.fiscalYearId);
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    this.assertWithinFiscalYear(startDate, endDate, fiscalYear);

    const status = payload.status ?? FiscalPeriodStatus.OPEN;

    const closedAt = status === FiscalPeriodStatus.CLOSED ? new Date() : null;
    const closedByUserId =
      status === FiscalPeriodStatus.CLOSED ? actorUserId : null;
    const reopenedAt = status === FiscalPeriodStatus.REOPENED ? new Date() : null;
    const reopenedByUserId =
      status === FiscalPeriodStatus.REOPENED ? actorUserId : null;

    try {
      const period = await this.prisma.fiscalPeriod.create({
        data: {
          fiscalYearId: payload.fiscalYearId,
          periodNumber: payload.periodNumber,
          nameAr,
          periodType: payload.periodType,
          startDate,
          endDate,
          status,
          closedAt,
          closedByUserId,
          closeNotes: payload.closeNotes?.trim(),
          reopenedAt,
          reopenedByUserId,
          reopenReason: payload.reopenReason?.trim(),
          reopenDeadline: payload.reopenDeadline
            ? new Date(payload.reopenDeadline)
            : null,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: fiscalPeriodInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FISCAL_PERIOD_CREATE',
        resource: 'fiscal-periods',
        resourceId: String(period.id),
        details: {
          fiscalYearId: period.fiscalYearId,
          periodNumber: period.periodNumber,
        },
      });

      return period;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'FISCAL_PERIOD_CREATE_FAILED',
        resource: 'fiscal-periods',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListFiscalPeriodsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.FiscalPeriodWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      fiscalYearId: query.fiscalYearId,
      periodType: query.periodType,
      status: query.status,
      startDate: query.dateFrom || query.dateTo
        ? {
            gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
            lte: query.dateTo ? new Date(query.dateTo) : undefined,
          }
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.fiscalPeriod.count({ where }),
      this.prisma.fiscalPeriod.findMany({
        where,
        include: fiscalPeriodInclude,
        orderBy: [{ startDate: 'desc' }],
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
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: fiscalPeriodInclude,
    });

    if (!period) {
      throw new NotFoundException('Fiscal period not found');
    }

    return period;
  }

  async update(id: number, payload: UpdateFiscalPeriodDto, actorUserId: string) {
    const existing = await this.ensureFiscalPeriodExists(id);

    const fiscalYearId = payload.fiscalYearId ?? existing.fiscalYearId;
    const fiscalYear =
      payload.fiscalYearId === undefined
        ? null
        : await this.ensureFiscalYearExists(payload.fiscalYearId);

    const startDate = payload.startDate
      ? new Date(payload.startDate)
      : existing.startDate;
    const endDate = payload.endDate
      ? new Date(payload.endDate)
      : existing.endDate;

    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const targetYear = fiscalYear ?? (await this.ensureFiscalYearExists(fiscalYearId));
    this.assertWithinFiscalYear(startDate, endDate, targetYear);

    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    const status = payload.status;

    const closedAt =
      status === undefined
        ? undefined
        : status === FiscalPeriodStatus.CLOSED
          ? new Date()
          : null;
    const closedByUserId =
      status === undefined
        ? undefined
        : status === FiscalPeriodStatus.CLOSED
          ? actorUserId
          : null;
    const reopenedAt =
      status === undefined
        ? undefined
        : status === FiscalPeriodStatus.REOPENED
          ? new Date()
          : null;
    const reopenedByUserId =
      status === undefined
        ? undefined
        : status === FiscalPeriodStatus.REOPENED
          ? actorUserId
          : null;

    try {
      const updated = await this.prisma.fiscalPeriod.update({
        where: { id },
        data: {
          fiscalYearId: payload.fiscalYearId,
          periodNumber: payload.periodNumber,
          nameAr,
          periodType: payload.periodType,
          startDate: payload.startDate ? startDate : undefined,
          endDate: payload.endDate ? endDate : undefined,
          status,
          closedAt,
          closedByUserId,
          closeNotes: payload.closeNotes?.trim(),
          reopenedAt,
          reopenedByUserId,
          reopenReason: payload.reopenReason?.trim(),
          reopenDeadline: payload.reopenDeadline
            ? new Date(payload.reopenDeadline)
            : undefined,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: fiscalPeriodInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FISCAL_PERIOD_UPDATE',
        resource: 'fiscal-periods',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureFiscalPeriodExists(id);

    await this.prisma.fiscalPeriod.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'FISCAL_PERIOD_DELETE',
      resource: 'fiscal-periods',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureFiscalYearExists(id: number) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!fiscalYear) {
      throw new NotFoundException('Fiscal year not found');
    }

    return fiscalYear;
  }

  private async ensureFiscalPeriodExists(id: number) {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        fiscalYearId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!period) {
      throw new NotFoundException('Fiscal period not found');
    }

    return period;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private assertWithinFiscalYear(
    startDate: Date,
    endDate: Date,
    fiscalYear: { startDate: Date; endDate: Date },
  ) {
    if (startDate < fiscalYear.startDate || endDate > fiscalYear.endDate) {
      throw new BadRequestException('Period dates must fall within fiscal year');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Fiscal period already exists');
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
