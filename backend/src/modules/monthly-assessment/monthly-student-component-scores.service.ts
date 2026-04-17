import { randomUUID } from 'crypto';
import {
  AssessmentComponentEntryMode,
  Prisma,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentPeriodComponentScoreDto } from '../assessment-periods/student-period-component-scores/dto/create-student-period-component-score.dto';
import { ListStudentPeriodComponentScoresDto } from '../assessment-periods/student-period-component-scores/dto/list-student-period-component-scores.dto';
import { UpdateStudentPeriodComponentScoreDto } from '../assessment-periods/student-period-component-scores/dto/update-student-period-component-score.dto';

type MonthlyScoreRow = {
  id: string;
  studentPeriodResultId: string;
  assessmentPeriodComponentId: string;
  rawScore: Prisma.Decimal | number | string;
  finalScore: Prisma.Decimal | number | string;
  isAutoCalculated: boolean;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  resultAssessmentPeriodId: string;
  resultStudentEnrollmentId: string;
  resultSubjectId: string;
  resultIsLocked: boolean;
  resultPeriodName: string;
  resultPeriodStatus: string;
  resultPeriodIsLocked: boolean;
  resultPeriodMaxScore: Prisma.Decimal | number | string;
  resultStudentId: string;
  resultStudentAdmissionNo: string;
  resultStudentFullName: string;
  resultSectionId: string | null;
  resultSubjectCode: string;
  resultSubjectName: string;
  componentAssessmentPeriodId: string;
  componentCode: string;
  componentName: string;
  componentEntryMode: AssessmentComponentEntryMode;
  componentMaxScore: Prisma.Decimal | number | string;
  componentSortOrder: number;
  createdByEmail: string | null;
  updatedByEmail: string | null;
};

@Injectable()
export class MonthlyStudentComponentScoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    payload: CreateStudentPeriodComponentScoreDto,
    actorUserId: string,
  ) {
    const context = await this.ensureEditableContext(
      payload.studentPeriodResultId,
      payload.assessmentPeriodComponentId,
    );

    const id = randomUUID();
    const finalScore = payload.finalScore ?? payload.rawScore;

    await this.prisma.$executeRaw`
      INSERT INTO monthly_student_component_scores (
        id,
        monthly_student_result_id,
        monthly_assessment_component_id,
        raw_score,
        final_score,
        is_auto_calculated,
        notes,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      ) VALUES (
        ${id},
        ${payload.studentPeriodResultId},
        ${payload.assessmentPeriodComponentId},
        ${payload.rawScore},
        ${finalScore},
        false,
        ${payload.notes?.trim() ?? null},
        ${payload.isActive ?? true},
        NOW(),
        NOW(),
        ${actorUserId},
        ${actorUserId}
      )
    `;

    await this.recalculateResultTotal(context.resultId, actorUserId);
    return this.findOne(id);
  }

  async findAll(query: ListStudentPeriodComponentScoresDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const where = this.buildWhere(query);
    const whereSql = Prisma.join(where, Prisma.sql` AND `);

    const [items, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<MonthlyScoreRow[]>(Prisma.sql`
        SELECT
          sc.id,
          sc.monthly_student_result_id AS studentPeriodResultId,
          sc.monthly_assessment_component_id AS assessmentPeriodComponentId,
          sc.raw_score AS rawScore,
          sc.final_score AS finalScore,
          sc.is_auto_calculated AS isAutoCalculated,
          sc.notes,
          sc.is_active AS isActive,
          sc.created_at AS createdAt,
          sc.updated_at AS updatedAt,
          sc.created_by AS createdById,
          sc.updated_by AS updatedById,
          r.monthly_assessment_period_id AS resultAssessmentPeriodId,
          r.student_enrollment_id AS resultStudentEnrollmentId,
          r.subject_id AS resultSubjectId,
          r.is_locked AS resultIsLocked,
          p.name AS resultPeriodName,
          p.status AS resultPeriodStatus,
          p.is_locked AS resultPeriodIsLocked,
          p.max_score AS resultPeriodMaxScore,
          s.id AS resultStudentId,
          s.admission_no AS resultStudentAdmissionNo,
          s.full_name AS resultStudentFullName,
          e.section_id AS resultSectionId,
          sub.code AS resultSubjectCode,
          sub.name AS resultSubjectName,
          c.monthly_assessment_period_id AS componentAssessmentPeriodId,
          c.code AS componentCode,
          c.name AS componentName,
          c.entry_mode AS componentEntryMode,
          c.max_score AS componentMaxScore,
          c.sort_order AS componentSortOrder,
          cu.email AS createdByEmail,
          uu.email AS updatedByEmail
        FROM monthly_student_component_scores sc
        INNER JOIN monthly_student_results r ON r.id = sc.monthly_student_result_id
        INNER JOIN monthly_assessment_periods p ON p.id = r.monthly_assessment_period_id
        INNER JOIN monthly_assessment_components c ON c.id = sc.monthly_assessment_component_id
        INNER JOIN student_enrollments e ON e.id = r.student_enrollment_id
        INNER JOIN students s ON s.id = e.student_id
        INNER JOIN subjects sub ON sub.id = r.subject_id
        LEFT JOIN users cu ON cu.id = sc.created_by
        LEFT JOIN users uu ON uu.id = sc.updated_by
        WHERE ${whereSql}
        ORDER BY c.sort_order ASC, sc.created_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM monthly_student_component_scores sc
        INNER JOIN monthly_student_results r ON r.id = sc.monthly_student_result_id
        INNER JOIN monthly_assessment_periods p ON p.id = r.monthly_assessment_period_id
        INNER JOIN monthly_assessment_components c ON c.id = sc.monthly_assessment_component_id
        INNER JOIN student_enrollments e ON e.id = r.student_enrollment_id
        INNER JOIN students s ON s.id = e.student_id
        WHERE ${whereSql}
      `),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return {
      data: items.map((item) => this.mapScore(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<MonthlyScoreRow[]>(Prisma.sql`
      SELECT
        sc.id,
        sc.monthly_student_result_id AS studentPeriodResultId,
        sc.monthly_assessment_component_id AS assessmentPeriodComponentId,
        sc.raw_score AS rawScore,
        sc.final_score AS finalScore,
        sc.is_auto_calculated AS isAutoCalculated,
        sc.notes,
        sc.is_active AS isActive,
        sc.created_at AS createdAt,
        sc.updated_at AS updatedAt,
        sc.created_by AS createdById,
        sc.updated_by AS updatedById,
        r.monthly_assessment_period_id AS resultAssessmentPeriodId,
        r.student_enrollment_id AS resultStudentEnrollmentId,
        r.subject_id AS resultSubjectId,
        r.is_locked AS resultIsLocked,
        p.name AS resultPeriodName,
        p.status AS resultPeriodStatus,
        p.is_locked AS resultPeriodIsLocked,
        p.max_score AS resultPeriodMaxScore,
        s.id AS resultStudentId,
        s.admission_no AS resultStudentAdmissionNo,
        s.full_name AS resultStudentFullName,
        e.section_id AS resultSectionId,
        sub.code AS resultSubjectCode,
        sub.name AS resultSubjectName,
        c.monthly_assessment_period_id AS componentAssessmentPeriodId,
        c.code AS componentCode,
        c.name AS componentName,
        c.entry_mode AS componentEntryMode,
        c.max_score AS componentMaxScore,
        c.sort_order AS componentSortOrder,
        cu.email AS createdByEmail,
        uu.email AS updatedByEmail
      FROM monthly_student_component_scores sc
      INNER JOIN monthly_student_results r ON r.id = sc.monthly_student_result_id
      INNER JOIN monthly_assessment_periods p ON p.id = r.monthly_assessment_period_id
      INNER JOIN monthly_assessment_components c ON c.id = sc.monthly_assessment_component_id
      INNER JOIN student_enrollments e ON e.id = r.student_enrollment_id
      INNER JOIN students s ON s.id = e.student_id
      INNER JOIN subjects sub ON sub.id = r.subject_id
      LEFT JOIN users cu ON cu.id = sc.created_by
      LEFT JOIN users uu ON uu.id = sc.updated_by
      WHERE sc.id = ${id}
        AND sc.deleted_at IS NULL
        AND r.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND c.deleted_at IS NULL
      LIMIT 1
    `);

    const score = rows[0];
    if (!score) {
      throw new NotFoundException('Monthly student component score not found');
    }

    return this.mapScore(score);
  }

  async update(
    id: string,
    payload: UpdateStudentPeriodComponentScoreDto,
    actorUserId: string,
  ) {
    const existing = await this.findOne(id);
    await this.ensureEditableContext(
      existing.studentPeriodResultId,
      existing.assessmentPeriodComponentId,
    );

    await this.prisma.$executeRaw`
      UPDATE monthly_student_component_scores
      SET
        raw_score = COALESCE(${payload.rawScore ?? null}, raw_score),
        final_score = COALESCE(${payload.finalScore ?? null}, final_score),
        notes = COALESCE(${payload.notes?.trim() ?? null}, notes),
        is_active = COALESCE(${payload.isActive ?? null}, is_active),
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${id}
        AND deleted_at IS NULL
    `;

    await this.recalculateResultTotal(existing.studentPeriodResultId, actorUserId);
    return this.findOne(id);
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.findOne(id);

    await this.prisma.$executeRaw`
      UPDATE monthly_student_component_scores
      SET
        deleted_at = NOW(),
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${id}
        AND deleted_at IS NULL
    `;

    await this.recalculateResultTotal(existing.studentPeriodResultId, actorUserId);
    return { success: true };
  }

  private buildWhere(query: ListStudentPeriodComponentScoresDto) {
    const where: Prisma.Sql[] = [
      Prisma.sql`sc.deleted_at IS NULL`,
      Prisma.sql`r.deleted_at IS NULL`,
      Prisma.sql`p.deleted_at IS NULL`,
      Prisma.sql`c.deleted_at IS NULL`,
    ];

    if (query.studentPeriodResultId) {
      where.push(
        Prisma.sql`sc.monthly_student_result_id = ${query.studentPeriodResultId}`,
      );
    }

    if (query.assessmentPeriodComponentId) {
      where.push(
        Prisma.sql`sc.monthly_assessment_component_id = ${query.assessmentPeriodComponentId}`,
      );
    }

    if (query.assessmentPeriodId) {
      where.push(Prisma.sql`r.monthly_assessment_period_id = ${query.assessmentPeriodId}`);
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

    if (typeof query.isActive === 'boolean') {
      where.push(Prisma.sql`sc.is_active = ${query.isActive}`);
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      where.push(Prisma.sql`
        (
          sc.notes LIKE ${search}
          OR c.name LIKE ${search}
          OR s.full_name LIKE ${search}
        )
      `);
    }

    return where;
  }

  private async ensureEditableContext(
    resultId: string,
    componentId: string,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        resultId: string;
        resultIsLocked: boolean;
        periodIsLocked: boolean;
        componentAssessmentPeriodId: string;
        resultAssessmentPeriodId: string;
        componentEntryMode: AssessmentComponentEntryMode;
      }>
    >(Prisma.sql`
      SELECT
        r.id AS resultId,
        r.is_locked AS resultIsLocked,
        p.is_locked AS periodIsLocked,
        c.monthly_assessment_period_id AS componentAssessmentPeriodId,
        r.monthly_assessment_period_id AS resultAssessmentPeriodId,
        c.entry_mode AS componentEntryMode
      FROM monthly_student_results r
      INNER JOIN monthly_assessment_periods p ON p.id = r.monthly_assessment_period_id
      INNER JOIN monthly_assessment_components c ON c.id = ${componentId}
      WHERE r.id = ${resultId}
        AND r.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND c.deleted_at IS NULL
      LIMIT 1
    `);

    const context = rows[0];
    if (!context) {
      throw new BadRequestException('Monthly result or component not found');
    }

    if (context.componentAssessmentPeriodId !== context.resultAssessmentPeriodId) {
      throw new BadRequestException('Component does not belong to the same monthly period');
    }

    if (context.resultIsLocked || context.periodIsLocked) {
      throw new BadRequestException('Cannot modify scores inside a locked monthly result');
    }

    if (context.componentEntryMode === AssessmentComponentEntryMode.AGGREGATED_PERIODS) {
      throw new BadRequestException('Aggregated monthly components are read-only');
    }

    return context;
  }

  private async recalculateResultTotal(resultId: string, actorUserId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ total: Prisma.Decimal | number | string }>>(Prisma.sql`
      SELECT COALESCE(SUM(final_score), 0) AS total
      FROM monthly_student_component_scores
      WHERE monthly_student_result_id = ${resultId}
        AND deleted_at IS NULL
        AND is_active = true
    `);
    const total = Number(rows[0]?.total ?? 0);

    await this.prisma.$executeRaw`
      UPDATE monthly_student_results
      SET
        total_score = ${total},
        calculated_at = NOW(),
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${resultId}
        AND deleted_at IS NULL
    `;
  }

  private mapScore(item: MonthlyScoreRow) {
    return {
      id: item.id,
      studentPeriodResultId: item.studentPeriodResultId,
      assessmentPeriodComponentId: item.assessmentPeriodComponentId,
      rawScore: Number(item.rawScore),
      finalScore: Number(item.finalScore),
      isAutoCalculated: Boolean(item.isAutoCalculated),
      notes: item.notes,
      isActive: Boolean(item.isActive),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdById: item.createdById,
      updatedById: item.updatedById,
      studentPeriodResult: {
        id: item.studentPeriodResultId,
        assessmentPeriodId: item.resultAssessmentPeriodId,
        studentEnrollmentId: item.resultStudentEnrollmentId,
        subjectId: item.resultSubjectId,
        isLocked: Boolean(item.resultIsLocked),
        assessmentPeriod: {
          id: item.resultAssessmentPeriodId,
          name: item.resultPeriodName,
          category: 'MONTHLY',
          status: item.resultPeriodStatus,
          isLocked: Boolean(item.resultPeriodIsLocked),
          maxScore: Number(item.resultPeriodMaxScore),
        },
        studentEnrollment: {
          id: item.resultStudentEnrollmentId,
          sectionId: item.resultSectionId,
          student: {
            id: item.resultStudentId,
            admissionNo: item.resultStudentAdmissionNo,
            fullName: item.resultStudentFullName,
          },
        },
        subject: {
          id: item.resultSubjectId,
          code: item.resultSubjectCode,
          name: item.resultSubjectName,
        },
      },
      assessmentPeriodComponent: {
        id: item.assessmentPeriodComponentId,
        assessmentPeriodId: item.componentAssessmentPeriodId,
        code: item.componentCode,
        name: item.componentName,
        entryMode: item.componentEntryMode,
        maxScore: Number(item.componentMaxScore),
        sortOrder: Number(item.componentSortOrder),
      },
      createdBy: item.createdById
        ? { id: item.createdById, email: item.createdByEmail }
        : null,
      updatedBy: item.updatedById
        ? { id: item.updatedById, email: item.updatedByEmail }
        : null,
    };
  }
}
