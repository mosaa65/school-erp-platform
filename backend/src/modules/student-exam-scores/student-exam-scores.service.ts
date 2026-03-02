import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  ExamAbsenceType,
  Prisma,
  StudentExamScore,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateStudentExamScoreDto } from './dto/create-student-exam-score.dto';
import { ListStudentExamScoresDto } from './dto/list-student-exam-scores.dto';
import { UpdateStudentExamScoreDto } from './dto/update-student-exam-score.dto';

const studentExamScoreInclude: Prisma.StudentExamScoreInclude = {
  examAssessment: {
    select: {
      id: true,
      title: true,
      examDate: true,
      maxScore: true,
      sectionId: true,
      subjectId: true,
      examPeriod: {
        select: {
          id: true,
          name: true,
          assessmentType: true,
          status: true,
          isLocked: true,
          academicYearId: true,
        },
      },
      section: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
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
    },
  },
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
};

type AssessmentContext = {
  id: string;
  sectionId: string;
  subjectId: string;
  maxScore: number;
  isLocked: boolean;
  academicYearId: string;
};

type EnrollmentContext = {
  id: string;
  sectionId: string;
  academicYearId: string;
  isActive: boolean;
};

type NormalizedScorePayload = {
  score: number;
  isPresent: boolean;
  absenceType: ExamAbsenceType | null;
  excuseDetails: string | null;
};

@Injectable()
export class StudentExamScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateStudentExamScoreDto, actorUserId: string) {
    const assessment = await this.ensureAssessmentExistsAndMutable(
      payload.examAssessmentId,
    );
    const enrollment = await this.ensureEnrollmentExistsAndActive(
      payload.studentEnrollmentId,
    );
    this.ensureEnrollmentMatchesAssessment(enrollment, assessment);
    await this.ensureActorAuthorized(
      actorUserId,
      assessment.sectionId,
      assessment.subjectId,
      assessment.academicYearId,
    );

    const normalizedPayload = this.normalizeScorePayload(
      payload.score,
      payload.isPresent,
      payload.absenceType,
      payload.excuseDetails,
      assessment.maxScore,
    );

    try {
      const studentExamScore = await this.prisma.studentExamScore.create({
        data: {
          examAssessmentId: payload.examAssessmentId,
          studentEnrollmentId: payload.studentEnrollmentId,
          score: normalizedPayload.score,
          isPresent: normalizedPayload.isPresent,
          absenceType: normalizedPayload.absenceType,
          excuseDetails: normalizedPayload.excuseDetails,
          teacherNotes: payload.teacherNotes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentExamScoreInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_EXAM_SCORE_CREATE',
        resource: 'student-exam-scores',
        resourceId: studentExamScore.id,
        details: {
          examAssessmentId: studentExamScore.examAssessmentId,
          studentEnrollmentId: studentExamScore.studentEnrollmentId,
          isPresent: studentExamScore.isPresent,
          score: studentExamScore.score,
        },
      });

      return studentExamScore;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_EXAM_SCORE_CREATE_FAILED',
        resource: 'student-exam-scores',
        status: AuditStatus.FAILURE,
        details: {
          examAssessmentId: payload.examAssessmentId,
          studentEnrollmentId: payload.studentEnrollmentId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentExamScoresDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentExamScoreWhereInput = {
      deletedAt: null,
      examAssessmentId: query.examAssessmentId,
      studentEnrollmentId: query.studentEnrollmentId,
      isPresent: query.isPresent,
      absenceType: query.absenceType,
      isActive: query.isActive,
      examAssessment: query.examPeriodId
        ? {
            examPeriodId: query.examPeriodId,
          }
        : undefined,
      studentEnrollment: query.studentId
        ? {
            studentId: query.studentId,
          }
        : undefined,
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
              examAssessment: {
                title: {
                  contains: query.search,
                },
              },
            },
            {
              teacherNotes: {
                contains: query.search,
              },
            },
            {
              excuseDetails: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentExamScore.count({ where }),
      this.prisma.studentExamScore.findMany({
        where,
        include: studentExamScoreInclude,
        orderBy: [
          {
            examAssessment: {
              examDate: 'desc',
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
    const studentExamScore = await this.prisma.studentExamScore.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentExamScoreInclude,
    });

    if (!studentExamScore) {
      throw new NotFoundException('Student exam score not found');
    }

    return studentExamScore;
  }

  async update(
    id: string,
    payload: UpdateStudentExamScoreDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureStudentExamScoreExists(id);

    await this.ensureAssessmentNotLocked(existing.examAssessmentId);

    const resolvedExamAssessmentId =
      payload.examAssessmentId ?? existing.examAssessmentId;
    const resolvedStudentEnrollmentId =
      payload.studentEnrollmentId ?? existing.studentEnrollmentId;

    const assessment = await this.ensureAssessmentExistsAndMutable(
      resolvedExamAssessmentId,
    );
    const enrollment = await this.ensureEnrollmentExistsAndActive(
      resolvedStudentEnrollmentId,
    );

    this.ensureEnrollmentMatchesAssessment(enrollment, assessment);
    await this.ensureActorAuthorized(
      actorUserId,
      assessment.sectionId,
      assessment.subjectId,
      assessment.academicYearId,
    );

    const normalizedPayload = this.normalizeScorePayload(
      payload.score ?? Number(existing.score),
      payload.isPresent ?? existing.isPresent,
      payload.absenceType ?? existing.absenceType,
      payload.excuseDetails ?? existing.excuseDetails,
      assessment.maxScore,
    );

    try {
      const studentExamScore = await this.prisma.studentExamScore.update({
        where: {
          id,
        },
        data: {
          examAssessmentId: payload.examAssessmentId,
          studentEnrollmentId: payload.studentEnrollmentId,
          score: normalizedPayload.score,
          isPresent: normalizedPayload.isPresent,
          absenceType: normalizedPayload.absenceType,
          excuseDetails: normalizedPayload.excuseDetails,
          teacherNotes: payload.teacherNotes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: studentExamScoreInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_EXAM_SCORE_UPDATE',
        resource: 'student-exam-scores',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return studentExamScore;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.ensureStudentExamScoreExists(id);

    await this.ensureAssessmentNotLocked(existing.examAssessmentId);

    const assessment = await this.ensureAssessmentExists(
      existing.examAssessmentId,
    );
    await this.ensureActorAuthorized(
      actorUserId,
      assessment.sectionId,
      assessment.subjectId,
      assessment.academicYearId,
    );

    await this.prisma.studentExamScore.update({
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
      action: 'STUDENT_EXAM_SCORE_DELETE',
      resource: 'student-exam-scores',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureStudentExamScoreExists(
    id: string,
  ): Promise<StudentExamScore> {
    const studentExamScore = await this.prisma.studentExamScore.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!studentExamScore) {
      throw new NotFoundException('Student exam score not found');
    }

    return studentExamScore;
  }

  private async ensureAssessmentExists(id: string): Promise<AssessmentContext> {
    const assessment = await this.prisma.examAssessment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        sectionId: true,
        subjectId: true,
        maxScore: true,
        examPeriod: {
          select: {
            isLocked: true,
            academicYearId: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new BadRequestException('Exam assessment is invalid or deleted');
    }

    return {
      id: assessment.id,
      sectionId: assessment.sectionId,
      subjectId: assessment.subjectId,
      maxScore: Number(assessment.maxScore),
      isLocked: assessment.examPeriod.isLocked,
      academicYearId: assessment.examPeriod.academicYearId,
    };
  }

  private async ensureAssessmentExistsAndMutable(
    id: string,
  ): Promise<AssessmentContext> {
    const assessment = await this.ensureAssessmentExists(id);

    if (assessment.isLocked) {
      throw new ConflictException(
        'Cannot modify student scores for a locked exam period',
      );
    }

    return assessment;
  }

  private async ensureAssessmentNotLocked(id: string) {
    const assessment = await this.ensureAssessmentExists(id);

    if (assessment.isLocked) {
      throw new ConflictException(
        'Cannot modify student scores for a locked exam period',
      );
    }
  }

  private async ensureEnrollmentExistsAndActive(
    id: string,
  ): Promise<EnrollmentContext> {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        sectionId: true,
        academicYearId: true,
        isActive: true,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('Student enrollment is invalid or deleted');
    }

    if (!enrollment.isActive) {
      throw new BadRequestException('Student enrollment is inactive');
    }

    return enrollment;
  }

  private ensureEnrollmentMatchesAssessment(
    enrollment: EnrollmentContext,
    assessment: AssessmentContext,
  ) {
    if (enrollment.sectionId !== assessment.sectionId) {
      throw new BadRequestException(
        'Student enrollment section does not match the exam assessment section',
      );
    }

    if (enrollment.academicYearId !== assessment.academicYearId) {
      throw new BadRequestException(
        'Student enrollment academic year does not match the exam period academic year',
      );
    }
  }

  private async ensureActorAuthorized(
    actorUserId: string,
    sectionId: string,
    subjectId: string,
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
      throw new ForbiddenException('Authenticated user is not active');
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
          subjectId,
          academicYearId,
          deletedAt: null,
          isActive: true,
        },
      },
    );

    if (assignmentsCount === 0) {
      throw new ForbiddenException(
        'You are not assigned to this subject and section for the selected academic year',
      );
    }
  }

  private normalizeScorePayload(
    scoreInput: number | undefined,
    isPresentInput: boolean | undefined,
    absenceTypeInput: ExamAbsenceType | null | undefined,
    excuseDetailsInput: string | null | undefined,
    maxScore: number,
  ): NormalizedScorePayload {
    const isPresent = isPresentInput ?? true;
    let score = scoreInput ?? 0;
    let absenceType: ExamAbsenceType | null = absenceTypeInput ?? null;
    let excuseDetails = excuseDetailsInput ?? null;

    if (isPresent) {
      if (score < 0 || score > maxScore) {
        throw new BadRequestException(
          `score must be between 0 and ${maxScore} for this assessment`,
        );
      }

      absenceType = null;
      excuseDetails = null;
    } else {
      score = 0;
      absenceType = absenceType ?? ExamAbsenceType.UNEXCUSED;
    }

    return {
      score,
      isPresent,
      absenceType,
      excuseDetails,
    };
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Student score already exists for this assessment and enrollment',
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
}
