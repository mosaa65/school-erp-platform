import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AcademicMonth,
  AuditStatus,
  GradingWorkflowStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateAcademicMonthDto } from './dto/create-academic-month.dto';
import { ListAcademicMonthsDto } from './dto/list-academic-months.dto';
import { UpdateAcademicMonthDto } from './dto/update-academic-month.dto';

type DateInput = string | Date | null | undefined;

const academicMonthInclude: Prisma.AcademicMonthInclude = {
  _count: {
    select: {
      monthlyGrades: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      isCurrent: true,
    },
  },
  academicTerm: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      termType: true,
      isActive: true,
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
};

@Injectable()
export class AcademicMonthsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateAcademicMonthDto, actorUserId: string) {
    const startDate = this.parseDate(payload.startDate, 'startDate');
    const endDate = this.parseDate(payload.endDate, 'endDate');
    this.ensureDateRange(startDate, endDate);

    await this.ensureYearAndTermConsistency(
      payload.academicYearId,
      payload.academicTermId,
    );
    await this.ensureDatesWithinTerm(
      payload.academicTermId,
      startDate,
      endDate,
    );
    await this.ensureNoDateOverlap(
      payload.academicTermId,
      startDate,
      endDate,
      undefined,
    );

    const code = payload.code.trim().toUpperCase();
    const name = payload.name.trim();

    if (!code) {
      throw new BadRequestException('code cannot be empty');
    }

    if (!name) {
      throw new BadRequestException('name cannot be empty');
    }

    try {
      const academicMonth = await this.prisma.$transaction(async (tx) => {
        if (payload.isCurrent) {
          await tx.academicMonth.updateMany({
            where: {
              academicTermId: payload.academicTermId,
              deletedAt: null,
              isCurrent: true,
            },
            data: {
              isCurrent: false,
              updatedById: actorUserId,
            },
          });
        }

        return tx.academicMonth.create({
          data: {
            academicYearId: payload.academicYearId,
            academicTermId: payload.academicTermId,
            code,
            name,
            sequence: payload.sequence,
            startDate,
            endDate,
            status: payload.status ?? GradingWorkflowStatus.DRAFT,
            isCurrent: payload.isCurrent ?? false,
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: academicMonthInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ACADEMIC_MONTH_CREATE',
        resource: 'academic-months',
        resourceId: academicMonth.id,
        details: {
          academicYearId: academicMonth.academicYearId,
          academicTermId: academicMonth.academicTermId,
          code: academicMonth.code,
          sequence: academicMonth.sequence,
        },
      });

      return academicMonth;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'ACADEMIC_MONTH_CREATE_FAILED',
        resource: 'academic-months',
        status: AuditStatus.FAILURE,
        details: {
          academicYearId: payload.academicYearId,
          academicTermId: payload.academicTermId,
          code: payload.code,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListAcademicMonthsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AcademicMonthWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      academicTermId: query.academicTermId,
      status: query.status,
      isCurrent: query.isCurrent,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              code: {
                contains: query.search,
              },
            },
            {
              name: {
                contains: query.search,
              },
            },
            {
              academicTerm: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              academicYear: {
                name: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.academicMonth.count({ where }),
      this.prisma.academicMonth.findMany({
        where,
        include: academicMonthInclude,
        orderBy: [
          {
            academicYear: {
              startDate: 'desc',
            },
          },
          {
            academicTerm: {
              sequence: 'asc',
            },
          },
          {
            sequence: 'asc',
          },
        ],
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
    const academicMonth = await this.prisma.academicMonth.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: academicMonthInclude,
    });

    if (!academicMonth) {
      throw new NotFoundException('Academic month not found');
    }

    return academicMonth;
  }

  async update(
    id: string,
    payload: UpdateAcademicMonthDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureAcademicMonthExists(id);

    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const resolvedAcademicTermId =
      payload.academicTermId ?? existing.academicTermId;
    const resolvedStartDate = this.parseDate(
      payload.startDate ?? existing.startDate,
      'startDate',
    );
    const resolvedEndDate = this.parseDate(
      payload.endDate ?? existing.endDate,
      'endDate',
    );

    this.ensureDateRange(resolvedStartDate, resolvedEndDate);
    await this.ensureYearAndTermConsistency(
      resolvedAcademicYearId,
      resolvedAcademicTermId,
    );
    await this.ensureDatesWithinTerm(
      resolvedAcademicTermId,
      resolvedStartDate,
      resolvedEndDate,
    );
    await this.ensureNoDateOverlap(
      resolvedAcademicTermId,
      resolvedStartDate,
      resolvedEndDate,
      id,
    );

    const code =
      payload.code === undefined
        ? undefined
        : payload.code.trim().toUpperCase();
    const name = payload.name === undefined ? undefined : payload.name.trim();

    if (code !== undefined && !code) {
      throw new BadRequestException('code cannot be empty');
    }

    if (name !== undefined && !name) {
      throw new BadRequestException('name cannot be empty');
    }

    try {
      const academicMonth = await this.prisma.$transaction(async (tx) => {
        const shouldSetCurrent = payload.isCurrent === true;

        if (shouldSetCurrent) {
          await tx.academicMonth.updateMany({
            where: {
              academicTermId: resolvedAcademicTermId,
              deletedAt: null,
              isCurrent: true,
              id: {
                not: id,
              },
            },
            data: {
              isCurrent: false,
              updatedById: actorUserId,
            },
          });
        }

        return tx.academicMonth.update({
          where: {
            id,
          },
          data: {
            academicYearId: payload.academicYearId,
            academicTermId: payload.academicTermId,
            code,
            name,
            sequence: payload.sequence,
            startDate: payload.startDate,
            endDate: payload.endDate,
            status: payload.status,
            isCurrent: payload.isCurrent,
            isActive: payload.isActive,
            updatedById: actorUserId,
          },
          include: academicMonthInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ACADEMIC_MONTH_UPDATE',
        resource: 'academic-months',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return academicMonth;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureAcademicMonthExists(id);

    const linkedMonthlyGradesCount = await this.prisma.monthlyGrade.count({
      where: {
        academicMonthId: id,
        deletedAt: null,
      },
    });

    if (linkedMonthlyGradesCount > 0) {
      throw new ConflictException(
        'Cannot delete an academic month linked to active monthly grades',
      );
    }

    await this.prisma.academicMonth.update({
      where: {
        id,
      },
      data: {
        isCurrent: false,
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ACADEMIC_MONTH_DELETE',
      resource: 'academic-months',
      resourceId: existing.id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureAcademicMonthExists(id: string): Promise<AcademicMonth> {
    const academicMonth = await this.prisma.academicMonth.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!academicMonth) {
      throw new NotFoundException('Academic month not found');
    }

    return academicMonth;
  }

  private async ensureYearAndTermConsistency(
    academicYearId: string,
    academicTermId: string,
  ) {
    const term = await this.prisma.academicTerm.findFirst({
      where: {
        id: academicTermId,
        deletedAt: null,
      },
      select: {
        id: true,
        academicYearId: true,
        isActive: true,
      },
    });

    if (!term) {
      throw new BadRequestException('Academic term is invalid or deleted');
    }

    if (!term.isActive) {
      throw new BadRequestException('Academic term is inactive');
    }

    if (term.academicYearId !== academicYearId) {
      throw new BadRequestException(
        'Academic term does not belong to the selected academic year',
      );
    }
  }

  private async ensureDatesWithinTerm(
    academicTermId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const term = await this.prisma.academicTerm.findFirst({
      where: {
        id: academicTermId,
        deletedAt: null,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!term) {
      throw new BadRequestException('Academic term is invalid or deleted');
    }

    if (startDate < term.startDate || endDate > term.endDate) {
      throw new BadRequestException(
        'Academic month date range must be within the selected academic term',
      );
    }
  }

  private async ensureNoDateOverlap(
    academicTermId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ) {
    const overlappingMonth = await this.prisma.academicMonth.findFirst({
      where: {
        academicTermId,
        deletedAt: null,
        id: excludeId
          ? {
              not: excludeId,
            }
          : undefined,
        startDate: {
          lte: endDate,
        },
        endDate: {
          gte: startDate,
        },
      },
      select: {
        id: true,
      },
    });

    if (overlappingMonth) {
      throw new ConflictException(
        'Academic month date range overlaps with another month in the same term',
      );
    }
  }

  private ensureDateRange(startDate: Date, endDate: Date) {
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be after or equal startDate');
    }
  }

  private parseDate(value: DateInput, fieldName: string): Date {
    if (value === undefined || value === null) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Invalid datetime format for ${fieldName}`);
    }

    return parsedDate;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Academic month code and sequence must be unique within the same academic term',
      );
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
