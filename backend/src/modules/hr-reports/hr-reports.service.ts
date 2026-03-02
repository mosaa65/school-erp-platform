import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EmployeeAttendanceStatus,
  PerformanceRatingLevel,
  Prisma,
  ViolationSeverity,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { HrSummaryQueryDto } from './dto/hr-summary-query.dto';

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
}
