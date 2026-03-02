import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, EmployeeViolation, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeViolationDto } from './dto/create-employee-violation.dto';
import { ListEmployeeViolationsDto } from './dto/list-employee-violations.dto';
import { UpdateEmployeeViolationDto } from './dto/update-employee-violation.dto';

const employeeViolationInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
  reportedBy: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
} as const;

@Injectable()
export class EmployeeViolationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(payload: CreateEmployeeViolationDto, actorUserId: string) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.employeeId,
      );
      await this.ensureReporterExistsAndActive(payload.reportedByEmployeeId);

      const employeeViolation = await this.prisma.employeeViolation.create({
        data: {
          employeeId: payload.employeeId,
          violationDate: payload.violationDate,
          violationAspect: payload.violationAspect,
          violationText: payload.violationText,
          actionTaken: payload.actionTaken,
          severity: payload.severity,
          hasWarning: payload.hasWarning ?? false,
          hasMinutes: payload.hasMinutes ?? false,
          reportedByEmployeeId: payload.reportedByEmployeeId,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: employeeViolationInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_VIOLATION_CREATE',
        resource: 'employee-violations',
        resourceId: employeeViolation.id,
        details: {
          employeeId: employeeViolation.employeeId,
          violationDate: employeeViolation.violationDate,
          severity: employeeViolation.severity,
        },
      });

      return employeeViolation;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_VIOLATION_CREATE_FAILED',
        resource: 'employee-violations',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          violationDate: payload.violationDate,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListEmployeeViolationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeViolationWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      reportedByEmployeeId: query.reportedByEmployeeId,
      severity: query.severity,
      isActive: query.isActive,
      violationDate:
        query.fromDate || query.toDate
          ? {
              gte: query.fromDate,
              lte: query.toDate,
            }
          : undefined,
      OR: query.search
        ? [
            {
              violationAspect: {
                contains: query.search,
              },
            },
            {
              violationText: {
                contains: query.search,
              },
            },
            {
              actionTaken: {
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
            {
              reportedBy: {
                fullName: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employeeViolation.count({ where }),
      this.prisma.employeeViolation.findMany({
        where,
        include: employeeViolationInclude,
        orderBy: [
          {
            violationDate: 'desc',
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
    const employeeViolation = await this.prisma.employeeViolation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeViolationInclude,
    });

    if (!employeeViolation) {
      throw new NotFoundException('Employee violation not found');
    }

    return employeeViolation;
  }

  async update(
    id: string,
    payload: UpdateEmployeeViolationDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureEmployeeViolationExists(id);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    const resolvedReporterId =
      payload.reportedByEmployeeId ?? existing.reportedByEmployeeId;

    await this.employeesService.ensureEmployeeExistsAndActive(
      resolvedEmployeeId,
    );
    await this.ensureReporterExistsAndActive(resolvedReporterId ?? undefined);

    const employeeViolation = await this.prisma.employeeViolation.update({
      where: {
        id,
      },
      data: {
        employeeId: payload.employeeId,
        violationDate: payload.violationDate,
        violationAspect: payload.violationAspect,
        violationText: payload.violationText,
        actionTaken: payload.actionTaken,
        severity: payload.severity,
        hasWarning: payload.hasWarning,
        hasMinutes: payload.hasMinutes,
        reportedByEmployeeId: payload.reportedByEmployeeId,
        isActive: payload.isActive,
        updatedById: actorUserId,
      },
      include: employeeViolationInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_VIOLATION_UPDATE',
      resource: 'employee-violations',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return employeeViolation;
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEmployeeViolationExists(id);

    await this.prisma.employeeViolation.update({
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
      action: 'EMPLOYEE_VIOLATION_DELETE',
      resource: 'employee-violations',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEmployeeViolationExists(
    id: string,
  ): Promise<EmployeeViolation> {
    const employeeViolation = await this.prisma.employeeViolation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employeeViolation) {
      throw new NotFoundException('Employee violation not found');
    }

    return employeeViolation;
  }

  private async ensureReporterExistsAndActive(reporterId?: string) {
    if (!reporterId) {
      return;
    }

    await this.employeesService.ensureEmployeeExistsAndActive(reporterId);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
