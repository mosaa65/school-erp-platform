import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { ListBranchesDto } from './dto/list-branches.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

const branchInclude: Prisma.BranchInclude = {
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

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateBranchDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const nameEn =
      payload.nameEn === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameEn, 'nameEn');

    try {
      const branch = await this.prisma.branch.create({
        data: {
          nameAr,
          nameEn,
          address: payload.address?.trim(),
          phone: payload.phone?.trim(),
          isHeadquarters: payload.isHeadquarters ?? false,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: branchInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'BRANCH_CREATE',
        resource: 'branches',
        resourceId: String(branch.id),
        details: {
          nameAr: branch.nameAr,
        },
      });

      return branch;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'BRANCH_CREATE_FAILED',
        resource: 'branches',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListBranchesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.BranchWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      isHeadquarters: query.isHeadquarters,
      OR: query.search
        ? [
            {
              nameAr: {
                contains: query.search,
              },
            },
            {
              nameEn: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.branch.count({ where }),
      this.prisma.branch.findMany({
        where,
        include: branchInclude,
        orderBy: [{ nameAr: 'asc' }, { id: 'asc' }],
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

  async findOne(id: number) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: branchInclude,
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: number, payload: UpdateBranchDto, actorUserId: string) {
    await this.ensureBranchExists(id);

    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const nameEn =
      payload.nameEn === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameEn, 'nameEn');

    try {
      const updated = await this.prisma.branch.update({
        where: { id },
        data: {
          nameAr,
          nameEn,
          address: payload.address?.trim(),
          phone: payload.phone?.trim(),
          isHeadquarters: payload.isHeadquarters,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: branchInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'BRANCH_UPDATE',
        resource: 'branches',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureBranchExists(id);

    await this.prisma.branch.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'BRANCH_DELETE',
      resource: 'branches',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureBranchExists(id: number) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Branch already exists');
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
