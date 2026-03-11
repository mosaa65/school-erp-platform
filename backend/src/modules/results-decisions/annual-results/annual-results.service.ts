import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnnualResult,
  AssessmentType,
  AuditStatus,
  GradingWorkflowStatus,
  Prisma,
  TieBreakStrategy,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CalculateAnnualResultsDto } from './dto/calculate-annual-results.dto';
import { CreateAnnualResultDto } from './dto/create-annual-result.dto';
import { ListAnnualResultsDto } from './dto/list-annual-results.dto';
import { UpdateAnnualResultDto } from './dto/update-annual-result.dto';

type SectionContext = {
  sectionId: string;
  gradeLevelId: string;
  academicYearId: string;
};

type OutcomeRuleContext = {
  promotedMaxFailedSubjects: number;
  conditionalMaxFailedSubjects: number;
  promotedDecisionId: string;
  conditionalDecisionId: string;
  retainedDecisionId: string;
  tieBreakStrategy: TieBreakStrategy;
};

type SubjectAnnualAggregate = {
  studentEnrollmentId: string;
  subjectId: string;
  termTotals: Array<{
    academicTermId: string;
    sequence: number;
    termTotal: number;
  }>;
};

const annualResultInclude: Prisma.AnnualResultInclude = {
  studentEnrollment: {
    select: {
      id: true,
      studentId: true,
      sectionId: true,
      academicYearId: true,
      status: true,
      isActive: true,
      student: {
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
          isActive: true,
        },
      },
      section: {
        select: {
          id: true,
          code: true,
          name: true,
          gradeLevelId: true,
          isActive: true,
          gradeLevel: {
            select: {
              id: true,
              code: true,
              name: true,
              sequence: true,
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
      status: true,
      isCurrent: true,
    },
  },
  promotionDecision: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
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
  lockedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
  approvedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
};

@Injectable()
export class AnnualResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateAnnualResultDto, actorUserId: string) {
    const context = await this.ensureEnrollmentContext(
      payload.studentEnrollmentId,
      payload.academicYearId,
    );
    await this.ensureActorAuthorizedForSection(
      actorUserId,
      context.sectionId,
      context.academicYearId,
    );
    await this.ensurePromotionDecisionExists(payload.promotionDecisionId);

    const existing = await this.prisma.annualResult.findFirst({
      where: {
        studentEnrollmentId: payload.studentEnrollmentId,
        academicYearId: payload.academicYearId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'توجد نتيجة سنوية مسبقًا لهذا القيد وهذه السنة',
      );
    }

    const totalAllSubjects = payload.totalAllSubjects ?? 0;
    const maxPossibleTotal = payload.maxPossibleTotal ?? 0;
    const percentage =
      payload.percentage ??
      this.computePercentage(totalAllSubjects, maxPossibleTotal);
    const passedSubjectsCount = payload.passedSubjectsCount ?? 0;
    const failedSubjectsCount = payload.failedSubjectsCount ?? 0;

    this.validateScore(totalAllSubjects, 'totalAllSubjects');
    this.validateScore(maxPossibleTotal, 'maxPossibleTotal');
    this.validateScore(percentage, 'percentage');
    this.validateNonNegativeInteger(passedSubjectsCount, 'passedSubjectsCount');
    this.validateNonNegativeInteger(failedSubjectsCount, 'failedSubjectsCount');

    const status = payload.status ?? GradingWorkflowStatus.DRAFT;
    const shouldLock = status === GradingWorkflowStatus.APPROVED;

    try {
      const annualResult = await this.prisma.annualResult.create({
        data: {
          studentEnrollmentId: payload.studentEnrollmentId,
          academicYearId: payload.academicYearId,
          totalAllSubjects,
          maxPossibleTotal,
          percentage,
          rankInClass: payload.rankInClass,
          rankInGrade: payload.rankInGrade,
          passedSubjectsCount,
          failedSubjectsCount,
          promotionDecisionId: payload.promotionDecisionId,
          status,
          isLocked: shouldLock,
          lockedAt: shouldLock ? new Date() : null,
          lockedByUserId: shouldLock ? actorUserId : null,
          approvedByUserId: shouldLock ? actorUserId : null,
          approvedAt: shouldLock ? new Date() : null,
          calculatedAt: new Date(),
          notes: payload.notes?.trim(),
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: annualResultInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ANNUAL_RESULT_CREATE',
        resource: 'annual-results',
        resourceId: annualResult.id,
        details: {
          studentEnrollmentId: annualResult.studentEnrollmentId,
          academicYearId: annualResult.academicYearId,
        },
      });

      return annualResult;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'ANNUAL_RESULT_CREATE_FAILED',
        resource: 'annual-results',
        status: AuditStatus.FAILURE,
        details: {
          studentEnrollmentId: payload.studentEnrollmentId,
          academicYearId: payload.academicYearId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListAnnualResultsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AnnualResultWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      studentEnrollmentId: query.studentEnrollmentId,
      promotionDecisionId: query.promotionDecisionId,
      status: query.status,
      isLocked: query.isLocked,
      isActive: query.isActive,
      studentEnrollment: {
        sectionId: query.sectionId,
        studentId: query.studentId,
        section: {
          gradeLevelId: query.gradeLevelId,
        },
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

    const [total, items] = await this.prisma.$transaction([
      this.prisma.annualResult.count({ where }),
      this.prisma.annualResult.findMany({
        where,
        include: annualResultInclude,
        orderBy: [
          {
            academicYear: {
              startDate: 'desc',
            },
          },
          {
            rankInClass: 'asc',
          },
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
    const annualResult = await this.prisma.annualResult.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: annualResultInclude,
    });

    if (!annualResult) {
      throw new NotFoundException('النتيجة السنوية غير موجودة');
    }

    return annualResult;
  }

  async update(
    id: string,
    payload: UpdateAnnualResultDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureAnnualResultExists(id);

    if (existing.isLocked) {
      throw new ConflictException('لا يمكن تعديل نتيجة سنوية مقفلة');
    }

    if (
      payload.studentEnrollmentId !== undefined ||
      payload.academicYearId !== undefined
    ) {
      throw new BadRequestException(
        'لا يمكن تعديل studentEnrollmentId أو academicYearId',
      );
    }

    const context = await this.ensureAnnualResultContext(id);
    await this.ensureActorAuthorizedForSection(
      actorUserId,
      context.sectionId,
      existing.academicYearId,
    );

    if (payload.promotionDecisionId) {
      await this.ensurePromotionDecisionExists(payload.promotionDecisionId);
    }

    const totalAllSubjects =
      payload.totalAllSubjects ??
      this.decimalToNumber(existing.totalAllSubjects) ??
      0;
    const maxPossibleTotal =
      payload.maxPossibleTotal ??
      this.decimalToNumber(existing.maxPossibleTotal) ??
      0;
    const percentage =
      payload.percentage ??
      this.computePercentage(totalAllSubjects, maxPossibleTotal);
    const passedSubjectsCount =
      payload.passedSubjectsCount ?? existing.passedSubjectsCount;
    const failedSubjectsCount =
      payload.failedSubjectsCount ?? existing.failedSubjectsCount;

    this.validateScore(totalAllSubjects, 'totalAllSubjects');
    this.validateScore(maxPossibleTotal, 'maxPossibleTotal');
    this.validateScore(percentage, 'percentage');
    this.validateNonNegativeInteger(passedSubjectsCount, 'passedSubjectsCount');
    this.validateNonNegativeInteger(failedSubjectsCount, 'failedSubjectsCount');

    const shouldLock = payload.status === GradingWorkflowStatus.APPROVED;
    const lockData =
      shouldLock === true
        ? {
            isLocked: true,
            lockedAt: existing.lockedAt ?? new Date(),
            lockedByUserId: existing.lockedByUserId ?? actorUserId,
            approvedByUserId: actorUserId,
            approvedAt: new Date(),
          }
        : {};

    const annualResult = await this.prisma.annualResult.update({
      where: {
        id,
      },
      data: {
        totalAllSubjects,
        maxPossibleTotal,
        percentage,
        rankInClass: payload.rankInClass,
        rankInGrade: payload.rankInGrade,
        passedSubjectsCount,
        failedSubjectsCount,
        promotionDecisionId: payload.promotionDecisionId,
        status: payload.status,
        notes: payload.notes?.trim(),
        isActive: payload.isActive,
        calculatedAt: new Date(),
        updatedById: actorUserId,
        ...lockData,
      },
      include: annualResultInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ANNUAL_RESULT_UPDATE',
      resource: 'annual-results',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return annualResult;
  }

  async lock(id: string, actorUserId: string) {
    const existing = await this.ensureAnnualResultExists(id);
    const context = await this.ensureAnnualResultContext(id);

    await this.ensureActorAuthorizedForSection(
      actorUserId,
      context.sectionId,
      existing.academicYearId,
    );

    if (existing.isLocked) {
      throw new ConflictException('النتيجة السنوية مقفلة بالفعل');
    }

    const annualResult = await this.prisma.annualResult.update({
      where: {
        id,
      },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedByUserId: actorUserId,
        approvedByUserId: actorUserId,
        approvedAt: new Date(),
        status: GradingWorkflowStatus.APPROVED,
        updatedById: actorUserId,
      },
      include: annualResultInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ANNUAL_RESULT_LOCK',
      resource: 'annual-results',
      resourceId: id,
    });

    return annualResult;
  }

  async unlock(id: string, actorUserId: string) {
    const existing = await this.ensureAnnualResultExists(id);
    const context = await this.ensureAnnualResultContext(id);

    await this.ensureActorAuthorizedForSection(
      actorUserId,
      context.sectionId,
      existing.academicYearId,
    );

    if (!existing.isLocked) {
      throw new ConflictException('النتيجة السنوية غير مقفلة');
    }

    const annualResult = await this.prisma.annualResult.update({
      where: {
        id,
      },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedByUserId: null,
        approvedByUserId: null,
        approvedAt: null,
        status: GradingWorkflowStatus.IN_REVIEW,
        updatedById: actorUserId,
      },
      include: annualResultInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ANNUAL_RESULT_UNLOCK',
      resource: 'annual-results',
      resourceId: id,
    });

    return annualResult;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureAnnualResultExists(id);
    const context = await this.ensureAnnualResultContext(id);

    await this.ensureActorAuthorizedForSection(
      actorUserId,
      context.sectionId,
      existing.academicYearId,
    );

    if (existing.isLocked) {
      throw new ConflictException('لا يمكن حذف نتيجة سنوية مقفلة');
    }

    await this.prisma.annualResult.update({
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
      action: 'ANNUAL_RESULT_DELETE',
      resource: 'annual-results',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async calculate(payload: CalculateAnnualResultsDto, actorUserId: string) {
    const context = await this.ensureSectionContext(
      payload.sectionId,
      payload.academicYearId,
    );
    await this.ensureActorAuthorizedForSection(
      actorUserId,
      context.sectionId,
      context.academicYearId,
    );

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        sectionId: payload.sectionId,
        academicYearId: payload.academicYearId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (enrollments.length === 0) {
      return {
        message: 'لا توجد قيود طلاب نشطة للشعبة والسنة المحددتين',
        summary: {
          annualGrades: {
            created: 0,
            updated: 0,
            skippedLocked: 0,
          },
          annualResults: {
            created: 0,
            updated: 0,
            skippedLocked: 0,
          },
          rankedClassRows: 0,
          rankedGradeRows: 0,
        },
      };
    }

    const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
    const [passStatus, failStatus] = await this.prisma.$transaction([
      this.prisma.annualStatusLookup.findFirst({
        where: {
          code: 'PASS',
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.annualStatusLookup.findFirst({
        where: {
          code: 'FAIL',
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!passStatus || !failStatus) {
      throw new BadRequestException(
        'يجب إعداد حالتي PASS و FAIL قبل تنفيذ الاحتساب السنوي',
      );
    }

    const outcomeRule = await this.resolveOutcomeRule(
      payload.academicYearId,
      context.gradeLevelId,
    );

    const semesterGradeRows = await this.prisma.semesterGrade.findMany({
      where: {
        academicYearId: payload.academicYearId,
        studentEnrollmentId: {
          in: enrollmentIds,
        },
        deletedAt: null,
        isActive: true,
      },
      select: {
        studentEnrollmentId: true,
        subjectId: true,
        academicTermId: true,
        semesterTotal: true,
        academicTerm: {
          select: {
            sequence: true,
          },
        },
      },
    });

    const aggregateMap = new Map<string, SubjectAnnualAggregate>();
    for (const row of semesterGradeRows) {
      const key = `${row.studentEnrollmentId}::${row.subjectId}`;
      const existing =
        aggregateMap.get(key) ??
        ({
          studentEnrollmentId: row.studentEnrollmentId,
          subjectId: row.subjectId,
          termTotals: [],
        } as SubjectAnnualAggregate);

      const termTotal = this.decimalToNumber(row.semesterTotal) ?? 0;
      const termEntry = existing.termTotals.find(
        (item) => item.academicTermId === row.academicTermId,
      );
      if (termEntry) {
        termEntry.termTotal = this.round2(termEntry.termTotal + termTotal);
      } else {
        existing.termTotals.push({
          academicTermId: row.academicTermId,
          sequence: row.academicTerm.sequence,
          termTotal,
        });
      }

      aggregateMap.set(key, existing);
    }

    const subjectIds = Array.from(
      new Set(Array.from(aggregateMap.values()).map((item) => item.subjectId)),
    );
    const termCount = await this.resolveTermCount(payload.academicYearId);
    const policyMetaBySubjectId = await this.buildPolicyMetaMap(
      payload.academicYearId,
      context.gradeLevelId,
      subjectIds,
      termCount,
    );

    const annualGradeSummary = {
      created: 0,
      updated: 0,
      skippedLocked: 0,
    };
    const annualResultSummary = {
      created: 0,
      updated: 0,
      skippedLocked: 0,
    };
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (aggregateMap.size > 0) {
        const annualGradeRows = await tx.annualGrade.findMany({
          where: {
            academicYearId: payload.academicYearId,
            studentEnrollmentId: {
              in: enrollmentIds,
            },
            subjectId: {
              in: subjectIds,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            studentEnrollmentId: true,
            subjectId: true,
            isLocked: true,
            status: true,
          },
        });

        const annualGradeByKey = new Map(
          annualGradeRows.map((row) => [
            `${row.studentEnrollmentId}::${row.subjectId}`,
            row,
          ]),
        );

        for (const aggregate of aggregateMap.values()) {
          const key = `${aggregate.studentEnrollmentId}::${aggregate.subjectId}`;
          const existing = annualGradeByKey.get(key);

          if (existing?.isLocked) {
            annualGradeSummary.skippedLocked += 1;
            continue;
          }

          const termTotals = [...aggregate.termTotals].sort(
            (a, b) => a.sequence - b.sequence,
          );
          const semester1Total = this.round2(
            termTotals.find((term) => term.sequence === 1)?.termTotal ?? 0,
          );
          const semester2Total = this.round2(
            termTotals.find((term) => term.sequence === 2)?.termTotal ?? 0,
          );
          const annualTotal = this.round2(
            termTotals.reduce((sum, term) => sum + term.termTotal, 0),
          );
          const policyMeta = policyMetaBySubjectId.get(aggregate.subjectId);
          if (!policyMeta) {
            throw new BadRequestException(
              'لا توجد سياسة درجات معتمدة لحساب النتيجة السنوية لهذه المادة',
            );
          }
          const annualPercentage =
            policyMeta.maxAnnual > 0
              ? this.round2((annualTotal / policyMeta.maxAnnual) * 100)
              : 0;
          const finalStatusId =
            annualPercentage >= policyMeta.passingScore
              ? passStatus.id
              : failStatus.id;

          if (existing) {
            await tx.annualGrade.update({
              where: {
                id: existing.id,
              },
              data: {
                semester1Total,
                semester2Total,
                annualTotal,
                annualPercentage,
                finalStatusId,
                calculatedAt: now,
                status:
                  existing.status === GradingWorkflowStatus.ARCHIVED
                    ? GradingWorkflowStatus.ARCHIVED
                    : GradingWorkflowStatus.DRAFT,
                updatedById: actorUserId,
              },
            });
            await this.syncAnnualGradeTerms(
              tx,
              existing.id,
              termTotals,
              actorUserId,
              now,
            );
            annualGradeSummary.updated += 1;
          } else {
            const created = await tx.annualGrade.create({
              data: {
                studentEnrollmentId: aggregate.studentEnrollmentId,
                subjectId: aggregate.subjectId,
                academicYearId: payload.academicYearId,
                semester1Total,
                semester2Total,
                annualTotal,
                annualPercentage,
                finalStatusId,
                status: GradingWorkflowStatus.DRAFT,
                isLocked: false,
                calculatedAt: now,
                isActive: true,
                createdById: actorUserId,
                updatedById: actorUserId,
                termTotals: {
                  create: termTotals.map((term) => ({
                    academicTermId: term.academicTermId,
                    termTotal: term.termTotal,
                    isActive: true,
                    createdById: actorUserId,
                    updatedById: actorUserId,
                  })),
                },
              },
            });
            if (created && termTotals.length === 0) {
              await this.syncAnnualGradeTerms(
                tx,
                created.id,
                termTotals,
                actorUserId,
                now,
              );
            }
            annualGradeSummary.created += 1;
          }
        }
      }

      const latestAnnualGrades = await tx.annualGrade.findMany({
        where: {
          academicYearId: payload.academicYearId,
          studentEnrollmentId: {
            in: enrollmentIds,
          },
          deletedAt: null,
          isActive: true,
        },
        select: {
          studentEnrollmentId: true,
          subjectId: true,
          annualTotal: true,
          finalStatus: {
            select: {
              code: true,
            },
          },
        },
      });

      const gradeRowsByEnrollmentId = new Map<
        string,
        Array<{
          subjectId: string;
          annualTotal: number;
          finalStatusCode: string;
        }>
      >();
      for (const row of latestAnnualGrades) {
        const list = gradeRowsByEnrollmentId.get(row.studentEnrollmentId) ?? [];
        list.push({
          subjectId: row.subjectId,
          annualTotal: this.decimalToNumber(row.annualTotal) ?? 0,
          finalStatusCode: row.finalStatus.code,
        });
        gradeRowsByEnrollmentId.set(row.studentEnrollmentId, list);
      }

      const annualResultsRows = await tx.annualResult.findMany({
        where: {
          academicYearId: payload.academicYearId,
          studentEnrollmentId: {
            in: enrollmentIds,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          studentEnrollmentId: true,
          isLocked: true,
          status: true,
        },
      });
      const annualResultByEnrollmentId = new Map(
        annualResultsRows.map((row) => [row.studentEnrollmentId, row] as const),
      );

      for (const enrollmentId of enrollmentIds) {
        const existing = annualResultByEnrollmentId.get(enrollmentId);

        if (existing?.isLocked) {
          annualResultSummary.skippedLocked += 1;
          continue;
        }

        const gradeRows = gradeRowsByEnrollmentId.get(enrollmentId) ?? [];

        const totalAllSubjects = this.round2(
          gradeRows.reduce((sum, row) => sum + row.annualTotal, 0),
        );
        const maxPossibleTotal = this.round2(
          gradeRows.reduce((sum, row) => {
            const policyMeta = policyMetaBySubjectId.get(row.subjectId);
            return sum + (policyMeta?.maxAnnual ?? 0);
          }, 0),
        );
        const percentage = this.computePercentage(
          totalAllSubjects,
          maxPossibleTotal,
        );
        const passedSubjectsCount = gradeRows.filter(
          (row) => row.finalStatusCode === 'PASS',
        ).length;
        const failedSubjectsCount = gradeRows.length - passedSubjectsCount;

        const promotionDecisionId =
          failedSubjectsCount <= outcomeRule.promotedMaxFailedSubjects
            ? outcomeRule.promotedDecisionId
            : failedSubjectsCount <= outcomeRule.conditionalMaxFailedSubjects
              ? outcomeRule.conditionalDecisionId
              : outcomeRule.retainedDecisionId;

        if (existing) {
          await tx.annualResult.update({
            where: {
              id: existing.id,
            },
            data: {
              totalAllSubjects,
              maxPossibleTotal,
              percentage,
              rankInClass: null,
              rankInGrade: null,
              passedSubjectsCount,
              failedSubjectsCount,
              promotionDecisionId,
              calculatedAt: now,
              status:
                existing.status === GradingWorkflowStatus.ARCHIVED
                  ? GradingWorkflowStatus.ARCHIVED
                  : GradingWorkflowStatus.DRAFT,
              updatedById: actorUserId,
            },
          });
          annualResultSummary.updated += 1;
        } else {
          await tx.annualResult.create({
            data: {
              studentEnrollmentId: enrollmentId,
              academicYearId: payload.academicYearId,
              totalAllSubjects,
              maxPossibleTotal,
              percentage,
              rankInClass: null,
              rankInGrade: null,
              passedSubjectsCount,
              failedSubjectsCount,
              promotionDecisionId,
              status: GradingWorkflowStatus.DRAFT,
              isLocked: false,
              calculatedAt: now,
              isActive: true,
              createdById: actorUserId,
              updatedById: actorUserId,
            },
          });
          annualResultSummary.created += 1;
        }
      }

      const classRows = await tx.annualResult.findMany({
        where: {
          academicYearId: payload.academicYearId,
          deletedAt: null,
          isActive: true,
          studentEnrollment: {
            academicYearId: payload.academicYearId,
            sectionId: payload.sectionId,
          },
        },
        select: {
          id: true,
          percentage: true,
          totalAllSubjects: true,
          studentEnrollment: {
            select: {
              student: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      });
      const sortedClassRows = this.sortAnnualRankingRows(
        classRows,
        outcomeRule.tieBreakStrategy,
      );
      for (let i = 0; i < sortedClassRows.length; i += 1) {
        await tx.annualResult.update({
          where: {
            id: sortedClassRows[i].id,
          },
          data: {
            rankInClass: i + 1,
            updatedById: actorUserId,
          },
        });
      }

      const gradeRows = await tx.annualResult.findMany({
        where: {
          academicYearId: payload.academicYearId,
          deletedAt: null,
          isActive: true,
          studentEnrollment: {
            academicYearId: payload.academicYearId,
            section: {
              gradeLevelId: context.gradeLevelId,
            },
          },
        },
        select: {
          id: true,
          percentage: true,
          totalAllSubjects: true,
          studentEnrollment: {
            select: {
              student: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      });
      const sortedGradeRows = this.sortAnnualRankingRows(
        gradeRows,
        outcomeRule.tieBreakStrategy,
      );
      for (let i = 0; i < sortedGradeRows.length; i += 1) {
        await tx.annualResult.update({
          where: {
            id: sortedGradeRows[i].id,
          },
          data: {
            rankInGrade: i + 1,
            updatedById: actorUserId,
          },
        });
      }
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ANNUAL_RESULT_CALCULATE',
      resource: 'annual-results',
      details: {
        academicYearId: payload.academicYearId,
        sectionId: payload.sectionId,
        annualGrades: annualGradeSummary,
        annualResults: annualResultSummary,
      },
    });

    return {
      message: 'اكتمل احتساب النتائج السنوية',
      summary: {
        annualGrades: annualGradeSummary,
        annualResults: annualResultSummary,
      },
    };
  }

  private async ensureSectionContext(
    sectionId: string,
    academicYearId: string,
  ): Promise<SectionContext> {
    const [academicYear, section] = await this.prisma.$transaction([
      this.prisma.academicYear.findFirst({
        where: {
          id: academicYearId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.section.findFirst({
        where: {
          id: sectionId,
          deletedAt: null,
        },
        select: {
          id: true,
          gradeLevelId: true,
          isActive: true,
        },
      }),
    ]);

    if (!academicYear) {
      throw new BadRequestException('السنة الدراسية غير صالحة أو محذوفة');
    }
    if (!section) {
      throw new BadRequestException('الشعبة غير صالحة أو محذوفة');
    }
    if (!section.isActive) {
      throw new BadRequestException('الشعبة غير نشطة');
    }

    return {
      sectionId: section.id,
      gradeLevelId: section.gradeLevelId,
      academicYearId,
    };
  }

  private async ensureEnrollmentContext(
    studentEnrollmentId: string,
    academicYearId: string,
  ): Promise<SectionContext> {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id: studentEnrollmentId,
        deletedAt: null,
      },
      select: {
        id: true,
        sectionId: true,
        academicYearId: true,
        isActive: true,
        section: {
          select: {
            gradeLevelId: true,
            isActive: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new BadRequestException('قيد الطالب غير صالح أو محذوف');
    }
    if (!enrollment.isActive) {
      throw new BadRequestException('قيد الطالب غير نشط');
    }
    if (!enrollment.section.isActive) {
      throw new BadRequestException('شعبة القيد غير نشطة');
    }
    if (enrollment.academicYearId !== academicYearId) {
      throw new BadRequestException(
        'السنة الدراسية لقيد الطالب لا تطابق السنة المرسلة',
      );
    }

    return {
      sectionId: enrollment.sectionId,
      gradeLevelId: enrollment.section.gradeLevelId,
      academicYearId,
    };
  }

  private async ensureAnnualResultContext(id: string): Promise<SectionContext> {
    const annualResult = await this.prisma.annualResult.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        academicYearId: true,
        studentEnrollment: {
          select: {
            sectionId: true,
            section: {
              select: {
                gradeLevelId: true,
              },
            },
          },
        },
      },
    });

    if (!annualResult) {
      throw new NotFoundException('النتيجة السنوية غير موجودة');
    }

    return {
      sectionId: annualResult.studentEnrollment.sectionId,
      gradeLevelId: annualResult.studentEnrollment.section.gradeLevelId,
      academicYearId: annualResult.academicYearId,
    };
  }

  private async ensureAnnualResultExists(id: string): Promise<AnnualResult> {
    const annualResult = await this.prisma.annualResult.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!annualResult) {
      throw new NotFoundException('النتيجة السنوية غير موجودة');
    }

    return annualResult;
  }

  private async ensurePromotionDecisionExists(promotionDecisionId: string) {
    const decision = await this.prisma.promotionDecisionLookup.findFirst({
      where: {
        id: promotionDecisionId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!decision) {
      throw new BadRequestException(
        'قرار الترفيع غير صالح أو محذوف أو غير نشط',
      );
    }
  }

  private async ensureActorAuthorizedForSection(
    actorUserId: string,
    sectionId: string,
    academicYearId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: actorUserId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('المستخدم المصادق عليه غير نشط');
    }

    if (!user.employeeId) {
      // Allow privileged users without linked employee profile.
      return;
    }

    const assignmentsCount = await this.prisma.employeeTeachingAssignment.count(
      {
        where: {
          employeeId: user.employeeId,
          sectionId,
          academicYearId,
          deletedAt: null,
          isActive: true,
        },
      },
    );

    if (assignmentsCount === 0) {
      throw new ForbiddenException(
        'أنت غير مكلّف بهذه الشعبة في السنة الدراسية المحددة',
      );
    }
  }

  private async resolveOutcomeRule(
    academicYearId: string,
    gradeLevelId: string,
  ): Promise<OutcomeRuleContext> {
    const [promotedDecision, conditionalDecision, retainedDecision, rule] =
      await this.prisma.$transaction([
        this.prisma.promotionDecisionLookup.findFirst({
          where: {
            code: 'PROMOTED',
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        }),
        this.prisma.promotionDecisionLookup.findFirst({
          where: {
            code: 'CONDITIONAL',
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        }),
        this.prisma.promotionDecisionLookup.findFirst({
          where: {
            code: 'RETAINED',
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        }),
        this.prisma.gradingOutcomeRule.findFirst({
          where: {
            academicYearId,
            gradeLevelId,
            isActive: true,
            deletedAt: null,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          select: {
            promotedMaxFailedSubjects: true,
            conditionalMaxFailedSubjects: true,
            conditionalDecisionId: true,
            retainedDecisionId: true,
            tieBreakStrategy: true,
          },
        }),
      ]);

    if (!promotedDecision) {
      throw new BadRequestException(
        'قرار الترفيع PROMOTED يجب أن يكون موجودًا قبل الاحتساب',
      );
    }

    return {
      promotedMaxFailedSubjects: rule?.promotedMaxFailedSubjects ?? 0,
      conditionalMaxFailedSubjects: rule?.conditionalMaxFailedSubjects ?? 2,
      promotedDecisionId: promotedDecision.id,
      conditionalDecisionId:
        rule?.conditionalDecisionId ??
        conditionalDecision?.id ??
        promotedDecision.id,
      retainedDecisionId:
        rule?.retainedDecisionId ??
        retainedDecision?.id ??
        conditionalDecision?.id ??
        promotedDecision.id,
      tieBreakStrategy:
        rule?.tieBreakStrategy ?? TieBreakStrategy.PERCENTAGE_THEN_NAME,
    };
  }

  private async buildPolicyMetaMap(
    academicYearId: string,
    gradeLevelId: string,
    subjectIds: string[],
    termCount: number,
  ): Promise<Map<string, { passingScore: number; maxAnnual: number }>> {
    if (subjectIds.length === 0) {
      return new Map();
    }

    const policies = await this.prisma.gradingPolicy.findMany({
      where: {
        academicYearId,
        gradeLevelId,
        subjectId: {
          in: subjectIds,
        },
        assessmentType: AssessmentType.MONTHLY,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        subjectId: true,
        isDefault: true,
        status: true,
        updatedAt: true,
        maxExamScore: true,
        maxHomeworkScore: true,
        maxAttendanceScore: true,
        maxActivityScore: true,
        maxContributionScore: true,
        passingScore: true,
      },
    });

    const pickedBySubject = new Map<string, (typeof policies)[number]>();
    for (const policy of policies) {
      const current = pickedBySubject.get(policy.subjectId);
      if (!current) {
        pickedBySubject.set(policy.subjectId, policy);
        continue;
      }

      const currentScore =
        (current.status === GradingWorkflowStatus.APPROVED ? 4 : 0) +
        (current.isDefault ? 2 : 0);
      const candidateScore =
        (policy.status === GradingWorkflowStatus.APPROVED ? 4 : 0) +
        (policy.isDefault ? 2 : 0);

      if (
        candidateScore > currentScore ||
        (candidateScore === currentScore &&
          policy.updatedAt > current.updatedAt)
      ) {
        pickedBySubject.set(policy.subjectId, policy);
      }
    }

    const pickedPolicies = Array.from(pickedBySubject.values());
    const policyIds = pickedPolicies.map((policy) => policy.id);
    const componentSums = await this.prisma.gradingPolicyComponent.groupBy({
      by: ['gradingPolicyId'],
      where: {
        gradingPolicyId: {
          in: policyIds,
        },
        includeInSemester: true,
        deletedAt: null,
        isActive: true,
      },
      _sum: {
        maxScore: true,
      },
    });

    const componentSumByPolicyId = new Map(
      componentSums.map((row) => [
        row.gradingPolicyId,
        this.decimalToNumber(row._sum.maxScore) ?? 0,
      ]),
    );

    const result = new Map<
      string,
      { passingScore: number; maxAnnual: number }
    >();
    for (const policy of pickedPolicies) {
      const componentTotal = componentSumByPolicyId.get(policy.id) ?? 0;
      const legacyTotal =
        (this.decimalToNumber(policy.maxExamScore) ?? 0) +
        (this.decimalToNumber(policy.maxHomeworkScore) ?? 0) +
        (this.decimalToNumber(policy.maxAttendanceScore) ?? 0) +
        (this.decimalToNumber(policy.maxActivityScore) ?? 0) +
        (this.decimalToNumber(policy.maxContributionScore) ?? 0);
      const oneSemesterMax = componentTotal > 0 ? componentTotal : legacyTotal;

      result.set(policy.subjectId, {
        passingScore: this.decimalToNumber(policy.passingScore) ?? 0,
        maxAnnual:
          termCount > 0 ? this.round2(oneSemesterMax * termCount) : 0,
      });
    }

    return result;
  }

  private sortAnnualRankingRows(
    rows: Array<{
      id: string;
      percentage: Prisma.Decimal;
      totalAllSubjects: Prisma.Decimal;
      studentEnrollment: {
        student: {
          fullName: string;
        };
      };
    }>,
    tieBreakStrategy: TieBreakStrategy,
  ) {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const percentageDiff =
        (this.decimalToNumber(b.percentage) ?? 0) -
        (this.decimalToNumber(a.percentage) ?? 0);
      if (percentageDiff !== 0) {
        return percentageDiff;
      }

      if (tieBreakStrategy !== TieBreakStrategy.PERCENTAGE_ONLY) {
        const totalDiff =
          (this.decimalToNumber(b.totalAllSubjects) ?? 0) -
          (this.decimalToNumber(a.totalAllSubjects) ?? 0);
        if (totalDiff !== 0) {
          return totalDiff;
        }
      }

      if (tieBreakStrategy === TieBreakStrategy.PERCENTAGE_THEN_NAME) {
        const byName = a.studentEnrollment.student.fullName.localeCompare(
          b.studentEnrollment.student.fullName,
        );
        if (byName !== 0) {
          return byName;
        }
      }

      return a.id.localeCompare(b.id);
    });

    return sorted;
  }

  private async syncAnnualGradeTerms(
    tx: Prisma.TransactionClient,
    annualGradeId: string,
    termTotals: Array<{ academicTermId: string; termTotal: number }>,
    actorUserId: string,
    now: Date,
  ) {
    if (termTotals.length === 0) {
      return;
    }

    for (const term of termTotals) {
      await tx.annualGradeTerm.upsert({
        where: {
          annualGradeId_academicTermId: {
            annualGradeId,
            academicTermId: term.academicTermId,
          },
        },
        create: {
          annualGradeId,
          academicTermId: term.academicTermId,
          termTotal: term.termTotal,
          isActive: true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        update: {
          termTotal: term.termTotal,
          isActive: true,
          deletedAt: null,
          updatedById: actorUserId,
          updatedAt: now,
        },
      });
    }

    const termIds = termTotals.map((term) => term.academicTermId);
    await tx.annualGradeTerm.updateMany({
      where: {
        annualGradeId,
        academicTermId: {
          notIn: termIds,
        },
        deletedAt: null,
      },
      data: {
        isActive: false,
        deletedAt: now,
        updatedById: actorUserId,
      },
    });
  }

  private async resolveTermCount(academicYearId: string): Promise<number> {
    const count = await this.prisma.academicTerm.count({
      where: {
        academicYearId,
        deletedAt: null,
        isActive: true,
      },
    });

    return count;
  }

  private computePercentage(total: number, maxTotal: number): number {
    if (maxTotal <= 0) {
      return 0;
    }

    return this.round2((total / maxTotal) * 100);
  }

  private validateScore(value: number, fieldName: string) {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `يجب أن تكون قيمة ${fieldName} رقمًا غير سالب`,
      );
    }
  }

  private validateNonNegativeInteger(value: number, fieldName: string) {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(
        `يجب أن تكون قيمة ${fieldName} عددًا صحيحًا غير سالب`,
      );
    }
  }

  private decimalToNumber(
    value: Prisma.Decimal | number | null | undefined,
  ): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return Number(value);
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'توجد نتيجة سنوية مسبقًا لهذا القيد وهذه السنة',
      );
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'خطأ غير معروف';
  }
}

