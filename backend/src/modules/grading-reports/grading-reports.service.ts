import { BadRequestException, Injectable } from '@nestjs/common';
import { GradingWorkflowStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GradingSummaryQueryDto } from './dto/grading-summary-query.dto';

type StatusCountRow = {
  status: GradingWorkflowStatus;
  _count: {
    _all: number;
  };
};

@Injectable()
export class GradingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: GradingSummaryQueryDto) {
    const updatedAtRange = this.buildDateRange(query.fromDate, query.toDate);
    await this.validateScopeReferences(query);

    const enrollmentFilter = this.buildEnrollmentFilter(
      query.sectionId,
      query.gradeLevelId,
    );

    const semesterWhere: Prisma.SemesterGradeWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      academicTermId: query.academicTermId,
      updatedAt: updatedAtRange,
      studentEnrollment: enrollmentFilter,
    };

    const annualGradeWhere: Prisma.AnnualGradeWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      updatedAt: updatedAtRange,
      studentEnrollment: enrollmentFilter,
    };

    const annualResultWhere: Prisma.AnnualResultWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      updatedAt: updatedAtRange,
      studentEnrollment: enrollmentFilter,
    };

    const [
      semesterTotal,
      semesterLocked,
      semesterActive,
      annualGradeTotal,
      annualGradeLocked,
      annualGradeActive,
      annualResultTotal,
      annualResultLocked,
      annualResultActive,
      semesterStatusRows,
      annualGradeStatusRows,
      annualResultStatusRows,
      finalStatusDistribution,
      promotionDecisionDistribution,
      withClassRank,
      withGradeRank,
      fullyRanked,
    ] = await Promise.all([
      this.prisma.semesterGrade.count({ where: semesterWhere }),
      this.prisma.semesterGrade.count({
        where: {
          ...semesterWhere,
          isLocked: true,
        },
      }),
      this.prisma.semesterGrade.count({
        where: {
          ...semesterWhere,
          isActive: true,
        },
      }),
      this.prisma.annualGrade.count({ where: annualGradeWhere }),
      this.prisma.annualGrade.count({
        where: {
          ...annualGradeWhere,
          isLocked: true,
        },
      }),
      this.prisma.annualGrade.count({
        where: {
          ...annualGradeWhere,
          isActive: true,
        },
      }),
      this.prisma.annualResult.count({ where: annualResultWhere }),
      this.prisma.annualResult.count({
        where: {
          ...annualResultWhere,
          isLocked: true,
        },
      }),
      this.prisma.annualResult.count({
        where: {
          ...annualResultWhere,
          isActive: true,
        },
      }),
      this.prisma.semesterGrade.groupBy({
        by: ['status'],
        where: semesterWhere,
        _count: { _all: true },
      }),
      this.prisma.annualGrade.groupBy({
        by: ['status'],
        where: annualGradeWhere,
        _count: { _all: true },
      }),
      this.prisma.annualResult.groupBy({
        by: ['status'],
        where: annualResultWhere,
        _count: { _all: true },
      }),
      this.countAnnualFinalStatusDistribution(annualGradeWhere),
      this.countPromotionDecisionDistribution(annualResultWhere),
      this.prisma.annualResult.count({
        where: {
          ...annualResultWhere,
          rankInClass: {
            not: null,
          },
        },
      }),
      this.prisma.annualResult.count({
        where: {
          ...annualResultWhere,
          rankInGrade: {
            not: null,
          },
        },
      }),
      this.prisma.annualResult.count({
        where: {
          ...annualResultWhere,
          rankInClass: {
            not: null,
          },
          rankInGrade: {
            not: null,
          },
        },
      }),
    ]);

    const semesterUnlocked = semesterTotal - semesterLocked;
    const annualGradeUnlocked = annualGradeTotal - annualGradeLocked;
    const annualResultUnlocked = annualResultTotal - annualResultLocked;

    return {
      generatedAt: new Date().toISOString(),
      scope: {
        academicYearId: query.academicYearId ?? null,
        gradeLevelId: query.gradeLevelId ?? null,
        sectionId: query.sectionId ?? null,
        academicTermId: query.academicTermId ?? null,
        fromDate: query.fromDate ?? null,
        toDate: query.toDate ?? null,
      },
      semesterGrades: {
        total: semesterTotal,
        active: semesterActive,
        inactive: semesterTotal - semesterActive,
        locked: semesterLocked,
        unlocked: semesterUnlocked,
        lockRate: this.percentage(semesterLocked, semesterTotal),
        byStatus: this.mapWorkflowStatusCounts(semesterStatusRows),
      },
      annualGrades: {
        total: annualGradeTotal,
        active: annualGradeActive,
        inactive: annualGradeTotal - annualGradeActive,
        locked: annualGradeLocked,
        unlocked: annualGradeUnlocked,
        lockRate: this.percentage(annualGradeLocked, annualGradeTotal),
        byStatus: this.mapWorkflowStatusCounts(annualGradeStatusRows),
        byFinalStatus: finalStatusDistribution,
      },
      annualResults: {
        total: annualResultTotal,
        active: annualResultActive,
        inactive: annualResultTotal - annualResultActive,
        locked: annualResultLocked,
        unlocked: annualResultUnlocked,
        lockRate: this.percentage(annualResultLocked, annualResultTotal),
        byStatus: this.mapWorkflowStatusCounts(annualResultStatusRows),
        byPromotionDecision: promotionDecisionDistribution,
      },
      rankingReadiness: {
        withClassRank,
        withGradeRank,
        fullyRanked,
        missingClassRank: annualResultTotal - withClassRank,
        missingGradeRank: annualResultTotal - withGradeRank,
        notFullyRanked: annualResultTotal - fullyRanked,
      },
    };
  }

  private async validateScopeReferences(query: GradingSummaryQueryDto) {
    let sectionGradeLevelId: string | undefined;
    let termAcademicYearId: string | undefined;

    if (query.academicYearId) {
      const academicYear = await this.prisma.academicYear.findFirst({
        where: {
          id: query.academicYearId,
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

    if (query.gradeLevelId) {
      const gradeLevel = await this.prisma.gradeLevel.findFirst({
        where: {
          id: query.gradeLevelId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!gradeLevel) {
        throw new BadRequestException('Grade level is invalid or deleted');
      }
    }

    if (query.sectionId) {
      const section = await this.prisma.section.findFirst({
        where: {
          id: query.sectionId,
          deletedAt: null,
        },
        select: {
          id: true,
          gradeLevelId: true,
        },
      });

      if (!section) {
        throw new BadRequestException('Section is invalid or deleted');
      }

      sectionGradeLevelId = section.gradeLevelId;
    }

    if (query.academicTermId) {
      const academicTerm = await this.prisma.academicTerm.findFirst({
        where: {
          id: query.academicTermId,
          deletedAt: null,
        },
        select: {
          id: true,
          academicYearId: true,
        },
      });

      if (!academicTerm) {
        throw new BadRequestException('Academic term is invalid or deleted');
      }

      termAcademicYearId = academicTerm.academicYearId;
    }

    if (
      query.gradeLevelId &&
      sectionGradeLevelId &&
      sectionGradeLevelId !== query.gradeLevelId
    ) {
      throw new BadRequestException(
        'Section does not belong to the provided grade level',
      );
    }

    if (
      query.academicYearId &&
      termAcademicYearId &&
      termAcademicYearId !== query.academicYearId
    ) {
      throw new BadRequestException(
        'Academic term does not belong to the provided academic year',
      );
    }
  }

  private buildEnrollmentFilter(sectionId?: string, gradeLevelId?: string) {
    if (!sectionId && !gradeLevelId) {
      return undefined;
    }

    return {
      sectionId,
      section: gradeLevelId
        ? {
            gradeLevelId,
          }
        : undefined,
    } satisfies Prisma.StudentEnrollmentWhereInput;
  }

  private mapWorkflowStatusCounts(rows: StatusCountRow[]) {
    const countMap = new Map(
      rows.map((row) => [row.status, row._count._all] as const),
    );

    return Object.values(GradingWorkflowStatus).map((status) => ({
      status,
      count: countMap.get(status) ?? 0,
    }));
  }

  private async countAnnualFinalStatusDistribution(
    baseWhere: Prisma.AnnualGradeWhereInput,
  ) {
    const grouped = await this.prisma.annualGrade.groupBy({
      by: ['finalStatusId'],
      where: baseWhere,
      _count: {
        _all: true,
      },
    });

    if (grouped.length === 0) {
      return [];
    }

    const statusIds = grouped.map((row) => row.finalStatusId);
    const statuses = await this.prisma.annualStatusLookup.findMany({
      where: {
        id: {
          in: statusIds,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
    const statusMap = new Map(
      statuses.map((status) => [status.id, status] as const),
    );

    return grouped
      .map((row) => {
        const status = statusMap.get(row.finalStatusId);
        return {
          finalStatusId: row.finalStatusId,
          code: status?.code ?? 'UNKNOWN',
          name: status?.name ?? 'Unknown',
          count: row._count._all,
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private async countPromotionDecisionDistribution(
    baseWhere: Prisma.AnnualResultWhereInput,
  ) {
    const grouped = await this.prisma.annualResult.groupBy({
      by: ['promotionDecisionId'],
      where: baseWhere,
      _count: {
        _all: true,
      },
    });

    if (grouped.length === 0) {
      return [];
    }

    const decisionIds = grouped.map((row) => row.promotionDecisionId);
    const decisions = await this.prisma.promotionDecisionLookup.findMany({
      where: {
        id: {
          in: decisionIds,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
    const decisionMap = new Map(
      decisions.map((decision) => [decision.id, decision] as const),
    );

    return grouped
      .map((row) => {
        const decision = decisionMap.get(row.promotionDecisionId);
        return {
          promotionDecisionId: row.promotionDecisionId,
          code: decision?.code ?? 'UNKNOWN',
          name: decision?.name ?? 'Unknown',
          count: row._count._all,
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private buildDateRange(
    fromDate?: string,
    toDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!fromDate && !toDate) {
      return undefined;
    }

    const parsedFromDate = fromDate ? new Date(fromDate) : undefined;
    const parsedToDate = toDate ? new Date(toDate) : undefined;

    if (parsedFromDate && Number.isNaN(parsedFromDate.getTime())) {
      throw new BadRequestException('fromDate must be a valid date');
    }
    if (parsedToDate && Number.isNaN(parsedToDate.getTime())) {
      throw new BadRequestException('toDate must be a valid date');
    }
    if (parsedFromDate && parsedToDate && parsedFromDate > parsedToDate) {
      throw new BadRequestException(
        'fromDate must be before or equal to toDate',
      );
    }

    return {
      gte: parsedFromDate,
      lte: parsedToDate,
    };
  }

  private percentage(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Math.round(((value / total) * 100 + Number.EPSILON) * 100) / 100;
  }
}
