import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateLookupBloodTypeDto } from './dto/create-lookup-blood-type.dto';
import { ListLookupBloodTypesDto } from './dto/list-lookup-blood-types.dto';
import { UpdateLookupBloodTypeDto } from './dto/update-lookup-blood-type.dto';

const lookupBloodTypeInclude: Prisma.LookupBloodTypeInclude = {
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
export class LookupBloodTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateLookupBloodTypeDto, actorUserId: string) {
    const normalizedName = this.normalizeName(payload.name);

    try {
      const bloodType = await this.prisma.lookupBloodType.create({
        data: {
          name: normalizedName,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: lookupBloodTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_BLOOD_TYPE_CREATE',
        resource: 'lookup-blood-types',
        resourceId: String(bloodType.id),
        details: {
          name: bloodType.name,
        },
      });

      return bloodType;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_BLOOD_TYPE_CREATE_FAILED',
        resource: 'lookup-blood-types',
        status: AuditStatus.FAILURE,
        details: {
          name: normalizedName,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListLookupBloodTypesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LookupBloodTypeWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              name: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.lookupBloodType.count({ where }),
      this.prisma.lookupBloodType.findMany({
        where,
        include: lookupBloodTypeInclude,
        orderBy: [{ name: 'asc' }],
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
    const bloodType = await this.prisma.lookupBloodType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: lookupBloodTypeInclude,
    });

    if (!bloodType) {
      throw new NotFoundException('Blood type not found');
    }

    return bloodType;
  }

  async update(
    id: number,
    payload: UpdateLookupBloodTypeDto,
    actorUserId: string,
  ) {
    await this.ensureBloodTypeExists(id);

    const normalizedName =
      payload.name === undefined ? undefined : this.normalizeName(payload.name);

    try {
      const updated = await this.prisma.lookupBloodType.update({
        where: { id },
        data: {
          name: normalizedName,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: lookupBloodTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_BLOOD_TYPE_UPDATE',
        resource: 'lookup-blood-types',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureBloodTypeExists(id);

    await this.prisma.lookupBloodType.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'LOOKUP_BLOOD_TYPE_DELETE',
      resource: 'lookup-blood-types',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureBloodTypeExists(id: number) {
    const bloodType = await this.prisma.lookupBloodType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!bloodType) {
      throw new NotFoundException('Blood type not found');
    }
  }

  private normalizeName(name: string): string {
    const normalized = name.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('name cannot be empty');
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Blood type name already exists');
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
