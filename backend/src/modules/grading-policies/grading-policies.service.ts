import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, GradingPolicy, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateGradingPolicyDto } from './dto/create-grading-policy.dto';
import { ListGradingPoliciesDto } from './dto/list-grading-policies.dto';
import { UpdateGradingPolicyDto } from './dto/update-grading-policy.dto';

const gradingPolicyInclude: Prisma.GradingPolicyInclude = {
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      isCurrent: true,
      status: true,
    },
  },
  gradeLevel: {
    select: {
      id: true,
      code: true,
      name: true,
      stage: true,
      sequence: true,
      isActive: true,
    },
  },
  subject: {
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      isActive: true,
    },
  },
  components: {
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
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
export class GradingPoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateGradingPolicyDto, actorUserId: string) {
    this.validateScoreRules(payload);
    await this.ensureReferencesExist(
      payload.academicYearId,
      payload.gradeLevelId,
      payload.subjectId,
    );

    try {
      const gradingPolicy = await this.prisma.gradingPolicy.create({
        data: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          subjectId: payload.subjectId,
          assessmentType: payload.assessmentType,
          maxExamScore: payload.maxExamScore,
          maxHomeworkScore: payload.maxHomeworkScore,
          maxAttendanceScore: payload.maxAttendanceScore,
          maxActivityScore: payload.maxActivityScore,
          maxContributionScore: payload.maxContributionScore,
          passingScore: payload.passingScore,
          isDefault: payload.isDefault ?? false,
          status: payload.status,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: gradingPolicyInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_POLICY_CREATE',
        resource: 'grading-policies',
        resourceId: gradingPolicy.id,
        details: {
          academicYearId: gradingPolicy.academicYearId,
          gradeLevelId: gradingPolicy.gradeLevelId,
          subjectId: gradingPolicy.subjectId,
          assessmentType: gradingPolicy.assessmentType,
        },
      });

      return gradingPolicy;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_POLICY_CREATE_FAILED',
        resource: 'grading-policies',
        status: AuditStatus.FAILURE,
        details: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          subjectId: payload.subjectId,
          assessmentType: payload.assessmentType,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListGradingPoliciesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.GradingPolicyWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      gradeLevelId: query.gradeLevelId,
      subjectId: query.subjectId,
      assessmentType: query.assessmentType,
      status: query.status,
      isDefault: query.isDefault,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              subject: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              subject: {
                code: {
                  contains: query.search,
                },
              },
            },
            {
              gradeLevel: {
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
            {
              notes: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.gradingPolicy.count({ where }),
      this.prisma.gradingPolicy.findMany({
        where,
        include: gradingPolicyInclude,
        orderBy: [
          {
            academicYear: {
              startDate: 'desc',
            },
          },
          {
            gradeLevel: {
              sequence: 'asc',
            },
          },
          {
            subject: {
              name: 'asc',
            },
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
    const gradingPolicy = await this.prisma.gradingPolicy.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: gradingPolicyInclude,
    });

    if (!gradingPolicy) {
      throw new NotFoundException('لم يتم العثور على سياسة التقدير');
    }

    return gradingPolicy;
  }

  async update(
    id: string,
    payload: UpdateGradingPolicyDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureGradingPolicyExists(id);
    this.validateScoreRules(payload);

    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const resolvedGradeLevelId = payload.gradeLevelId ?? existing.gradeLevelId;
    const resolvedSubjectId = payload.subjectId ?? existing.subjectId;

    await this.ensureReferencesExist(
      resolvedAcademicYearId,
      resolvedGradeLevelId,
      resolvedSubjectId,
    );

    try {
      const gradingPolicy = await this.prisma.gradingPolicy.update({
        where: {
          id,
        },
        data: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          subjectId: payload.subjectId,
          assessmentType: payload.assessmentType,
          maxExamScore: payload.maxExamScore,
          maxHomeworkScore: payload.maxHomeworkScore,
          maxAttendanceScore: payload.maxAttendanceScore,
          maxActivityScore: payload.maxActivityScore,
          maxContributionScore: payload.maxContributionScore,
          passingScore: payload.passingScore,
          isDefault: payload.isDefault,
          status: payload.status,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: gradingPolicyInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADING_POLICY_UPDATE',
        resource: 'grading-policies',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return gradingPolicy;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureGradingPolicyExists(id);

    await this.prisma.gradingPolicy.update({
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
      action: 'GRADING_POLICY_DELETE',
      resource: 'grading-policies',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureGradingPolicyExists(id: string): Promise<GradingPolicy> {
    const gradingPolicy = await this.prisma.gradingPolicy.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!gradingPolicy) {
      throw new NotFoundException('لم يتم العثور على سياسة التقدير');
    }

    return gradingPolicy;
  }

  private async ensureReferencesExist(
    academicYearId: string,
    gradeLevelId: string,
    subjectId: string,
  ) {
    const [academicYear, gradeLevel, subject] = await this.prisma.$transaction([
      this.prisma.academicYear.findFirst({
        where: {
          id: academicYearId,
          deletedAt: null,
        },
        select: { id: true },
      }),
      this.prisma.gradeLevel.findFirst({
        where: {
          id: gradeLevelId,
          deletedAt: null,
        },
        select: { id: true },
      }),
      this.prisma.subject.findFirst({
        where: {
          id: subjectId,
          deletedAt: null,
        },
        select: { id: true, isActive: true },
      }),
    ]);

    if (!academicYear) {
      throw new BadRequestException('السنة الدراسية غير صالحة أو محذوفة');
    }

    if (!gradeLevel) {
      throw new BadRequestException('الصف الدراسي غير صالح أو محذوف');
    }

    if (!subject) {
      throw new BadRequestException('المادة غير صالحة أو محذوفة');
    }

    if (!subject.isActive) {
      throw new BadRequestException('المادة غير نشطة');
    }
  }

  private validateScoreRules(
    payload: Pick<
      CreateGradingPolicyDto,
      | 'maxExamScore'
      | 'maxHomeworkScore'
      | 'maxAttendanceScore'
      | 'maxActivityScore'
      | 'maxContributionScore'
      | 'passingScore'
    >,
  ) {
    const scorePairs = [
      ['maxExamScore', payload.maxExamScore],
      ['maxHomeworkScore', payload.maxHomeworkScore],
      ['maxAttendanceScore', payload.maxAttendanceScore],
      ['maxActivityScore', payload.maxActivityScore],
      ['maxContributionScore', payload.maxContributionScore],
    ] as const;

    for (const [fieldName, value] of scorePairs) {
      if (value !== undefined && value < 0) {
        throw new BadRequestException(
          `لا يمكن أن تكون قيمة ${fieldName} سالبة`,
        );
      }
    }

    if (payload.passingScore !== undefined) {
      if (payload.passingScore < 0 || payload.passingScore > 100) {
        throw new BadRequestException('يجب أن تكون درجة النجاح بين 0 و100');
      }
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'سياسة التقدير موجودة مسبقًا لهذه السنة والصف والمادة ونوع التقييم',
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
