import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  GradingWorkflowStatus,
  Homework,
  ParentNotificationSendMethod,
  ParentNotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { ParentNotificationsService } from '../../parent-notifications/parent-notifications.service';
import { DataScopeService } from '../../teaching-assignments/data-scope/data-scope.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { HomeworksDashboardDto } from './dto/homeworks-dashboard.dto';
import { HomeworkWorkflowActionDto } from './dto/homework-workflow-action.dto';
import { ListHomeworksDto } from './dto/list-homeworks.dto';
import { SendHomeworkNotificationsDto } from './dto/send-homework-notifications.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

type DateInput = string | Date | null | undefined;

type HomeworkReferenceContext = {
  termStartDate: Date;
  termEndDate: Date;
};

const DEFAULT_DUE_DATE_OFFSET_DAYS = 5;

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
    private readonly dataScopeService: DataScopeService,
    private readonly parentNotificationsService: ParentNotificationsService,
  ) {}

  async create(payload: CreateHomeworkDto, actorUserId: string) {
    const references = await this.ensureReferencesExist(
      payload.academicYearId,
      payload.academicTermId,
      payload.sectionId,
      payload.subjectId,
      payload.homeworkTypeId,
    );
    const resolvedDueDate = this.resolveDueDate(
      payload.homeworkDate,
      payload.dueDate,
      references.termEndDate,
    );
    this.validateHomeworkDates(
      payload.homeworkDate,
      resolvedDueDate,
      references.termStartDate,
      references.termEndDate,
    );
    await this.ensureActorAuthorized(
      actorUserId,
      payload.sectionId,
      payload.subjectId,
      payload.academicYearId,
    );
    if (payload.maxScore === undefined) {
      throw new BadRequestException('درجة الواجب القصوى مطلوبة');
    }

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
          dueDate: resolvedDueDate,
          maxScore: payload.maxScore,
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

  async findAll(query: ListHomeworksDto, actorUserId: string) {
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

      where.AND = [
        {
          OR: scope.grants.map((grant) => ({
            sectionId: grant.sectionId,
            academicYearId: grant.academicYearId,
            subjectId: grant.subjectId,
          })),
        },
      ];
    }

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

  async dashboard(query: HomeworksDashboardDto, actorUserId: string) {
    const asOfDate = this.parseDate(query.asOfDate, 'asOfDate') ?? new Date();
    const startOfToday = new Date(asOfDate);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(asOfDate);
    endOfToday.setHours(23, 59, 59, 999);
    const dueSoonEnd = new Date(endOfToday);
    dueSoonEnd.setDate(dueSoonEnd.getDate() + 7);

    const where: Prisma.HomeworkWhereInput = {
      deletedAt: null,
      isActive: true,
      academicYearId: query.academicYearId,
      academicTermId: query.academicTermId,
      sectionId: query.sectionId,
      subjectId: query.subjectId,
      homeworkDate:
        query.fromDate || query.toDate
          ? {
              gte: query.fromDate,
              lte: query.toDate,
            }
          : undefined,
    };

    const scopedWhere = await this.applyHomeworkScope(
      where,
      actorUserId,
      query.academicYearId,
    );

    if (!scopedWhere) {
      return this.emptyDashboard();
    }

    const studentHomeworkWhere: Prisma.StudentHomeworkWhereInput = {
      deletedAt: null,
      isActive: true,
      homework: scopedWhere,
    };

    const pendingStudentHomeworkWhere: Prisma.StudentHomeworkWhereInput = {
      ...studentHomeworkWhere,
      isCompleted: false,
    };

    const [
      totalHomeworks,
      todayHomeworks,
      dueSoonHomeworks,
      overdueHomeworks,
      totalStudentRows,
      completedStudentRows,
      pendingStudentRows,
      recentHomeworks,
      pendingRows,
      reportRows,
    ] = await this.prisma.$transaction([
      this.prisma.homework.count({ where: scopedWhere }),
      this.prisma.homework.count({
        where: {
          ...scopedWhere,
          homeworkDate: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      this.prisma.homework.count({
        where: {
          ...scopedWhere,
          dueDate: {
            gte: startOfToday,
            lte: dueSoonEnd,
          },
        },
      }),
      this.prisma.homework.count({
        where: {
          ...scopedWhere,
          dueDate: {
            lt: startOfToday,
          },
          studentHomeworks: {
            some: {
              deletedAt: null,
              isActive: true,
              isCompleted: false,
            },
          },
        },
      }),
      this.prisma.studentHomework.count({ where: studentHomeworkWhere }),
      this.prisma.studentHomework.count({
        where: {
          ...studentHomeworkWhere,
          isCompleted: true,
        },
      }),
      this.prisma.studentHomework.count({ where: pendingStudentHomeworkWhere }),
      this.prisma.homework.findMany({
        where: scopedWhere,
        include: homeworkListInclude,
        orderBy: [{ homeworkDate: 'desc' }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.studentHomework.findMany({
        where: pendingStudentHomeworkWhere,
        select: {
          id: true,
          homeworkId: true,
          homework: {
            select: {
              id: true,
              title: true,
              dueDate: true,
              homeworkDate: true,
              section: {
                select: {
                  id: true,
                  code: true,
                  name: true,
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
                },
              },
            },
          },
        },
        orderBy: [
          {
            homework: {
              dueDate: 'asc',
            },
          },
          {
            createdAt: 'asc',
          },
        ],
        take: 500,
      }),
      this.prisma.studentHomework.findMany({
        where: studentHomeworkWhere,
        select: {
          isCompleted: true,
          homework: {
            select: {
              section: {
                select: {
                  id: true,
                  code: true,
                  name: true,
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
                },
              },
            },
          },
        },
        take: 2000,
      }),
    ]);

    const pendingByHomework = new Map<
      string,
      {
        homeworkId: string;
        title: string;
        dueDate: Date | null;
        homeworkDate: Date;
        section: (typeof pendingRows)[number]['homework']['section'];
        subject: (typeof pendingRows)[number]['homework']['subject'];
        pendingCount: number;
      }
    >();

    for (const row of pendingRows) {
      const current = pendingByHomework.get(row.homeworkId);
      if (current) {
        current.pendingCount += 1;
        continue;
      }

      pendingByHomework.set(row.homeworkId, {
        homeworkId: row.homeworkId,
        title: row.homework.title,
        dueDate: row.homework.dueDate,
        homeworkDate: row.homework.homeworkDate,
        section: row.homework.section,
        subject: row.homework.subject,
        pendingCount: 1,
      });
    }

    const topPendingHomeworks = Array.from(pendingByHomework.values())
      .sort((a, b) => b.pendingCount - a.pendingCount)
      .slice(0, 6);
    const bySubject = this.buildDashboardGroupSummary(
      reportRows.map((row) => ({
        key: row.homework.subject.id,
        label: row.homework.subject.name,
        code: row.homework.subject.code,
        isCompleted: row.isCompleted,
      })),
    );
    const bySection = this.buildDashboardGroupSummary(
      reportRows.map((row) => ({
        key: row.homework.section.id,
        label: row.homework.section.name,
        code: row.homework.section.code,
        isCompleted: row.isCompleted,
      })),
    );

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalHomeworks,
        todayHomeworks,
        dueSoonHomeworks,
        overdueHomeworks,
        totalStudentRows,
        completedStudentRows,
        pendingStudentRows,
        completionRate:
          totalStudentRows > 0
            ? Math.round((completedStudentRows / totalStudentRows) * 100)
            : 0,
      },
      recentHomeworks,
      topPendingHomeworks,
      reports: {
        bySubject,
        bySection,
      },
    };
  }

  async findOne(id: string, actorUserId: string) {
    const homework = await this.prisma.homework.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: homeworkDetailsInclude,
    });

    if (!homework) {
      throw new NotFoundException('لم يتم العثور على الواجب');
    }

    await this.ensureActorAuthorized(
      actorUserId,
      homework.sectionId,
      homework.subjectId,
      homework.academicYearId,
    );

    return homework;
  }

  async update(id: string, payload: UpdateHomeworkDto, actorUserId: string) {
    const existing = await this.ensureHomeworkExists(id);
    this.ensureHomeworkEditable(existing);

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
        'لا يمكن تغيير academicYearId أو sectionId بعد وجود سجلات واجبات للطلاب',
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
    this.ensureHomeworkEditable(homework);
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

  async approve(
    id: string,
    payload: HomeworkWorkflowActionDto,
    actorUserId: string,
  ) {
    const homework = await this.ensureHomeworkExists(id);

    await this.ensureActorAuthorized(
      actorUserId,
      homework.sectionId,
      homework.subjectId,
      homework.academicYearId,
    );

    const now = new Date();
    const updated = await this.prisma.homework.update({
      where: {
        id,
      },
      data: {
        status: GradingWorkflowStatus.APPROVED,
        isLocked: payload.lockAfterApprove ?? true,
        approvedAt: now,
        approvedById: actorUserId,
        lockedAt: payload.lockAfterApprove === false ? null : now,
        notes: payload.notes?.trim() ?? homework.notes,
        updatedById: actorUserId,
      },
      include: homeworkDetailsInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'HOMEWORK_APPROVE',
      resource: 'homeworks',
      resourceId: id,
      details: {
        lockAfterApprove: payload.lockAfterApprove ?? true,
        notes: payload.notes,
      },
    });

    return updated;
  }

  async reopen(
    id: string,
    payload: HomeworkWorkflowActionDto,
    actorUserId: string,
  ) {
    const homework = await this.ensureHomeworkExists(id);
    await this.ensureHomeworkNotInLockedMonthlyGrades(homework);

    await this.ensureActorAuthorized(
      actorUserId,
      homework.sectionId,
      homework.subjectId,
      homework.academicYearId,
    );

    const updated = await this.prisma.homework.update({
      where: {
        id,
      },
      data: {
        status: GradingWorkflowStatus.DRAFT,
        isLocked: false,
        lockedAt: null,
        notes: payload.notes?.trim() ?? homework.notes,
        updatedById: actorUserId,
      },
      include: homeworkDetailsInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'HOMEWORK_REOPEN',
      resource: 'homeworks',
      resourceId: id,
      details: {
        notes: payload.notes,
      },
    });

    return updated;
  }

  async sendLateNotifications(
    id: string,
    payload: SendHomeworkNotificationsDto,
    actorUserId: string,
  ) {
    const homework = await this.ensureHomeworkExists(id);

    await this.ensureActorAuthorized(
      actorUserId,
      homework.sectionId,
      homework.subjectId,
      homework.academicYearId,
    );

    const pendingRows = await this.prisma.studentHomework.findMany({
      where: {
        homeworkId: id,
        deletedAt: null,
        isActive: true,
        isCompleted: false,
      },
      select: {
        studentEnrollment: {
          select: {
            studentId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    let createdCount = 0;
    let skippedDuplicateCount = 0;
    const behaviorType = 'واجبات';
    const behaviorDescription = `لم ينفذ الطالب واجب: ${homework.title}`;

    for (const row of pendingRows) {
      const studentId = row.studentEnrollment.studentId;
      const existingNotification =
        await this.prisma.parentNotification.findFirst({
          where: {
            studentId,
            deletedAt: null,
            behaviorType,
            behaviorDescription,
          },
          select: {
            id: true,
          },
        });

      if (existingNotification) {
        skippedDuplicateCount += 1;
        continue;
      }

      await this.parentNotificationsService.create(
        {
          studentId,
          notificationType: ParentNotificationType.NEGATIVE,
          behaviorType,
          behaviorDescription,
          requiredAction:
            payload.requiredAction ??
            'يرجى متابعة تنفيذ الواجب مع الطالب وإبلاغ المدرسة عند الحاجة.',
          sendMethod: ParentNotificationSendMethod.PAPER,
          isSent: payload.markAsSent ?? false,
          sentDate: payload.markAsSent ? new Date().toISOString() : undefined,
          results: `واجب: ${homework.title}`,
        },
        actorUserId,
      );
      createdCount += 1;
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'HOMEWORK_LATE_NOTIFICATIONS_SEND',
      resource: 'homeworks',
      resourceId: id,
      details: {
        pendingCount: pendingRows.length,
        createdCount,
        skippedDuplicateCount,
      },
    });

    return {
      homeworkId: id,
      pendingCount: pendingRows.length,
      createdCount,
      skippedDuplicateCount,
    };
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureHomeworkExists(id);
    this.ensureHomeworkEditable(existing);

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

  private resolveDueDate(
    homeworkDate: DateInput,
    dueDate: DateInput,
    termEndDate: Date,
  ): Date | undefined {
    const explicitDueDate = this.parseDate(dueDate, 'dueDate');
    if (explicitDueDate) {
      return explicitDueDate;
    }

    const parsedHomeworkDate = this.parseDate(homeworkDate, 'homeworkDate');
    if (!parsedHomeworkDate) {
      return undefined;
    }

    const fallbackDueDate = new Date(parsedHomeworkDate);
    fallbackDueDate.setUTCDate(
      fallbackDueDate.getUTCDate() + DEFAULT_DUE_DATE_OFFSET_DAYS,
    );

    if (fallbackDueDate > termEndDate) {
      return termEndDate;
    }

    return fallbackDueDate;
  }

  private async ensureHomeworkExists(id: string): Promise<Homework> {
    const homework = await this.prisma.homework.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!homework) {
      throw new NotFoundException('لم يتم العثور على الواجب');
    }

    return homework;
  }

  private ensureHomeworkEditable(homework: Homework) {
    if (
      homework.isLocked ||
      homework.status === GradingWorkflowStatus.APPROVED
    ) {
      throw new ConflictException(
        'لا يمكن تعديل واجب معتمد أو مقفل. أعد فتح الواجب أولًا ثم حاول مرة أخرى.',
      );
    }
  }

  private async ensureHomeworkNotInLockedMonthlyGrades(homework: Homework) {
    const lockedMonthlyGrade = await this.prisma.monthlyGrade.findFirst({
      where: {
        academicYearId: homework.academicYearId,
        academicTermId: homework.academicTermId,
        subjectId: homework.subjectId,
        deletedAt: null,
        OR: [
          {
            isLocked: true,
          },
          {
            status: GradingWorkflowStatus.APPROVED,
          },
        ],
        studentEnrollment: {
          sectionId: homework.sectionId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
      },
    });

    if (lockedMonthlyGrade) {
      throw new ConflictException(
        'لا يمكن إعادة فتح الواجب لأنه مرتبط بمحصلة شهرية معتمدة أو مقفلة.',
      );
    }
  }

  private async applyHomeworkScope(
    where: Prisma.HomeworkWhereInput,
    actorUserId: string,
    academicYearId?: string,
  ): Promise<Prisma.HomeworkWhereInput | null> {
    const scope = await this.dataScopeService.getSectionSubjectYearGrants({
      actorUserId,
      capability: 'MANAGE_HOMEWORKS',
      academicYearId,
    });

    if (scope.isPrivileged) {
      return where;
    }

    if (scope.grants.length === 0) {
      return null;
    }

    return {
      ...where,
      AND: [
        ...(Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : []),
        {
          OR: scope.grants.map((grant) => ({
            sectionId: grant.sectionId,
            academicYearId: grant.academicYearId,
            subjectId: grant.subjectId,
          })),
        },
      ],
    };
  }

  private emptyDashboard() {
    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalHomeworks: 0,
        todayHomeworks: 0,
        dueSoonHomeworks: 0,
        overdueHomeworks: 0,
        totalStudentRows: 0,
        completedStudentRows: 0,
        pendingStudentRows: 0,
        completionRate: 0,
      },
      recentHomeworks: [],
      topPendingHomeworks: [],
      reports: {
        bySubject: [],
        bySection: [],
      },
    };
  }

  private buildDashboardGroupSummary(
    rows: Array<{
      key: string;
      label: string;
      code: string | null;
      isCompleted: boolean;
    }>,
  ) {
    const grouped = new Map<
      string,
      {
        id: string;
        label: string;
        code: string | null;
        total: number;
        completed: number;
        pending: number;
        completionRate: number;
      }
    >();

    for (const row of rows) {
      const current = grouped.get(row.key) ?? {
        id: row.key,
        label: row.label,
        code: row.code,
        total: 0,
        completed: 0,
        pending: 0,
        completionRate: 0,
      };

      current.total += 1;
      if (row.isCompleted) {
        current.completed += 1;
      } else {
        current.pending += 1;
      }

      current.completionRate =
        current.total > 0
          ? Math.round((current.completed / current.total) * 100)
          : 0;
      grouped.set(row.key, current);
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.pending - a.pending || b.total - a.total,
    );
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
      throw new BadRequestException('السنة الدراسية غير صالحة أو محذوفة');
    }

    if (!academicTerm) {
      throw new BadRequestException('الفصل الدراسي غير صالح أو محذوف');
    }

    if (!academicTerm.isActive) {
      throw new BadRequestException('الفصل الدراسي غير نشط');
    }

    if (academicTerm.academicYearId !== academicYearId) {
      throw new BadRequestException(
        'Academic term does not belong to the selected academic year',
      );
    }

    if (!section) {
      throw new BadRequestException('الشعبة غير صالحة أو محذوفة');
    }

    if (!section.isActive) {
      throw new BadRequestException('الشعبة غير نشطة');
    }

    if (!subject) {
      throw new BadRequestException('المادة غير صالحة أو محذوفة');
    }

    if (!subject.isActive) {
      throw new BadRequestException('المادة غير نشطة');
    }

    if (!homeworkType) {
      throw new BadRequestException('نوع الواجب غير صالح أو محذوف');
    }

    if (!homeworkType.isActive) {
      throw new BadRequestException('نوع الواجب غير نشط');
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
      throw new BadRequestException('تاريخ الواجب مطلوب');
    }

    if (
      parsedHomeworkDate < termStartDate ||
      parsedHomeworkDate > termEndDate
    ) {
      throw new BadRequestException(
        'يجب أن يكون homeworkDate ضمن نطاق تواريخ الفصل الدراسي المحدد',
      );
    }

    if (parsedDueDate && parsedDueDate < parsedHomeworkDate) {
      throw new BadRequestException(
        'يجب أن يكون dueDate مساويًا أو بعد homeworkDate',
      );
    }

    if (
      parsedDueDate &&
      (parsedDueDate < termStartDate || parsedDueDate > termEndDate)
    ) {
      throw new BadRequestException(
        'يجب أن يكون dueDate ضمن نطاق تواريخ الفصل الدراسي المحدد',
      );
    }
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

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`لا يمكن أن يكون ${fieldName} فارغًا`);
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
        'الواجب موجود مسبقًا لهذا الفصل والشعبة والمادة والعنوان والتاريخ',
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
