import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  Prisma,
  StudentSibling,
  StudentSiblingRelationship,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StudentsService } from '../students/students.service';
import { CreateStudentSiblingDto } from './dto/create-student-sibling.dto';
import { ListStudentSiblingsDto } from './dto/list-student-siblings.dto';
import { UpdateStudentSiblingDto } from './dto/update-student-sibling.dto';

const studentSiblingInclude = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      isActive: true,
    },
  },
  sibling: {
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
export class StudentSiblingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly studentsService: StudentsService,
  ) {}

  async create(payload: CreateStudentSiblingDto, actorUserId: string) {
    this.ensureDistinctStudents(payload.studentId, payload.siblingId);
    await this.studentsService.ensureStudentExistsAndActive(payload.studentId);
    await this.studentsService.ensureStudentExistsAndActive(payload.siblingId);
    await this.ensureNoInverseDuplicate(payload.studentId, payload.siblingId);

    try {
      const studentSibling = await this.prisma.studentSibling.create({
        data: {
          studentId: payload.studentId,
          siblingId: payload.siblingId,
          relationship: payload.relationship,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentSiblingInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_SIBLING_CREATE',
        resource: 'student-siblings',
        resourceId: studentSibling.id,
        details: {
          studentId: studentSibling.studentId,
          siblingId: studentSibling.siblingId,
          relationship: studentSibling.relationship,
        },
      });

      return studentSibling;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_SIBLING_CREATE_FAILED',
        resource: 'student-siblings',
        status: AuditStatus.FAILURE,
        details: {
          studentId: payload.studentId,
          siblingId: payload.siblingId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentSiblingsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentSiblingWhereInput = {
      deletedAt: null,
      studentId: query.studentId,
      siblingId: query.siblingId,
      relationship: query.relationship,
      isActive: query.isActive,
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
              sibling: {
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
              sibling: {
                admissionNo: {
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
      this.prisma.studentSibling.count({ where }),
      this.prisma.studentSibling.findMany({
        where,
        include: studentSiblingInclude,
        orderBy: [{ createdAt: 'desc' }],
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
    const studentSibling = await this.prisma.studentSibling.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentSiblingInclude,
    });

    if (!studentSibling) {
      throw new NotFoundException('Student sibling record not found');
    }

    return studentSibling;
  }

  async update(
    id: string,
    payload: UpdateStudentSiblingDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureStudentSiblingExists(id);

    const resolvedStudentId = payload.studentId ?? existing.studentId;
    const resolvedSiblingId = payload.siblingId ?? existing.siblingId;
    this.ensureDistinctStudents(resolvedStudentId, resolvedSiblingId);

    await this.studentsService.ensureStudentExistsAndActive(resolvedStudentId);
    await this.studentsService.ensureStudentExistsAndActive(resolvedSiblingId);
    await this.ensureNoInverseDuplicate(resolvedStudentId, resolvedSiblingId, id);

    try {
      const studentSibling = await this.prisma.studentSibling.update({
        where: {
          id,
        },
        data: {
          studentId: payload.studentId,
          siblingId: payload.siblingId,
          relationship: payload.relationship,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: studentSiblingInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_SIBLING_UPDATE',
        resource: 'student-siblings',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return studentSibling;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureStudentSiblingExists(id);

    await this.prisma.studentSibling.update({
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
      action: 'STUDENT_SIBLING_DELETE',
      resource: 'student-siblings',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureStudentSiblingExists(id: string): Promise<StudentSibling> {
    const studentSibling = await this.prisma.studentSibling.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!studentSibling) {
      throw new NotFoundException('Student sibling record not found');
    }

    return studentSibling;
  }

  private ensureDistinctStudents(studentId: string, siblingId: string) {
    if (studentId === siblingId) {
      throw new BadRequestException('studentId and siblingId cannot be the same');
    }
  }

  private async ensureNoInverseDuplicate(
    studentId: string,
    siblingId: string,
    currentId?: string,
  ) {
    const inverse = await this.prisma.studentSibling.findFirst({
      where: {
        deletedAt: null,
        studentId: siblingId,
        siblingId: studentId,
        id: currentId
          ? {
              not: currentId,
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

    if (inverse) {
      throw new ConflictException(
        'Sibling relationship already exists for this pair in inverse direction',
      );
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Student-sibling relationship must be unique');
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
