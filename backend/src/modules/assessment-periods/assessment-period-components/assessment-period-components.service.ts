import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentComponentEntryMode,
  AuditStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { generateAutoCode } from '../../../common/utils/auto-code';
import { CreateAssessmentPeriodComponentDto } from './dto/create-assessment-period-component.dto';
import { ListAssessmentPeriodComponentsDto } from './dto/list-assessment-period-components.dto';
import { UpdateAssessmentPeriodComponentDto } from './dto/update-assessment-period-component.dto';

const componentInclude: Prisma.AssessmentPeriodComponentInclude = {
  assessmentPeriod: {
    select: {
      id: true,
      name: true,
      category: true,
      academicYearId: true,
      academicTermId: true,
      academicMonthId: true,
      status: true,
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
};

@Injectable()
export class AssessmentPeriodComponentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    payload: CreateAssessmentPeriodComponentDto,
    actorUserId: string,
  ) {
    await this.ensurePeriodExists(payload.assessmentPeriodId);

    const code =
      payload.code?.trim().toUpperCase() || generateAutoCode('APC', 50);
    const name = payload.name.trim();
    if (!name) {
      throw new BadRequestException('name cannot be empty');
    }

    try {
      const component = await this.prisma.assessmentPeriodComponent.create({
        data: {
          assessmentPeriodId: payload.assessmentPeriodId,
          code,
          name,
          entryMode: payload.entryMode ?? AssessmentComponentEntryMode.MANUAL,
          maxScore: payload.maxScore ?? 0,
          sortOrder: payload.sortOrder ?? 1,
          isRequired: payload.isRequired ?? true,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: componentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ASSESSMENT_PERIOD_COMPONENT_CREATE',
        resource: 'assessment-period-components',
        resourceId: component.id,
        details: {
          assessmentPeriodId: component.assessmentPeriodId,
          code: component.code,
          entryMode: component.entryMode,
        },
      });

      return component;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'ASSESSMENT_PERIOD_COMPONENT_CREATE_FAILED',
        resource: 'assessment-period-components',
        status: AuditStatus.FAILURE,
        details: {
          assessmentPeriodId: payload.assessmentPeriodId,
          code,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListAssessmentPeriodComponentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AssessmentPeriodComponentWhereInput = {
      deletedAt: null,
      assessmentPeriodId: query.assessmentPeriodId,
      entryMode: query.entryMode,
      isActive: query.isActive,
      OR: query.search
        ? [
            { code: { contains: query.search } },
            { name: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.assessmentPeriodComponent.count({ where }),
      this.prisma.assessmentPeriodComponent.findMany({
        where,
        include: componentInclude,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
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
    const component = await this.prisma.assessmentPeriodComponent.findFirst({
      where: { id, deletedAt: null },
      include: componentInclude,
    });

    if (!component) {
      throw new NotFoundException('Assessment period component not found');
    }

    return component;
  }

  async update(
    id: string,
    payload: UpdateAssessmentPeriodComponentDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureComponentExists(id);

    const code = payload.code?.trim().toUpperCase();
    const name = payload.name?.trim();
    if (payload.name !== undefined && !name) {
      throw new BadRequestException('name cannot be empty');
    }

    try {
      const component = await this.prisma.assessmentPeriodComponent.update({
        where: { id },
        data: {
          code,
          name,
          entryMode: payload.entryMode,
          maxScore: payload.maxScore,
          sortOrder: payload.sortOrder,
          isRequired: payload.isRequired,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: componentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ASSESSMENT_PERIOD_COMPONENT_UPDATE',
        resource: 'assessment-period-components',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return component;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureComponentExists(id);

    await this.prisma.assessmentPeriodComponent.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ASSESSMENT_PERIOD_COMPONENT_DELETE',
      resource: 'assessment-period-components',
      resourceId: id,
    });

    return { success: true, id };
  }

  private async ensurePeriodExists(id: string) {
    const period = await this.prisma.assessmentPeriod.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!period) {
      throw new BadRequestException('Assessment period not found');
    }
  }

  private async ensureComponentExists(id: string) {
    const component = await this.prisma.assessmentPeriodComponent.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!component) {
      throw new NotFoundException('Assessment period component not found');
    }

    return component;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Component code must be unique per period');
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
