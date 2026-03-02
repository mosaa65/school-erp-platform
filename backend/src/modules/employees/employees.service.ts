import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Employee, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesDto } from './dto/list-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const employeeInclude = {
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
  idType: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      isActive: true,
    },
  },
} as const;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateEmployeeDto, actorUserId: string) {
    if (payload.idTypeId !== undefined && payload.idTypeId !== null) {
      await this.ensureIdTypeExists(payload.idTypeId);
    }

    try {
      const employee = await this.prisma.employee.create({
        data: {
          jobNumber: payload.jobNumber,
          financialNumber: payload.financialNumber,
          fullName: payload.fullName,
          gender: payload.gender,
          birthDate: payload.birthDate,
          phonePrimary: payload.phonePrimary,
          phoneSecondary: payload.phoneSecondary,
          hasWhatsapp: payload.hasWhatsapp ?? true,
          qualification: payload.qualification,
          qualificationDate: payload.qualificationDate,
          specialization: payload.specialization,
          idNumber: payload.idNumber,
          idTypeId: payload.idTypeId === null ? null : payload.idTypeId,
          idExpiryDate: payload.idExpiryDate,
          experienceYears: payload.experienceYears ?? 0,
          employmentType: payload.employmentType,
          jobTitle: payload.jobTitle,
          hireDate: payload.hireDate,
          previousSchool: payload.previousSchool,
          salaryApproved: payload.salaryApproved ?? false,
          systemAccessStatus: payload.systemAccessStatus,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: employeeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_CREATE',
        resource: 'employees',
        resourceId: employee.id,
        details: {
          jobNumber: employee.jobNumber,
          fullName: employee.fullName,
          jobTitle: employee.jobTitle,
        },
      });

      return employee;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_CREATE_FAILED',
        resource: 'employees',
        status: AuditStatus.FAILURE,
        details: {
          jobNumber: payload.jobNumber,
          financialNumber: payload.financialNumber,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListEmployeesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      gender: query.gender,
      employmentType: query.employmentType,
      idTypeId: query.idTypeId,
      isActive: query.isActive,
      jobTitle: query.jobTitle
        ? {
            contains: query.jobTitle,
          }
        : undefined,
      OR: query.search
        ? [
            {
              fullName: {
                contains: query.search,
              },
            },
            {
              jobNumber: {
                contains: query.search,
              },
            },
            {
              financialNumber: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        include: employeeInclude,
        orderBy: [
          {
            fullName: 'asc',
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
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeInclude,
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(id: string, payload: UpdateEmployeeDto, actorUserId: string) {
    await this.ensureEmployeeExists(id);

    if (payload.idTypeId !== undefined && payload.idTypeId !== null) {
      await this.ensureIdTypeExists(payload.idTypeId);
    }

    try {
      const employee = await this.prisma.employee.update({
        where: {
          id,
        },
        data: {
          jobNumber: payload.jobNumber,
          financialNumber: payload.financialNumber,
          fullName: payload.fullName,
          gender: payload.gender,
          birthDate: payload.birthDate,
          phonePrimary: payload.phonePrimary,
          phoneSecondary: payload.phoneSecondary,
          hasWhatsapp: payload.hasWhatsapp,
          qualification: payload.qualification,
          qualificationDate: payload.qualificationDate,
          specialization: payload.specialization,
          idNumber: payload.idNumber,
          idTypeId: payload.idTypeId === null ? null : payload.idTypeId,
          idExpiryDate: payload.idExpiryDate,
          experienceYears: payload.experienceYears,
          employmentType: payload.employmentType,
          jobTitle: payload.jobTitle,
          hireDate: payload.hireDate,
          previousSchool: payload.previousSchool,
          salaryApproved: payload.salaryApproved,
          systemAccessStatus: payload.systemAccessStatus,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: employeeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_UPDATE',
        resource: 'employees',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return employee;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEmployeeExists(id);

    await this.prisma.employee.update({
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
      action: 'EMPLOYEE_DELETE',
      resource: 'employees',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async ensureEmployeeExistsAndActive(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.isActive) {
      throw new ConflictException('Employee is inactive');
    }

    return employee;
  }

  private async ensureEmployeeExists(id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  private async ensureIdTypeExists(idTypeId: number) {
    const idType = await this.prisma.lookupIdType.findFirst({
      where: {
        id: idTypeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!idType) {
      throw new BadRequestException('idTypeId is not valid');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Employee job number or financial number must be unique',
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
