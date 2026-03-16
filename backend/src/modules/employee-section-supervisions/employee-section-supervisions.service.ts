import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  EmployeeSectionSupervision,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeSectionSupervisionDto } from './dto/create-employee-section-supervision.dto';
import { ListEmployeeSectionSupervisionsDto } from './dto/list-employee-section-supervisions.dto';
import { UpdateEmployeeSectionSupervisionDto } from './dto/update-employee-section-supervision.dto';

const supervisionInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
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
        },
      },
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
export class EmployeeSectionSupervisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(
    payload: CreateEmployeeSectionSupervisionDto,
    actorUserId: string,
  ) {
    try {
      const resolvedIsActive = payload.isActive ?? true;
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.employeeId,
      );
      await this.ensureEmployeeReadyForOperationalScopeIfStrict(
        payload.employeeId,
        resolvedIsActive,
      );
      await this.ensureSectionExistsAndActive(payload.sectionId);
      await this.ensureAcademicYearExists(payload.academicYearId);

      const supervision = await this.prisma.employeeSectionSupervision.create({
        data: {
          employeeId: payload.employeeId,
          sectionId: payload.sectionId,
          academicYearId: payload.academicYearId,
          canViewStudents: payload.canViewStudents ?? true,
          canManageHomeworks: payload.canManageHomeworks ?? true,
          canManageGrades: payload.canManageGrades ?? true,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: supervisionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_SECTION_SUPERVISION_CREATE',
        resource: 'employee-section-supervisions',
        resourceId: supervision.id,
        details: {
          employeeId: supervision.employeeId,
          sectionId: supervision.sectionId,
          academicYearId: supervision.academicYearId,
        },
      });

      return supervision;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_SECTION_SUPERVISION_CREATE_FAILED',
        resource: 'employee-section-supervisions',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          sectionId: payload.sectionId,
          academicYearId: payload.academicYearId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListEmployeeSectionSupervisionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeSectionSupervisionWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      sectionId: query.sectionId,
      academicYearId: query.academicYearId,
      canViewStudents: query.canViewStudents,
      canManageHomeworks: query.canManageHomeworks,
      canManageGrades: query.canManageGrades,
      isActive: query.isActive,
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
              section: {
                name: {
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
      this.prisma.employeeSectionSupervision.count({ where }),
      this.prisma.employeeSectionSupervision.findMany({
        where,
        include: supervisionInclude,
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
    const supervision = await this.prisma.employeeSectionSupervision.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: supervisionInclude,
    });

    if (!supervision) {
      throw new NotFoundException('Employee section supervision not found');
    }

    return supervision;
  }

  async update(
    id: string,
    payload: UpdateEmployeeSectionSupervisionDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureSupervisionExists(id);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    const resolvedSectionId = payload.sectionId ?? existing.sectionId;
    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const resolvedIsActive = payload.isActive ?? existing.isActive;

    await this.employeesService.ensureEmployeeExistsAndActive(
      resolvedEmployeeId,
    );
    await this.ensureEmployeeReadyForOperationalScopeIfStrict(
      resolvedEmployeeId,
      resolvedIsActive,
    );
    await this.ensureSectionExistsAndActive(resolvedSectionId);
    await this.ensureAcademicYearExists(resolvedAcademicYearId);

    try {
      const supervision = await this.prisma.employeeSectionSupervision.update({
        where: {
          id,
        },
        data: {
          employeeId: payload.employeeId,
          sectionId: payload.sectionId,
          academicYearId: payload.academicYearId,
          canViewStudents: payload.canViewStudents,
          canManageHomeworks: payload.canManageHomeworks,
          canManageGrades: payload.canManageGrades,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: supervisionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_SECTION_SUPERVISION_UPDATE',
        resource: 'employee-section-supervisions',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return supervision;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureSupervisionExists(id);

    await this.prisma.employeeSectionSupervision.update({
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
      action: 'EMPLOYEE_SECTION_SUPERVISION_DELETE',
      resource: 'employee-section-supervisions',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureSupervisionExists(
    id: string,
  ): Promise<EmployeeSectionSupervision> {
    const supervision = await this.prisma.employeeSectionSupervision.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!supervision) {
      throw new NotFoundException('Employee section supervision not found');
    }

    return supervision;
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

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Employee section supervision already exists for this employee, section, and year',
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

  private isStrictEmployeeWorkflowEnabled() {
    const value = process.env.STRICT_EMPLOYEE_WORKFLOW?.trim().toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  }

  private async ensureEmployeeReadyForOperationalScopeIfStrict(
    employeeId: string,
    isActive: boolean,
  ) {
    if (!isActive) {
      return;
    }

    if (!this.isStrictEmployeeWorkflowEnabled()) {
      return;
    }

    await this.employeesService.ensureEmployeeReadyForAcademicOperations(
      employeeId,
    );
  }
}
