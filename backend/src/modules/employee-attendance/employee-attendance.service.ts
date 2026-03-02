import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, EmployeeAttendance, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeAttendanceDto } from './dto/create-employee-attendance.dto';
import { ListEmployeeAttendanceDto } from './dto/list-employee-attendance.dto';
import { UpdateEmployeeAttendanceDto } from './dto/update-employee-attendance.dto';

const attendanceInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
} as const;

@Injectable()
export class EmployeeAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(payload: CreateEmployeeAttendanceDto, actorUserId: string) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.employeeId,
      );
      this.validateCheckInOutOrder(payload.checkInAt, payload.checkOutAt);

      const attendance = await this.prisma.employeeAttendance.create({
        data: {
          employeeId: payload.employeeId,
          attendanceDate: payload.attendanceDate,
          status: payload.status,
          checkInAt: payload.checkInAt,
          checkOutAt: payload.checkOutAt,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: attendanceInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_ATTENDANCE_CREATE',
        resource: 'employee-attendance',
        resourceId: attendance.id,
        details: {
          employeeId: attendance.employeeId,
          attendanceDate: attendance.attendanceDate,
          status: attendance.status,
        },
      });

      return attendance;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_ATTENDANCE_CREATE_FAILED',
        resource: 'employee-attendance',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          attendanceDate: payload.attendanceDate,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListEmployeeAttendanceDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeAttendanceWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      status: query.status,
      isActive: query.isActive,
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
              employee: {
                fullName: {
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
      this.prisma.employeeAttendance.count({ where }),
      this.prisma.employeeAttendance.findMany({
        where,
        include: attendanceInclude,
        orderBy: [
          {
            attendanceDate: 'desc',
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
    const attendance = await this.prisma.employeeAttendance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: attendanceInclude,
    });

    if (!attendance) {
      throw new NotFoundException('Employee attendance record not found');
    }

    return attendance;
  }

  async update(
    id: string,
    payload: UpdateEmployeeAttendanceDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureAttendanceExists(id);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    const resolvedCheckInAt = payload.checkInAt ?? existing.checkInAt;
    const resolvedCheckOutAt = payload.checkOutAt ?? existing.checkOutAt;

    await this.employeesService.ensureEmployeeExistsAndActive(
      resolvedEmployeeId,
    );
    this.validateCheckInOutOrder(resolvedCheckInAt, resolvedCheckOutAt);

    try {
      const attendance = await this.prisma.employeeAttendance.update({
        where: {
          id,
        },
        data: {
          employeeId: payload.employeeId,
          attendanceDate: payload.attendanceDate,
          status: payload.status,
          checkInAt: payload.checkInAt,
          checkOutAt: payload.checkOutAt,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: attendanceInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_ATTENDANCE_UPDATE',
        resource: 'employee-attendance',
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

    await this.prisma.employeeAttendance.update({
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
      action: 'EMPLOYEE_ATTENDANCE_DELETE',
      resource: 'employee-attendance',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureAttendanceExists(
    id: string,
  ): Promise<EmployeeAttendance> {
    const attendance = await this.prisma.employeeAttendance.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Employee attendance record not found');
    }

    return attendance;
  }

  private validateCheckInOutOrder(
    checkInAt?: string | Date | null,
    checkOutAt?: string | Date | null,
  ) {
    if (!checkInAt || !checkOutAt) {
      return;
    }

    const checkIn = this.normalizeDateInput(checkInAt);
    const checkOut = this.normalizeDateInput(checkOutAt);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException(
        'Invalid check-in/check-out datetime format',
      );
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('checkOutAt must be after checkInAt');
    }
  }

  private normalizeDateInput(value: string | Date): Date {
    if (value instanceof Date) {
      return value;
    }

    return new Date(value);
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'An attendance record already exists for this employee on this date',
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
