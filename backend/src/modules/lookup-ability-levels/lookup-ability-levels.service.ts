import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateLookupAbilityLevelDto } from './dto/create-lookup-ability-level.dto';
import { ListLookupAbilityLevelsDto } from './dto/list-lookup-ability-levels.dto';
import { UpdateLookupAbilityLevelDto } from './dto/update-lookup-ability-level.dto';

const lookupAbilityLevelInclude: Prisma.LookupAbilityLevelInclude = {
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
export class LookupAbilityLevelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateLookupAbilityLevelDto, actorUserId: string) {
    const normalizedCode = this.normalizeCode(payload.code);
    const normalizedNameAr = this.normalizeRequiredText(
      payload.nameAr,
      'nameAr',
    );

    try {
      const abilityLevel = await this.prisma.lookupAbilityLevel.create({
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: lookupAbilityLevelInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ABILITY_LEVEL_CREATE',
        resource: 'lookup-ability-levels',
        resourceId: String(abilityLevel.id),
        details: {
          code: abilityLevel.code,
          nameAr: abilityLevel.nameAr,
        },
      });

      return abilityLevel;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ABILITY_LEVEL_CREATE_FAILED',
        resource: 'lookup-ability-levels',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListLookupAbilityLevelsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LookupAbilityLevelWhereInput = {
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
      this.prisma.lookupAbilityLevel.count({ where }),
      this.prisma.lookupAbilityLevel.findMany({
        where,
        include: lookupAbilityLevelInclude,
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
    const abilityLevel = await this.prisma.lookupAbilityLevel.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: lookupAbilityLevelInclude,
    });

    if (!abilityLevel) {
      throw new NotFoundException('Ability level not found');
    }

    return abilityLevel;
  }

  async update(
    id: number,
    payload: UpdateLookupAbilityLevelDto,
    actorUserId: string,
  ) {
    await this.ensureLookupItemExists(id);

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedNameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');

    try {
      const updated = await this.prisma.lookupAbilityLevel.update({
        where: { id },
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: lookupAbilityLevelInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ABILITY_LEVEL_UPDATE',
        resource: 'lookup-ability-levels',
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

    await this.prisma.lookupAbilityLevel.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'LOOKUP_ABILITY_LEVEL_DELETE',
      resource: 'lookup-ability-levels',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureLookupItemExists(id: number) {
    const abilityLevel = await this.prisma.lookupAbilityLevel.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!abilityLevel) {
      throw new NotFoundException('Ability level not found');
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
      throw new ConflictException('Ability level code already exists');
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
