import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, StudentEnrollment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StudentsService } from '../students/students.service';
import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto';
import { ListStudentEnrollmentsDto } from './dto/list-student-enrollments.dto';
import { UpdateStudentEnrollmentDto } from './dto/update-student-enrollment.dto';

const studentEnrollmentInclude = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      isActive: true,
    },
  },
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
      isActive: true,
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
export class StudentEnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly studentsService: StudentsService,
  ) {}

  async create(payload: CreateStudentEnrollmentDto, actorUserId: string) {
    try {
      await this.studentsService.ensureStudentExistsAndActive(
        payload.studentId,
      );
      await this.ensureAcademicYearExists(payload.academicYearId);
      await this.ensureSectionExistsAndActive(payload.sectionId);

      const enrollment = await this.prisma.studentEnrollment.create({
        data: {
          studentId: payload.studentId,
          academicYearId: payload.academicYearId,
          sectionId: payload.sectionId,
          enrollmentDate: payload.enrollmentDate,
          status: payload.status,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentEnrollmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_ENROLLMENT_CREATE',
        resource: 'student-enrollments',
        resourceId: enrollment.id,
        details: {
          studentId: enrollment.studentId,
          academicYearId: enrollment.academicYearId,
          sectionId: enrollment.sectionId,
          status: enrollment.status,
        },
      });

      return enrollment;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_ENROLLMENT_CREATE_FAILED',
        resource: 'student-enrollments',
        status: AuditStatus.FAILURE,
        details: {
          studentId: payload.studentId,
          academicYearId: payload.academicYearId,
          sectionId: payload.sectionId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentEnrollmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentEnrollmentWhereInput = {
      deletedAt: null,
      studentId: query.studentId,
      academicYearId: query.academicYearId,
      sectionId: query.sectionId,
      status: query.status,
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
              student: {
                admissionNo: {
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
              section: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              academicYear: {
                code: {
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
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentEnrollment.count({ where }),
      this.prisma.studentEnrollment.findMany({
        where,
        include: studentEnrollmentInclude,
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
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentEnrollmentInclude,
    });

    if (!enrollment) {
      throw new NotFoundException('Student enrollment not found');
    }

    return enrollment;
  }

  async update(
    id: string,
    payload: UpdateStudentEnrollmentDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureEnrollmentExists(id);

    const resolvedStudentId = payload.studentId ?? existing.studentId;
    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const resolvedSectionId = payload.sectionId ?? existing.sectionId;

    await this.studentsService.ensureStudentExistsAndActive(resolvedStudentId);
    await this.ensureAcademicYearExists(resolvedAcademicYearId);
    await this.ensureSectionExistsAndActive(resolvedSectionId);

    try {
      const enrollment = await this.prisma.studentEnrollment.update({
        where: {
          id,
        },
        data: {
          studentId: payload.studentId,
          academicYearId: payload.academicYearId,
          sectionId: payload.sectionId,
          enrollmentDate: payload.enrollmentDate,
          status: payload.status,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: studentEnrollmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_ENROLLMENT_UPDATE',
        resource: 'student-enrollments',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return enrollment;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEnrollmentExists(id);

    await this.prisma.studentEnrollment.update({
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
      action: 'STUDENT_ENROLLMENT_DELETE',
      resource: 'student-enrollments',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEnrollmentExists(id: string): Promise<StudentEnrollment> {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Student enrollment not found');
    }

    return enrollment;
  }

  private async ensureAcademicYearExists(academicYearId: string) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!academicYear) {
      throw new BadRequestException('Academic year is invalid or deleted');
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
      throw new BadRequestException('Section is invalid or deleted');
    }

    if (!section.isActive) {
      throw new BadRequestException('Section is inactive');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Student can only have one enrollment per academic year',
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
