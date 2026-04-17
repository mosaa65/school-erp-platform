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
import { CreateAssessmentPeriodComponentDto } from '../assessment-periods/assessment-period-components/dto/create-assessment-period-component.dto';
import { ListAssessmentPeriodComponentsDto } from '../assessment-periods/assessment-period-components/dto/list-assessment-period-components.dto';
import { UpdateAssessmentPeriodComponentDto } from '../assessment-periods/assessment-period-components/dto/update-assessment-period-component.dto';

type MonthlyComponentRow = {
  id: string;
  assessmentPeriodId: string;
  code: string;
  name: string;
  entryMode: AssessmentComponentEntryMode;
  maxScore: Prisma.Decimal | number | string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  assessmentPeriodName: string;
  assessmentPeriodStatus: string;
  assessmentPeriodIsActive: boolean;
  assessmentPeriodAcademicYearId: string;
  assessmentPeriodAcademicTermId: string;
  assessmentPeriodAcademicMonthId: string;
  createdByEmail: string | null;
  updatedByEmail: string | null;
};

@Injectable()
export class MonthlyAssessmentComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    payload: CreateAssessmentPeriodComponentDto,
    actorUserId: string,
  ) {
    await this.ensureMonthlyPeriod(payload.assessmentPeriodId);

    const id = randomUUID();
    const code = this.buildCode(payload.code, payload.name);

    await this.prisma.$executeRaw`
      INSERT INTO monthly_assessment_components (
        id,
        monthly_assessment_period_id,
        code,
        name,
        entry_mode,
        max_score,
        sort_order,
        is_required,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      ) VALUES (
        ${id},
        ${payload.assessmentPeriodId},
        ${code},
        ${payload.name.trim()},
        ${payload.entryMode ?? AssessmentComponentEntryMode.MANUAL},
        ${payload.maxScore ?? 0},
        ${payload.sortOrder ?? 1},
        ${payload.isRequired ?? true},
        ${payload.isActive ?? true},
        NOW(),
        NOW(),
        ${actorUserId},
        ${actorUserId}
      )
    `;

    return this.findOne(id);
  }

  async findAll(query: ListAssessmentPeriodComponentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const where = this.buildWhere(query);
    const whereSql = Prisma.join(where, ' AND ');

    const [items, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<MonthlyComponentRow[]>(Prisma.sql`
        SELECT
          c.id,
          c.monthly_assessment_period_id AS assessmentPeriodId,
          c.code,
          c.name,
          c.entry_mode AS entryMode,
          c.max_score AS maxScore,
          c.sort_order AS sortOrder,
          c.is_required AS isRequired,
          c.is_active AS isActive,
          c.created_at AS createdAt,
          c.updated_at AS updatedAt,
          c.deleted_at AS deletedAt,
          c.created_by AS createdById,
          c.updated_by AS updatedById,
          p.name AS assessmentPeriodName,
          p.status AS assessmentPeriodStatus,
          p.is_active AS assessmentPeriodIsActive,
          p.academic_year_id AS assessmentPeriodAcademicYearId,
          p.academic_term_id AS assessmentPeriodAcademicTermId,
          p.academic_month_id AS assessmentPeriodAcademicMonthId,
          cu.email AS createdByEmail,
          uu.email AS updatedByEmail
        FROM monthly_assessment_components c
        INNER JOIN monthly_assessment_periods p ON p.id = c.monthly_assessment_period_id
        LEFT JOIN users cu ON cu.id = c.created_by
        LEFT JOIN users uu ON uu.id = c.updated_by
        WHERE ${whereSql}
        ORDER BY c.sort_order ASC, c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM monthly_assessment_components c
        INNER JOIN monthly_assessment_periods p ON p.id = c.monthly_assessment_period_id
        WHERE ${whereSql}
      `),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    return {
      data: items.map((item) => this.mapComponent(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<MonthlyComponentRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.monthly_assessment_period_id AS assessmentPeriodId,
        c.code,
        c.name,
        c.entry_mode AS entryMode,
        c.max_score AS maxScore,
        c.sort_order AS sortOrder,
        c.is_required AS isRequired,
        c.is_active AS isActive,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        c.deleted_at AS deletedAt,
        c.created_by AS createdById,
        c.updated_by AS updatedById,
        p.name AS assessmentPeriodName,
        p.status AS assessmentPeriodStatus,
        p.is_active AS assessmentPeriodIsActive,
        p.academic_year_id AS assessmentPeriodAcademicYearId,
        p.academic_term_id AS assessmentPeriodAcademicTermId,
        p.academic_month_id AS assessmentPeriodAcademicMonthId,
        cu.email AS createdByEmail,
        uu.email AS updatedByEmail
      FROM monthly_assessment_components c
      INNER JOIN monthly_assessment_periods p ON p.id = c.monthly_assessment_period_id
      LEFT JOIN users cu ON cu.id = c.created_by
      LEFT JOIN users uu ON uu.id = c.updated_by
      WHERE c.id = ${id}
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
      LIMIT 1
    `);

    const component = rows[0];
    if (!component) {
      throw new NotFoundException('Monthly assessment component not found');
    }

    return this.mapComponent(component);
  }

  async update(
    id: string,
    payload: UpdateAssessmentPeriodComponentDto,
    actorUserId: string,
  ) {
    const current = await this.findOne(id);
    const code = payload.code ? this.buildCode(payload.code, payload.name ?? current.name) : null;

    await this.prisma.$executeRaw`
      UPDATE monthly_assessment_components
      SET
        code = COALESCE(${code}, code),
        name = COALESCE(${payload.name?.trim() ?? null}, name),
        entry_mode = COALESCE(${payload.entryMode ?? null}, entry_mode),
        max_score = COALESCE(${payload.maxScore ?? null}, max_score),
        sort_order = COALESCE(${payload.sortOrder ?? null}, sort_order),
        is_required = COALESCE(${payload.isRequired ?? null}, is_required),
        is_active = COALESCE(${payload.isActive ?? null}, is_active),
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
      UPDATE monthly_assessment_components
      SET
        deleted_at = NOW(),
        updated_at = NOW(),
        updated_by = ${actorUserId}
      WHERE id = ${id}
        AND deleted_at IS NULL
    `;

    return { success: true };
  }

  private async ensureMonthlyPeriod(id: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; isLocked: boolean }>>(Prisma.sql`
      SELECT id, is_locked AS isLocked
      FROM monthly_assessment_periods
      WHERE id = ${id}
        AND deleted_at IS NULL
      LIMIT 1
    `);
    const period = rows[0];
    if (!period) {
      throw new BadRequestException('Monthly assessment period not found');
    }
    if (period.isLocked) {
      throw new BadRequestException('Cannot modify components of a locked monthly period');
    }
  }

  private buildWhere(query: ListAssessmentPeriodComponentsDto) {
    const where: Prisma.Sql[] = [
      Prisma.sql`c.deleted_at IS NULL`,
      Prisma.sql`p.deleted_at IS NULL`,
    ];

    if (query.assessmentPeriodId) {
      where.push(
        Prisma.sql`c.monthly_assessment_period_id = ${query.assessmentPeriodId}`,
      );
    }

    if (query.entryMode) {
      where.push(Prisma.sql`c.entry_mode = ${query.entryMode}`);
    }

    if (typeof query.isActive === 'boolean') {
      where.push(Prisma.sql`c.is_active = ${query.isActive}`);
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      where.push(Prisma.sql`
        (
          c.name LIKE ${search}
          OR c.code LIKE ${search}
          OR p.name LIKE ${search}
        )
      `);
    }

    return where;
  }

  private buildCode(code: string | undefined, name: string) {
    const source = (code?.trim() || name.trim() || 'COMP').toUpperCase();
    const normalized = source
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);

    if (normalized.length > 0) {
      return normalized;
    }

    return `COMP_${Date.now()}`.slice(0, 50);
  }

  private mapComponent(item: MonthlyComponentRow) {
    return {
      id: item.id,
      assessmentPeriodId: item.assessmentPeriodId,
      code: item.code,
      name: item.name,
      entryMode: item.entryMode,
      maxScore: Number(item.maxScore),
      sortOrder: Number(item.sortOrder),
      isRequired: Boolean(item.isRequired),
      isActive: Boolean(item.isActive),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdById: item.createdById,
      updatedById: item.updatedById,
      assessmentPeriod: {
        id: item.assessmentPeriodId,
        name: item.assessmentPeriodName,
        category: 'MONTHLY',
        academicYearId: item.assessmentPeriodAcademicYearId,
        academicTermId: item.assessmentPeriodAcademicTermId,
        academicMonthId: item.assessmentPeriodAcademicMonthId,
        status: item.assessmentPeriodStatus,
        isActive: Boolean(item.assessmentPeriodIsActive),
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
