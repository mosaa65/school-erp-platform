import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentComponentEntryMode,
  AssessmentPeriodCategory,
  AuditStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateAssessmentComponentSourcePeriodDto } from './dto/create-assessment-component-source-period.dto';
import { ListAssessmentComponentSourcePeriodsDto } from './dto/list-assessment-component-source-periods.dto';
import { UpdateAssessmentComponentSourcePeriodDto } from './dto/update-assessment-component-source-period.dto';

const sourceInclude: Prisma.AssessmentComponentSourcePeriodInclude = {
  assessmentPeriodComponent: {
    select: {
      id: true,
      name: true,
      entryMode: true,
      assessmentPeriodId: true,
    },
  },
  sourcePeriod: {
    select: {
      id: true,
      name: true,
      category: true,
      academicYearId: true,
      academicTermId: true,
      academicMonthId: true,
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
export class AssessmentComponentSourcePeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    payload: CreateAssessmentComponentSourcePeriodDto,
    actorUserId: string,
  ) {
    const component = await this.ensureComponentExists(
      payload.assessmentPeriodComponentId,
    );

    if (component.entryMode !== AssessmentComponentEntryMode.AGGREGATED_PERIODS) {
      throw new BadRequestException(
        'Component entryMode must be AGGREGATED_PERIODS',
      );
    }

    const sourcePeriod = await this.ensureSourcePeriodExists(
      payload.sourcePeriodId,
    );

    if (sourcePeriod.academicYearId !== component.assessmentPeriod.academicYearId) {
      throw new BadRequestException('Source period academic year mismatch');
    }

    if (sourcePeriod.category !== AssessmentPeriodCategory.MONTHLY) {
      throw new BadRequestException('Source period must be MONTHLY');
    }

    try {
      const record = await this.prisma.assessmentComponentSourcePeriod.create({
        data: {
          assessmentPeriodComponentId: payload.assessmentPeriodComponentId,
          sourcePeriodId: payload.sourcePeriodId,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: sourceInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ASSESSMENT_COMPONENT_SOURCE_CREATE',
        resource: 'assessment-component-source-periods',
        resourceId: record.id,
        details: {
          assessmentPeriodComponentId: record.assessmentPeriodComponentId,
          sourcePeriodId: record.sourcePeriodId,
        },
      });

      return record;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'ASSESSMENT_COMPONENT_SOURCE_CREATE_FAILED',
        resource: 'assessment-component-source-periods',
        status: AuditStatus.FAILURE,
        details: {
          assessmentPeriodComponentId: payload.assessmentPeriodComponentId,
          sourcePeriodId: payload.sourcePeriodId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListAssessmentComponentSourcePeriodsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AssessmentComponentSourcePeriodWhereInput = {
      deletedAt: null,
      assessmentPeriodComponentId: query.assessmentPeriodComponentId,
      sourcePeriodId: query.sourcePeriodId,
      isActive: query.isActive,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.assessmentComponentSourcePeriod.count({ where }),
      this.prisma.assessmentComponentSourcePeriod.findMany({
        where,
        include: sourceInclude,
        orderBy: [{ createdAt: 'desc' }],
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
    const record = await this.prisma.assessmentComponentSourcePeriod.findFirst({
      where: { id, deletedAt: null },
      include: sourceInclude,
    });

    if (!record) {
      throw new NotFoundException('Assessment component source period not found');
    }

    return record;
  }

  async update(
    id: string,
    payload: UpdateAssessmentComponentSourcePeriodDto,
    actorUserId: string,
  ) {
    await this.ensureSourceLinkExists(id);

    try {
      const record = await this.prisma.assessmentComponentSourcePeriod.update({
        where: { id },
        data: {
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: sourceInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ASSESSMENT_COMPONENT_SOURCE_UPDATE',
        resource: 'assessment-component-source-periods',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return record;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureSourceLinkExists(id);

    await this.prisma.assessmentComponentSourcePeriod.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ASSESSMENT_COMPONENT_SOURCE_DELETE',
      resource: 'assessment-component-source-periods',
      resourceId: id,
    });

    return { success: true, id };
  }

  private async ensureComponentExists(id: string) {
    const component = await this.prisma.assessmentPeriodComponent.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        entryMode: true,
        assessmentPeriod: {
          select: {
            id: true,
            academicYearId: true,
          },
        },
      },
    });

    if (!component) {
      throw new BadRequestException('Assessment period component not found');
    }

    return component;
  }

  private async ensureSourcePeriodExists(id: string) {
    const period = await this.prisma.assessmentPeriod.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        academicYearId: true,
        category: true,
      },
    });

    if (!period) {
      throw new BadRequestException('Source assessment period not found');
    }

    return period;
  }

  private async ensureSourceLinkExists(id: string) {
    const record = await this.prisma.assessmentComponentSourcePeriod.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException('Assessment component source period not found');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Source period already linked');
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
