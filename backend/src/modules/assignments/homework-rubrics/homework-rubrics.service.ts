import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { generateAutoCode } from '../../../common/utils/auto-code';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { HomeworkRubricCriterionDto } from './dto/homework-rubric-criterion.dto';
import { CreateHomeworkRubricDto } from './dto/create-homework-rubric.dto';
import { ListHomeworkRubricsDto } from './dto/list-homework-rubrics.dto';
import { UpdateHomeworkRubricDto } from './dto/update-homework-rubric.dto';

const homeworkRubricInclude: Prisma.HomeworkRubricInclude = {
  homeworkType: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  },
  subject: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  },
  gradeLevel: {
    select: {
      id: true,
      code: true,
      name: true,
      stage: true,
      isActive: true,
    },
  },
  criteria: {
    where: {
      deletedAt: null,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
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

type NormalizedCriterion = {
  title: string;
  description: string | null;
  maxScore: number;
  weight: number;
  sortOrder: number;
  isActive: boolean;
};

@Injectable()
export class HomeworkRubricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateHomeworkRubricDto, actorUserId: string) {
    const normalizedCode = payload.code
      ? this.normalizeCode(payload.code)
      : generateAutoCode('RUB', 50);
    const normalizedName = this.normalizeRequiredText(payload.name, 'اسم المعيار');
    const normalizedDescription = payload.description?.trim() || null;
    const normalizedDifficulty = this.normalizeDifficulty(payload.difficulty);
    const normalizedMaxScore = this.normalizeDecimal(
      payload.maxScore ?? 10,
      'الدرجة الكلية',
    );

    const homeworkTypeId = this.normalizeOptionalRelationId(payload.homeworkTypeId);
    const subjectId = this.normalizeOptionalRelationId(payload.subjectId);
    const gradeLevelId = this.normalizeOptionalRelationId(payload.gradeLevelId);

    await Promise.all([
      this.ensureHomeworkTypeExists(homeworkTypeId),
      this.ensureSubjectExists(subjectId),
      this.ensureGradeLevelExists(gradeLevelId),
    ]);

    const normalizedCriteria = this.normalizeCriteria(
      payload.criteria,
      normalizedMaxScore,
    );

    try {
      const rubric = await this.prisma.homeworkRubric.create({
        data: {
          code: normalizedCode,
          name: normalizedName,
          description: normalizedDescription,
          homeworkTypeId,
          subjectId,
          gradeLevelId,
          difficulty: normalizedDifficulty,
          maxScore: normalizedMaxScore,
          isSystem: payload.isSystem ?? false,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        criteria: {
          create: normalizedCriteria.map((criterion: NormalizedCriterion) => ({
              title: criterion.title,
              description: criterion.description,
              maxScore: criterion.maxScore,
              weight: criterion.weight,
              sortOrder: criterion.sortOrder,
              isActive: criterion.isActive,
              createdById: actorUserId,
              updatedById: actorUserId,
            })),
          },
        },
        include: homeworkRubricInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_RUBRIC_CREATE',
        resource: 'homework-rubrics',
        resourceId: rubric.id,
        details: {
          code: rubric.code,
          name: rubric.name,
          criteriaCount: rubric.criteria.length,
        },
      });

      return rubric;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_RUBRIC_CREATE_FAILED',
        resource: 'homework-rubrics',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListHomeworkRubricsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.HomeworkRubricWhereInput = {
      deletedAt: null,
      homeworkTypeId: query.homeworkTypeId,
      subjectId: query.subjectId,
      gradeLevelId: query.gradeLevelId,
      difficulty: query.difficulty,
      isSystem: query.isSystem,
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
              description: {
                contains: query.search,
              },
            },
            {
              criteria: {
                some: {
                  deletedAt: null,
                  OR: [
                    {
                      title: {
                        contains: query.search,
                      },
                    },
                    {
                      description: {
                        contains: query.search,
                      },
                    },
                  ],
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
        this.prisma.homeworkRubric.count({ where }),
        this.prisma.homeworkRubric.findMany({
        where,
        include: homeworkRubricInclude,
        orderBy: [{ isSystem: 'desc' }, { updatedAt: 'desc' }, { name: 'asc' }],
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
    const rubric = await this.prisma.homeworkRubric.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: homeworkRubricInclude,
    });

    if (!rubric) {
      throw new NotFoundException('لم يتم العثور على معيار التصحيح');
    }

    return rubric;
  }

  async update(
    id: string,
    payload: UpdateHomeworkRubricDto,
    actorUserId: string,
  ) {
    const existing = await this.findOne(id);

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedName =
      payload.name === undefined
        ? undefined
        : this.normalizeRequiredText(payload.name, 'اسم المعيار');
    const normalizedDescription =
      payload.description === undefined
        ? undefined
        : payload.description?.trim() || null;
    const normalizedDifficulty =
      payload.difficulty === undefined
        ? undefined
        : this.normalizeDifficulty(payload.difficulty);
    const normalizedMaxScore =
      payload.maxScore === undefined
        ? undefined
        : this.normalizeDecimal(payload.maxScore, 'الدرجة الكلية');
    const homeworkTypeId =
      payload.homeworkTypeId === undefined
        ? undefined
        : this.normalizeOptionalRelationId(payload.homeworkTypeId);
    const subjectId =
      payload.subjectId === undefined
        ? undefined
        : this.normalizeOptionalRelationId(payload.subjectId);
    const gradeLevelId =
      payload.gradeLevelId === undefined
        ? undefined
        : this.normalizeOptionalRelationId(payload.gradeLevelId);
    const criteria =
      payload.criteria === undefined
        ? undefined
        : this.normalizeCriteria(payload.criteria, normalizedMaxScore ?? this.toNumber(existing.maxScore));

    if (homeworkTypeId !== undefined) {
      await this.ensureHomeworkTypeExists(homeworkTypeId);
    }

    if (subjectId !== undefined) {
      await this.ensureSubjectExists(subjectId);
    }

    if (gradeLevelId !== undefined) {
      await this.ensureGradeLevelExists(gradeLevelId);
    }

    if (criteria === undefined && normalizedMaxScore !== undefined) {
      this.ensureBalancedTotals(
        existing.criteria.map((criterion) => ({
          title: criterion.title,
          description: criterion.description,
          maxScore: this.toNumber(criterion.maxScore),
          weight: this.toNumber(criterion.weight),
          sortOrder: criterion.sortOrder,
          isActive: criterion.isActive,
        })),
        normalizedMaxScore,
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.homeworkRubric.update({
          where: {
            id,
          },
          data: {
            code: normalizedCode,
            name: normalizedName,
            description: normalizedDescription,
            homeworkTypeId,
            subjectId,
            gradeLevelId,
            difficulty: normalizedDifficulty,
            maxScore: normalizedMaxScore,
            isSystem: payload.isSystem,
            isActive: payload.isActive,
            updatedById: actorUserId,
          },
        });

        if (criteria !== undefined) {
          const now = new Date();

          await tx.homeworkRubricCriterion.updateMany({
            where: {
              homeworkRubricId: id,
              deletedAt: null,
            },
            data: {
              isActive: false,
              deletedAt: now,
              updatedById: actorUserId,
            },
          });

          for (const criterion of criteria) {
            await tx.homeworkRubricCriterion.create({
              data: {
                homeworkRubricId: id,
                title: criterion.title,
                description: criterion.description,
                maxScore: criterion.maxScore,
                weight: criterion.weight,
                sortOrder: criterion.sortOrder,
                isActive: criterion.isActive,
                createdById: actorUserId,
                updatedById: actorUserId,
              },
            });
          }
        }
      });

      const rubric = await this.findOne(id);

      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_RUBRIC_UPDATE',
        resource: 'homework-rubrics',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return rubric;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_RUBRIC_UPDATE_FAILED',
        resource: 'homework-rubrics',
        status: AuditStatus.FAILURE,
        resourceId: id,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const rubric = await this.findOne(id);

    if (rubric.isSystem) {
      throw new ConflictException('لا يمكن حذف معيار تصحيح نظامي');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.homeworkRubric.update({
        where: {
          id,
        },
        data: {
          isActive: false,
          deletedAt: now,
          updatedById: actorUserId,
        },
      }),
      this.prisma.homeworkRubricCriterion.updateMany({
        where: {
          homeworkRubricId: id,
          deletedAt: null,
        },
        data: {
          isActive: false,
          deletedAt: now,
          updatedById: actorUserId,
        },
      }),
    ]);

    await this.auditLogsService.record({
      actorUserId,
      action: 'HOMEWORK_RUBRIC_DELETE',
      resource: 'homework-rubrics',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private normalizeCode(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('لا يمكن أن يكون الرمز فارغًا');
    }

    return normalized;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`لا يمكن أن يكون ${fieldName} فارغًا`);
    }

    return normalized;
  }

  private normalizeOptionalRelationId(
    value?: string | null,
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized ? normalized : null;
  }

  private normalizeDifficulty(value?: string | null): string {
    if (!value) {
      return 'BALANCED';
    }

    const normalized = value.trim().toUpperCase();
    if (!['FOUNDATION', 'BALANCED', 'CHALLENGE'].includes(normalized)) {
      throw new BadRequestException('قيمة مستوى الصعوبة غير صحيحة');
    }

    return normalized;
  }

  private normalizeDecimal(value: number, fieldName: string): number {
    const normalized = Number(value);

    if (!Number.isFinite(normalized) || normalized <= 0) {
      throw new BadRequestException(`${fieldName} يجب أن تكون أكبر من صفر`);
    }

    return normalized;
  }

  private normalizeCriteria(
    criteria: HomeworkRubricCriterionDto[] | undefined,
    maxScore: number,
  ): NormalizedCriterion[] {
    if (!criteria || criteria.length === 0) {
      throw new BadRequestException('يجب إضافة معيار واحد على الأقل');
    }

    const normalized = criteria.map((criterion, index) => {
      const title = this.normalizeRequiredText(criterion.title, 'عنوان المعيار');
      const description = criterion.description?.trim() || null;
      const criterionMaxScore = this.normalizeDecimal(
        criterion.maxScore,
        'درجة المعيار',
      );
      const weight = this.normalizeDecimal(criterion.weight, 'وزن المعيار');

      return {
        title,
        description,
        maxScore: criterionMaxScore,
        weight,
        sortOrder: criterion.sortOrder ?? index + 1,
        isActive: criterion.isActive ?? true,
      };
    });

    normalized.sort((left, right) => left.sortOrder - right.sortOrder);

    this.ensureBalancedTotals(normalized, maxScore);

    return normalized;
  }

  private ensureBalancedTotals(
    criteria: Array<{ maxScore: number; weight: number }>,
    expectedMaxScore: number,
  ) {
    const totalScore = criteria.reduce(
      (sum, criterion) => sum + criterion.maxScore,
      0,
    );
    const totalWeight = criteria.reduce(
      (sum, criterion) => sum + criterion.weight,
      0,
    );

    if (Math.abs(totalScore - expectedMaxScore) > 0.01) {
      throw new BadRequestException(
        'مجموع درجات المعايير يجب أن يساوي الدرجة الكلية',
      );
    }

    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestException('مجموع أوزان المعايير يجب أن يساوي 100%');
    }
  }

  private async ensureHomeworkTypeExists(homeworkTypeId?: string | null) {
    if (!homeworkTypeId) {
      return;
    }

    const homeworkType = await this.prisma.homeworkType.findFirst({
      where: {
        id: homeworkTypeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!homeworkType) {
      throw new BadRequestException('نوع الواجب غير صالح أو محذوف');
    }
  }

  private async ensureSubjectExists(subjectId?: string | null) {
    if (!subjectId) {
      return;
    }

    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!subject) {
      throw new BadRequestException('المادة غير صالحة أو محذوفة');
    }
  }

  private async ensureGradeLevelExists(gradeLevelId?: string | null) {
    if (!gradeLevelId) {
      return;
    }

    const gradeLevel = await this.prisma.gradeLevel.findFirst({
      where: {
        id: gradeLevelId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!gradeLevel) {
      throw new BadRequestException('الصف غير صالح أو محذوف');
    }
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('رمز معيار التصحيح مستخدم مسبقًا');
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
