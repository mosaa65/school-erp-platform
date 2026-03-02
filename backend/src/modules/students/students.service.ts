import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, Student } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsDto } from './dto/list-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const studentInclude: Prisma.StudentInclude = {
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
  bloodType: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
  guardians: {
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      relationship: true,
      isPrimary: true,
      guardian: {
        select: {
          id: true,
          fullName: true,
          phonePrimary: true,
          whatsappNumber: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
  enrollments: {
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      status: true,
      enrollmentDate: true,
      academicYear: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          isCurrent: true,
        },
      },
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
              stage: true,
              sequence: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        academicYear: {
          startDate: 'desc',
        },
      },
      {
        createdAt: 'desc',
      },
    ],
  },
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateStudentDto, actorUserId: string) {
    const fullName = payload.fullName.trim();
    const admissionNo = payload.admissionNo?.trim().toUpperCase();

    if (payload.bloodTypeId !== undefined && payload.bloodTypeId !== null) {
      await this.ensureBloodTypeExists(payload.bloodTypeId);
    }

    try {
      const student = await this.prisma.student.create({
        data: {
          admissionNo,
          fullName,
          gender: payload.gender,
          birthDate: payload.birthDate,
          bloodTypeId:
            payload.bloodTypeId === null ? null : payload.bloodTypeId,
          healthStatus: payload.healthStatus,
          healthNotes: payload.healthNotes,
          orphanStatus: payload.orphanStatus,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_CREATE',
        resource: 'students',
        resourceId: student.id,
        details: {
          admissionNo: student.admissionNo,
          fullName: student.fullName,
        },
      });

      return student;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_CREATE_FAILED',
        resource: 'students',
        status: AuditStatus.FAILURE,
        details: {
          admissionNo,
          fullName,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentWhereInput = {
      deletedAt: null,
      gender: query.gender,
      bloodTypeId: query.bloodTypeId,
      orphanStatus: query.orphanStatus,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              fullName: {
                contains: query.search,
              },
            },
            {
              admissionNo: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        include: studentInclude,
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
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentInclude,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(id: string, payload: UpdateStudentDto, actorUserId: string) {
    await this.ensureStudentExists(id);

    if (payload.bloodTypeId !== undefined && payload.bloodTypeId !== null) {
      await this.ensureBloodTypeExists(payload.bloodTypeId);
    }

    try {
      const student = await this.prisma.student.update({
        where: {
          id,
        },
        data: {
          admissionNo: payload.admissionNo?.trim().toUpperCase(),
          fullName: payload.fullName?.trim(),
          gender: payload.gender,
          birthDate: payload.birthDate,
          bloodTypeId:
            payload.bloodTypeId === null ? null : payload.bloodTypeId,
          healthStatus: payload.healthStatus,
          healthNotes: payload.healthNotes,
          orphanStatus: payload.orphanStatus,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: studentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_UPDATE',
        resource: 'students',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return student;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureStudentExists(id);

    await this.prisma.student.update({
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
      action: 'STUDENT_DELETE',
      resource: 'students',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async ensureStudentExistsAndActive(id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!student.isActive) {
      throw new ConflictException('Student is inactive');
    }

    return student;
  }

  private async ensureStudentExists(id: string): Promise<Student> {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  private async ensureBloodTypeExists(bloodTypeId: number) {
    const bloodType = await this.prisma.lookupBloodType.findFirst({
      where: {
        id: bloodTypeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!bloodType) {
      throw new BadRequestException('bloodTypeId is not valid');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Student admission number must be unique');
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
