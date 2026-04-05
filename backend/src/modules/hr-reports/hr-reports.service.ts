import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EmployeeAttendanceStatus,
  PerformanceRatingLevel,
  Prisma,
  ViolationSeverity,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { HrSummaryQueryDto } from './dto/hr-summary-query.dto';

const HR_COMPLIANCE_EXPIRY_THRESHOLD_DAYS = 30;
const HR_DOCUMENT_ENTITY_TYPE = 'employee';

@Injectable()
export class HrReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: HrSummaryQueryDto) {
    const dateRange = this.buildDateRange(query.fromDate, query.toDate);

    if (query.employeeId) {
      await this.ensureEmployeeExists(query.employeeId);
    }

    const employeeScopedWhere: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      id: query.employeeId,
    };

    const attendanceWhere: Prisma.EmployeeAttendanceWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      attendanceDate: dateRange,
    };

    const violationWhere: Prisma.EmployeeViolationWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      violationDate: dateRange,
    };

    const courseWhere: Prisma.EmployeeCourseWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      courseDate: dateRange,
    };

    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      employeesWithUsers,
      attendanceTotal,
      violationsTotal,
      violationsWithWarning,
      coursesTotal,
      activeTeachingAssignments,
      activeTasks,
      evaluationsTotal,
    ] = await this.prisma.$transaction([
      this.prisma.employee.count({ where: employeeScopedWhere }),
      this.prisma.employee.count({
        where: {
          ...employeeScopedWhere,
          isActive: true,
        },
      }),
      this.prisma.employee.count({
        where: {
          ...employeeScopedWhere,
          isActive: false,
        },
      }),
      this.prisma.employee.count({
        where: {
          ...employeeScopedWhere,
          userAccount: {
            is: {
              deletedAt: null,
            },
          },
        },
      }),
      this.prisma.employeeAttendance.count({ where: attendanceWhere }),
      this.prisma.employeeViolation.count({ where: violationWhere }),
      this.prisma.employeeViolation.count({
        where: {
          ...violationWhere,
          hasWarning: true,
        },
      }),
      this.prisma.employeeCourse.count({ where: courseWhere }),
      this.prisma.employeeTeachingAssignment.count({
        where: {
          deletedAt: null,
          employeeId: query.employeeId,
          isActive: true,
        },
      }),
      this.prisma.employeeTask.count({
        where: {
          deletedAt: null,
          employeeId: query.employeeId,
          isActive: true,
        },
      }),
      this.prisma.employeePerformanceEvaluation.count({
        where: {
          deletedAt: null,
          employeeId: query.employeeId,
        },
      }),
    ]);

    const attendanceByStatus =
      await this.countAttendanceByStatus(attendanceWhere);
    const violationsBySeverity =
      await this.countViolationsBySeverity(violationWhere);
    const evaluationsByRating = await this.countEvaluationsByRating(
      query.employeeId,
    );
    const compliance = await this.buildComplianceInsights(query.employeeId);
    const attendanceIndicators = this.buildAttendanceIndicators(
      attendanceTotal,
      attendanceByStatus,
    );
    const organization = await this.buildOrganizationInsights(query.employeeId);

    return {
      generatedAt: new Date().toISOString(),
      scope: {
        fromDate: query.fromDate ?? null,
        toDate: query.toDate ?? null,
        employeeId: query.employeeId ?? null,
      },
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        withUserAccount: employeesWithUsers,
        withoutUserAccount: totalEmployees - employeesWithUsers,
      },
      attendance: {
        total: attendanceTotal,
        byStatus: attendanceByStatus,
        indicators: attendanceIndicators,
      },
      violations: {
        total: violationsTotal,
        withWarning: violationsWithWarning,
        bySeverity: violationsBySeverity,
      },
      courses: {
        total: coursesTotal,
      },
      workload: {
        activeTeachingAssignments,
        activeTasks,
      },
      performance: {
        totalEvaluations: evaluationsTotal,
        byRating: evaluationsByRating,
      },
      organization,
      compliance,
    };
  }

  private async countAttendanceByStatus(
    baseWhere: Prisma.EmployeeAttendanceWhereInput,
  ) {
    const statuses = Object.values(EmployeeAttendanceStatus);
    const counts = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await this.prisma.employeeAttendance.count({
          where: {
            ...baseWhere,
            status,
          },
        }),
      })),
    );

    return counts.filter((item) => item.count > 0);
  }

  private async countViolationsBySeverity(
    baseWhere: Prisma.EmployeeViolationWhereInput,
  ) {
    const severities = Object.values(ViolationSeverity);
    const counts = await Promise.all(
      severities.map(async (severity) => ({
        severity,
        count: await this.prisma.employeeViolation.count({
          where: {
            ...baseWhere,
            severity,
          },
        }),
      })),
    );

    return counts.filter((item) => item.count > 0);
  }

  private async countEvaluationsByRating(employeeId?: string) {
    const ratings = Object.values(PerformanceRatingLevel);
    const counts = await Promise.all(
      ratings.map(async (ratingLevel) => ({
        ratingLevel,
        count: await this.prisma.employeePerformanceEvaluation.count({
          where: {
            deletedAt: null,
            employeeId,
            ratingLevel,
          },
        }),
      })),
    );

    return counts.filter((item) => item.count > 0);
  }

  private buildDateRange(
    fromDate?: string,
    toDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!fromDate && !toDate) {
      return undefined;
    }

    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      throw new BadRequestException(
        'fromDate must be before or equal to toDate',
      );
    }

    return {
      gte: fromDate,
      lte: toDate,
    };
  }

  private async ensureEmployeeExists(employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!employee) {
      throw new BadRequestException('Employee is invalid or deleted');
    }
  }

  private async buildComplianceInsights(employeeId?: string) {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const endOfThreshold = new Date(startOfToday);
    endOfThreshold.setUTCHours(23, 59, 59, 999);
    endOfThreshold.setUTCDate(
      endOfThreshold.getUTCDate() + HR_COMPLIANCE_EXPIRY_THRESHOLD_DAYS,
    );

    const activeEmployeeWhere: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      id: employeeId,
      isActive: true,
    };

    const [activeEmployees, incompleteProfiles] = await this.prisma.$transaction([
      this.prisma.employee.count({
        where: activeEmployeeWhere,
      }),
      this.prisma.employee.count({
        where: {
          ...activeEmployeeWhere,
          OR: [
            { jobNumber: null },
            { jobNumber: '' },
            { idNumber: null },
            { idNumber: '' },
            { hireDate: null },
            { departmentId: null },
          ],
        },
      }),
    ]);

    const employeesWithDocumentIds = await this.prisma.fileAttachment.groupBy({
      by: ['entityId'],
      where: {
        entityType: HR_DOCUMENT_ENTITY_TYPE,
        deletedAt: null,
        entityId: employeeId,
      },
    });

    const activeEmployeesWithDocuments =
      employeesWithDocumentIds.length === 0
        ? 0
        : await this.prisma.employee.count({
            where: {
              ...activeEmployeeWhere,
              id: {
                in: employeesWithDocumentIds.map((item) => item.entityId),
              },
            },
          });

    const [
      contractsExpiringSoon,
      contractsExpired,
      documentsExpiringSoon,
      documentsExpired,
      identitiesExpiringSoon,
      identitiesExpired,
    ] = await this.prisma.$transaction([
      this.prisma.employeeContract.count({
        where: {
          deletedAt: null,
          employeeId,
          isActive: true,
          isCurrent: true,
          contractEndDate: {
            not: null,
            gte: startOfToday,
            lte: endOfThreshold,
          },
        },
      }),
      this.prisma.employeeContract.count({
        where: {
          deletedAt: null,
          employeeId,
          isActive: true,
          isCurrent: true,
          contractEndDate: {
            not: null,
            lt: startOfToday,
          },
        },
      }),
      this.prisma.fileAttachment.count({
        where: {
          entityType: HR_DOCUMENT_ENTITY_TYPE,
          deletedAt: null,
          entityId: employeeId,
          expiresAt: {
            not: null,
            gte: startOfToday,
            lte: endOfThreshold,
          },
        },
      }),
      this.prisma.fileAttachment.count({
        where: {
          entityType: HR_DOCUMENT_ENTITY_TYPE,
          deletedAt: null,
          entityId: employeeId,
          expiresAt: {
            not: null,
            lt: startOfToday,
          },
        },
      }),
      this.prisma.employee.count({
        where: {
          ...activeEmployeeWhere,
          idExpiryDate: {
            not: null,
            gte: startOfToday,
            lte: endOfThreshold,
          },
        },
      }),
      this.prisma.employee.count({
        where: {
          ...activeEmployeeWhere,
          idExpiryDate: {
            not: null,
            lt: startOfToday,
          },
        },
      }),
    ]);

    return {
      thresholdDays: HR_COMPLIANCE_EXPIRY_THRESHOLD_DAYS,
      incompleteProfiles,
      employeesWithoutDocuments: Math.max(
        0,
        activeEmployees - activeEmployeesWithDocuments,
      ),
      contractsExpiringSoon,
      contractsExpired,
      documentsExpiringSoon,
      documentsExpired,
      identitiesExpiringSoon,
      identitiesExpired,
    };
  }

  private buildAttendanceIndicators(
    totalAttendance: number,
    byStatus: Array<{ status: EmployeeAttendanceStatus; count: number }>,
  ) {
    if (totalAttendance <= 0) {
      return {
        presentRate: 0,
        absentRate: 0,
        lateRate: 0,
        excusedAbsenceRate: 0,
        earlyLeaveRate: 0,
      };
    }

    const countByStatus = new Map(
      byStatus.map((item) => [item.status, item.count]),
    );

    return {
      presentRate: this.toPercentage(
        countByStatus.get(EmployeeAttendanceStatus.PRESENT) ?? 0,
        totalAttendance,
      ),
      absentRate: this.toPercentage(
        countByStatus.get(EmployeeAttendanceStatus.ABSENT) ?? 0,
        totalAttendance,
      ),
      lateRate: this.toPercentage(
        countByStatus.get(EmployeeAttendanceStatus.LATE) ?? 0,
        totalAttendance,
      ),
      excusedAbsenceRate: this.toPercentage(
        countByStatus.get(EmployeeAttendanceStatus.EXCUSED_ABSENCE) ?? 0,
        totalAttendance,
      ),
      earlyLeaveRate: this.toPercentage(
        countByStatus.get(EmployeeAttendanceStatus.EARLY_LEAVE) ?? 0,
        totalAttendance,
      ),
    };
  }

  private async buildOrganizationInsights(employeeId?: string) {
    const grouped = await this.prisma.employee.groupBy({
      by: ['departmentId'],
      where: {
        deletedAt: null,
        id: employeeId,
        isActive: true,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    const departmentIds = grouped
      .map((item) => item.departmentId)
      .filter((value): value is string => Boolean(value));

    const departments = departmentIds.length
      ? await this.prisma.employeeDepartment.findMany({
          where: {
            id: {
              in: departmentIds,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            code: true,
            name: true,
          },
        })
      : [];

    const departmentMap = new Map(
      departments.map((department) => [department.id, department]),
    );

    const distribution = grouped
      .filter((item) => item.departmentId)
      .map((item) => {
        const department = departmentMap.get(item.departmentId!);
        return {
          departmentId: item.departmentId!,
          departmentCode: department?.code ?? null,
          departmentName: department?.name ?? 'قسم غير معروف',
          employeeCount: item._count._all,
        };
      })
      .sort((left, right) => right.employeeCount - left.employeeCount);

    const unassignedEmployees = grouped
      .filter((item) => item.departmentId === null)
      .reduce((sum, item) => sum + item._count._all, 0);

    return {
      departmentDistribution: distribution,
      unassignedEmployees,
    };
  }

  private toPercentage(numerator: number, denominator: number) {
    if (denominator <= 0) {
      return 0;
    }

    return Number(((numerator / denominator) * 100).toFixed(2));
  }
}
