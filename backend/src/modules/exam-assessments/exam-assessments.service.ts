import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, ExamAssessment, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateExamAssessmentDto } from './dto/create-exam-assessment.dto';
import { ListExamAssessmentsDto } from './dto/list-exam-assessments.dto';
import { UpdateExamAssessmentDto } from './dto/update-exam-assessment.dto';

const examAssessmentInclude: Prisma.ExamAssessmentInclude = {
  examPeriod: {
    select: {
      id: true,
      name: true,
      assessmentType: true,
      status: true,
      isLocked: true,
      startDate: true,
      endDate: true,
      academicYearId: true,
      academicTermId: true,
    },
  },
  section: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      gradeLevel: {
        select: {
          id: true,
          code: true,
          name: true,
          sequence: true,
        },
      },
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
export class ExamAssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateExamAssessmentDto, actorUserId: string) {
    this.ensurePositiveMaxScore(payload.maxScore);

    const examPeriod = await this.ensureExamPeriodExistsAndMutable(
      payload.examPeriodId,
    );
    await this.ensureSectionExistsAndActive(payload.sectionId);
    await this.ensureSubjectExistsAndActive(payload.subjectId);
    this.ensureExamDateInsidePeriod(payload.examDate, examPeriod);

    try {
      const examAssessment = await this.prisma.examAssessment.create({
        data: {
          examPeriodId: payload.examPeriodId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          title: payload.title.trim(),
          examDate: payload.examDate,
          maxScore: payload.maxScore,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: examAssessmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EXAM_ASSESSMENT_CREATE',
        resource: 'exam-assessments',
        resourceId: examAssessment.id,
        details: {
          examPeriodId: examAssessment.examPeriodId,
          sectionId: examAssessment.sectionId,
          subjectId: examAssessment.subjectId,
          examDate: examAssessment.examDate,
        },
      });

      return examAssessment;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EXAM_ASSESSMENT_CREATE_FAILED',
        resource: 'exam-assessments',
        status: AuditStatus.FAILURE,
        details: {
          examPeriodId: payload.examPeriodId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListExamAssessmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ExamAssessmentWhereInput = {
      deletedAt: null,
      examPeriodId: query.examPeriodId,
      sectionId: query.sectionId,
      subjectId: query.subjectId,
      isActive: query.isActive,
      examDate:
        query.fromExamDate || query.toExamDate
          ? {
              gte: query.fromExamDate,
              lte: query.toExamDate,
            }
          : undefined,
      OR: query.search
        ? [
            {
              title: {
                contains: query.search,
              },
            },
            {
              section: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              section: {
                code: {
                  contains: query.search,
                },
              },
            },
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
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.examAssessment.count({ where }),
      this.prisma.examAssessment.findMany({
        where,
        include: examAssessmentInclude,
        orderBy: [{ examDate: 'desc' }, { createdAt: 'desc' }],
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
    const examAssessment = await this.prisma.examAssessment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: examAssessmentInclude,
    });

    if (!examAssessment) {
      throw new NotFoundException('لم يتم العثور على تقييم الاختبار');
    }

    return examAssessment;
  }

  async update(
    id: string,
    payload: UpdateExamAssessmentDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureExamAssessmentExists(id);

    await this.ensureExamPeriodNotLocked(existing.examPeriodId);
    this.ensurePositiveMaxScore(payload.maxScore);

    const resolvedExamPeriodId = payload.examPeriodId ?? existing.examPeriodId;
    const resolvedSectionId = payload.sectionId ?? existing.sectionId;
    const resolvedSubjectId = payload.subjectId ?? existing.subjectId;
    const resolvedExamDate = payload.examDate ?? existing.examDate;

    const examPeriod =
      await this.ensureExamPeriodExistsAndMutable(resolvedExamPeriodId);
    await this.ensureSectionExistsAndActive(resolvedSectionId);
    await this.ensureSubjectExistsAndActive(resolvedSubjectId);
    this.ensureExamDateInsidePeriod(resolvedExamDate, examPeriod);

    try {
      const examAssessment = await this.prisma.examAssessment.update({
        where: {
          id,
        },
        data: {
          examPeriodId: payload.examPeriodId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          title: payload.title?.trim(),
          examDate: payload.examDate,
          maxScore: payload.maxScore,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: examAssessmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EXAM_ASSESSMENT_UPDATE',
        resource: 'exam-assessments',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return examAssessment;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureExamAssessmentExists(id);
    await this.ensureExamPeriodNotLocked(existing.examPeriodId);

    await this.prisma.examAssessment.update({
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
      action: 'EXAM_ASSESSMENT_DELETE',
      resource: 'exam-assessments',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureExamAssessmentExists(
    id: string,
  ): Promise<ExamAssessment> {
    const examAssessment = await this.prisma.examAssessment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!examAssessment) {
      throw new NotFoundException('لم يتم العثور على تقييم الاختبار');
    }

    return examAssessment;
  }

  private async ensureExamPeriodExistsAndMutable(id: string) {
    const examPeriod = await this.prisma.examPeriod.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
        isLocked: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!examPeriod) {
      throw new BadRequestException('فترة الاختبار غير صالحة أو محذوفة');
    }

    if (!examPeriod.isActive) {
      throw new BadRequestException('فترة الاختبار غير نشطة');
    }

    if (examPeriod.isLocked) {
      throw new ConflictException(
        'Cannot modify assessments inside a locked exam period',
      );
    }

    return examPeriod;
  }

  private async ensureExamPeriodNotLocked(id: string) {
    const examPeriod = await this.prisma.examPeriod.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isLocked: true,
      },
    });

    if (!examPeriod) {
      throw new BadRequestException('فترة الاختبار غير صالحة أو محذوفة');
    }

    if (examPeriod.isLocked) {
      throw new ConflictException(
        'Cannot modify assessments inside a locked exam period',
      );
    }
  }

  private async ensureSectionExistsAndActive(sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!section) {
      throw new BadRequestException('الشعبة غير صالحة أو محذوفة');
    }

    if (!section.isActive) {
      throw new BadRequestException('الشعبة غير نشطة');
    }
  }

  private async ensureSubjectExistsAndActive(subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!subject) {
      throw new BadRequestException('المادة غير صالحة أو محذوفة');
    }

    if (!subject.isActive) {
      throw new BadRequestException('المادة غير نشطة');
    }
  }

  private ensureExamDateInsidePeriod(
    examDate: string | Date,
    examPeriod: {
      startDate: Date | null;
      endDate: Date | null;
    },
  ) {
    const normalizedExamDate = this.parseDate(examDate);

    if (!normalizedExamDate) {
      throw new BadRequestException('تاريخ الاختبار غير صالح');
    }

    if (examPeriod.startDate && normalizedExamDate < examPeriod.startDate) {
      throw new BadRequestException(
        'لا يمكن أن يكون examDate قبل startDate لفترة الاختبار',
      );
    }

    if (examPeriod.endDate && normalizedExamDate > examPeriod.endDate) {
      throw new BadRequestException(
        'لا يمكن أن يكون examDate بعد endDate لفترة الاختبار',
      );
    }
  }

  private ensurePositiveMaxScore(maxScore?: number) {
    if (maxScore !== undefined && maxScore <= 0) {
      throw new BadRequestException('يجب أن تكون الدرجة العظمى أكبر من صفر');
    }
  }

  private parseDate(value: string | Date): Date | undefined {
    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return undefined;
    }

    return parsedDate;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'يجب أن يكون تقييم الاختبار فريدًا حسب الفترة والشعبة والمادة والتاريخ',
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
