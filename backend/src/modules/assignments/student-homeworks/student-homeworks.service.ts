import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  GradingWorkflowStatus,
  Prisma,
  StudentHomework,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { DataScopeService } from '../../teaching-assignments/data-scope/data-scope.service';
import { BulkUpdateStudentHomeworksDto } from './dto/bulk-update-student-homeworks.dto';
import { CreateStudentHomeworkDto } from './dto/create-student-homework.dto';
import { ListStudentHomeworksDto } from './dto/list-student-homeworks.dto';
import { UpdateStudentHomeworkDto } from './dto/update-student-homework.dto';

type DateInput = string | Date | null | undefined;

type HomeworkContext = {
  id: string;
  sectionId: string;
  subjectId: string;
  academicYearId: string;
  maxScore: number;
  status: GradingWorkflowStatus;
  isLocked: boolean;
};

type EnrollmentContext = {
  id: string;
  sectionId: string;
  academicYearId: string;
};

type NormalizedSubmissionPayload = {
  isCompleted: boolean;
  submittedAt: Date | null;
  manualScore: number | null;
};

const studentHomeworkInclude: Prisma.StudentHomeworkInclude = {
  homework: {
    select: {
      id: true,
      title: true,
      homeworkDate: true,
      dueDate: true,
      maxScore: true,
      sectionId: true,
      subjectId: true,
      academicYearId: true,
      isActive: true,
      section: {
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
    },
  },
  studentEnrollment: {
    select: {
      id: true,
      studentId: true,
      sectionId: true,
      academicYearId: true,
      status: true,
      isActive: true,
      student: {
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
          isActive: true,
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

@Injectable()
export class StudentHomeworksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async create(payload: CreateStudentHomeworkDto, actorUserId: string) {
    const homework = await this.ensureHomeworkExistsAndMutable(
      payload.homeworkId,
    );
    const enrollment = await this.ensureEnrollmentExistsAndActive(
      payload.studentEnrollmentId,
    );
    this.ensureEnrollmentMatchesHomework(enrollment, homework);
    await this.ensureActorAuthorized(
      actorUserId,
      homework.sectionId,
      homework.subjectId,
      homework.academicYearId,
    );

    const normalizedPayload = this.normalizeSubmissionPayload(
      payload.isCompleted,
      payload.submittedAt,
      payload.manualScore,
      homework.maxScore,
    );

    const softDeletedRow = await this.prisma.studentHomework.findFirst({
      where: {
        homeworkId: payload.homeworkId,
        studentEnrollmentId: payload.studentEnrollmentId,
        deletedAt: {
          not: null,
        },
      },
      select: {
        id: true,
      },
    });

    if (softDeletedRow) {
      const restored = await this.prisma.studentHomework.update({
        where: {
          id: softDeletedRow.id,
        },
        data: {
          isCompleted: normalizedPayload.isCompleted,
          submittedAt: normalizedPayload.submittedAt,
          manualScore: normalizedPayload.manualScore,
          teacherNotes: payload.teacherNotes,
          isActive: payload.isActive ?? true,
          deletedAt: null,
          updatedById: actorUserId,
        },
        include: studentHomeworkInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_HOMEWORK_RESTORE',
        resource: 'student-homeworks',
        resourceId: restored.id,
        details: {
          homeworkId: restored.homeworkId,
          studentEnrollmentId: restored.studentEnrollmentId,
        },
      });

      return restored;
    }

    try {
      const studentHomework = await this.prisma.studentHomework.create({
        data: {
          homeworkId: payload.homeworkId,
          studentEnrollmentId: payload.studentEnrollmentId,
          isCompleted: normalizedPayload.isCompleted,
          submittedAt: normalizedPayload.submittedAt,
          manualScore: normalizedPayload.manualScore,
          teacherNotes: payload.teacherNotes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentHomeworkInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_HOMEWORK_CREATE',
        resource: 'student-homeworks',
        resourceId: studentHomework.id,
        details: {
          homeworkId: studentHomework.homeworkId,
          studentEnrollmentId: studentHomework.studentEnrollmentId,
          isCompleted: studentHomework.isCompleted,
          manualScore: studentHomework.manualScore,
        },
      });

      return studentHomework;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_HOMEWORK_CREATE_FAILED',
        resource: 'student-homeworks',
        status: AuditStatus.FAILURE,
        details: {
          homeworkId: payload.homeworkId,
          studentEnrollmentId: payload.studentEnrollmentId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentHomeworksDto, actorUserId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentHomeworkWhereInput = {
      deletedAt: null,
      homeworkId: query.homeworkId,
      studentEnrollmentId: query.studentEnrollmentId,
      isCompleted: query.isCompleted,
      isActive: query.isActive,
      submittedAt:
        query.fromSubmittedAt || query.toSubmittedAt
          ? {
              gte: query.fromSubmittedAt,
              lte: query.toSubmittedAt,
            }
          : undefined,
      homework:
        query.academicYearId || query.sectionId || query.subjectId
          ? {
              academicYearId: query.academicYearId,
              sectionId: query.sectionId,
              subjectId: query.subjectId,
            }
          : undefined,
      studentEnrollment: query.studentId
        ? {
            studentId: query.studentId,
          }
        : undefined,
      OR: query.search
        ? [
            {
              studentEnrollment: {
                student: {
                  fullName: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              studentEnrollment: {
                student: {
                  admissionNo: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              homework: {
                title: {
                  contains: query.search,
                },
              },
            },
            {
              teacherNotes: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const scope = await this.dataScopeService.getSectionSubjectYearGrants({
      actorUserId,
      capability: 'MANAGE_HOMEWORKS',
      academicYearId: query.academicYearId,
    });

    if (!scope.isPrivileged) {
      if (scope.grants.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }

      const scopedHomeworkWhere: Prisma.HomeworkWhereInput = {
        OR: scope.grants.map((grant) => ({
          sectionId: grant.sectionId,
          academicYearId: grant.academicYearId,
          subjectId: grant.subjectId,
        })),
      };

      if (where.homework) {
        where.homework = {
          AND: [where.homework, scopedHomeworkWhere],
        };
      } else {
        where.homework = scopedHomeworkWhere;
      }
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentHomework.count({ where }),
      this.prisma.studentHomework.findMany({
        where,
        include: studentHomeworkInclude,
        orderBy: [
          {
            homework: {
              homeworkDate: 'desc',
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

  async findOne(id: string, actorUserId: string) {
    const studentHomework = await this.prisma.studentHomework.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentHomeworkInclude,
    });

    if (!studentHomework) {
      throw new NotFoundException('لم يتم العثور على سجل واجب الطالب');
    }

    await this.ensureActorAuthorized(
      actorUserId,
      studentHomework.homework.sectionId,
      studentHomework.homework.subjectId,
      studentHomework.homework.academicYearId,
    );

    return studentHomework;
  }

  async bulkUpdate(
    payload: BulkUpdateStudentHomeworksDto,
    actorUserId: string,
  ) {
    const homework = await this.ensureHomeworkExistsAndMutable(
      payload.homeworkId,
    );

    await this.ensureActorAuthorized(
      actorUserId,
      homework.sectionId,
      homework.subjectId,
      homework.academicYearId,
    );

    const seenStudentHomeworkIds = new Set<string>();
    const seenEnrollmentIds = new Set<string>();
    const preparedItems = await Promise.all(
      payload.items.map(async (item, index) => {
        if (!item.studentHomeworkId && !item.studentEnrollmentId) {
          throw new BadRequestException(
            `السطر رقم ${index + 1} يحتاج studentHomeworkId أو studentEnrollmentId`,
          );
        }

        if (item.studentHomeworkId) {
          if (seenStudentHomeworkIds.has(item.studentHomeworkId)) {
            throw new BadRequestException(
              `يوجد تكرار في سجل واجب الطالب رقم ${index + 1}`,
            );
          }

          seenStudentHomeworkIds.add(item.studentHomeworkId);
        }

        if (item.studentEnrollmentId) {
          if (seenEnrollmentIds.has(item.studentEnrollmentId)) {
            throw new BadRequestException(
              `يوجد تكرار في قيد الطالب رقم ${index + 1}`,
            );
          }

          seenEnrollmentIds.add(item.studentEnrollmentId);
        }

        const existing = item.studentHomeworkId
          ? await this.ensureStudentHomeworkExists(item.studentHomeworkId)
          : null;

        if (existing && existing.homeworkId !== payload.homeworkId) {
          throw new BadRequestException(
            `سجل واجب الطالب رقم ${index + 1} لا يتبع الواجب المحدد`,
          );
        }

        const studentEnrollmentId =
          item.studentEnrollmentId ?? existing?.studentEnrollmentId;

        if (!studentEnrollmentId) {
          throw new BadRequestException(
            `تعذر تحديد قيد الطالب في السطر رقم ${index + 1}`,
          );
        }

        const enrollment =
          await this.ensureEnrollmentExistsAndActive(studentEnrollmentId);
        this.ensureEnrollmentMatchesHomework(enrollment, homework);

        const normalizedPayload = this.normalizeSubmissionPayload(
          item.isCompleted,
          item.submittedAt,
          item.manualScore,
          homework.maxScore,
        );

        return {
          id: existing?.id,
          studentEnrollmentId,
          normalizedPayload,
          teacherNotes: item.teacherNotes,
        };
      }),
    );

    const updated = await this.prisma.$transaction(
      preparedItems.map((item) => {
        if (item.id) {
          return this.prisma.studentHomework.update({
            where: {
              id: item.id,
            },
            data: {
              isCompleted: item.normalizedPayload.isCompleted,
              submittedAt: item.normalizedPayload.submittedAt,
              manualScore: item.normalizedPayload.manualScore,
              teacherNotes: item.teacherNotes,
              updatedById: actorUserId,
            },
            include: studentHomeworkInclude,
          });
        }

        return this.prisma.studentHomework.upsert({
          where: {
            homeworkId_studentEnrollmentId: {
              homeworkId: payload.homeworkId,
              studentEnrollmentId: item.studentEnrollmentId,
            },
          },
          update: {
            isCompleted: item.normalizedPayload.isCompleted,
            submittedAt: item.normalizedPayload.submittedAt,
            manualScore: item.normalizedPayload.manualScore,
            teacherNotes: item.teacherNotes,
            isActive: true,
            deletedAt: null,
            updatedById: actorUserId,
          },
          create: {
            homeworkId: payload.homeworkId,
            studentEnrollmentId: item.studentEnrollmentId,
            isCompleted: item.normalizedPayload.isCompleted,
            submittedAt: item.normalizedPayload.submittedAt,
            manualScore: item.normalizedPayload.manualScore,
            teacherNotes: item.teacherNotes,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: studentHomeworkInclude,
        });
      }),
    );

    const completedCount = updated.filter((item) => item.isCompleted).length;

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_HOMEWORK_BULK_UPDATE',
      resource: 'student-homeworks',
      details: {
        homeworkId: payload.homeworkId,
        updatedCount: updated.length,
        completedCount,
        pendingCount: updated.length - completedCount,
      },
    });

    return {
      data: updated,
      summary: {
        total: updated.length,
        completed: completedCount,
        pending: updated.length - completedCount,
      },
    };
  }

  async update(
    id: string,
    payload: UpdateStudentHomeworkDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureStudentHomeworkExists(id);

    const resolvedHomeworkId = payload.homeworkId ?? existing.homeworkId;
    const resolvedStudentEnrollmentId =
      payload.studentEnrollmentId ?? existing.studentEnrollmentId;

    const homework =
      await this.ensureHomeworkExistsAndMutable(resolvedHomeworkId);
    const enrollment = await this.ensureEnrollmentExistsAndActive(
      resolvedStudentEnrollmentId,
    );

    this.ensureEnrollmentMatchesHomework(enrollment, homework);
    await this.ensureActorAuthorized(
      actorUserId,
      homework.sectionId,
      homework.subjectId,
      homework.academicYearId,
    );

    const normalizedPayload = this.normalizeSubmissionPayload(
      payload.isCompleted ?? existing.isCompleted,
      payload.submittedAt ?? existing.submittedAt,
      payload.manualScore ?? this.numberOrNull(existing.manualScore),
      homework.maxScore,
    );

    try {
      const studentHomework = await this.prisma.studentHomework.update({
        where: {
          id,
        },
        data: {
          homeworkId: payload.homeworkId,
          studentEnrollmentId: payload.studentEnrollmentId,
          isCompleted: normalizedPayload.isCompleted,
          submittedAt: normalizedPayload.submittedAt,
          manualScore: normalizedPayload.manualScore,
          teacherNotes: payload.teacherNotes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: studentHomeworkInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_HOMEWORK_UPDATE',
        resource: 'student-homeworks',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return studentHomework;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureStudentHomeworkExists(id);
    const homework = await this.ensureHomeworkExistsAndMutable(
      existing.homeworkId,
    );

    await this.ensureActorAuthorized(
      actorUserId,
      homework.sectionId,
      homework.subjectId,
      homework.academicYearId,
    );

    await this.prisma.studentHomework.update({
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
      action: 'STUDENT_HOMEWORK_DELETE',
      resource: 'student-homeworks',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureStudentHomeworkExists(
    id: string,
  ): Promise<StudentHomework> {
    const studentHomework = await this.prisma.studentHomework.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!studentHomework) {
      throw new NotFoundException('لم يتم العثور على سجل واجب الطالب');
    }

    return studentHomework;
  }

  private async ensureHomeworkExistsAndMutable(
    homeworkId: string,
  ): Promise<HomeworkContext> {
    const homework = await this.prisma.homework.findFirst({
      where: {
        id: homeworkId,
        deletedAt: null,
      },
      select: {
        id: true,
        sectionId: true,
        subjectId: true,
        academicYearId: true,
        maxScore: true,
        status: true,
        isLocked: true,
        isActive: true,
      },
    });

    if (!homework) {
      throw new BadRequestException('الواجب غير صالح أو محذوف');
    }

    if (!homework.isActive) {
      throw new ConflictException('الواجب غير نشط');
    }

    if (
      homework.isLocked ||
      homework.status === GradingWorkflowStatus.APPROVED
    ) {
      throw new ConflictException(
        'لا يمكن تعديل تنفيذ الطلاب لواجب معتمد أو مقفل. أعد فتح الواجب أولًا.',
      );
    }

    return {
      id: homework.id,
      sectionId: homework.sectionId,
      subjectId: homework.subjectId,
      academicYearId: homework.academicYearId,
      maxScore: Number(homework.maxScore),
      status: homework.status,
      isLocked: homework.isLocked,
    };
  }

  private async ensureEnrollmentExistsAndActive(
    studentEnrollmentId: string,
  ): Promise<EnrollmentContext> {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id: studentEnrollmentId,
        deletedAt: null,
      },
      select: {
        id: true,
        sectionId: true,
        academicYearId: true,
        isActive: true,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('قيد الطالب غير صالح أو محذوف');
    }

    if (!enrollment.isActive) {
      throw new BadRequestException('قيد الطالب غير نشط');
    }

    if (!enrollment.sectionId) {
      throw new BadRequestException('قيد الطالب غير موزع على شعبة');
    }

    return {
      id: enrollment.id,
      sectionId: enrollment.sectionId,
      academicYearId: enrollment.academicYearId,
    };
  }

  private ensureEnrollmentMatchesHomework(
    enrollment: EnrollmentContext,
    homework: HomeworkContext,
  ) {
    if (enrollment.sectionId !== homework.sectionId) {
      throw new BadRequestException(
        'Student enrollment section does not match homework section',
      );
    }

    if (enrollment.academicYearId !== homework.academicYearId) {
      throw new BadRequestException(
        'Student enrollment academic year does not match homework academic year',
      );
    }
  }

  private normalizeSubmissionPayload(
    isCompletedInput: boolean | undefined,
    submittedAtInput: DateInput,
    manualScoreInput: number | null | undefined,
    maxScore: number,
  ): NormalizedSubmissionPayload {
    const isCompleted = isCompletedInput ?? false;
    let submittedAt =
      submittedAtInput === undefined
        ? null
        : (this.parseDate(submittedAtInput, 'submittedAt') ?? null);
    let manualScore = manualScoreInput ?? null;

    if (manualScore !== null && (manualScore < 0 || manualScore > maxScore)) {
      throw new BadRequestException(
        `يجب أن تكون manualScore بين 0 و${maxScore} لهذا الواجب`,
      );
    }

    if (!isCompleted) {
      submittedAt = null;
      manualScore = null;
    } else if (!submittedAt) {
      submittedAt = new Date();
    }

    return {
      isCompleted,
      submittedAt,
      manualScore,
    };
  }

  private numberOrNull(value: Prisma.Decimal | null): number | null {
    if (value === null) {
      return null;
    }

    return Number(value);
  }

  private parseDate(value: DateInput, fieldName: string): Date | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(
        `تنسيق التاريخ غير صالح للحقل ${fieldName}`,
      );
    }

    return parsedDate;
  }

  private async ensureActorAuthorized(
    actorUserId: string,
    sectionId: string,
    subjectId: string,
    academicYearId: string,
  ) {
    await this.dataScopeService.ensureCanManageSectionSubjectYear({
      actorUserId,
      sectionId,
      subjectId,
      academicYearId,
      capability: 'MANAGE_HOMEWORKS',
    });
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'سجل واجب الطالب موجود مسبقًا لهذا الواجب وهذا القيد',
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
