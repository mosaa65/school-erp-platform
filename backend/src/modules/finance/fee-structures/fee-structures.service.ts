import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { ListFeeStructuresDto } from './dto/list-fee-structures.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';

const feeStructureInclude: Prisma.FeeStructureInclude = {
  academicYear: {
    select: {
      id: true,
      name: true,
    },
  },
  gradeLevel: {
    select: {
      id: true,
      name: true,
    },
  },
  currency: {
    select: {
      id: true,
      code: true,
      nameAr: true,
    },
  },
};

@Injectable()
export class FeeStructuresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateFeeStructureDto, actorUserId: string) {
    const nameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const feeStructure = await this.prisma.feeStructure.create({
        data: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          feeType: payload.feeType,
          nameAr,
          amount: payload.amount,
          currencyId: payload.currencyId,
          vatRate: payload.vatRate ?? 0,
          isActive: payload.isActive ?? true,
        },
        include: feeStructureInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FEE_STRUCTURE_CREATE',
        resource: 'fee-structures',
        resourceId: String(feeStructure.id),
        details: {
          feeType: feeStructure.feeType,
          amount: feeStructure.amount,
        },
      });

      return feeStructure;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'FEE_STRUCTURE_CREATE_FAILED',
        resource: 'fee-structures',
        status: AuditStatus.FAILURE,
        details: {
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListFeeStructuresDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.FeeStructureWhereInput = {
      isActive: query.isActive,
      academicYearId: query.academicYearId,
      gradeLevelId: query.gradeLevelId,
      feeType: query.feeType,
      currencyId: query.currencyId,
      OR: query.search
        ? [
            {
              nameAr: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.feeStructure.count({ where }),
      this.prisma.feeStructure.findMany({
        where,
        include: feeStructureInclude,
        orderBy: [{ createdAt: 'desc' }],
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
    const feeStructure = await this.prisma.feeStructure.findFirst({
      where: {
        id,
      },
      include: feeStructureInclude,
    });

    if (!feeStructure) {
      throw new NotFoundException('Fee structure not found');
    }

    return feeStructure;
  }

  async update(
    id: number,
    payload: UpdateFeeStructureDto,
    actorUserId: string,
  ) {
    await this.ensureFeeStructureExists(id);

    const nameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const updated = await this.prisma.feeStructure.update({
        where: { id },
        data: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          feeType: payload.feeType,
          nameAr,
          amount: payload.amount,
          currencyId: payload.currencyId,
          vatRate: payload.vatRate,
          isActive: payload.isActive,
        },
        include: feeStructureInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'FEE_STRUCTURE_UPDATE',
        resource: 'fee-structures',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureFeeStructureExists(id);

    await this.prisma.feeStructure.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'FEE_STRUCTURE_DELETE',
      resource: 'fee-structures',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureFeeStructureExists(id: number) {
    const feeStructure = await this.prisma.feeStructure.findFirst({
      where: {
        id,
      },
      select: { id: true },
    });

    if (!feeStructure) {
      throw new NotFoundException('Fee structure not found');
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
      throw new ConflictException('Fee structure already exists');
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
