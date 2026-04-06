import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, GradingComponentCalculationMode, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { generateAutoCode } from '../../../common/utils/auto-code';
import { CreateGradingPolicyComponentDto } from './dto/create-grading-policy-component.dto';
import { ListGradingPolicyComponentsDto } from './dto/list-grading-policy-components.dto';
import { UpdateGradingPolicyComponentDto } from './dto/update-grading-policy-component.dto';

const gradingPolicyComponentInclude: Prisma.GradingPolicyComponentInclude = {
  gradingPolicy: {
    select: {
      id: true,
      academicYearId: true,
      gradeLevelId: true,
      subjectId: true,
      assessmentType: true,
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
export class GradingPolicyComponentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateGradingPolicyComponentDto, actorUserId: string) {
    const gradingPolicyId = payload.gradingPolicyId;
    await this.ensurePolicyExists(gradingPolicyId);
    await this.ensureAutoModeUnique(
      gradingPolicyId,
      payload.calculationMode,
    );

    const code =
      payload.code?.trim().toUpperCase() || generateAutoCode('GPC', 50);
    const name = payload.name.trim();

    try {
      const component = await this.prisma.gradingPolicyComponent.create({
        data: {
          gradingPolicyId,
          code,
          name,
          maxScore: payload.maxScore,
          calculationMode: payload.calculationMode,
          includeInMonthly: payload.includeInMonthly ?? true,
          includeInSemester: payload.includeInSemester ?? true,
          weight: payload.weight,
          autoSourceType: payload.autoSourceType?.trim() || null,
          isRequired: payload.isRequired ?? true,
          sortOrder: payload.sortOrder ?? 1,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: gradingPolicyComponentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_POLICY_COMPONENT_CREATE',
        resource: 'grading-policy-components',
        resourceId: component.id,
        details: {
          gradingPolicyId,
          code,
          calculationMode: payload.calculationMode,
        },
      });

      return component;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_POLICY_COMPONENT_CREATE_FAILED',
        resource: 'grading-policy-components',
        status: AuditStatus.FAILURE,
        details: {
          gradingPolicyId,
          code,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListGradingPolicyComponentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.GradingPolicyComponentWhereInput = {
      deletedAt: null,
      gradingPolicyId: query.gradingPolicyId,
      calculationMode: query.calculationMode,
      includeInMonthly: query.includeInMonthly,
      includeInSemester: query.includeInSemester,
      isActive: query.isActive,
      OR: query.search
        ? [
            { code: { contains: query.search } },
            { name: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.gradingPolicyComponent.count({ where }),
      this.prisma.gradingPolicyComponent.findMany({
        where,
        include: gradingPolicyComponentInclude,
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
    const component = await this.prisma.gradingPolicyComponent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: gradingPolicyComponentInclude,
    });

    if (!component) {
      throw new NotFoundException('لم يتم العثور على مكوّن سياسة الدرجات');
    }

    return component;
  }

  async update(
    id: string,
    payload: UpdateGradingPolicyComponentDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureComponentExists(id);

    if (payload.calculationMode) {
      await this.ensureAutoModeUnique(
        existing.gradingPolicyId,
        payload.calculationMode,
        existing.id,
      );
    }

    const code = payload.code?.trim().toUpperCase();
    const name = payload.name?.trim();

    try {
      const component = await this.prisma.gradingPolicyComponent.update({
        where: {
          id,
        },
        data: {
          code: code ?? undefined,
          name,
          maxScore: payload.maxScore,
          calculationMode: payload.calculationMode,
          includeInMonthly: payload.includeInMonthly,
          includeInSemester: payload.includeInSemester,
          weight: payload.weight,
          autoSourceType: payload.autoSourceType,
          isRequired: payload.isRequired,
          sortOrder: payload.sortOrder,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: gradingPolicyComponentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_POLICY_COMPONENT_UPDATE',
        resource: 'grading-policy-components',
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

    await this.prisma.gradingPolicyComponent.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'GRADING_POLICY_COMPONENT_DELETE',
      resource: 'grading-policy-components',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensurePolicyExists(gradingPolicyId: string) {
    const policy = await this.prisma.gradingPolicy.findFirst({
      where: {
        id: gradingPolicyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!policy) {
      throw new BadRequestException('سياسة الدرجات غير صالحة أو محذوفة');
    }
  }

  private async ensureAutoModeUnique(
    gradingPolicyId: string,
    calculationMode: GradingComponentCalculationMode,
    excludeId?: string,
  ) {
    if (calculationMode === GradingComponentCalculationMode.MANUAL) {
      return;
    }

    const existing = await this.prisma.gradingPolicyComponent.findFirst({
      where: {
        gradingPolicyId,
        calculationMode,
        deletedAt: null,
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'يوجد مكوّن تلقائي نشط بنفس النوع داخل سياسة الدرجات',
      );
    }
  }

  private async ensureComponentExists(id: string) {
    const component = await this.prisma.gradingPolicyComponent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        gradingPolicyId: true,
      },
    });

    if (!component) {
      throw new NotFoundException('لم يتم العثور على مكوّن سياسة الدرجات');
    }

    return component;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'مكوّن سياسة الدرجات موجود مسبقًا بنفس الرمز داخل السياسة',
      );
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'خطأ غير معروف';
  }
}
