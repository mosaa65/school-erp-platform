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
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DataScopeService } from '../data-scope/data-scope.service';
import { CreateAnnualGradeDto } from './dto/create-annual-grade.dto';
import { ListAnnualGradesDto } from './dto/list-annual-grades.dto';
import { UpdateAnnualGradeDto } from './dto/update-annual-grade.dto';

type AnnualGradeContext = {
  sectionId: string;
  gradeLevelId: string;
  academicYearId: string;
};

const annualGradeInclude: Prisma.AnnualGradeInclude = {
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
};

@Injectable()
export class AnnualGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
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

    const semester1Total = payload.semester1Total ?? 0;
    const semester2Total = payload.semester2Total ?? 0;
    this.validateScore(semester1Total, 'semester1Total');
    this.validateScore(semester2Total, 'semester2Total');

    const annualTotal = this.computeAnnualTotal(semester1Total, semester2Total);
    const annualPercentage =
      payload.annualPercentage ??
      (await this.computeAnnualPercentage(
        context.academicYearId,
        context.gradeLevelId,
        payload.subjectId,
        annualTotal,
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
          semester1Total,
          semester2Total,
          annualTotal,
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

    await this.ensureActorAuthorized(
      actorUserId,
      annualGrade.studentEnrollment.sectionId,
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

    const semester1Total =
      payload.semester1Total ??
      this.decimalToNumber(existing.semester1Total) ??
      0;
    const semester2Total =
      payload.semester2Total ??
      this.decimalToNumber(existing.semester2Total) ??
      0;
    this.validateScore(semester1Total, 'semester1Total');
    this.validateScore(semester2Total, 'semester2Total');

    const annualTotal = this.computeAnnualTotal(semester1Total, semester2Total);
    const annualPercentage =
      payload.annualPercentage ??
      (await this.computeAnnualPercentage(
        existing.academicYearId,
        context.gradeLevelId,
        existing.subjectId,
        annualTotal,
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
        semester1Total,
        semester2Total,
        annualTotal,
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
        sectionId: true,
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
        'Student enrollment academic year does not match payload academic year',
      );
    }

    await this.ensureSubjectExistsAndActive(subjectId);

    const subjectMapped = await this.prisma.gradeLevelSubject.count({
      where: {
        academicYearId,
        gradeLevelId: enrollment.section.gradeLevelId,
        subjectId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (subjectMapped === 0) {
      throw new BadRequestException(
        'Subject is not configured for this grade level and academic year',
      );
    }

    return {
      sectionId: enrollment.sectionId,
      gradeLevelId: enrollment.section.gradeLevelId,
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

    return {
      sectionId: annualGrade.studentEnrollment.sectionId,
      gradeLevelId: annualGrade.studentEnrollment.section.gradeLevelId,
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
    annualTotal: number,
  ): Promise<number | null> {
    const approvedPolicy = await this.prisma.gradingPolicy.findFirst({
      where: {
        academicYearId,
        gradeLevelId,
        subjectId,
        assessmentType: AssessmentType.MONTHLY,
        status: GradingWorkflowStatus.APPROVED,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        maxExamScore: true,
        maxHomeworkScore: true,
        maxAttendanceScore: true,
        maxActivityScore: true,
        maxContributionScore: true,
      },
    });

    const policy =
      approvedPolicy ??
      (await this.prisma.gradingPolicy.findFirst({
        where: {
          academicYearId,
          gradeLevelId,
          subjectId,
          assessmentType: AssessmentType.MONTHLY,
          isActive: true,
          deletedAt: null,
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          maxExamScore: true,
          maxHomeworkScore: true,
          maxAttendanceScore: true,
          maxActivityScore: true,
          maxContributionScore: true,
        },
      }));

    if (!policy) {
      return null;
    }

    const customComponents = await this.prisma.gradingPolicyComponent.aggregate(
      {
        where: {
          gradingPolicyId: policy.id,
          includeInSemester: true,
          deletedAt: null,
          isActive: true,
        },
        _sum: {
          maxScore: true,
        },
      },
    );

    const oneSemesterMax =
      (this.decimalToNumber(policy.maxExamScore) ?? 0) +
      (this.decimalToNumber(policy.maxHomeworkScore) ?? 0) +
      (this.decimalToNumber(policy.maxAttendanceScore) ?? 0) +
      (this.decimalToNumber(policy.maxActivityScore) ?? 0) +
      (this.decimalToNumber(policy.maxContributionScore) ?? 0) +
      (this.decimalToNumber(customComponents._sum.maxScore) ?? 0);

    const annualMax = oneSemesterMax * 2;
    if (annualMax <= 0) {
      return null;
    }

    return this.round2((annualTotal / annualMax) * 100);
  }

  private computeAnnualTotal(semester1Total: number, semester2Total: number) {
    return this.round2(semester1Total + semester2Total);
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
