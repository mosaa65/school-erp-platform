import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, EmployeeTask, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeTaskDto } from './dto/create-employee-task.dto';
import { ListEmployeeTasksDto } from './dto/list-employee-tasks.dto';
import { UpdateEmployeeTaskDto } from './dto/update-employee-task.dto';

const taskInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
    },
  },
} as const;

@Injectable()
export class EmployeeTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(payload: CreateEmployeeTaskDto, actorUserId: string) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.employeeId,
      );
      await this.ensureAcademicYearExists(payload.academicYearId);

      const task = await this.prisma.employeeTask.create({
        data: {
          employeeId: payload.employeeId,
          academicYearId: payload.academicYearId,
          taskName: payload.taskName,
          dayOfWeek: payload.dayOfWeek,
          assignmentDate: payload.assignmentDate,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: taskInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_TASK_CREATE',
        resource: 'employee-tasks',
        resourceId: task.id,
        details: {
          employeeId: task.employeeId,
          academicYearId: task.academicYearId,
          taskName: task.taskName,
        },
      });

      return task;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_TASK_CREATE_FAILED',
        resource: 'employee-tasks',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          academicYearId: payload.academicYearId,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListEmployeeTasksDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeTaskWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      academicYearId: query.academicYearId,
      dayOfWeek: query.dayOfWeek,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              taskName: {
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
      this.prisma.employeeTask.count({ where }),
      this.prisma.employeeTask.findMany({
        where,
        include: taskInclude,
        orderBy: [
          {
            assignmentDate: 'desc',
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
    const task = await this.prisma.employeeTask.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: taskInclude,
    });

    if (!task) {
      throw new NotFoundException('Employee task not found');
    }

    return task;
  }

  async update(
    id: string,
    payload: UpdateEmployeeTaskDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureTaskExists(id);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;

    await this.employeesService.ensureEmployeeExistsAndActive(
      resolvedEmployeeId,
    );
    await this.ensureAcademicYearExists(resolvedAcademicYearId ?? undefined);

    const task = await this.prisma.employeeTask.update({
      where: {
        id,
      },
      data: {
        employeeId: payload.employeeId,
        academicYearId: payload.academicYearId,
        taskName: payload.taskName,
        dayOfWeek: payload.dayOfWeek,
        assignmentDate: payload.assignmentDate,
        notes: payload.notes,
        isActive: payload.isActive,
        updatedById: actorUserId,
      },
      include: taskInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_TASK_UPDATE',
      resource: 'employee-tasks',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return task;
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureTaskExists(id);

    await this.prisma.employeeTask.update({
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
      action: 'EMPLOYEE_TASK_DELETE',
      resource: 'employee-tasks',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureTaskExists(id: string): Promise<EmployeeTask> {
    const task = await this.prisma.employeeTask.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Employee task not found');
    }

    return task;
  }

  private async ensureAcademicYearExists(academicYearId?: string) {
    if (!academicYearId) {
      return;
    }

    const year = await this.prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!year) {
      throw new BadRequestException('Academic year is invalid or deleted');
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
