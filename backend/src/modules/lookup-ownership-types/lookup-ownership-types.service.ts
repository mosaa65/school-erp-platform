import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateLookupOwnershipTypeDto } from './dto/create-lookup-ownership-type.dto';
import { ListLookupOwnershipTypesDto } from './dto/list-lookup-ownership-types.dto';
import { UpdateLookupOwnershipTypeDto } from './dto/update-lookup-ownership-type.dto';

const lookupOwnershipTypeInclude: Prisma.LookupOwnershipTypeInclude = {
  _count: {
    select: {
      schoolProfiles: true,
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
export class LookupOwnershipTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateLookupOwnershipTypeDto, actorUserId: string) {
    const normalizedCode = this.normalizeCode(payload.code);
    const normalizedNameAr = this.normalizeRequiredText(
      payload.nameAr,
      'nameAr',
    );

    try {
      const ownershipType = await this.prisma.lookupOwnershipType.create({
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: lookupOwnershipTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_OWNERSHIP_TYPE_CREATE',
        resource: 'lookup-ownership-types',
        resourceId: String(ownershipType.id),
        details: {
          code: ownershipType.code,
          nameAr: ownershipType.nameAr,
        },
      });

      return ownershipType;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_OWNERSHIP_TYPE_CREATE_FAILED',
        resource: 'lookup-ownership-types',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListLookupOwnershipTypesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const deletedOnly = query.deletedOnly ?? false;

    const where: Prisma.LookupOwnershipTypeWhereInput = {
      deletedAt: deletedOnly ? { not: null } : null,
      isActive: deletedOnly ? undefined : query.isActive,
      OR: query.search
        ? [
            {
              code: {
                contains: query.search,
              },
            },
            {
              nameAr: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.lookupOwnershipType.count({ where }),
      this.prisma.lookupOwnershipType.findMany({
        where,
        include: lookupOwnershipTypeInclude,
        orderBy: [{ code: 'asc' }],
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
    const ownershipType = await this.prisma.lookupOwnershipType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: lookupOwnershipTypeInclude,
    });

    if (!ownershipType) {
      throw new NotFoundException('Ownership type not found');
    }

    return ownershipType;
  }

  async update(
    id: number,
    payload: UpdateLookupOwnershipTypeDto,
    actorUserId: string,
  ) {
    await this.ensureOwnershipTypeExists(id);

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedNameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const updated = await this.prisma.lookupOwnershipType.update({
        where: { id },
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: lookupOwnershipTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_OWNERSHIP_TYPE_UPDATE',
        resource: 'lookup-ownership-types',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureOwnershipTypeExists(id);

    const linkedSchoolProfiles = await this.prisma.schoolProfile.count({
      where: {
        ownershipTypeId: id,
        deletedAt: null,
      },
    });

    if (linkedSchoolProfiles > 0) {
      throw new ConflictException(
        'Cannot delete ownership type linked to active school profiles',
      );
    }

    await this.prisma.lookupOwnershipType.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'LOOKUP_OWNERSHIP_TYPE_DELETE',
      resource: 'lookup-ownership-types',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureOwnershipTypeExists(id: number) {
    const ownershipType = await this.prisma.lookupOwnershipType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!ownershipType) {
      throw new NotFoundException('Ownership type not found');
    }
  }

  private normalizeCode(code: string): string {
    const normalized = code.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('code cannot be empty');
    }

    return normalized;
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
      throw new ConflictException('Ownership type code already exists');
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
