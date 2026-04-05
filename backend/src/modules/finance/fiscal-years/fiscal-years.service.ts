import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { ListFiscalYearsDto } from './dto/list-fiscal-years.dto';
import { UpdateFiscalYearDto } from './dto/update-fiscal-year.dto';

const fiscalYearInclude: Prisma.FiscalYearInclude = {
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
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
};

@Injectable()
export class FiscalYearsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateFiscalYearDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const isClosed = payload.isClosed ?? false;

    try {
      const fiscalYear = await this.prisma.fiscalYear.create({
        data: {
          nameAr,
          startDate,
          endDate,
          academicYearId: payload.academicYearId,
          isClosed,
          closedAt: isClosed ? new Date() : null,
          closedByUserId: isClosed ? actorUserId : null,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: fiscalYearInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FISCAL_YEAR_CREATE',
        resource: 'fiscal-years',
        resourceId: String(fiscalYear.id),
        details: {
          nameAr: fiscalYear.nameAr,
          startDate: fiscalYear.startDate,
          endDate: fiscalYear.endDate,
        },
      });

      return fiscalYear;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'FISCAL_YEAR_CREATE_FAILED',
        resource: 'fiscal-years',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListFiscalYearsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.FiscalYearWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      isClosed: query.isClosed,
      academicYearId: query.academicYearId,
      startDate: query.dateFrom || query.dateTo
        ? {
            gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
            lte: query.dateTo ? new Date(query.dateTo) : undefined,
          }
        : undefined,
      OR: query.search
        ? [
            {
              nameAr: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.fiscalYear.count({ where }),
      this.prisma.fiscalYear.findMany({
        where,
        include: fiscalYearInclude,
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
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: fiscalYearInclude,
    });

    if (!fiscalYear) {
      throw new NotFoundException('Fiscal year not found');
    }

    return fiscalYear;
  }

  async update(id: number, payload: UpdateFiscalYearDto, actorUserId: string) {
    const existing = await this.ensureFiscalYearExists(id);

    const startDate = payload.startDate
      ? new Date(payload.startDate)
      : existing.startDate;
    const endDate = payload.endDate
      ? new Date(payload.endDate)
      : existing.endDate;

    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    const isClosed = payload.isClosed;
    const closedAt =
      isClosed === undefined
        ? undefined
        : isClosed
          ? existing.closedAt ?? new Date()
          : null;
    const closedByUserId =
      isClosed === undefined ? undefined : isClosed ? actorUserId : null;

    try {
      const updated = await this.prisma.fiscalYear.update({
        where: { id },
        data: {
          nameAr,
          startDate: payload.startDate ? startDate : undefined,
          endDate: payload.endDate ? endDate : undefined,
          academicYearId: payload.academicYearId,
          isClosed,
          closedAt,
          closedByUserId,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: fiscalYearInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FISCAL_YEAR_UPDATE',
        resource: 'fiscal-years',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureFiscalYearExists(id);

    await this.prisma.fiscalYear.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'FISCAL_YEAR_DELETE',
      resource: 'fiscal-years',
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
        closedAt: true,
      },
    });

    if (!fiscalYear) {
      throw new NotFoundException('Fiscal year not found');
    }

    return fiscalYear;
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
      throw new ConflictException('Fiscal year already exists');
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
