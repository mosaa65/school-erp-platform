import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, GradingWorkflowStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssessmentPeriodDto } from '../assessment-periods/assessment-periods/dto/create-assessment-period.dto';
import { ListAssessmentPeriodsDto } from '../assessment-periods/assessment-periods/dto/list-assessment-periods.dto';
import { UpdateAssessmentPeriodDto } from '../assessment-periods/assessment-periods/dto/update-assessment-period.dto';

type MonthlyPeriodRow = {
  id: string;
  academicYearId: string;
  academicTermId: string;
  academicMonthId: string;
  name: string;
  sequence: number;
  maxScore: Prisma.Decimal | number | string;
  status: GradingWorkflowStatus;
  isLocked: boolean;
  lockedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  lockedByUserId: string | null;
  academicYearCode: string;
  academicYearName: string;
  academicYearStatus: string;
  academicYearIsCurrent: boolean;
  academicTermCode: string;
  academicTermName: string;
  academicTermSequence: number;
  academicTermIsActive: boolean;
  academicMonthCode: string;
  academicMonthName: string;
  academicMonthSequence: number;
  academicMonthIsCurrent: boolean;
  academicMonthIsActive: boolean;
  createdByEmail: string | null;
  updatedByEmail: string | null;
  lockedByEmail: string | null;
  componentCount: bigint | number;
  resultCount: bigint | number;
};

@Injectable()
export class MonthlyAssessmentPeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateAssessmentPeriodDto, actorUserId: string) {
    const id = randomUUID();

    await this.prisma.$executeRaw`
      INSERT INTO monthly_assessment_periods (
        id,
        academic_year_id,
        academic_term_id,
        academic_month_id,
        name,
        sequence,
        max_score,
        status,
        is_locked,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      ) VALUES (
        ${id},
        ${payload.academicYearId},
        ${payload.academicTermId ?? null},
        ${payload.academicMonthId ?? null},
        ${payload.name.trim()},
        ${payload.sequence ?? 1},
        ${payload.maxScore ?? 100},
        ${payload.status ?? GradingWorkflowStatus.DRAFT},
        false,
        ${payload.isActive ?? true},
        NOW(),
        NOW(),
        ${actorUserId},
        ${actorUserId}
      )
    `;

    return this.findOne(id);
  }

  async findAll(query: ListAssessmentPeriodsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const where = this.buildWhere(query);
    const whereSql = Prisma.join(where, Prisma.sql` AND `);

    const [items, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<MonthlyPeriodRow[]>(Prisma.sql`
        SELECT
          p.id,
          p.academic_year_id AS academicYearId,
          p.academic_term_id AS academicTermId,
          p.academic_month_id AS academicMonthId,
          p.name,
          p.sequence,
          p.max_score AS maxScore,
          p.status,
          p.is_locked AS isLocked,
          p.locked_at AS lockedAt,
          p.is_active AS isActive,
          p.created_at AS createdAt,
          p.updated_at AS updatedAt,
          p.deleted_at AS deletedAt,
          p.created_by AS createdById,
          p.updated_by AS updatedById,
          p.locked_by_user_id AS lockedByUserId,
          ay.code AS academicYearCode,
          ay.name AS academicYearName,
          ay.status AS academicYearStatus,
          ay.is_current AS academicYearIsCurrent,
          at.code AS academicTermCode,
          at.name AS academicTermName,
          at.sequence AS academicTermSequence,
          at.is_active AS academicTermIsActive,
          am.code AS academicMonthCode,
          am.name AS academicMonthName,
          am.sequence AS academicMonthSequence,
          am.is_current AS academicMonthIsCurrent,
          am.is_active AS academicMonthIsActive,
          cu.email AS createdByEmail,
          uu.email AS updatedByEmail,
          lu.email AS lockedByEmail,
          (
            SELECT COUNT(*)
            FROM monthly_assessment_components c
            WHERE c.monthly_assessment_period_id = p.id
              AND c.deleted_at IS NULL
          ) AS componentCount,
          (
            SELECT COUNT(*)
            FROM monthly_student_results r
            WHERE r.monthly_assessment_period_id = p.id
              AND r.deleted_at IS NULL
          ) AS resultCount
        FROM monthly_assessment_periods p
        INNER JOIN academic_years ay ON ay.id = p.academic_year_id
        INNER JOIN academic_terms at ON at.id = p.academic_term_id
        INNER JOIN academic_months am ON am.id = p.academic_month_id
        LEFT JOIN users cu ON cu.id = p.created_by
        LEFT JOIN users uu ON uu.id = p.updated_by
        LEFT JOIN users lu ON lu.id = p.locked_by_user_id
        WHERE ${whereSql}
        ORDER BY at.sequence ASC, am.sequence ASC, p.sequence ASC, p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM monthly_assessment_periods p
        INNER JOIN academic_years ay ON ay.id = p.academic_year_id
        INNER JOIN academic_terms at ON at.id = p.academic_term_id
        INNER JOIN academic_months am ON am.id = p.academic_month_id
        WHERE ${whereSql}
      `),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return {
      data: items.map((item) => this.mapPeriod(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<MonthlyPeriodRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.academic_year_id AS academicYearId,
        p.academic_term_id AS academicTermId,
        p.academic_month_id AS academicMonthId,
        p.name,
        p.sequence,
        p.max_score AS maxScore,
        p.status,
        p.is_locked AS isLocked,
        p.locked_at AS lockedAt,
        p.is_active AS isActive,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        p.deleted_at AS deletedAt,
        p.created_by AS createdById,
        p.updated_by AS updatedById,
        p.locked_by_user_id AS lockedByUserId,
        ay.code AS academicYearCode,
        ay.name AS academicYearName,
        ay.status AS academicYearStatus,
        ay.is_current AS academicYearIsCurrent,
        at.code AS academicTermCode,
        at.name AS academicTermName,
        at.sequence AS academicTermSequence,
        at.is_active AS academicTermIsActive,
        am.code AS academicMonthCode,
        am.name AS academicMonthName,
        am.sequence AS academicMonthSequence,
        am.is_current AS academicMonthIsCurrent,
        am.is_active AS academicMonthIsActive,
        cu.email AS createdByEmail,
        uu.email AS updatedByEmail,
        lu.email AS lockedByEmail,
        (
          SELECT COUNT(*)
          FROM monthly_assessment_components c
          WHERE c.monthly_assessment_period_id = p.id
            AND c.deleted_at IS NULL
        ) AS componentCount,
        (
          SELECT COUNT(*)
          FROM monthly_student_results r
          WHERE r.monthly_assessment_period_id = p.id
            AND r.deleted_at IS NULL
        ) AS resultCount
      FROM monthly_assessment_periods p
      INNER JOIN academic_years ay ON ay.id = p.academic_year_id
      INNER JOIN academic_terms at ON at.id = p.academic_term_id
      INNER JOIN academic_months am ON am.id = p.academic_month_id
      LEFT JOIN users cu ON cu.id = p.created_by
      LEFT JOIN users uu ON uu.id = p.updated_by
      LEFT JOIN users lu ON lu.id = p.locked_by_user_id
      WHERE p.id = ${id}
        AND p.deleted_at IS NULL
      LIMIT 1
    `);

    const period = rows[0];
    if (!period) {
      throw new NotFoundException('Monthly assessment period not found');
    }

    return this.mapPeriod(period);
  }

  async update(
    id: string,
    payload: UpdateAssessmentPeriodDto,
    actorUserId: string,
  ) {
    await this.findOne(id);

    await this.prisma.$executeRaw`
      UPDATE monthly_assessment_periods
      SET
        academic_year_id = COALESCE(${payload.academicYearId ?? null}, academic_year_id),
        academic_term_id = COALESCE(${payload.academicTermId ?? null}, academic_term_id),
        academic_month_id = COALESCE(${payload.academicMonthId ?? null}, academic_month_id),
        name = COALESCE(${payload.name?.trim() ?? null}, name),
        sequence = COALESCE(${payload.sequence ?? null}, sequence),
        max_score = COALESCE(${payload.maxScore ?? null}, max_score),
        status = COALESCE(${payload.status ?? null}, status),
        is_active = COALESCE(${payload.isActive ?? null}, is_active),
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${id}
        AND deleted_at IS NULL
    `;

    return this.findOne(id);
  }

  async lock(id: string, actorUserId: string) {
    await this.findOne(id);

    await this.prisma.$executeRaw`
      UPDATE monthly_assessment_periods
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
      UPDATE monthly_assessment_periods
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
      UPDATE monthly_assessment_periods
      SET
        deleted_at = NOW(),
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${id}
        AND deleted_at IS NULL
    `;

    return { success: true };
  }

  private buildWhere(query: ListAssessmentPeriodsDto) {
    const where: Prisma.Sql[] = [Prisma.sql`p.deleted_at IS NULL`];

    if (query.academicYearId) {
      where.push(Prisma.sql`p.academic_year_id = ${query.academicYearId}`);
    }

    if (query.academicTermId) {
      where.push(Prisma.sql`p.academic_term_id = ${query.academicTermId}`);
    }

    if (query.academicMonthId) {
      where.push(Prisma.sql`p.academic_month_id = ${query.academicMonthId}`);
    }

    if (query.status) {
      where.push(Prisma.sql`p.status = ${query.status}`);
    }

    if (typeof query.isLocked === 'boolean') {
      where.push(Prisma.sql`p.is_locked = ${query.isLocked}`);
    }

    if (typeof query.isActive === 'boolean') {
      where.push(Prisma.sql`p.is_active = ${query.isActive}`);
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      where.push(Prisma.sql`
        (
          p.name LIKE ${search}
          OR ay.name LIKE ${search}
          OR at.name LIKE ${search}
          OR am.name LIKE ${search}
        )
      `);
    }

    return where;
  }

  private mapPeriod(item: MonthlyPeriodRow) {
    return {
      id: item.id,
      academicYearId: item.academicYearId,
      academicTermId: item.academicTermId,
      academicMonthId: item.academicMonthId,
      category: 'MONTHLY',
      name: item.name,
      sequence: Number(item.sequence),
      maxScore: Number(item.maxScore),
      status: item.status,
      isLocked: Boolean(item.isLocked),
      lockedAt: item.lockedAt,
      isActive: Boolean(item.isActive),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdById: item.createdById,
      updatedById: item.updatedById,
      lockedByUserId: item.lockedByUserId,
      academicYear: {
        id: item.academicYearId,
        code: item.academicYearCode,
        name: item.academicYearName,
        status: item.academicYearStatus,
        isCurrent: Boolean(item.academicYearIsCurrent),
      },
      academicTerm: {
        id: item.academicTermId,
        code: item.academicTermCode,
        name: item.academicTermName,
        sequence: Number(item.academicTermSequence),
        isActive: Boolean(item.academicTermIsActive),
      },
      academicMonth: {
        id: item.academicMonthId,
        code: item.academicMonthCode,
        name: item.academicMonthName,
        sequence: Number(item.academicMonthSequence),
        isCurrent: Boolean(item.academicMonthIsCurrent),
        isActive: Boolean(item.academicMonthIsActive),
      },
      createdBy: item.createdById
        ? { id: item.createdById, email: item.createdByEmail }
        : null,
      updatedBy: item.updatedById
        ? { id: item.updatedById, email: item.updatedByEmail }
        : null,
      lockedByUser: item.lockedByUserId
        ? { id: item.lockedByUserId, email: item.lockedByEmail }
        : null,
      _count: {
        components: Number(item.componentCount),
        results: Number(item.resultCount),
      },
    };
  }
}
