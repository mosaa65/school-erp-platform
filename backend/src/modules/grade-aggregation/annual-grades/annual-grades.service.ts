import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentType,
  AnnualGrade,
  AuditStatus,
  GradingWorkflowStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PolicyResolverService } from '../../evaluation-policies/grading-policies/policy-resolver.service';
import { DataScopeService } from '../../teaching-assignments/data-scope/data-scope.service';
import { CreateAnnualGradeDto } from './dto/create-annual-grade.dto';
import { ListAnnualGradesDto } from './dto/list-annual-grades.dto';
import { UpdateAnnualGradeDto } from './dto/update-annual-grade.dto';

type AnnualGradeContext = {
  sectionId: string;
  gradeLevelId: string;
  academicYearId: string;
};

type AnnualGradeTermInput = {
  academicTermId: string;
  termTotal: number;
};

type ResolvedAnnualTotals = {
  semester1Total: number;
  semester2Total: number;
  annualTotal: number;
  termTotals: Array<{
    academicTermId: string;
    sequence: number;
    termTotal: number;
  }>;
};

const annualGradeInclude: Prisma.AnnualGradeInclude = {
  studentEnrollment: {
    select: {
      id: true,
      studentId: true,
      sectionId: true,
      gradeLevelId: true,
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
  subject: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
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
  finalStatus: {
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
  termTotals: {
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: {
      academicTerm: {
        sequence: 'asc',
      },
    },
    select: {
      id: true,
      academicTermId: true,
      termTotal: true,
      academicTerm: {
        select: {
          id: true,
          code: true,
          name: true,
          sequence: true,
          termType: true,
        },
      },
    },
  },
};

@Injectable()
export class AnnualGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly policyResolver: PolicyResolverService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async create(payload: CreateAnnualGradeDto, actorUserId: string) {
    const context = await this.ensureEnrollmentContext(
      payload.studentEnrollmentId,
      payload.subjectId,
      payload.academicYearId,
    );
    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      payload.subjectId,
      context.academicYearId,
    );
    await this.ensureAnnualStatusExists(payload.finalStatusId);

    const existing = await this.prisma.annualGrade.findFirst({
      where: {
        studentEnrollmentId: payload.studentEnrollmentId,
        subjectId: payload.subjectId,
        academicYearId: payload.academicYearId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'الدرجة السنوية موجودة مسبقًا لهذا القيد والمادة والسنة',
      );
    }

    const resolvedTotals = await this.resolveAnnualTotals({
      academicYearId: payload.academicYearId,
      termTotals: payload.termTotals,
      semester1Total: payload.semester1Total,
      semester2Total: payload.semester2Total,
    });
    const annualPercentage =
      payload.annualPercentage ??
      (await this.computeAnnualPercentage(
        context.academicYearId,
        context.gradeLevelId,
        payload.subjectId,
        context.sectionId,
        resolvedTotals.annualTotal,
      ));

    if (annualPercentage !== null) {
      this.validateScore(annualPercentage, 'annualPercentage');
    }

    const status = payload.status ?? GradingWorkflowStatus.DRAFT;
    const shouldLock = status === GradingWorkflowStatus.APPROVED;

    try {
      const annualGrade = await this.prisma.annualGrade.create({
        data: {
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          academicYearId: payload.academicYearId,
          semester1Total: resolvedTotals.semester1Total,
          semester2Total: resolvedTotals.semester2Total,
          annualTotal: resolvedTotals.annualTotal,
          annualPercentage,
          finalStatusId: payload.finalStatusId,
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
          termTotals:
            resolvedTotals.termTotals.length > 0
              ? {
                  create: resolvedTotals.termTotals.map((term) => ({
                    academicTermId: term.academicTermId,
                    termTotal: term.termTotal,
                    isActive: true,
                    createdById: actorUserId,
                    updatedById: actorUserId,
                  })),
                }
              : undefined,
        },
        include: annualGradeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ANNUAL_GRADE_CREATE',
        resource: 'annual-grades',
        resourceId: annualGrade.id,
        details: {
          studentEnrollmentId: annualGrade.studentEnrollmentId,
          subjectId: annualGrade.subjectId,
          academicYearId: annualGrade.academicYearId,
        },
      });

      return annualGrade;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'ANNUAL_GRADE_CREATE_FAILED',
        resource: 'annual-grades',
        status: AuditStatus.FAILURE,
        details: {
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          academicYearId: payload.academicYearId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListAnnualGradesDto, actorUserId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AnnualGradeWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      subjectId: query.subjectId,
      studentEnrollmentId: query.studentEnrollmentId,
      finalStatusId: query.finalStatusId,
      status: query.status,
      isLocked: query.isLocked,
      isActive: query.isActive,
      studentEnrollment: {
        sectionId: query.sectionId,
        studentId: query.studentId,
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
              subject: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              subject: {
                code: {
                  contains: query.search,
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

    const scope = await this.dataScopeService.getSectionSubjectYearGrants({
      actorUserId,
      capability: 'MANAGE_GRADES',
      academicYearId: query.academicYearId,
    });

    if (!scope.isPrivileged) {
      if (scope.grants.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }

      const scopedOr: Prisma.AnnualGradeWhereInput[] = scope.grants.map(
        (grant) => ({
          academicYearId: grant.academicYearId,
          subjectId: grant.subjectId,
          studentEnrollment: {
            sectionId: grant.sectionId,
          },
        }),
      );

      where.AND = [
        {
          OR: scopedOr,
        },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.annualGrade.count({ where }),
      this.prisma.annualGrade.findMany({
        where,
        include: annualGradeInclude,
        orderBy: [
          {
            academicYear: {
              startDate: 'desc',
            },
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

  async findOne(id: string, actorUserId: string) {
    const annualGrade = await this.prisma.annualGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: annualGradeInclude,
    });

    if (!annualGrade) {
      throw new NotFoundException('لم يتم العثور على الدرجة السنوية');
    }

    const sectionId = this.requireAssignedSectionId(
      annualGrade.studentEnrollment.sectionId,
      'لا يمكن عرض الدرجة السنوية لقيد غير موزع على شعبة بعد. وزّع الطالب على شعبة أولًا ثم أعد المحاولة.',
    );

    await this.ensureActorAuthorized(
      actorUserId,
      sectionId,
      annualGrade.subject.id,
      annualGrade.academicYear.id,
    );

    return annualGrade;
  }

  async update(id: string, payload: UpdateAnnualGradeDto, actorUserId: string) {
    const existing = await this.ensureAnnualGradeExists(id);

    if (existing.isLocked) {
      throw new ConflictException('لا يمكن تعديل درجة سنوية مقفلة');
    }

    if (
      payload.studentEnrollmentId !== undefined ||
      payload.subjectId !== undefined ||
      payload.academicYearId !== undefined
    ) {
      throw new BadRequestException(
        'لا يمكن تعديل studentEnrollmentId وsubjectId وacademicYearId',
      );
    }

    const context = await this.ensureAnnualGradeContext(id);
    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (payload.finalStatusId) {
      await this.ensureAnnualStatusExists(payload.finalStatusId);
    }

    const resolvedTotals = await this.resolveAnnualTotals({
      academicYearId: existing.academicYearId,
      termTotals: payload.termTotals,
      semester1Total: payload.semester1Total,
      semester2Total: payload.semester2Total,
      fallbackSemester1: this.decimalToNumber(existing.semester1Total) ?? 0,
      fallbackSemester2: this.decimalToNumber(existing.semester2Total) ?? 0,
    });
    const annualPercentage =
      payload.annualPercentage ??
      (await this.computeAnnualPercentage(
        existing.academicYearId,
        context.gradeLevelId,
        existing.subjectId,
        context.sectionId,
        resolvedTotals.annualTotal,
      ));

    if (annualPercentage !== null) {
      this.validateScore(annualPercentage, 'annualPercentage');
    }

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

    const annualGrade = await this.prisma.annualGrade.update({
      where: {
        id,
      },
      data: {
        semester1Total: resolvedTotals.semester1Total,
        semester2Total: resolvedTotals.semester2Total,
        annualTotal: resolvedTotals.annualTotal,
        annualPercentage,
        finalStatusId: payload.finalStatusId,
        status: payload.status,
        notes: payload.notes?.trim(),
        isActive: payload.isActive,
        calculatedAt: new Date(),
        updatedById: actorUserId,
        ...lockData,
      },
      include: annualGradeInclude,
    });

    if (payload.termTotals !== undefined) {
      await this.syncAnnualGradeTerms(
        annualGrade.id,
        resolvedTotals.termTotals,
        actorUserId,
        new Date(),
      );
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'ANNUAL_GRADE_UPDATE',
      resource: 'annual-grades',
      resourceId: id,
      details: payload as Prisma.InputJsonValue,
    });

    return annualGrade;
  }

  async lock(id: string, actorUserId: string) {
    const existing = await this.ensureAnnualGradeExists(id);
    const context = await this.ensureAnnualGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (existing.isLocked) {
      throw new ConflictException('الدرجة السنوية مقفلة بالفعل');
    }

    const annualGrade = await this.prisma.annualGrade.update({
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
      include: annualGradeInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ANNUAL_GRADE_LOCK',
      resource: 'annual-grades',
      resourceId: id,
    });

    return annualGrade;
  }

  async unlock(id: string, actorUserId: string) {
    const existing = await this.ensureAnnualGradeExists(id);
    const context = await this.ensureAnnualGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (!existing.isLocked) {
      throw new ConflictException('الدرجة السنوية غير مقفلة');
    }

    const annualGrade = await this.prisma.annualGrade.update({
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
      include: annualGradeInclude,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'ANNUAL_GRADE_UNLOCK',
      resource: 'annual-grades',
      resourceId: id,
    });

    return annualGrade;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureAnnualGradeExists(id);
    const context = await this.ensureAnnualGradeContext(id);

    await this.ensureActorAuthorized(
      actorUserId,
      context.sectionId,
      existing.subjectId,
      existing.academicYearId,
    );

    if (existing.isLocked) {
      throw new ConflictException('لا يمكن حذف درجة سنوية مقفلة');
    }

    await this.prisma.annualGrade.update({
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
      action: 'ANNUAL_GRADE_DELETE',
      resource: 'annual-grades',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEnrollmentContext(
    studentEnrollmentId: string,
    subjectId: string,
    academicYearId: string,
  ): Promise<AnnualGradeContext> {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id: studentEnrollmentId,
        deletedAt: null,
      },
      select: {
        id: true,
        academicYearId: true,
        gradeLevelId: true,
        sectionId: true,
        isActive: true,
        section: {
          select: {
            id: true,
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
    const section = enrollment.section;
    const gradeLevelId = this.resolveEnrollmentGradeLevelId(
      enrollment.gradeLevelId,
      section?.gradeLevelId,
    );

    if (!gradeLevelId) {
      throw new BadRequestException('تعذر تحديد الصف المرتبط بالقيد');
    }

    if (!section) {
      throw new BadRequestException(
        'لا يمكن احتساب درجة سنوية لقيد غير موزع على شعبة بعد. وزّع الطالب على شعبة أولًا ثم أعد المحاولة.',
      );
    }
    if (!section.isActive) {
      throw new BadRequestException('شعبة القيد غير نشطة');
    }
    if (enrollment.academicYearId !== academicYearId) {
      throw new BadRequestException(
        'السنة الدراسية للقيد لا تطابق السنة المرسلة',
      );
    }

    await this.ensureSubjectExistsAndActive(subjectId);

    const subjectMapped = await this.prisma.gradeLevelSubject.count({
      where: {
        academicYearId,
        gradeLevelId,
        subjectId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (subjectMapped === 0) {
      throw new BadRequestException(
        'المادة غير مهيأة لهذا الصف وهذه السنة الدراسية',
      );
    }

    return {
      sectionId: section.id,
      gradeLevelId,
      academicYearId,
    };
  }

  private async ensureAnnualGradeContext(
    id: string,
  ): Promise<AnnualGradeContext> {
    const annualGrade = await this.prisma.annualGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        academicYearId: true,
        studentEnrollment: {
          select: {
            gradeLevelId: true,
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

    if (!annualGrade) {
      throw new NotFoundException('لم يتم العثور على الدرجة السنوية');
    }

    const sectionId = this.requireAssignedSectionId(
      annualGrade.studentEnrollment.sectionId,
      'لا يمكن استخدام درجة سنوية لقيد غير موزع على شعبة بعد. وزّع الطالب على شعبة أولًا ثم أعد المحاولة.',
    );
    const gradeLevelId = this.resolveEnrollmentGradeLevelId(
      annualGrade.studentEnrollment.gradeLevelId,
      annualGrade.studentEnrollment.section?.gradeLevelId,
    );

    if (!gradeLevelId) {
      throw new BadRequestException('تعذر تحديد الصف المرتبط بالقيد');
    }

    return {
      sectionId,
      gradeLevelId,
      academicYearId: annualGrade.academicYearId,
    };
  }

  private async ensureAnnualGradeExists(id: string): Promise<AnnualGrade> {
    const annualGrade = await this.prisma.annualGrade.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!annualGrade) {
      throw new NotFoundException('لم يتم العثور على الدرجة السنوية');
    }

    return annualGrade;
  }

  private async ensureAnnualStatusExists(finalStatusId: string) {
    const status = await this.prisma.annualStatusLookup.findFirst({
      where: {
        id: finalStatusId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!status) {
      throw new BadRequestException(
        'الحالة السنوية غير صالحة أو محذوفة أو غير نشطة',
      );
    }
  }

  private requireAssignedSectionId(sectionId: string | null, message: string) {
    if (!sectionId) {
      throw new BadRequestException(message);
    }

    return sectionId;
  }

  private resolveEnrollmentGradeLevelId(
    enrollmentGradeLevelId: string | null | undefined,
    sectionGradeLevelId: string | null | undefined,
  ) {
    return enrollmentGradeLevelId ?? sectionGradeLevelId ?? null;
  }

  private async ensureSubjectExistsAndActive(subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!subject) {
      throw new BadRequestException('المادة غير صالحة أو محذوفة');
    }
    if (!subject.isActive) {
      throw new BadRequestException('المادة غير نشطة');
    }
  }

  private async computeAnnualPercentage(
    academicYearId: string,
    gradeLevelId: string,
    subjectId: string,
    sectionId: string,
    annualTotal: number,
  ): Promise<number | null> {
    let policy;
    try {
      policy = await this.policyResolver.resolvePolicy({
        academicYearId,
        gradeLevelId,
        subjectId,
        assessmentType: AssessmentType.MONTHLY,
        sectionId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }

      throw error;
    }

    const componentTotal = policy.components
      .filter((component) => component.includeInSemester)
      .reduce((sum, component) => {
        return sum + (this.decimalToNumber(component.maxScore) ?? 0);
      }, 0);
    const oneSemesterMax =
      componentTotal > 0
        ? componentTotal
        : (this.decimalToNumber(policy.totalMaxScore) ?? 100);

    const termCount = await this.resolveTermCount(academicYearId);
    if (termCount === 0) {
      return null;
    }

    const annualMax = oneSemesterMax * termCount;
    if (annualMax <= 0) {
      return null;
    }

    return this.round2((annualTotal / annualMax) * 100);
  }


  private computeAnnualTotal(semester1Total: number, semester2Total: number) {
    return this.round2(semester1Total + semester2Total);
  }

  private async resolveAnnualTotals(params: {
    academicYearId: string;
    termTotals?: AnnualGradeTermInput[];
    semester1Total?: number;
    semester2Total?: number;
    fallbackSemester1?: number;
    fallbackSemester2?: number;
  }): Promise<ResolvedAnnualTotals> {
    if (params.termTotals !== undefined) {
      const termTotals = params.termTotals ?? [];
      const termIds = termTotals.map((term) => term.academicTermId);
      const uniqueTermIds = new Set(termIds);
      if (uniqueTermIds.size !== termIds.length) {
        throw new BadRequestException('لا يمكن تكرار نفس الفصل في المجموع السنوي');
      }

      if (termIds.length === 0) {
        return {
          semester1Total: 0,
          semester2Total: 0,
          annualTotal: 0,
          termTotals: [],
        };
      }

      const terms = await this.prisma.academicTerm.findMany({
        where: {
          id: {
            in: termIds,
          },
          academicYearId: params.academicYearId,
          deletedAt: null,
        },
        select: {
          id: true,
          sequence: true,
          isActive: true,
        },
      });

      if (terms.length !== termIds.length) {
        throw new BadRequestException('أحد الفصول غير صالح أو غير تابع للسنة');
      }
      if (terms.some((term) => !term.isActive)) {
        throw new BadRequestException('أحد الفصول غير نشط');
      }

      const sequenceById = new Map(
        terms.map((term) => [term.id, term.sequence] as const),
      );
      const resolvedTermTotals = termTotals.map((term) => {
        this.validateScore(term.termTotal, 'termTotal');
        return {
          academicTermId: term.academicTermId,
          sequence: sequenceById.get(term.academicTermId) ?? 0,
          termTotal: term.termTotal,
        };
      });

      const semester1Total = this.round2(
        resolvedTermTotals.find((term) => term.sequence === 1)?.termTotal ?? 0,
      );
      const semester2Total = this.round2(
        resolvedTermTotals.find((term) => term.sequence === 2)?.termTotal ?? 0,
      );
      const annualTotal = this.round2(
        resolvedTermTotals.reduce((sum, term) => sum + term.termTotal, 0),
      );

      return {
        semester1Total,
        semester2Total,
        annualTotal,
        termTotals: resolvedTermTotals,
      };
    }

    const semester1Total = params.semester1Total ?? params.fallbackSemester1 ?? 0;
    const semester2Total = params.semester2Total ?? params.fallbackSemester2 ?? 0;
    this.validateScore(semester1Total, 'semester1Total');
    this.validateScore(semester2Total, 'semester2Total');

    return {
      semester1Total,
      semester2Total,
      annualTotal: this.computeAnnualTotal(semester1Total, semester2Total),
      termTotals: [],
    };
  }

  private async syncAnnualGradeTerms(
    annualGradeId: string,
    termTotals: ResolvedAnnualTotals['termTotals'],
    actorUserId: string,
    now: Date,
  ) {
    if (termTotals.length === 0) {
      await this.prisma.annualGradeTerm.updateMany({
        where: {
          annualGradeId,
          deletedAt: null,
        },
        data: {
          isActive: false,
          deletedAt: now,
          updatedById: actorUserId,
        },
      });
      return;
    }

    for (const term of termTotals) {
      await this.prisma.annualGradeTerm.upsert({
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
    await this.prisma.annualGradeTerm.updateMany({
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

  private validateScore(value: number, fieldName: string) {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `يجب أن تكون قيمة ${fieldName} رقمًا غير سالب`,
      );
    }
  }

  private async ensureActorAuthorized(
    actorUserId: string,
    sectionId: string,
    subjectId: string,
    academicYearId: string,
  ) {
    await this.dataScopeService.ensureCanManageSectionSubjectYear({
      actorUserId,
      sectionId,
      subjectId,
      academicYearId,
      capability: 'MANAGE_GRADES',
    });
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
        'الدرجة السنوية موجودة مسبقًا لهذا القيد والمادة والسنة',
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

