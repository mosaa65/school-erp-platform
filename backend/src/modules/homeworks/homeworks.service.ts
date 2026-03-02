import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Homework, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { ListHomeworksDto } from './dto/list-homeworks.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

type DateInput = string | Date | null | undefined;

type HomeworkReferenceContext = {
  termStartDate: Date;
  termEndDate: Date;
};

const homeworkListInclude: Prisma.HomeworkInclude = {
  _count: {
    select: {
      studentHomeworks: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      isCurrent: true,
      status: true,
    },
  },
  academicTerm: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      isActive: true,
      startDate: true,
      endDate: true,
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
  homeworkType: {
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

const homeworkDetailsInclude: Prisma.HomeworkInclude = {
  ...homeworkListInclude,
  studentHomeworks: {
    where: {
      deletedAt: null,
    },
    include: {
      studentEnrollment: {
        select: {
          id: true,
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
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
};

@Injectable()
export class HomeworksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateHomeworkDto, actorUserId: string) {
    const references = await this.ensureReferencesExist(
      payload.academicYearId,
      payload.academicTermId,
      payload.sectionId,
      payload.subjectId,
      payload.homeworkTypeId,
    );
    this.validateHomeworkDates(
      payload.homeworkDate,
      payload.dueDate,
      references.termStartDate,
      references.termEndDate,
    );
    await this.ensureActorAuthorized(
      actorUserId,
      payload.sectionId,
      payload.subjectId,
      payload.academicYearId,
    );

    const enrollmentIds =
      payload.autoPopulateStudents === false
        ? []
        : await this.findActiveEnrollmentIds(
            payload.sectionId,
            payload.academicYearId,
          );

    try {
      const homework = await this.prisma.homework.create({
        data: {
          academicYearId: payload.academicYearId,
          academicTermId: payload.academicTermId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          homeworkTypeId: payload.homeworkTypeId,
          title: this.normalizeRequiredText(payload.title, 'title'),
          content: payload.content?.trim(),
          homeworkDate: payload.homeworkDate,
          dueDate: payload.dueDate,
          maxScore: payload.maxScore ?? 5,
          notes: payload.notes?.trim(),
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
          studentHomeworks:
            enrollmentIds.length > 0
              ? {
                  create: enrollmentIds.map((studentEnrollmentId) => ({
                    studentEnrollmentId,
                    isCompleted: false,
                    isActive: true,
                    createdById: actorUserId,
                    updatedById: actorUserId,
                  })),
                }
              : undefined,
        },
        include: homeworkDetailsInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_CREATE',
        resource: 'homeworks',
        resourceId: homework.id,
        details: {
          academicYearId: homework.academicYearId,
          academicTermId: homework.academicTermId,
          sectionId: homework.sectionId,
          subjectId: homework.subjectId,
          autoPopulatedStudentsCount: enrollmentIds.length,
        },
      });

      return homework;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_CREATE_FAILED',
        resource: 'homeworks',
        status: AuditStatus.FAILURE,
        details: {
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          academicYearId: payload.academicYearId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListHomeworksDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.HomeworkWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      academicTermId: query.academicTermId,
      sectionId: query.sectionId,
      subjectId: query.subjectId,
      homeworkTypeId: query.homeworkTypeId,
      isActive: query.isActive,
      homeworkDate:
        query.fromHomeworkDate || query.toHomeworkDate
          ? {
              gte: query.fromHomeworkDate,
              lte: query.toHomeworkDate,
            }
          : undefined,
      dueDate:
        query.fromDueDate || query.toDueDate
          ? {
              gte: query.fromDueDate,
              lte: query.toDueDate,
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
              notes: {
                contains: query.search,
              },
            },
            {
              content: {
                contains: query.search,
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
            {
              section: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              homeworkType: {
                name: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.homework.count({ where }),
      this.prisma.homework.findMany({
        where,
        include: homeworkListInclude,
        orderBy: [{ homeworkDate: 'desc' }, { createdAt: 'desc' }],
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
    const homework = await this.prisma.homework.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: homeworkDetailsInclude,
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    return homework;
  }

  async update(id: string, payload: UpdateHomeworkDto, actorUserId: string) {
    const existing = await this.ensureHomeworkExists(id);

    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const resolvedAcademicTermId =
      payload.academicTermId ?? existing.academicTermId;
    const resolvedSectionId = payload.sectionId ?? existing.sectionId;
    const resolvedSubjectId = payload.subjectId ?? existing.subjectId;
    const resolvedHomeworkTypeId =
      payload.homeworkTypeId ?? existing.homeworkTypeId;
    const resolvedHomeworkDate = payload.homeworkDate ?? existing.homeworkDate;
    const resolvedDueDate = payload.dueDate ?? existing.dueDate;
    const resolvedMaxScore = payload.maxScore ?? Number(existing.maxScore);

    const hasStudentRows = await this.prisma.studentHomework.count({
      where: {
        homeworkId: id,
        deletedAt: null,
      },
    });

    if (
      hasStudentRows > 0 &&
      (resolvedAcademicYearId !== existing.academicYearId ||
        resolvedSectionId !== existing.sectionId)
    ) {
      throw new ConflictException(
        'Cannot change academicYearId or sectionId after student homework records exist',
      );
    }

    const references = await this.ensureReferencesExist(
      resolvedAcademicYearId,
      resolvedAcademicTermId,
      resolvedSectionId,
      resolvedSubjectId,
      resolvedHomeworkTypeId,
    );

    this.validateHomeworkDates(
      resolvedHomeworkDate,
      resolvedDueDate,
      references.termStartDate,
      references.termEndDate,
    );

    await this.ensureActorAuthorized(
      actorUserId,
      resolvedSectionId,
      resolvedSubjectId,
      resolvedAcademicYearId,
    );

    await this.ensureManualScoresWithinMaxScore(id, resolvedMaxScore);

    try {
      const homework = await this.prisma.homework.update({
        where: {
          id,
        },
        data: {
          academicYearId: payload.academicYearId,
          academicTermId: payload.academicTermId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          homeworkTypeId: payload.homeworkTypeId,
          title:
            payload.title === undefined
              ? undefined
              : this.normalizeRequiredText(payload.title, 'title'),
          content: payload.content?.trim(),
          homeworkDate: payload.homeworkDate,
          dueDate: payload.dueDate,
          maxScore: payload.maxScore,
          notes: payload.notes?.trim(),
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: homeworkDetailsInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_UPDATE',
        resource: 'homeworks',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return homework;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async populateStudents(id: string, actorUserId: string) {
    const homework = await this.ensureHomeworkExists(id);
    await this.ensureActorAuthorized(
      actorUserId,
      homework.sectionId,
      homework.subjectId,
      homework.academicYearId,
    );

    const activeEnrollmentIds = await this.findActiveEnrollmentIds(
      homework.sectionId,
      homework.academicYearId,
    );
    const existingRows = await this.prisma.studentHomework.findMany({
      where: {
        homeworkId: id,
      },
      select: {
        id: true,
        studentEnrollmentId: true,
        deletedAt: true,
      },
    });

    const activeEnrollmentSet = new Set(
      existingRows
        .filter((row) => row.deletedAt === null)
        .map((row) => row.studentEnrollmentId),
    );
    const softDeletedByEnrollment = new Map(
      existingRows
        .filter((row) => row.deletedAt !== null)
        .map((row) => [row.studentEnrollmentId, row.id] as const),
    );

    const enrollmentIdsToCreate: string[] = [];
    const rowIdsToReactivate: string[] = [];

    for (const studentEnrollmentId of activeEnrollmentIds) {
      if (activeEnrollmentSet.has(studentEnrollmentId)) {
        continue;
      }

      const softDeletedRowId = softDeletedByEnrollment.get(studentEnrollmentId);

      if (softDeletedRowId) {
        rowIdsToReactivate.push(softDeletedRowId);
      } else {
        enrollmentIdsToCreate.push(studentEnrollmentId);
      }
    }

    const operations: Prisma.PrismaPromise<unknown>[] = [];

    for (const rowId of rowIdsToReactivate) {
      operations.push(
        this.prisma.studentHomework.update({
          where: {
            id: rowId,
          },
          data: {
            isCompleted: false,
            submittedAt: null,
            manualScore: null,
            teacherNotes: null,
            isActive: true,
            deletedAt: null,
            updatedById: actorUserId,
          },
        }),
      );
    }

    if (enrollmentIdsToCreate.length > 0) {
      operations.push(
        this.prisma.homework.update({
          where: {
            id,
          },
          data: {
            updatedById: actorUserId,
            studentHomeworks: {
              create: enrollmentIdsToCreate.map((studentEnrollmentId) => ({
                studentEnrollmentId,
                isCompleted: false,
                isActive: true,
                createdById: actorUserId,
                updatedById: actorUserId,
              })),
            },
          },
        }),
      );
    } else {
      operations.push(
        this.prisma.homework.update({
          where: {
            id,
          },
          data: {
            updatedById: actorUserId,
          },
        }),
      );
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'HOMEWORK_POPULATE_STUDENTS',
      resource: 'homeworks',
      resourceId: id,
      details: {
        insertedCount: enrollmentIdsToCreate.length,
        restoredCount: rowIdsToReactivate.length,
        activeEnrollmentCount: activeEnrollmentIds.length,
      },
    });

    return {
      homeworkId: id,
      insertedCount: enrollmentIdsToCreate.length,
      restoredCount: rowIdsToReactivate.length,
      activeEnrollmentCount: activeEnrollmentIds.length,
    };
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureHomeworkExists(id);

    await this.ensureActorAuthorized(
      actorUserId,
      existing.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    await this.prisma.$transaction([
      this.prisma.studentHomework.updateMany({
        where: {
          homeworkId: id,
          deletedAt: null,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
          updatedById: actorUserId,
        },
      }),
      this.prisma.homework.update({
        where: {
          id,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
          updatedById: actorUserId,
        },
      }),
    ]);

    await this.auditLogsService.record({
      actorUserId,
      action: 'HOMEWORK_DELETE',
      resource: 'homeworks',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureHomeworkExists(id: string): Promise<Homework> {
    const homework = await this.prisma.homework.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    return homework;
  }

  private async ensureReferencesExist(
    academicYearId: string,
    academicTermId: string,
    sectionId: string,
    subjectId: string,
    homeworkTypeId: string,
  ): Promise<HomeworkReferenceContext> {
    const [academicYear, academicTerm, section, subject, homeworkType] =
      await this.prisma.$transaction([
        this.prisma.academicYear.findFirst({
          where: {
            id: academicYearId,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        }),
        this.prisma.academicTerm.findFirst({
          where: {
            id: academicTermId,
            deletedAt: null,
          },
          select: {
            id: true,
            academicYearId: true,
            isActive: true,
            startDate: true,
            endDate: true,
          },
        }),
        this.prisma.section.findFirst({
          where: {
            id: sectionId,
            deletedAt: null,
          },
          select: {
            id: true,
            isActive: true,
            gradeLevelId: true,
          },
        }),
        this.prisma.subject.findFirst({
          where: {
            id: subjectId,
            deletedAt: null,
          },
          select: {
            id: true,
            isActive: true,
          },
        }),
        this.prisma.homeworkType.findFirst({
          where: {
            id: homeworkTypeId,
            deletedAt: null,
          },
          select: {
            id: true,
            isActive: true,
          },
        }),
      ]);

    if (!academicYear) {
      throw new BadRequestException('Academic year is invalid or deleted');
    }

    if (!academicTerm) {
      throw new BadRequestException('Academic term is invalid or deleted');
    }

    if (!academicTerm.isActive) {
      throw new BadRequestException('Academic term is inactive');
    }

    if (academicTerm.academicYearId !== academicYearId) {
      throw new BadRequestException(
        'Academic term does not belong to the selected academic year',
      );
    }

    if (!section) {
      throw new BadRequestException('Section is invalid or deleted');
    }

    if (!section.isActive) {
      throw new BadRequestException('Section is inactive');
    }

    if (!subject) {
      throw new BadRequestException('Subject is invalid or deleted');
    }

    if (!subject.isActive) {
      throw new BadRequestException('Subject is inactive');
    }

    if (!homeworkType) {
      throw new BadRequestException('Homework type is invalid or deleted');
    }

    if (!homeworkType.isActive) {
      throw new BadRequestException('Homework type is inactive');
    }

    const subjectOfferingCount = await this.prisma.termSubjectOffering.count({
      where: {
        academicTermId,
        deletedAt: null,
        isActive: true,
        gradeLevelSubject: {
          academicYearId,
          gradeLevelId: section.gradeLevelId,
          subjectId,
          deletedAt: null,
          isActive: true,
        },
      },
    });

    if (subjectOfferingCount === 0) {
      throw new BadRequestException(
        'Subject is not offered for this section grade level in the selected term',
      );
    }

    return {
      termStartDate: academicTerm.startDate,
      termEndDate: academicTerm.endDate,
    };
  }

  private validateHomeworkDates(
    homeworkDate: DateInput,
    dueDate: DateInput,
    termStartDate: Date,
    termEndDate: Date,
  ) {
    const parsedHomeworkDate = this.parseDate(homeworkDate, 'homeworkDate');
    const parsedDueDate = this.parseDate(dueDate, 'dueDate');

    if (!parsedHomeworkDate) {
      throw new BadRequestException('homeworkDate is required');
    }

    if (
      parsedHomeworkDate < termStartDate ||
      parsedHomeworkDate > termEndDate
    ) {
      throw new BadRequestException(
        'homeworkDate must be within the selected academic term date range',
      );
    }

    if (parsedDueDate && parsedDueDate < parsedHomeworkDate) {
      throw new BadRequestException(
        'dueDate must be on or after the homeworkDate',
      );
    }

    if (
      parsedDueDate &&
      (parsedDueDate < termStartDate || parsedDueDate > termEndDate)
    ) {
      throw new BadRequestException(
        'dueDate must be within the selected academic term date range',
      );
    }
  }

  private parseDate(value: DateInput, fieldName: string): Date | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Invalid date format for ${fieldName}`);
    }

    return parsedDate;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private async ensureManualScoresWithinMaxScore(
    homeworkId: string,
    maxScore: number,
  ) {
    const violatingRow = await this.prisma.studentHomework.findFirst({
      where: {
        homeworkId,
        deletedAt: null,
        manualScore: {
          gt: maxScore,
        },
      },
      select: {
        id: true,
      },
    });

    if (violatingRow) {
      throw new ConflictException(
        'Cannot reduce maxScore below existing manual student scores',
      );
    }
  }

  private async findActiveEnrollmentIds(
    sectionId: string,
    academicYearId: string,
  ): Promise<string[]> {
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        sectionId,
        academicYearId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return enrollments.map((enrollment) => enrollment.id);
  }

  private async ensureActorAuthorized(
    actorUserId: string,
    sectionId: string,
    subjectId: string,
    academicYearId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: actorUserId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Authenticated user is not active');
    }

    if (!user.employeeId) {
      // Allow privileged users without linked employee profile.
      return;
    }

    const assignmentsCount = await this.prisma.employeeTeachingAssignment.count(
      {
        where: {
          employeeId: user.employeeId,
          sectionId,
          subjectId,
          academicYearId,
          deletedAt: null,
          isActive: true,
        },
      },
    );

    if (assignmentsCount === 0) {
      throw new ForbiddenException(
        'You are not assigned to this subject and section for the selected academic year',
      );
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Homework already exists for this term, section, subject, title, and date',
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
