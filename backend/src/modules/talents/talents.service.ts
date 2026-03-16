import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, Talent } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateTalentDto } from './dto/create-talent.dto';
import { ListTalentsDto } from './dto/list-talents.dto';
import { UpdateTalentDto } from './dto/update-talent.dto';

const talentInclude = {
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
} as const;

@Injectable()
export class TalentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateTalentDto, actorUserId: string) {
    try {
      const talent = await this.prisma.talent.create({
        data: {
          code: payload.code,
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: talentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'TALENT_CREATE',
        resource: 'talents',
        resourceId: talent.id,
        details: {
          code: talent.code,
          name: talent.name,
        },
      });

      return talent;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'TALENT_CREATE_FAILED',
        resource: 'talents',
        status: AuditStatus.FAILURE,
        details: {
          code: payload.code,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListTalentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TalentWhereInput = {
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
      this.prisma.talent.count({ where }),
      this.prisma.talent.findMany({
        where,
        include: talentInclude,
        orderBy: [
          {
            name: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
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
    const talent = await this.prisma.talent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: talentInclude,
    });

    if (!talent) {
      throw new NotFoundException('Talent not found');
    }

    return talent;
  }

  async update(id: string, payload: UpdateTalentDto, actorUserId: string) {
    await this.ensureTalentExists(id);

    try {
      const talent = await this.prisma.talent.update({
        where: {
          id,
        },
        data: {
          code: payload.code,
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: talentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'TALENT_UPDATE',
        resource: 'talents',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return talent;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureTalentExists(id);

    await this.prisma.talent.update({
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
      action: 'TALENT_DELETE',
      resource: 'talents',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async ensureTalentExistsAndActive(id: string) {
    const talent = await this.prisma.talent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!talent) {
      throw new NotFoundException('Talent not found');
    }

    if (!talent.isActive) {
      throw new ConflictException('Talent is inactive');
    }

    return talent;
  }

  private async ensureTalentExists(id: string): Promise<Talent> {
    const talent = await this.prisma.talent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!talent) {
      throw new NotFoundException('Talent not found');
    }

    return talent;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Talent code must be unique');
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
