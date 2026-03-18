import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, Prisma, StudentProblem } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StudentsService } from '../students/students.service';
import { CreateStudentProblemDto } from './dto/create-student-problem.dto';
import { ListStudentProblemsDto } from './dto/list-student-problems.dto';
import { UpdateStudentProblemDto } from './dto/update-student-problem.dto';

const studentProblemInclude = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
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
} as const;

@Injectable()
export class StudentProblemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly studentsService: StudentsService,
  ) {}

  async create(payload: CreateStudentProblemDto, actorUserId: string) {
    await this.studentsService.ensureStudentExistsAndActive(payload.studentId);

    try {
      const studentProblem = await this.prisma.studentProblem.create({
        data: {
          studentId: payload.studentId,
          problemDate: payload.problemDate,
          problemType: payload.problemType,
          problemDescription: payload.problemDescription,
          actionsTaken: payload.actionsTaken,
          hasMinutes: payload.hasMinutes ?? false,
          isResolved: payload.isResolved ?? false,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentProblemInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_PROBLEM_CREATE',
        resource: 'student-problems',
        resourceId: studentProblem.id,
        details: {
          studentId: studentProblem.studentId,
          problemDate: studentProblem.problemDate,
          isResolved: studentProblem.isResolved,
        },
      });

      return studentProblem;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_PROBLEM_CREATE_FAILED',
        resource: 'student-problems',
        status: AuditStatus.FAILURE,
        details: {
          studentId: payload.studentId,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListStudentProblemsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentProblemWhereInput = {
      deletedAt: null,
      studentId: query.studentId,
      problemType: query.problemType
        ? {
            contains: query.problemType,
          }
        : undefined,
      isResolved: query.isResolved,
      isActive: query.isActive,
      problemDate:
        query.fromProblemDate || query.toProblemDate
          ? {
              gte: query.fromProblemDate,
              lte: query.toProblemDate,
            }
          : undefined,
      OR: query.search
        ? [
            {
              student: {
                fullName: {
                  contains: query.search,
                },
              },
            },
            {
              student: {
                admissionNo: {
                  contains: query.search,
                },
              },
            },
            {
              problemType: {
                contains: query.search,
              },
            },
            {
              problemDescription: {
                contains: query.search,
              },
            },
            {
              actionsTaken: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentProblem.count({ where }),
      this.prisma.studentProblem.findMany({
        where,
        include: studentProblemInclude,
        orderBy: [{ problemDate: 'desc' }, { createdAt: 'desc' }],
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
    const studentProblem = await this.prisma.studentProblem.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentProblemInclude,
    });

    if (!studentProblem) {
      throw new NotFoundException('Student problem record not found');
    }

    return studentProblem;
  }

  async update(
    id: string,
    payload: UpdateStudentProblemDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureStudentProblemExists(id);
    const resolvedStudentId = payload.studentId ?? existing.studentId;

    await this.studentsService.ensureStudentExistsAndActive(resolvedStudentId);

    const studentProblem = await this.prisma.studentProblem.update({
      where: {
        id,
      },
      data: {
        studentId: payload.studentId,
        problemDate: payload.problemDate,
        problemType: payload.problemType,
        problemDescription: payload.problemDescription,
        actionsTaken: payload.actionsTaken,
        hasMinutes: payload.hasMinutes,
        isResolved: payload.isResolved,
        isActive: payload.isActive,
        updatedById: actorUserId,
      },
      include: studentProblemInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_PROBLEM_UPDATE',
      resource: 'student-problems',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return studentProblem;
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureStudentProblemExists(id);

    await this.prisma.studentProblem.update({
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
      action: 'STUDENT_PROBLEM_DELETE',
      resource: 'student-problems',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureStudentProblemExists(id: string): Promise<StudentProblem> {
    const studentProblem = await this.prisma.studentProblem.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!studentProblem) {
      throw new NotFoundException('Student problem record not found');
    }

    return studentProblem;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}

