import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, EmployeeCourse, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeCourseDto } from './dto/create-employee-course.dto';
import { ListEmployeeCoursesDto } from './dto/list-employee-courses.dto';
import { UpdateEmployeeCourseDto } from './dto/update-employee-course.dto';

const employeeCourseInclude = {
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
export class EmployeeCoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(payload: CreateEmployeeCourseDto, actorUserId: string) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.employeeId,
      );

      const employeeCourse = await this.prisma.employeeCourse.create({
        data: {
          employeeId: payload.employeeId,
          courseName: payload.courseName,
          courseProvider: payload.courseProvider,
          courseDate: payload.courseDate,
          durationDays: payload.durationDays,
          certificateNumber: payload.certificateNumber,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: employeeCourseInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_COURSE_CREATE',
        resource: 'employee-courses',
        resourceId: employeeCourse.id,
        details: {
          employeeId: employeeCourse.employeeId,
          courseName: employeeCourse.courseName,
        },
      });

      return employeeCourse;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_COURSE_CREATE_FAILED',
        resource: 'employee-courses',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          courseName: payload.courseName,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListEmployeeCoursesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeCourseWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      isActive: query.isActive,
      courseDate:
        query.fromDate || query.toDate
          ? {
              gte: query.fromDate,
              lte: query.toDate,
            }
          : undefined,
      OR: query.search
        ? [
            {
              courseName: {
                contains: query.search,
              },
            },
            {
              courseProvider: {
                contains: query.search,
              },
            },
            {
              certificateNumber: {
                contains: query.search,
              },
            },
            {
              notes: {
                contains: query.search,
              },
            },
            {
              employee: {
                fullName: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employeeCourse.count({ where }),
      this.prisma.employeeCourse.findMany({
        where,
        include: employeeCourseInclude,
        orderBy: [
          {
            courseDate: 'desc',
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
    const employeeCourse = await this.prisma.employeeCourse.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeCourseInclude,
    });

    if (!employeeCourse) {
      throw new NotFoundException('Employee course not found');
    }

    return employeeCourse;
  }

  async update(
    id: string,
    payload: UpdateEmployeeCourseDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureEmployeeCourseExists(id);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    await this.employeesService.ensureEmployeeExistsAndActive(
      resolvedEmployeeId,
    );

    const employeeCourse = await this.prisma.employeeCourse.update({
      where: {
        id,
      },
      data: {
        employeeId: payload.employeeId,
        courseName: payload.courseName,
        courseProvider: payload.courseProvider,
        courseDate: payload.courseDate,
        durationDays: payload.durationDays,
        certificateNumber: payload.certificateNumber,
        notes: payload.notes,
        isActive: payload.isActive,
        updatedById: actorUserId,
      },
      include: employeeCourseInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_COURSE_UPDATE',
      resource: 'employee-courses',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return employeeCourse;
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEmployeeCourseExists(id);

    await this.prisma.employeeCourse.update({
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
      action: 'EMPLOYEE_COURSE_DELETE',
      resource: 'employee-courses',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEmployeeCourseExists(
    id: string,
  ): Promise<EmployeeCourse> {
    const employeeCourse = await this.prisma.employeeCourse.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employeeCourse) {
      throw new NotFoundException('Employee course not found');
    }

    return employeeCourse;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
