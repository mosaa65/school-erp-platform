import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  buildHybridBranchClause,
  combineWhereClauses,
} from '../utils/hybrid-branch-scope';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { ListCostCentersDto } from './dto/list-cost-centers.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

const costCenterInclude: Prisma.CostCenterInclude = {
  parent: {
    select: { id: true, code: true, nameAr: true },
  },
  branch: {
    select: { id: true, nameAr: true },
  },
  managerEmployee: {
    select: { id: true, fullName: true },
  },
  children: {
    select: { id: true, code: true, nameAr: true },
  },
};

@Injectable()
export class CostCentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateCostCenterDto, actorUserId: string) {
    const code = this.normalizeRequiredText(payload.code, 'code');
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const costCenter = await this.prisma.costCenter.create({
        data: {
          code,
          nameAr,
          nameEn: payload.nameEn?.trim(),
          parentId: payload.parentId,
          branchId: payload.branchId,
          managerEmployeeId: payload.managerEmployeeId,
          isActive: payload.isActive ?? true,
        },
        include: costCenterInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'COST_CENTER_CREATE',
        resource: 'cost-centers',
        resourceId: String(costCenter.id),
        details: { code: costCenter.code, nameAr: costCenter.nameAr },
      });

      return costCenter;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'COST_CENTER_CREATE_FAILED',
        resource: 'cost-centers',
        status: AuditStatus.FAILURE,
        details: { reason: this.extractErrorMessage(error) },
      });
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListCostCentersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const baseWhere: Prisma.CostCenterWhereInput = {
      isActive: query.isActive,
    };
    const branchWhere = buildHybridBranchClause(query.branchId) as
      | Prisma.CostCenterWhereInput
      | undefined;
    const searchWhere: Prisma.CostCenterWhereInput | undefined = query.search
      ? {
          OR: [
            { nameAr: { contains: query.search } },
            { nameEn: { contains: query.search } },
            { code: { contains: query.search } },
          ],
        }
      : undefined;
    const where = combineWhereClauses<Prisma.CostCenterWhereInput>(
      baseWhere,
      branchWhere,
      searchWhere,
    );

    const [total, items] = await this.prisma.$transaction([
      this.prisma.costCenter.count({ where }),
      this.prisma.costCenter.findMany({
        where,
        include: costCenterInclude,
        orderBy: [{ code: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const costCenter = await this.prisma.costCenter.findFirst({
      where: { id },
      include: costCenterInclude,
    });
    if (!costCenter) throw new NotFoundException('Cost center not found');
    return costCenter;
  }

  async update(id: number, payload: UpdateCostCenterDto, actorUserId: string) {
    await this.ensureExists(id);
    try {
      const updated = await this.prisma.costCenter.update({
        where: { id },
        data: {
          code: payload.code?.trim(),
          nameAr: payload.nameAr?.trim(),
          nameEn: payload.nameEn?.trim(),
          parentId: payload.parentId,
          branchId: payload.branchId,
          managerEmployeeId: payload.managerEmployeeId,
          isActive: payload.isActive,
        },
        include: costCenterInclude,
      });
      await this.auditLogsService.record({
        actorUserId,
        action: 'COST_CENTER_UPDATE',
        resource: 'cost-centers',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });
      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureExists(id);
    await this.prisma.costCenter.update({
      where: { id },
      data: { isActive: false },
    });
    await this.auditLogsService.record({
      actorUserId,
      action: 'COST_CENTER_DELETE',
      resource: 'cost-centers',
      resourceId: String(id),
    });
    return { success: true, id };
  }

  private async ensureExists(id: number) {
    const item = await this.prisma.costCenter.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Cost center not found');
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${fieldName} cannot be empty`);
    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Cost center with this code already exists');
    }
    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
