import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateLookupIdTypeDto } from './dto/create-lookup-id-type.dto';
import { ListLookupIdTypesDto } from './dto/list-lookup-id-types.dto';
import { UpdateLookupIdTypeDto } from './dto/update-lookup-id-type.dto';

const lookupIdTypeInclude: Prisma.LookupIdTypeInclude = {
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
export class LookupIdTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateLookupIdTypeDto, actorUserId: string) {
    const normalizedCode = this.normalizeCode(payload.code);
    const normalizedNameAr = this.normalizeRequiredText(
      payload.nameAr,
      'nameAr',
    );

    try {
      const idType = await this.prisma.lookupIdType.create({
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: lookupIdTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ID_TYPE_CREATE',
        resource: 'lookup-id-types',
        resourceId: String(idType.id),
        details: {
          code: idType.code,
          nameAr: idType.nameAr,
        },
      });

      return idType;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ID_TYPE_CREATE_FAILED',
        resource: 'lookup-id-types',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListLookupIdTypesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LookupIdTypeWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
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
      this.prisma.lookupIdType.count({ where }),
      this.prisma.lookupIdType.findMany({
        where,
        include: lookupIdTypeInclude,
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
    const idType = await this.prisma.lookupIdType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: lookupIdTypeInclude,
    });

    if (!idType) {
      throw new NotFoundException('ID type not found');
    }

    return idType;
  }

  async update(
    id: number,
    payload: UpdateLookupIdTypeDto,
    actorUserId: string,
  ) {
    await this.ensureIdTypeExists(id);

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedNameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const updated = await this.prisma.lookupIdType.update({
        where: { id },
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: lookupIdTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ID_TYPE_UPDATE',
        resource: 'lookup-id-types',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureIdTypeExists(id);

    await this.prisma.lookupIdType.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'LOOKUP_ID_TYPE_DELETE',
      resource: 'lookup-id-types',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureIdTypeExists(id: number) {
    const idType = await this.prisma.lookupIdType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!idType) {
      throw new NotFoundException('ID type not found');
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
      throw new ConflictException('ID type code already exists');
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
