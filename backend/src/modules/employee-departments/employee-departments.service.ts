import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, EmployeeDepartment, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { generateAutoCode } from '../../common/utils/auto-code';
import { CreateEmployeeDepartmentDto } from './dto/create-employee-department.dto';
import { ListEmployeeDepartmentsDto } from './dto/list-employee-departments.dto';
import { UpdateEmployeeDepartmentDto } from './dto/update-employee-department.dto';

const employeeDepartmentInclude = {
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
  _count: {
    select: {
      employees: true,
    },
  },
} as const;

@Injectable()
export class EmployeeDepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateEmployeeDepartmentDto, actorUserId: string) {
    const code = payload.code?.trim() || generateAutoCode('DEPT');

    try {
      const department = await this.prisma.employeeDepartment.create({
        data: {
          code,
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: employeeDepartmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_DEPARTMENT_CREATE',
        resource: 'employee-departments',
        resourceId: department.id,
        details: {
          code: department.code,
          name: department.name,
        },
      });

      return department;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_DEPARTMENT_CREATE_FAILED',
        resource: 'employee-departments',
        status: AuditStatus.FAILURE,
        details: {
          code,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListEmployeeDepartmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeDepartmentWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              code: {
                contains: query.search,
              },
            },
            {
              name: {
                contains: query.search,
              },
            },
            {
              description: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employeeDepartment.count({ where }),
      this.prisma.employeeDepartment.findMany({
        where,
        include: employeeDepartmentInclude,
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
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
    const department = await this.prisma.employeeDepartment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeDepartmentInclude,
    });

    if (!department) {
      throw new NotFoundException('Employee department not found');
    }

    return department;
  }

  async update(
    id: string,
    payload: UpdateEmployeeDepartmentDto,
    actorUserId: string,
  ) {
    await this.ensureEmployeeDepartmentExists(id);

    try {
      const department = await this.prisma.employeeDepartment.update({
        where: { id },
        data: {
          code: payload.code,
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: employeeDepartmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_DEPARTMENT_UPDATE',
        resource: 'employee-departments',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return department;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEmployeeDepartmentExists(id);

    await this.prisma.employeeDepartment.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_DEPARTMENT_DELETE',
      resource: 'employee-departments',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async ensureEmployeeDepartmentExistsAndActive(id: string) {
    const department = await this.prisma.employeeDepartment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!department) {
      throw new NotFoundException('Employee department not found');
    }

    if (!department.isActive) {
      throw new ConflictException('Employee department is inactive');
    }

    return department;
  }

  private async ensureEmployeeDepartmentExists(
    id: string,
  ): Promise<EmployeeDepartment> {
    const department = await this.prisma.employeeDepartment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!department) {
      throw new NotFoundException('Employee department not found');
    }

    return department;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Employee department code must be unique');
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
