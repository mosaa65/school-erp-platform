import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentPeriodCategory,
  AuditStatus,
  GradingWorkflowStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateAssessmentPeriodDto } from './dto/create-assessment-period.dto';
import { ListAssessmentPeriodsDto } from './dto/list-assessment-periods.dto';
import { UpdateAssessmentPeriodDto } from './dto/update-assessment-period.dto';

const assessmentPeriodInclude: Prisma.AssessmentPeriodInclude = {
  _count: {
    select: {
      components: true,
      results: true,
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
      isActive: true,
    },
  },
  academicMonth: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      isCurrent: true,
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
  lockedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
};

@Injectable()
export class AssessmentPeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateAssessmentPeriodDto, actorUserId: string) {
    const name = payload.name.trim();
    if (!name) {
      throw new BadRequestException('name cannot be empty');
    }

    const resolved = await this.resolveScope(payload);

    try {
      const period = await this.prisma.assessmentPeriod.create({
        data: {
          academicYearId: resolved.academicYearId,
          academicTermId: resolved.academicTermId,
          academicMonthId: resolved.academicMonthId,
          category: resolved.category,
          name,
          sequence: payload.sequence ?? 1,
          maxScore: payload.maxScore ?? 100,
          status: payload.status ?? GradingWorkflowStatus.DRAFT,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: assessmentPeriodInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ASSESSMENT_PERIOD_CREATE',
        resource: 'assessment-periods',
        resourceId: period.id,
        details: {
          category: period.category,
          academicYearId: period.academicYearId,
          academicTermId: period.academicTermId,
          academicMonthId: period.academicMonthId,
          name: period.name,
        },
      });

      return period;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'ASSESSMENT_PERIOD_CREATE_FAILED',
        resource: 'assessment-periods',
        status: AuditStatus.FAILURE,
        details: {
          category: payload.category,
          academicYearId: payload.academicYearId,
          academicTermId: payload.academicTermId,
          academicMonthId: payload.academicMonthId,
          name,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListAssessmentPeriodsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AssessmentPeriodWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      academicTermId: query.academicTermId,
      academicMonthId: query.academicMonthId,
      category: query.category,
      status: query.status,
      isLocked: query.isLocked,
      isActive: query.isActive,
      OR: query.search
        ? [
            { name: { contains: query.search } },
            {
              academicTerm: { name: { contains: query.search } },
            },
            {
              academicMonth: { name: { contains: query.search } },
            },
            {
              academicYear: { name: { contains: query.search } },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.assessmentPeriod.count({ where }),
      this.prisma.assessmentPeriod.findMany({
        where,
        include: assessmentPeriodInclude,
        orderBy: [
          { academicYear: { startDate: 'desc' } },
          { sequence: 'asc' },
          { createdAt: 'desc' },
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
    const period = await this.prisma.assessmentPeriod.findFirst({
      where: { id, deletedAt: null },
      include: assessmentPeriodInclude,
    });

    if (!period) {
      throw new NotFoundException('Assessment period not found');
    }

    return period;
  }

  async update(
    id: string,
    payload: UpdateAssessmentPeriodDto,
    actorUserId: string,
  ) {
    const existing = await this.ensurePeriodExists(id);

    const mergedPayload: CreateAssessmentPeriodDto = {
      academicYearId: payload.academicYearId ?? existing.academicYearId,
      category: payload.category ?? existing.category,
      academicTermId:
        payload.academicTermId !== undefined
          ? payload.academicTermId ?? undefined
          : existing.academicTermId ?? undefined,
      academicMonthId:
        payload.academicMonthId !== undefined
          ? payload.academicMonthId ?? undefined
          : existing.academicMonthId ?? undefined,
      name: payload.name ?? existing.name,
      sequence: payload.sequence ?? existing.sequence,
      maxScore:
        payload.maxScore ?? this.decimalToNumber(existing.maxScore) ?? 100,
      status: payload.status ?? existing.status,
      isActive: payload.isActive ?? existing.isActive,
    };

    const resolved = await this.resolveScope(mergedPayload);
    const name = mergedPayload.name.trim();
    if (!name) {
      throw new BadRequestException('name cannot be empty');
    }

    const status = payload.status ?? existing.status;
    const shouldLock = status === GradingWorkflowStatus.APPROVED;

    try {
      const period = await this.prisma.assessmentPeriod.update({
        where: { id },
        data: {
          academicYearId: resolved.academicYearId,
          academicTermId: resolved.academicTermId,
          academicMonthId: resolved.academicMonthId,
          category: resolved.category,
          name,
          sequence: payload.sequence,
          maxScore: payload.maxScore,
          status,
          isLocked: shouldLock ? true : existing.isLocked,
          lockedAt: shouldLock ? new Date() : existing.lockedAt,
          lockedByUserId: shouldLock ? actorUserId : existing.lockedByUserId,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: assessmentPeriodInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ASSESSMENT_PERIOD_UPDATE',
        resource: 'assessment-periods',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return period;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensurePeriodExists(id);

    await this.prisma.assessmentPeriod.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ASSESSMENT_PERIOD_DELETE',
      resource: 'assessment-periods',
      resourceId: id,
    });

    return { success: true, id };
  }

  async lock(id: string, actorUserId: string) {
    const existing = await this.ensurePeriodExists(id);

    if (existing.isLocked) {
      throw new ConflictException('Assessment period is already locked');
    }

    const period = await this.prisma.assessmentPeriod.update({
      where: { id },
      data: {
        status: GradingWorkflowStatus.APPROVED,
        isLocked: true,
        lockedAt: new Date(),
        lockedByUserId: actorUserId,
        updatedById: actorUserId,
      },
      include: assessmentPeriodInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ASSESSMENT_PERIOD_LOCK',
      resource: 'assessment-periods',
      resourceId: id,
    });

    return period;
  }

  async unlock(id: string, actorUserId: string) {
    const existing = await this.ensurePeriodExists(id);

    if (!existing.isLocked) {
      throw new ConflictException('Assessment period is not locked');
    }

    const period = await this.prisma.assessmentPeriod.update({
      where: { id },
      data: {
        status:
          existing.status === GradingWorkflowStatus.ARCHIVED
            ? GradingWorkflowStatus.ARCHIVED
            : GradingWorkflowStatus.DRAFT,
        isLocked: false,
        lockedAt: null,
        lockedByUserId: null,
        updatedById: actorUserId,
      },
      include: assessmentPeriodInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ASSESSMENT_PERIOD_UNLOCK',
      resource: 'assessment-periods',
      resourceId: id,
    });

    return period;
  }

  private async resolveScope(payload: CreateAssessmentPeriodDto) {
    const academicYearId = payload.academicYearId;
    const category = payload.category;
    const academicTermId = payload.academicTermId ?? null;
    const academicMonthId = payload.academicMonthId ?? null;

    if (category === AssessmentPeriodCategory.MONTHLY) {
      if (!academicMonthId) {
        throw new BadRequestException(
          'academicMonthId is required for MONTHLY periods',
        );
      }

      const month = await this.ensureAcademicMonthExists(academicMonthId);
      if (month.academicYearId !== academicYearId) {
        throw new BadRequestException('Academic month year mismatch');
      }
      if (academicTermId && month.academicTermId !== academicTermId) {
        throw new BadRequestException('Academic month term mismatch');
      }

      return {
        academicYearId,
        category,
        academicMonthId: month.id,
        academicTermId: month.academicTermId,
      };
    }

    if (category === AssessmentPeriodCategory.SEMESTER) {
      if (!academicTermId) {
        throw new BadRequestException(
          'academicTermId is required for SEMESTER periods',
        );
      }
      if (academicMonthId) {
        throw new BadRequestException(
          'academicMonthId is not allowed for SEMESTER periods',
        );
      }

      const term = await this.ensureAcademicTermExists(academicTermId);
      if (term.academicYearId !== academicYearId) {
        throw new BadRequestException('Academic term year mismatch');
      }

      return {
        academicYearId,
        category,
        academicTermId: term.id,
        academicMonthId: null,
      };
    }

    if (academicTermId || academicMonthId) {
      throw new BadRequestException(
        'YEAR_FINAL period must not be linked to term or month',
      );
    }

    return {
      academicYearId,
      category: AssessmentPeriodCategory.YEAR_FINAL,
      academicTermId: null,
      academicMonthId: null,
    };
  }

  private async ensurePeriodExists(id: string) {
    const period = await this.prisma.assessmentPeriod.findFirst({
      where: { id, deletedAt: null },
    });

    if (!period) {
      throw new NotFoundException('Assessment period not found');
    }

    return period;
  }

  private async ensureAcademicMonthExists(id: string) {
    const month = await this.prisma.academicMonth.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        academicYearId: true,
        academicTermId: true,
      },
    });

    if (!month) {
      throw new BadRequestException('Academic month not found');
    }

    return month;
  }

  private async ensureAcademicTermExists(id: string) {
    const term = await this.prisma.academicTerm.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, academicYearId: true },
    });

    if (!term) {
      throw new BadRequestException('Academic term not found');
    }

    return term;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Assessment period already exists');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  private decimalToNumber(value: Prisma.Decimal | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }

    return Number(value);
  }
}
