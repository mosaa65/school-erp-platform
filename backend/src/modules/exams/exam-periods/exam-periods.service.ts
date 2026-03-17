import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  ExamPeriod,
  GradingWorkflowStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateExamPeriodDto } from './dto/create-exam-period.dto';
import { ListExamPeriodsDto } from './dto/list-exam-periods.dto';
import { UpdateExamPeriodDto } from './dto/update-exam-period.dto';

const examPeriodInclude: Prisma.ExamPeriodInclude = {
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
export class ExamPeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateExamPeriodDto, actorUserId: string) {
    this.ensureDateRange(payload.startDate, payload.endDate);
    await this.ensureYearAndTermConsistency(
      payload.academicYearId,
      payload.academicTermId,
    );

    const shouldLock =
      payload.isLocked ?? payload.status === GradingWorkflowStatus.APPROVED;
    const lockTime = shouldLock ? new Date() : null;

    try {
      const examPeriod = await this.prisma.examPeriod.create({
        data: {
          academicYearId: payload.academicYearId,
          academicTermId: payload.academicTermId,
          name: payload.name.trim(),
          assessmentType: payload.assessmentType,
          startDate: payload.startDate,
          endDate: payload.endDate,
          status: payload.status,
          isLocked: shouldLock,
          lockedAt: lockTime,
          lockedByUserId: shouldLock ? actorUserId : null,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: examPeriodInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EXAM_PERIOD_CREATE',
        resource: 'exam-periods',
        resourceId: examPeriod.id,
        details: {
          academicYearId: examPeriod.academicYearId,
          academicTermId: examPeriod.academicTermId,
          assessmentType: examPeriod.assessmentType,
          status: examPeriod.status,
        },
      });

      return examPeriod;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EXAM_PERIOD_CREATE_FAILED',
        resource: 'exam-periods',
        status: AuditStatus.FAILURE,
        details: {
          academicYearId: payload.academicYearId,
          academicTermId: payload.academicTermId,
          name: payload.name,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListExamPeriodsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ExamPeriodWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      academicTermId: query.academicTermId,
      assessmentType: query.assessmentType,
      status: query.status,
      isLocked: query.isLocked,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              name: {
                contains: query.search,
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
              academicTerm: {
                name: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.examPeriod.count({ where }),
      this.prisma.examPeriod.findMany({
        where,
        include: examPeriodInclude,
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
    const examPeriod = await this.prisma.examPeriod.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: examPeriodInclude,
    });

    if (!examPeriod) {
      throw new NotFoundException('لم يتم العثور على فترة الاختبار');
    }

    return examPeriod;
  }

  async update(id: string, payload: UpdateExamPeriodDto, actorUserId: string) {
    const existing = await this.ensureExamPeriodExists(id);

    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const resolvedAcademicTermId =
      payload.academicTermId ?? existing.academicTermId;
    const resolvedStartDate = payload.startDate ?? existing.startDate;
    const resolvedEndDate = payload.endDate ?? existing.endDate;

    this.ensureDateRange(resolvedStartDate, resolvedEndDate);
    await this.ensureYearAndTermConsistency(
      resolvedAcademicYearId,
      resolvedAcademicTermId,
    );

    const shouldLock =
      payload.isLocked ??
      (payload.status === GradingWorkflowStatus.APPROVED ? true : undefined);

    const lockData =
      shouldLock === undefined
        ? {}
        : shouldLock
          ? {
              isLocked: true,
              lockedAt: existing.lockedAt ?? new Date(),
              lockedByUserId: existing.lockedByUserId ?? actorUserId,
            }
          : {
              isLocked: false,
              lockedAt: null,
              lockedByUserId: null,
            };

    try {
      const examPeriod = await this.prisma.examPeriod.update({
        where: {
          id,
        },
        data: {
          academicYearId: payload.academicYearId,
          academicTermId: payload.academicTermId,
          name: payload.name?.trim(),
          assessmentType: payload.assessmentType,
          startDate: payload.startDate,
          endDate: payload.endDate,
          status: payload.status,
          isActive: payload.isActive,
          updatedById: actorUserId,
          ...lockData,
        },
        include: examPeriodInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EXAM_PERIOD_UPDATE',
        resource: 'exam-periods',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return examPeriod;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureExamPeriodExists(id);

    if (existing.isLocked) {
      throw new ConflictException('لا يمكن حذف فترة اختبار مقفلة');
    }

    await this.prisma.examPeriod.update({
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
      action: 'EXAM_PERIOD_DELETE',
      resource: 'exam-periods',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureExamPeriodExists(id: string): Promise<ExamPeriod> {
    const examPeriod = await this.prisma.examPeriod.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!examPeriod) {
      throw new NotFoundException('لم يتم العثور على فترة الاختبار');
    }

    return examPeriod;
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
      throw new BadRequestException('الفصل الدراسي غير صالح أو محذوف');
    }

    if (!term.isActive) {
      throw new BadRequestException('الفصل الدراسي غير نشط');
    }

    if (term.academicYearId !== academicYearId) {
      throw new BadRequestException(
        'Academic term does not belong to the selected academic year',
      );
    }
  }

  private ensureDateRange(
    startDate?: string | Date | null,
    endDate?: string | Date | null,
  ) {
    if (!startDate || !endDate) {
      return;
    }

    const normalizedStartDate = this.parseDate(startDate);
    const normalizedEndDate = this.parseDate(endDate);

    if (!normalizedStartDate || !normalizedEndDate) {
      return;
    }

    if (normalizedEndDate < normalizedStartDate) {
      throw new BadRequestException(
        'يجب أن يكون endDate بعد أو مساويًا لـ startDate',
      );
    }
  }

  private parseDate(value?: string | Date | null): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('تنسيق التاريخ/الوقت غير صالح');
    }

    return parsedDate;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'يجب أن يكون اسم فترة الاختبار فريدًا داخل الفصل الدراسي نفسه',
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

