import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  EmployeePerformanceEvaluation,
  PerformanceRatingLevel,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeePerformanceEvaluationDto } from './dto/create-employee-performance-evaluation.dto';
import { ListEmployeePerformanceEvaluationsDto } from './dto/list-employee-performance-evaluations.dto';
import { UpdateEmployeePerformanceEvaluationDto } from './dto/update-employee-performance-evaluation.dto';

const performanceInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
  evaluator: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
    },
  },
} as const;

@Injectable()
export class EmployeePerformanceEvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(
    payload: CreateEmployeePerformanceEvaluationDto,
    actorUserId: string,
  ) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.employeeId,
      );
      await this.ensureAcademicYearExists(payload.academicYearId);
      await this.ensureEvaluatorExistsAndActive(payload.evaluatorEmployeeId);

      const computedRating = this.getRatingByScore(payload.score);
      this.assertRatingConsistency(payload.ratingLevel, computedRating);

      const evaluation = await this.prisma.employeePerformanceEvaluation.create(
        {
          data: {
            employeeId: payload.employeeId,
            academicYearId: payload.academicYearId,
            evaluationDate: payload.evaluationDate,
            score: payload.score,
            ratingLevel: payload.ratingLevel ?? computedRating,
            evaluatorEmployeeId: payload.evaluatorEmployeeId,
            strengths: payload.strengths,
            weaknesses: payload.weaknesses,
            recommendations: payload.recommendations,
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: performanceInclude,
        },
      );

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_PERFORMANCE_EVALUATION_CREATE',
        resource: 'employee-performance-evaluations',
        resourceId: evaluation.id,
        details: {
          employeeId: evaluation.employeeId,
          academicYearId: evaluation.academicYearId,
          score: evaluation.score,
          ratingLevel: evaluation.ratingLevel,
        },
      });

      return evaluation;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_PERFORMANCE_EVALUATION_CREATE_FAILED',
        resource: 'employee-performance-evaluations',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          academicYearId: payload.academicYearId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListEmployeePerformanceEvaluationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeePerformanceEvaluationWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      academicYearId: query.academicYearId,
      ratingLevel: query.ratingLevel,
      evaluatorEmployeeId: query.evaluatorEmployeeId,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              employee: {
                fullName: {
                  contains: query.search,
                },
              },
            },
            {
              strengths: {
                contains: query.search,
              },
            },
            {
              weaknesses: {
                contains: query.search,
              },
            },
            {
              recommendations: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employeePerformanceEvaluation.count({ where }),
      this.prisma.employeePerformanceEvaluation.findMany({
        where,
        include: performanceInclude,
        orderBy: [
          {
            evaluationDate: 'desc',
          },
          {
            createdAt: 'desc',
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
    const evaluation =
      await this.prisma.employeePerformanceEvaluation.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: performanceInclude,
      });

    if (!evaluation) {
      throw new NotFoundException('Employee performance evaluation not found');
    }

    return evaluation;
  }

  async update(
    id: string,
    payload: UpdateEmployeePerformanceEvaluationDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureEvaluationExists(id);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const resolvedEvaluatorId =
      payload.evaluatorEmployeeId ?? existing.evaluatorEmployeeId;
    const resolvedScore = payload.score ?? existing.score;
    const computedRating = this.getRatingByScore(resolvedScore);

    await this.employeesService.ensureEmployeeExistsAndActive(
      resolvedEmployeeId,
    );
    await this.ensureAcademicYearExists(resolvedAcademicYearId);
    await this.ensureEvaluatorExistsAndActive(resolvedEvaluatorId ?? undefined);

    this.assertRatingConsistency(payload.ratingLevel, computedRating);

    try {
      const evaluation = await this.prisma.employeePerformanceEvaluation.update(
        {
          where: {
            id,
          },
          data: {
            employeeId: payload.employeeId,
            academicYearId: payload.academicYearId,
            evaluationDate: payload.evaluationDate,
            score: payload.score,
            ratingLevel: payload.ratingLevel ?? computedRating,
            evaluatorEmployeeId: payload.evaluatorEmployeeId,
            strengths: payload.strengths,
            weaknesses: payload.weaknesses,
            recommendations: payload.recommendations,
            isActive: payload.isActive,
            updatedById: actorUserId,
          },
          include: performanceInclude,
        },
      );

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_PERFORMANCE_EVALUATION_UPDATE',
        resource: 'employee-performance-evaluations',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return evaluation;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEvaluationExists(id);

    await this.prisma.employeePerformanceEvaluation.update({
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
      action: 'EMPLOYEE_PERFORMANCE_EVALUATION_DELETE',
      resource: 'employee-performance-evaluations',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEvaluationExists(
    id: string,
  ): Promise<EmployeePerformanceEvaluation> {
    const evaluation =
      await this.prisma.employeePerformanceEvaluation.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

    if (!evaluation) {
      throw new NotFoundException('Employee performance evaluation not found');
    }

    return evaluation;
  }

  private async ensureAcademicYearExists(academicYearId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!year) {
      throw new BadRequestException('Academic year is invalid or deleted');
    }
  }

  private async ensureEvaluatorExistsAndActive(evaluatorEmployeeId?: string) {
    if (!evaluatorEmployeeId) {
      return;
    }

    await this.employeesService.ensureEmployeeExistsAndActive(
      evaluatorEmployeeId,
    );
  }

  private getRatingByScore(score: number): PerformanceRatingLevel {
    if (score >= 90) {
      return PerformanceRatingLevel.EXCELLENT;
    }

    if (score >= 80) {
      return PerformanceRatingLevel.VERY_GOOD;
    }

    if (score >= 70) {
      return PerformanceRatingLevel.GOOD;
    }

    if (score >= 50) {
      return PerformanceRatingLevel.ACCEPTABLE;
    }

    return PerformanceRatingLevel.POOR;
  }

  private assertRatingConsistency(
    submitted?: PerformanceRatingLevel,
    computed?: PerformanceRatingLevel,
  ) {
    if (submitted && computed && submitted !== computed) {
      throw new BadRequestException(
        `ratingLevel ${submitted} does not match score-derived rating ${computed}`,
      );
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'An employee can only have one active performance evaluation per academic year',
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
