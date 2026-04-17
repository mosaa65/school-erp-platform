import { randomUUID } from 'crypto';
import {
  GradingWorkflowStatus,
  Prisma,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculateStudentPeriodResultsDto } from '../assessment-periods/student-period-results/dto/calculate-student-period-results.dto';
import { CreateStudentPeriodResultDto } from '../assessment-periods/student-period-results/dto/create-student-period-result.dto';
import { ListStudentPeriodResultsDto } from '../assessment-periods/student-period-results/dto/list-student-period-results.dto';
import { UpdateStudentPeriodResultDto } from '../assessment-periods/student-period-results/dto/update-student-period-result.dto';

type MonthlyResultRow = {
  id: string;
  assessmentPeriodId: string;
  studentEnrollmentId: string;
  subjectId: string;
  academicYearId: string;
  academicTermId: string;
  academicMonthId: string;
  termSubjectOfferingId: string | null;
  sectionId: string | null;
  totalScore: Prisma.Decimal | number | string;
  status: GradingWorkflowStatus;
  isLocked: boolean;
  lockedAt: Date | null;
  lockedByUserId: string | null;
  calculatedAt: Date | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  periodName: string;
  periodStatus: string;
  periodMaxScore: Prisma.Decimal | number | string;
  yearCode: string;
  yearName: string;
  yearStatus: string;
  yearIsCurrent: boolean;
  termCode: string;
  termName: string;
  termSequence: number;
  termIsActive: boolean;
  monthCode: string;
  monthName: string;
  monthSequence: number;
  monthIsActive: boolean;
  studentId: string;
  studentAdmissionNo: string;
  studentFullName: string;
  studentIsActive: boolean;
  enrollmentSectionId: string | null;
  enrollmentStatus: string;
  enrollmentIsActive: boolean;
  sectionCode: string | null;
  sectionName: string | null;
  sectionIsActive: boolean | null;
  subjectCode: string;
  subjectName: string;
  subjectIsActive: boolean;
  termSubjectOfferingAcademicTermId: string | null;
  termSubjectOfferingGradeLevelSubjectId: string | null;
  termSubjectOfferingSubjectId: string | null;
  termSubjectOfferingGradeLevelId: string | null;
  createdByEmail: string | null;
  updatedByEmail: string | null;
  lockedByEmail: string | null;
  componentCount: bigint | number;
};

@Injectable()
export class MonthlyStudentResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateStudentPeriodResultDto, actorUserId: string) {
    const period = await this.getMonthlyPeriod(payload.assessmentPeriodId);
    const enrollment = await this.getEnrollment(payload.studentEnrollmentId);
    await this.ensureSubject(payload.subjectId);

    if (period.isLocked) {
      throw new BadRequestException('Cannot create results inside a locked monthly period');
    }

    if (enrollment.academicYearId !== period.academicYearId) {
      throw new BadRequestException('Student enrollment does not belong to the same academic year');
    }

    const id = randomUUID();

    await this.prisma.$executeRaw`
      INSERT INTO monthly_student_results (
        id,
        monthly_assessment_period_id,
        student_enrollment_id,
        subject_id,
        academic_year_id,
        academic_term_id,
        academic_month_id,
        term_subject_offering_id,
        section_id,
        total_score,
        status,
        is_locked,
        notes,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      ) VALUES (
        ${id},
        ${payload.assessmentPeriodId},
        ${payload.studentEnrollmentId},
        ${payload.subjectId},
        ${period.academicYearId},
        ${period.academicTermId},
        ${period.academicMonthId},
        ${payload.termSubjectOfferingId ?? null},
        ${enrollment.sectionId ?? null},
        0,
        ${payload.status ?? GradingWorkflowStatus.DRAFT},
        false,
        ${payload.notes?.trim() ?? null},
        ${payload.isActive ?? true},
        NOW(),
        NOW(),
        ${actorUserId},
        ${actorUserId}
      )
    `;

    return this.findOne(id);
  }

  async findAll(query: ListStudentPeriodResultsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const where = this.buildWhere(query);
    const whereSql = Prisma.join(where, Prisma.sql` AND `);

    const [items, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<MonthlyResultRow[]>(Prisma.sql`
        SELECT
          r.id,
          r.monthly_assessment_period_id AS assessmentPeriodId,
          r.student_enrollment_id AS studentEnrollmentId,
          r.subject_id AS subjectId,
          r.academic_year_id AS academicYearId,
          r.academic_term_id AS academicTermId,
          r.academic_month_id AS academicMonthId,
          r.term_subject_offering_id AS termSubjectOfferingId,
          r.section_id AS sectionId,
          r.total_score AS totalScore,
          r.status,
          r.is_locked AS isLocked,
          r.locked_at AS lockedAt,
          r.locked_by_user_id AS lockedByUserId,
          r.calculated_at AS calculatedAt,
          r.notes,
          r.is_active AS isActive,
          r.created_at AS createdAt,
          r.updated_at AS updatedAt,
          r.created_by AS createdById,
          r.updated_by AS updatedById,
          p.name AS periodName,
          p.status AS periodStatus,
          p.max_score AS periodMaxScore,
          ay.code AS yearCode,
          ay.name AS yearName,
          ay.status AS yearStatus,
          ay.is_current AS yearIsCurrent,
          at.code AS termCode,
          at.name AS termName,
          at.sequence AS termSequence,
          at.is_active AS termIsActive,
          am.code AS monthCode,
          am.name AS monthName,
          am.sequence AS monthSequence,
          am.is_active AS monthIsActive,
          s.id AS studentId,
          s.admission_no AS studentAdmissionNo,
          s.full_name AS studentFullName,
          s.is_active AS studentIsActive,
          e.section_id AS enrollmentSectionId,
          e.status AS enrollmentStatus,
          e.is_active AS enrollmentIsActive,
          sec.code AS sectionCode,
          sec.name AS sectionName,
          sec.is_active AS sectionIsActive,
          sub.code AS subjectCode,
          sub.name AS subjectName,
          sub.is_active AS subjectIsActive,
          tso.academic_term_id AS termSubjectOfferingAcademicTermId,
          tso.grade_level_subject_id AS termSubjectOfferingGradeLevelSubjectId,
          gls.subject_id AS termSubjectOfferingSubjectId,
          gls.grade_level_id AS termSubjectOfferingGradeLevelId,
          cu.email AS createdByEmail,
          uu.email AS updatedByEmail,
          lu.email AS lockedByEmail,
          (
            SELECT COUNT(*)
            FROM monthly_student_component_scores sc
            WHERE sc.monthly_student_result_id = r.id
              AND sc.deleted_at IS NULL
          ) AS componentCount
        FROM monthly_student_results r
        INNER JOIN monthly_assessment_periods p ON p.id = r.monthly_assessment_period_id
        INNER JOIN academic_years ay ON ay.id = r.academic_year_id
        INNER JOIN academic_terms at ON at.id = r.academic_term_id
        INNER JOIN academic_months am ON am.id = r.academic_month_id
        INNER JOIN student_enrollments e ON e.id = r.student_enrollment_id
        INNER JOIN students s ON s.id = e.student_id
        LEFT JOIN sections sec ON sec.id = e.section_id
        INNER JOIN subjects sub ON sub.id = r.subject_id
        LEFT JOIN term_subject_offerings tso ON tso.id = r.term_subject_offering_id
        LEFT JOIN grade_level_subjects gls ON gls.id = tso.grade_level_subject_id
        LEFT JOIN users cu ON cu.id = r.created_by
        LEFT JOIN users uu ON uu.id = r.updated_by
        LEFT JOIN users lu ON lu.id = r.locked_by_user_id
        WHERE ${whereSql}
        ORDER BY r.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM monthly_student_results r
        INNER JOIN monthly_assessment_periods p ON p.id = r.monthly_assessment_period_id
        INNER JOIN student_enrollments e ON e.id = r.student_enrollment_id
        INNER JOIN students s ON s.id = e.student_id
        INNER JOIN subjects sub ON sub.id = r.subject_id
        INNER JOIN academic_years ay ON ay.id = r.academic_year_id
        INNER JOIN academic_terms at ON at.id = r.academic_term_id
        INNER JOIN academic_months am ON am.id = r.academic_month_id
        WHERE ${whereSql}
      `),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return {
      data: items.map((item) => this.mapResult(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<MonthlyResultRow[]>(Prisma.sql`
      SELECT
        r.id,
        r.monthly_assessment_period_id AS assessmentPeriodId,
        r.student_enrollment_id AS studentEnrollmentId,
        r.subject_id AS subjectId,
        r.academic_year_id AS academicYearId,
        r.academic_term_id AS academicTermId,
        r.academic_month_id AS academicMonthId,
        r.term_subject_offering_id AS termSubjectOfferingId,
        r.section_id AS sectionId,
        r.total_score AS totalScore,
        r.status,
        r.is_locked AS isLocked,
        r.locked_at AS lockedAt,
        r.locked_by_user_id AS lockedByUserId,
        r.calculated_at AS calculatedAt,
        r.notes,
        r.is_active AS isActive,
        r.created_at AS createdAt,
        r.updated_at AS updatedAt,
        r.created_by AS createdById,
        r.updated_by AS updatedById,
        p.name AS periodName,
        p.status AS periodStatus,
        p.max_score AS periodMaxScore,
        ay.code AS yearCode,
        ay.name AS yearName,
        ay.status AS yearStatus,
        ay.is_current AS yearIsCurrent,
        at.code AS termCode,
        at.name AS termName,
        at.sequence AS termSequence,
        at.is_active AS termIsActive,
        am.code AS monthCode,
        am.name AS monthName,
        am.sequence AS monthSequence,
        am.is_active AS monthIsActive,
        s.id AS studentId,
        s.admission_no AS studentAdmissionNo,
        s.full_name AS studentFullName,
        s.is_active AS studentIsActive,
        e.section_id AS enrollmentSectionId,
        e.status AS enrollmentStatus,
        e.is_active AS enrollmentIsActive,
        sec.code AS sectionCode,
        sec.name AS sectionName,
        sec.is_active AS sectionIsActive,
        sub.code AS subjectCode,
        sub.name AS subjectName,
        sub.is_active AS subjectIsActive,
        tso.academic_term_id AS termSubjectOfferingAcademicTermId,
        tso.grade_level_subject_id AS termSubjectOfferingGradeLevelSubjectId,
        gls.subject_id AS termSubjectOfferingSubjectId,
        gls.grade_level_id AS termSubjectOfferingGradeLevelId,
        cu.email AS createdByEmail,
        uu.email AS updatedByEmail,
        lu.email AS lockedByEmail,
        (
          SELECT COUNT(*)
          FROM monthly_student_component_scores sc
          WHERE sc.monthly_student_result_id = r.id
            AND sc.deleted_at IS NULL
        ) AS componentCount
      FROM monthly_student_results r
      INNER JOIN monthly_assessment_periods p ON p.id = r.monthly_assessment_period_id
      INNER JOIN academic_years ay ON ay.id = r.academic_year_id
      INNER JOIN academic_terms at ON at.id = r.academic_term_id
      INNER JOIN academic_months am ON am.id = r.academic_month_id
      INNER JOIN student_enrollments e ON e.id = r.student_enrollment_id
      INNER JOIN students s ON s.id = e.student_id
      LEFT JOIN sections sec ON sec.id = e.section_id
      INNER JOIN subjects sub ON sub.id = r.subject_id
      LEFT JOIN term_subject_offerings tso ON tso.id = r.term_subject_offering_id
      LEFT JOIN grade_level_subjects gls ON gls.id = tso.grade_level_subject_id
      LEFT JOIN users cu ON cu.id = r.created_by
      LEFT JOIN users uu ON uu.id = r.updated_by
      LEFT JOIN users lu ON lu.id = r.locked_by_user_id
      WHERE r.id = ${id}
        AND r.deleted_at IS NULL
        AND p.deleted_at IS NULL
      LIMIT 1
    `);

    const result = rows[0];
    if (!result) {
      throw new NotFoundException('Monthly student result not found');
    }

    return this.mapResult(result);
  }

  async update(
    id: string,
    payload: UpdateStudentPeriodResultDto,
    actorUserId: string,
  ) {
    await this.findOne(id);

    await this.prisma.$executeRaw`
      UPDATE monthly_student_results
      SET
        status = COALESCE(${payload.status ?? null}, status),
        notes = COALESCE(${payload.notes?.trim() ?? null}, notes),
        is_active = COALESCE(${payload.isActive ?? null}, is_active),
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${id}
        AND deleted_at IS NULL
    `;

    return this.findOne(id);
  }

  async calculate(
    payload: CalculateStudentPeriodResultsDto,
    actorUserId: string,
  ) {
    await this.getMonthlyPeriod(payload.assessmentPeriodId);

    const where: Prisma.Sql[] = [
      Prisma.sql`r.deleted_at IS NULL`,
      Prisma.sql`r.monthly_assessment_period_id = ${payload.assessmentPeriodId}`,
    ];

    if (payload.sectionId) {
      where.push(Prisma.sql`r.section_id = ${payload.sectionId}`);
    }

    if (payload.subjectId) {
      where.push(Prisma.sql`r.subject_id = ${payload.subjectId}`);
    }

    if (payload.studentEnrollmentId) {
      where.push(
        Prisma.sql`r.student_enrollment_id = ${payload.studentEnrollmentId}`,
      );
    }

    const whereSql = Prisma.join(where, Prisma.sql` AND `);

    const targets = await this.prisma.$queryRaw<
      Array<{ id: string; total: Prisma.Decimal | number | string; componentCount: bigint | number }>
    >(Prisma.sql`
      SELECT
        r.id,
        COALESCE(SUM(sc.final_score), 0) AS total,
        COUNT(sc.id) AS componentCount
      FROM monthly_student_results r
      LEFT JOIN monthly_student_component_scores sc
        ON sc.monthly_student_result_id = r.id
       AND sc.deleted_at IS NULL
       AND sc.is_active = true
      WHERE ${whereSql}
      GROUP BY r.id
    `);

    let updatedResults = 0;
    let updatedComponents = 0;

    for (const item of targets) {
      await this.prisma.$executeRaw`
        UPDATE monthly_student_results
        SET
          total_score = ${Number(item.total)},
          calculated_at = NOW(),
          updated_at = NOW(),
          updated_by = ${actorUserId}
        WHERE id = ${item.id}
          AND deleted_at IS NULL
      `;
      updatedResults += 1;
      updatedComponents += Number(item.componentCount);
    }

    return { updatedResults, updatedComponents };
  }

  async lock(id: string, actorUserId: string) {
    await this.findOne(id);

    await this.prisma.$executeRaw`
      UPDATE monthly_student_results
      SET
        is_locked = true,
        locked_at = NOW(),
        locked_by_user_id = ${actorUserId},
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${id}
        AND deleted_at IS NULL
    `;

    return this.findOne(id);
  }

  async unlock(id: string, actorUserId: string) {
    await this.findOne(id);

    await this.prisma.$executeRaw`
      UPDATE monthly_student_results
      SET
        is_locked = false,
        locked_at = NULL,
        locked_by_user_id = NULL,
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${id}
        AND deleted_at IS NULL
    `;

    return this.findOne(id);
  }

  async remove(id: string, actorUserId: string) {
    await this.findOne(id);

    await this.prisma.$executeRaw`
      UPDATE monthly_student_results
      SET
        deleted_at = NOW(),
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${id}
        AND deleted_at IS NULL
    `;

    return { success: true };
  }

  private buildWhere(query: ListStudentPeriodResultsDto) {
    const where: Prisma.Sql[] = [
      Prisma.sql`r.deleted_at IS NULL`,
      Prisma.sql`p.deleted_at IS NULL`,
    ];

    if (query.assessmentPeriodId) {
      where.push(
        Prisma.sql`r.monthly_assessment_period_id = ${query.assessmentPeriodId}`,
      );
    }

    if (query.academicYearId) {
      where.push(Prisma.sql`r.academic_year_id = ${query.academicYearId}`);
    }

    if (query.academicTermId) {
      where.push(Prisma.sql`r.academic_term_id = ${query.academicTermId}`);
    }

    if (query.academicMonthId) {
      where.push(Prisma.sql`r.academic_month_id = ${query.academicMonthId}`);
    }

    if (query.sectionId) {
      where.push(Prisma.sql`r.section_id = ${query.sectionId}`);
    }

    if (query.subjectId) {
      where.push(Prisma.sql`r.subject_id = ${query.subjectId}`);
    }

    if (query.studentEnrollmentId) {
      where.push(
        Prisma.sql`r.student_enrollment_id = ${query.studentEnrollmentId}`,
      );
    }

    if (query.studentId) {
      where.push(Prisma.sql`s.id = ${query.studentId}`);
    }

    if (query.termSubjectOfferingId) {
      where.push(
        Prisma.sql`r.term_subject_offering_id = ${query.termSubjectOfferingId}`,
      );
    }

    if (query.status) {
      where.push(Prisma.sql`r.status = ${query.status}`);
    }

    if (typeof query.isLocked === 'boolean') {
      where.push(Prisma.sql`r.is_locked = ${query.isLocked}`);
    }

    if (typeof query.isActive === 'boolean') {
      where.push(Prisma.sql`r.is_active = ${query.isActive}`);
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      where.push(Prisma.sql`
        (
          r.notes LIKE ${search}
          OR s.full_name LIKE ${search}
          OR sub.name LIKE ${search}
          OR p.name LIKE ${search}
        )
      `);
    }

    return where;
  }

  private async getMonthlyPeriod(id: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        academicYearId: string;
        academicTermId: string;
        academicMonthId: string;
        isLocked: boolean;
      }>
    >(Prisma.sql`
      SELECT
        id,
        academic_year_id AS academicYearId,
        academic_term_id AS academicTermId,
        academic_month_id AS academicMonthId,
        is_locked AS isLocked
      FROM monthly_assessment_periods
      WHERE id = ${id}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    const period = rows[0];
    if (!period) {
      throw new BadRequestException('Monthly assessment period not found');
    }
    return period;
  }

  private async getEnrollment(id: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; academicYearId: string; sectionId: string | null }>
    >(Prisma.sql`
      SELECT
        id,
        academic_year_id AS academicYearId,
        section_id AS sectionId
      FROM student_enrollments
      WHERE id = ${id}
        AND deleted_at IS NULL
      LIMIT 1
    `);
    const enrollment = rows[0];
    if (!enrollment) {
      throw new BadRequestException('Student enrollment not found');
    }
    return enrollment;
  }

  private async ensureSubject(id: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM subjects
      WHERE id = ${id}
        AND deleted_at IS NULL
      LIMIT 1
    `);
    if (!rows[0]) {
      throw new BadRequestException('Subject not found');
    }
  }

  private mapResult(item: MonthlyResultRow) {
    return {
      id: item.id,
      assessmentPeriodId: item.assessmentPeriodId,
      studentEnrollmentId: item.studentEnrollmentId,
      subjectId: item.subjectId,
      academicYearId: item.academicYearId,
      academicTermId: item.academicTermId,
      academicMonthId: item.academicMonthId,
      termSubjectOfferingId: item.termSubjectOfferingId,
      sectionId: item.sectionId,
      totalScore: Number(item.totalScore),
      status: item.status,
      isLocked: Boolean(item.isLocked),
      lockedAt: item.lockedAt,
      lockedByUserId: item.lockedByUserId,
      calculatedAt: item.calculatedAt,
      notes: item.notes,
      isActive: Boolean(item.isActive),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdById: item.createdById,
      updatedById: item.updatedById,
      _count: {
        componentScores: Number(item.componentCount),
      },
      assessmentPeriod: {
        id: item.assessmentPeriodId,
        name: item.periodName,
        category: 'MONTHLY',
        status: item.periodStatus,
        maxScore: Number(item.periodMaxScore),
        academicYearId: item.academicYearId,
        academicTermId: item.academicTermId,
        academicMonthId: item.academicMonthId,
      },
      academicYear: {
        id: item.academicYearId,
        code: item.yearCode,
        name: item.yearName,
        status: item.yearStatus,
        isCurrent: Boolean(item.yearIsCurrent),
      },
      academicTerm: {
        id: item.academicTermId,
        code: item.termCode,
        name: item.termName,
        sequence: Number(item.termSequence),
        isActive: Boolean(item.termIsActive),
      },
      academicMonth: {
        id: item.academicMonthId,
        code: item.monthCode,
        name: item.monthName,
        sequence: Number(item.monthSequence),
        isActive: Boolean(item.monthIsActive),
      },
      studentEnrollment: {
        id: item.studentEnrollmentId,
        sectionId: item.enrollmentSectionId,
        academicYearId: item.academicYearId,
        status: item.enrollmentStatus,
        isActive: Boolean(item.enrollmentIsActive),
        student: {
          id: item.studentId,
          admissionNo: item.studentAdmissionNo,
          fullName: item.studentFullName,
          isActive: Boolean(item.studentIsActive),
        },
        section: item.enrollmentSectionId
          ? {
              id: item.enrollmentSectionId,
              code: item.sectionCode,
              name: item.sectionName,
              isActive: Boolean(item.sectionIsActive),
            }
          : null,
      },
      subject: {
        id: item.subjectId,
        code: item.subjectCode,
        name: item.subjectName,
        isActive: Boolean(item.subjectIsActive),
      },
      termSubjectOffering: item.termSubjectOfferingId
        ? {
            id: item.termSubjectOfferingId,
            academicTermId: item.termSubjectOfferingAcademicTermId,
            gradeLevelSubject: {
              id: item.termSubjectOfferingGradeLevelSubjectId,
              subjectId: item.termSubjectOfferingSubjectId,
              gradeLevelId: item.termSubjectOfferingGradeLevelId,
            },
          }
        : null,
      createdBy: item.createdById
        ? { id: item.createdById, email: item.createdByEmail }
        : null,
      updatedBy: item.updatedById
        ? { id: item.updatedById, email: item.updatedByEmail }
        : null,
      lockedByUser: item.lockedByUserId
        ? { id: item.lockedByUserId, email: item.lockedByEmail }
        : null,
    };
  }
}
