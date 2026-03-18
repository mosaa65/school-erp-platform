import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateLookupGradeDescriptionDto } from './dto/create-lookup-grade-description.dto';
import { ListLookupGradeDescriptionsDto } from './dto/list-lookup-grade-descriptions.dto';
import { UpdateLookupGradeDescriptionDto } from './dto/update-lookup-grade-description.dto';

const lookupGradeDescriptionInclude: Prisma.LookupGradeDescriptionInclude = {
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
export class LookupGradeDescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateLookupGradeDescriptionDto, actorUserId: string) {
    this.validateRange(payload.minPercentage, payload.maxPercentage);
    const normalizedNameAr = this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const normalizedNameEn = this.normalizeOptionalText(payload.nameEn);
    const normalizedColorCode = this.normalizeOptionalText(payload.colorCode);

    try {
      const gradeDescription = await this.prisma.lookupGradeDescription.create({
        data: {
          minPercentage: payload.minPercentage,
          maxPercentage: payload.maxPercentage,
          nameAr: normalizedNameAr,
          nameEn: normalizedNameEn,
          colorCode: normalizedColorCode,
          sortOrder: payload.sortOrder ?? 1,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: lookupGradeDescriptionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_GRADE_DESCRIPTION_CREATE',
        resource: 'lookup-grade-descriptions',
        resourceId: String(gradeDescription.id),
        details: {
          minPercentage: Number(gradeDescription.minPercentage),
          maxPercentage: Number(gradeDescription.maxPercentage),
          nameAr: gradeDescription.nameAr,
        },
      });

      return gradeDescription;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_GRADE_DESCRIPTION_CREATE_FAILED',
        resource: 'lookup-grade-descriptions',
        status: AuditStatus.FAILURE,
        details: {
          minPercentage: payload.minPercentage,
          maxPercentage: payload.maxPercentage,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListLookupGradeDescriptionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const deletedOnly = query.deletedOnly ?? false;

    const where: Prisma.LookupGradeDescriptionWhereInput = {
      deletedAt: deletedOnly ? { not: null } : null,
      isActive: deletedOnly ? undefined : query.isActive,
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
      this.prisma.lookupGradeDescription.count({ where }),
      this.prisma.lookupGradeDescription.findMany({
        where,
        include: lookupGradeDescriptionInclude,
        orderBy: [{ sortOrder: 'asc' }, { minPercentage: 'desc' }],
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
    const gradeDescription = await this.prisma.lookupGradeDescription.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: lookupGradeDescriptionInclude,
    });

    if (!gradeDescription) {
      throw new NotFoundException('Grade description not found');
    }

    return gradeDescription;
  }

  async update(
    id: number,
    payload: UpdateLookupGradeDescriptionDto,
    actorUserId: string,
  ) {
    const current = await this.ensureLookupItemExists(id);

    const minPercentage = payload.minPercentage ?? Number(current.minPercentage);
    const maxPercentage = payload.maxPercentage ?? Number(current.maxPercentage);
    this.validateRange(minPercentage, maxPercentage);

    const normalizedNameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const normalizedNameEn =
      payload.nameEn === undefined
        ? undefined
        : this.normalizeOptionalText(payload.nameEn);
    const normalizedColorCode =
      payload.colorCode === undefined
        ? undefined
        : this.normalizeOptionalText(payload.colorCode);

    try {
      const updated = await this.prisma.lookupGradeDescription.update({
        where: { id },
        data: {
          minPercentage: payload.minPercentage,
          maxPercentage: payload.maxPercentage,
          nameAr: normalizedNameAr,
          nameEn: normalizedNameEn,
          colorCode: normalizedColorCode,
          sortOrder: payload.sortOrder,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: lookupGradeDescriptionInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_GRADE_DESCRIPTION_UPDATE',
        resource: 'lookup-grade-descriptions',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureLookupItemExists(id);

    await this.prisma.lookupGradeDescription.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'LOOKUP_GRADE_DESCRIPTION_DELETE',
      resource: 'lookup-grade-descriptions',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureLookupItemExists(id: number) {
    const gradeDescription = await this.prisma.lookupGradeDescription.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        minPercentage: true,
        maxPercentage: true,
      },
    });

    if (!gradeDescription) {
      throw new NotFoundException('Grade description not found');
    }

    return gradeDescription;
  }

  private validateRange(minPercentage: number, maxPercentage: number) {
    if (maxPercentage < minPercentage) {
      throw new BadRequestException(
        'maxPercentage must be greater than or equal to minPercentage',
      );
    }
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} cannot be empty`);
    }

    return normalized;
  }

  private normalizeOptionalText(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A grade description with the same percentage range already exists',
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
