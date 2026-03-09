import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnnualStatusLookup, AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateAnnualStatusDto } from './dto/create-annual-status.dto';
import { ListAnnualStatusesDto } from './dto/list-annual-statuses.dto';
import { UpdateAnnualStatusDto } from './dto/update-annual-status.dto';

const annualStatusInclude: Prisma.AnnualStatusLookupInclude = {
  _count: {
    select: {
      annualGrades: true,
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

@Injectable()
export class AnnualStatusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateAnnualStatusDto, actorUserId: string) {
    const normalizedCode = this.normalizeCode(payload.code);
    const normalizedName = this.normalizeRequiredText(payload.name, 'name');

    try {
      const annualStatus = await this.prisma.annualStatusLookup.create({
        data: {
          code: normalizedCode,
          name: normalizedName,
          description: payload.description?.trim(),
          isSystem: payload.isSystem ?? false,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: annualStatusInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ANNUAL_STATUS_CREATE',
        resource: 'annual-statuses',
        resourceId: annualStatus.id,
        details: {
          code: annualStatus.code,
          name: annualStatus.name,
        },
      });

      return annualStatus;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'ANNUAL_STATUS_CREATE_FAILED',
        resource: 'annual-statuses',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListAnnualStatusesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AnnualStatusLookupWhereInput = {
      deletedAt: null,
      isSystem: query.isSystem,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              code: {
                contains: query.search,
              },
            },
            {
              name: {
                contains: query.search,
              },
            },
            {
              description: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.annualStatusLookup.count({ where }),
      this.prisma.annualStatusLookup.findMany({
        where,
        include: annualStatusInclude,
        orderBy: [{ isSystem: 'desc' }, { code: 'asc' }],
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
    const annualStatus = await this.prisma.annualStatusLookup.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: annualStatusInclude,
    });

    if (!annualStatus) {
      throw new NotFoundException('لم يتم العثور على الحالة السنوية');
    }

    return annualStatus;
  }

  async update(
    id: string,
    payload: UpdateAnnualStatusDto,
    actorUserId: string,
  ) {
    const annualStatus = await this.ensureAnnualStatusExists(id);

    if (
      annualStatus.isSystem &&
      payload.code &&
      payload.code !== annualStatus.code
    ) {
      throw new ConflictException(
        'لا يمكن تعديل رمز الحالة السنوية النظامية',
      );
    }

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedName =
      payload.name === undefined
        ? undefined
        : this.normalizeRequiredText(payload.name, 'name');

    try {
      const updated = await this.prisma.annualStatusLookup.update({
        where: {
          id,
        },
        data: {
          code: normalizedCode,
          name: normalizedName,
          description: payload.description?.trim(),
          isSystem: payload.isSystem,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: annualStatusInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'ANNUAL_STATUS_UPDATE',
        resource: 'annual-statuses',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const annualStatus = await this.ensureAnnualStatusExists(id);

    if (annualStatus.isSystem) {
      throw new ConflictException('لا يمكن حذف حالة سنوية من النظام');
    }

    const linkedAnnualGrades = await this.prisma.annualGrade.count({
      where: {
        finalStatusId: id,
        deletedAt: null,
      },
    });

    if (linkedAnnualGrades > 0) {
      throw new ConflictException(
        'Cannot delete annual status that is linked to active annual grades',
      );
    }

    await this.prisma.annualStatusLookup.update({
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
      action: 'ANNUAL_STATUS_DELETE',
      resource: 'annual-statuses',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureAnnualStatusExists(
    id: string,
  ): Promise<AnnualStatusLookup> {
    const annualStatus = await this.prisma.annualStatusLookup.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!annualStatus) {
      throw new NotFoundException('لم يتم العثور على الحالة السنوية');
    }

    return annualStatus;
  }

  private normalizeCode(code: string): string {
    const normalized = code.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('لا يمكن أن يكون الرمز فارغًا');
    }

    return normalized;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`لا يمكن أن يكون ${fieldName} فارغًا`);
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('رمز الحالة السنوية موجود مسبقًا');
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

