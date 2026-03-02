import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, StudentAttendance } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateStudentAttendanceDto } from './dto/create-student-attendance.dto';
import { ListStudentAttendanceDto } from './dto/list-student-attendance.dto';
import { UpdateStudentAttendanceDto } from './dto/update-student-attendance.dto';

type DateInput = string | Date | null | undefined;

const studentAttendanceInclude: Prisma.StudentAttendanceInclude = {
  studentEnrollment: {
    select: {
      id: true,
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
export class StudentAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateStudentAttendanceDto, actorUserId: string) {
    await this.ensureEnrollmentExistsAndActive(payload.studentEnrollmentId);
    this.validateCheckInOutOrder(payload.checkInAt, payload.checkOutAt);

    try {
      const attendance = await this.prisma.studentAttendance.create({
        data: {
          studentEnrollmentId: payload.studentEnrollmentId,
          attendanceDate: payload.attendanceDate,
          status: payload.status,
          checkInAt: payload.checkInAt,
          checkOutAt: payload.checkOutAt,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentAttendanceInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_ATTENDANCE_CREATE',
        resource: 'student-attendance',
        resourceId: attendance.id,
        details: {
          studentEnrollmentId: attendance.studentEnrollmentId,
          attendanceDate: attendance.attendanceDate,
          status: attendance.status,
        },
      });

      return attendance;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_ATTENDANCE_CREATE_FAILED',
        resource: 'student-attendance',
        status: AuditStatus.FAILURE,
        details: {
          studentEnrollmentId: payload.studentEnrollmentId,
          attendanceDate: payload.attendanceDate,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentAttendanceDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentAttendanceWhereInput = {
      deletedAt: null,
      studentEnrollmentId: query.studentEnrollmentId,
      status: query.status,
      isActive: query.isActive,
      studentEnrollment: query.studentId
        ? {
            studentId: query.studentId,
          }
        : undefined,
      attendanceDate:
        query.fromDate || query.toDate
          ? {
              gte: query.fromDate,
              lte: query.toDate,
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
              notes: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentAttendance.count({ where }),
      this.prisma.studentAttendance.findMany({
        where,
        include: studentAttendanceInclude,
        orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
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
    const attendance = await this.prisma.studentAttendance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentAttendanceInclude,
    });

    if (!attendance) {
      throw new NotFoundException('Student attendance record not found');
    }

    return attendance;
  }

  async update(
    id: string,
    payload: UpdateStudentAttendanceDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureAttendanceExists(id);

    const resolvedStudentEnrollmentId =
      payload.studentEnrollmentId ?? existing.studentEnrollmentId;
    const resolvedCheckInAt = payload.checkInAt ?? existing.checkInAt;
    const resolvedCheckOutAt = payload.checkOutAt ?? existing.checkOutAt;

    await this.ensureEnrollmentExistsAndActive(resolvedStudentEnrollmentId);
    this.validateCheckInOutOrder(resolvedCheckInAt, resolvedCheckOutAt);

    try {
      const attendance = await this.prisma.studentAttendance.update({
        where: {
          id,
        },
        data: {
          studentEnrollmentId: payload.studentEnrollmentId,
          attendanceDate: payload.attendanceDate,
          status: payload.status,
          checkInAt: payload.checkInAt,
          checkOutAt: payload.checkOutAt,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: studentAttendanceInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_ATTENDANCE_UPDATE',
        resource: 'student-attendance',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return attendance;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureAttendanceExists(id);

    await this.prisma.studentAttendance.update({
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
      action: 'STUDENT_ATTENDANCE_DELETE',
      resource: 'student-attendance',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureAttendanceExists(id: string): Promise<StudentAttendance> {
    const attendance = await this.prisma.studentAttendance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Student attendance record not found');
    }

    return attendance;
  }

  private async ensureEnrollmentExistsAndActive(studentEnrollmentId: string) {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id: studentEnrollmentId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('Student enrollment is invalid or deleted');
    }

    if (!enrollment.isActive) {
      throw new BadRequestException('Student enrollment is inactive');
    }
  }

  private validateCheckInOutOrder(
    checkInAt?: DateInput,
    checkOutAt?: DateInput,
  ) {
    if (!checkInAt || !checkOutAt) {
      return;
    }

    const normalizedCheckInAt = this.parseDate(checkInAt);
    const normalizedCheckOutAt = this.parseDate(checkOutAt);

    if (!normalizedCheckInAt || !normalizedCheckOutAt) {
      return;
    }

    if (normalizedCheckOutAt <= normalizedCheckInAt) {
      throw new BadRequestException('checkOutAt must be after checkInAt');
    }
  }

  private parseDate(value?: DateInput): Date | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid datetime format');
    }

    return parsedDate;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'An attendance record already exists for this enrollment on this date',
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
