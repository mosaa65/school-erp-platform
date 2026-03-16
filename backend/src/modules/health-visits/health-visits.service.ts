import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { StudentsService } from '../students/students.service';
import { CreateHealthVisitDto } from './dto/create-health-visit.dto';
import { ListHealthVisitsDto } from './dto/list-health-visits.dto';
import { UpdateHealthVisitDto } from './dto/update-health-visit.dto';

const healthVisitInclude = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      isActive: true,
    },
  },
  nurse: {
    select: {
      id: true,
      fullName: true,
      jobTitle: true,
    },
  },
  healthStatus: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      requiresDetails: true,
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
} satisfies Prisma.StudentHealthVisitInclude;

type HealthVisitStatusBreakdownItem = {
  id: number;
  code: string;
  nameAr: string;
  requiresDetails: boolean;
  count: number;
};

type HealthVisitsSummary = {
  totalVisits: number;
  uniqueStudents: number;
  statusBreakdown: HealthVisitStatusBreakdownItem[];
  latestVisit: Prisma.StudentHealthVisitGetPayload<{
    include: typeof healthVisitInclude;
  }> | null;
  lastUpdatedAt: string;
};

@Injectable()
export class HealthVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly studentsService: StudentsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(payload: CreateHealthVisitDto, actorUserId: string) {
    await this.studentsService.ensureStudentExistsAndActive(payload.studentId);

    if (payload.nurseId) {
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.nurseId,
      );
    }

    try {
      const visit = await this.prisma.studentHealthVisit.create({
        data: {
          studentId: payload.studentId,
          nurseId: payload.nurseId,
          healthStatusId: payload.healthStatusId,
          visitDate: payload.visitDate,
          notes: payload.notes,
          followUpRequired: payload.followUpRequired ?? false,
          followUpNotes: payload.followUpNotes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: healthVisitInclude,
      });

      await this.updateStudentHealthRecord(
        payload.studentId,
        payload.healthStatusId,
        payload.notes,
        actorUserId,
      );

      await this.auditLogsService.record({
        actorUserId,
        action: 'HEALTH_VISIT_CREATE',
        resource: 'health-visits',
        resourceId: visit.id,
        details: {
          studentId: visit.studentId,
          healthStatusId: visit.healthStatusId,
        },
      });

      return visit;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'HEALTH_VISIT_CREATE_FAILED',
        resource: 'health-visits',
        status: AuditStatus.FAILURE,
        details: {
          studentId: payload.studentId,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async findAll(query: ListHealthVisitsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentHealthVisitWhereInput = {
      deletedAt: null,
      studentId: query.studentId,
      nurseId: query.nurseId,
      healthStatusId: query.healthStatusId,
      isActive: query.isActive,
      visitDate:
        query.fromDate || query.toDate
          ? {
              gte: query.fromDate ? new Date(query.fromDate) : undefined,
              lte: query.toDate ? new Date(query.toDate) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            {
              notes: {
                contains: query.search,
              },
            },
            {
              followUpNotes: {
                contains: query.search,
              },
            },
            {
              student: {
                fullName: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, visits] = await this.prisma.$transaction([
      this.prisma.studentHealthVisit.count({ where }),
      this.prisma.studentHealthVisit.findMany({
        where,
        include: healthVisitInclude,
        orderBy: {
          visitDate: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: visits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const visit = await this.prisma.studentHealthVisit.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: healthVisitInclude,
    });

    if (!visit) {
      throw new NotFoundException('Health visit not found');
    }

    return visit;
  }

  async update(id: string, payload: UpdateHealthVisitDto, actorUserId: string) {
    const existing = await this.prisma.studentHealthVisit.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Health visit not found');
    }

    if (payload.studentId) {
      await this.studentsService.ensureStudentExistsAndActive(
        payload.studentId,
      );
    }

    if (payload.nurseId) {
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.nurseId,
      );
    }

    const updateData: Prisma.StudentHealthVisitUncheckedUpdateInput = {
      updatedById: actorUserId,
    };

    if (payload.studentId) {
      updateData.studentId = payload.studentId;
    }

    if (payload.nurseId !== undefined) {
      updateData.nurseId = payload.nurseId;
    }

    if (payload.healthStatusId !== undefined) {
      updateData.healthStatusId = payload.healthStatusId;
    }

    if (payload.visitDate) {
      updateData.visitDate = payload.visitDate;
    }

    if (payload.notes !== undefined) {
      updateData.notes = payload.notes;
    }

    if (payload.followUpRequired !== undefined) {
      updateData.followUpRequired = payload.followUpRequired;
    }

    if (payload.followUpNotes !== undefined) {
      updateData.followUpNotes = payload.followUpNotes;
    }

    if (payload.isActive !== undefined) {
      updateData.isActive = payload.isActive;
    }

    try {
      const visit = await this.prisma.studentHealthVisit.update({
        where: { id },
        data: updateData,
        include: healthVisitInclude,
      });

      if (
        payload.studentId ||
        payload.healthStatusId !== undefined ||
        payload.notes
      ) {
        const targetStudentId = payload.studentId ?? existing.studentId;
        const healthStatusId =
          payload.healthStatusId ?? existing.healthStatusId ?? undefined;
        await this.updateStudentHealthRecord(
          targetStudentId,
          healthStatusId,
          payload.notes ?? existing.notes ?? undefined,
          actorUserId,
        );
      }

      await this.auditLogsService.record({
        actorUserId,
        action: 'HEALTH_VISIT_UPDATE',
        resource: 'health-visits',
        resourceId: visit.id,
      });

      return visit;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'HEALTH_VISIT_UPDATE_FAILED',
        resource: 'health-visits',
        status: AuditStatus.FAILURE,
        details: {
          visitId: id,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async remove(id: string, actorUserId: string) {
    const visit = await this.prisma.studentHealthVisit.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!visit) {
      throw new NotFoundException('Health visit not found');
    }

    try {
      await this.prisma.studentHealthVisit.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          updatedById: actorUserId,
        },
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'HEALTH_VISIT_DELETE',
        resource: 'health-visits',
        resourceId: id,
      });

      return {
        success: true,
        id,
      };
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'HEALTH_VISIT_DELETE_FAILED',
        resource: 'health-visits',
        status: AuditStatus.FAILURE,
        details: {
          visitId: id,
          reason: this.extractErrorMessage(error),
        },
      });

      throw error;
    }
  }

  async summary(): Promise<HealthVisitsSummary> {
    const totalVisits = await this.prisma.studentHealthVisit.count({
      where: {
        deletedAt: null,
      },
    });

    const statusRows = await this.prisma.studentHealthVisit.groupBy({
      by: ['healthStatusId'],
      where: {
        deletedAt: null,
        healthStatusId: {
          not: null,
        },
      },
      _count: {
        healthStatusId: true,
      },
    });

    const studentGroups = await this.prisma.studentHealthVisit.groupBy({
      by: ['studentId'],
      where: {
        deletedAt: null,
      },
    });

    const latestVisit = await this.prisma.studentHealthVisit.findFirst({
      where: {
        deletedAt: null,
      },
      orderBy: {
        visitDate: 'desc',
      },
      include: healthVisitInclude,
    });

    const statuses = await this.prisma.lookupHealthStatus.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        nameAr: true,
        requiresDetails: true,
      },
    });

    const statusBreakdown = statuses.map((status) => {
      const row = statusRows.find((item) => item.healthStatusId === status.id);
      return {
        id: status.id,
        code: status.code,
        nameAr: status.nameAr,
        requiresDetails: status.requiresDetails,
        count: row?._count.healthStatusId ?? 0,
      };
    });

    return {
      totalVisits,
      uniqueStudents: studentGroups.length,
      statusBreakdown,
      latestVisit,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  private async updateStudentHealthRecord(
    studentId: string,
    healthStatusId: number | undefined,
    healthNotes: string | undefined,
    actorUserId: string,
  ) {
    await this.prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        healthStatusId,
        healthNotes,
        updatedById: actorUserId,
      },
    });
  }

  private extractErrorMessage(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return `${error.code} ${error.message}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
