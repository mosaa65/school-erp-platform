import { BadRequestException, Injectable } from '@nestjs/common';
import { GradingWorkflowStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GradingDetailsQueryDto } from './dto/grading-details-query.dto';
import { GradingSummaryQueryDto } from './dto/grading-summary-query.dto';

type StatusCountRow = {
  status: GradingWorkflowStatus;
  _count: {
    _all: number;
  };
};

type GradeDescriptionLookupRow = {
  id: number;
  minPercentage: number;
  maxPercentage: number;
  nameAr: string;
  nameEn: string | null;
  colorCode: string | null;
  sortOrder: number;
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

  async getDetails(query: GradingDetailsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const updatedAtRange = this.buildDateRange(query.fromDate, query.toDate);
    await this.validateScopeReferences(query);

    const enrollmentFilter = this.buildEnrollmentFilter(
      query.sectionId,
      query.gradeLevelId,
    );

    const annualResultWhere: Prisma.AnnualResultWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      promotionDecisionId: query.promotionDecisionId,
      status: query.status,
      isLocked: query.isLocked,
      isActive: query.isActive,
      updatedAt: updatedAtRange,
      studentEnrollment: {
        ...(enrollmentFilter ?? {}),
        semesterGrades: query.academicTermId
          ? {
              some: {
                academicTermId: query.academicTermId,
                deletedAt: null,
              },
            }
          : undefined,
      },
      OR: query.search
        ? [
            {
              studentEnrollment: {
                student: {
                  fullName: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              studentEnrollment: {
                student: {
                  admissionNo: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              notes: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, annualResults, rawGradeDescriptions] =
      await this.prisma.$transaction([
        this.prisma.annualResult.count({
          where: annualResultWhere,
        }),
        this.prisma.annualResult.findMany({
          where: annualResultWhere,
          orderBy: [
            {
              percentage: 'desc',
            },
            {
              studentEnrollment: {
                student: {
                  fullName: 'asc',
                },
              },
            },
          ],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            studentEnrollmentId: true,
            academicYearId: true,
            totalAllSubjects: true,
            maxPossibleTotal: true,
            percentage: true,
            rankInClass: true,
            rankInGrade: true,
            passedSubjectsCount: true,
            failedSubjectsCount: true,
            promotionDecisionId: true,
            status: true,
            isLocked: true,
            isActive: true,
            calculatedAt: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            studentEnrollment: {
              select: {
                id: true,
                sectionId: true,
                student: {
                  select: {
                    id: true,
                    admissionNo: true,
                    fullName: true,
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
              },
            },
            academicYear: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            promotionDecision: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.lookupGradeDescription.findMany({
          where: {
            deletedAt: null,
            isActive: true,
          },
          orderBy: [
            {
              sortOrder: 'asc',
            },
            {
              minPercentage: 'asc',
            },
          ],
          select: {
            id: true,
            minPercentage: true,
            maxPercentage: true,
            nameAr: true,
            nameEn: true,
            colorCode: true,
            sortOrder: true,
          },
        }),
      ]);

    const gradeDescriptions: GradeDescriptionLookupRow[] = rawGradeDescriptions
      .map((item) => ({
        id: item.id,
        minPercentage: this.decimalToNumber(item.minPercentage) ?? 0,
        maxPercentage: this.decimalToNumber(item.maxPercentage) ?? 0,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        colorCode: item.colorCode,
        sortOrder: item.sortOrder,
      }))
      .sort((a, b) => a.minPercentage - b.minPercentage);

    const data = annualResults.map((row) => {
      const percentage = this.decimalToNumber(row.percentage) ?? 0;
      const gradeDescription = this.resolveGradeDescription(
        percentage,
        gradeDescriptions,
      );

      return {
        id: row.id,
        studentEnrollmentId: row.studentEnrollmentId,
        academicYearId: row.academicYearId,
        totalAllSubjects: this.decimalToNumber(row.totalAllSubjects) ?? 0,
        maxPossibleTotal: this.decimalToNumber(row.maxPossibleTotal) ?? 0,
        percentage,
        rankInClass: row.rankInClass,
        rankInGrade: row.rankInGrade,
        passedSubjectsCount: row.passedSubjectsCount,
        failedSubjectsCount: row.failedSubjectsCount,
        status: row.status,
        isLocked: row.isLocked,
        isActive: row.isActive,
        calculatedAt: row.calculatedAt,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        student: row.studentEnrollment.student,
        section: row.studentEnrollment.section,
        gradeLevel: row.studentEnrollment.section.gradeLevel,
        academicYear: row.academicYear,
        promotionDecision: row.promotionDecision,
        gradeDescription,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      scope: {
        academicYearId: query.academicYearId ?? null,
        gradeLevelId: query.gradeLevelId ?? null,
        sectionId: query.sectionId ?? null,
        academicTermId: query.academicTermId ?? null,
        promotionDecisionId: query.promotionDecisionId ?? null,
        status: query.status ?? null,
        isLocked: query.isLocked ?? null,
        isActive: query.isActive ?? null,
        search: query.search ?? null,
        fromDate: query.fromDate ?? null,
        toDate: query.toDate ?? null,
      },
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
        throw new BadRequestException('السنة الدراسية غير صالحة أو محذوفة');
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
        throw new BadRequestException('الصف الدراسي غير صالح أو محذوف');
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
        throw new BadRequestException('الشعبة غير صالحة أو محذوفة');
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
        throw new BadRequestException('الفصل الدراسي غير صالح أو محذوف');
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
      throw new BadRequestException('يجب أن يكون تاريخ البداية صالحًا');
    }
    if (parsedToDate && Number.isNaN(parsedToDate.getTime())) {
      throw new BadRequestException('يجب أن يكون تاريخ النهاية صالحًا');
    }
    if (parsedFromDate && parsedToDate && parsedFromDate > parsedToDate) {
      throw new BadRequestException(
        'يجب أن يكون fromDate قبل أو مساويًا لـ toDate',
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

  private resolveGradeDescription(
    percentage: number,
    gradeDescriptions: GradeDescriptionLookupRow[],
  ) {
    return (
      gradeDescriptions.find(
        (item) =>
          percentage >= item.minPercentage && percentage <= item.maxPercentage,
      ) ?? null
    );
  }

  private decimalToNumber(
    value: Prisma.Decimal | number | null | undefined,
  ): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return Number(value);
  }
}
