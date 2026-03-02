import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Guardian, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { ListGuardiansDto } from './dto/list-guardians.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';

const guardianInclude: Prisma.GuardianInclude = {
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
  idType: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      isActive: true,
    },
  },
  students: {
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      isPrimary: true,
      relationship: true,
      student: {
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
};

@Injectable()
export class GuardiansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateGuardianDto, actorUserId: string) {
    const fullName = payload.fullName.trim();

    if (payload.idTypeId !== undefined && payload.idTypeId !== null) {
      await this.ensureIdTypeExists(payload.idTypeId);
    }

    try {
      const guardian = await this.prisma.guardian.create({
        data: {
          fullName,
          gender: payload.gender,
          idNumber: payload.idNumber,
          idTypeId: payload.idTypeId === null ? null : payload.idTypeId,
          phonePrimary: payload.phonePrimary,
          phoneSecondary: payload.phoneSecondary,
          whatsappNumber: payload.whatsappNumber,
          residenceText: payload.residenceText,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: guardianInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GUARDIAN_CREATE',
        resource: 'guardians',
        resourceId: guardian.id,
        details: {
          fullName: guardian.fullName,
          phonePrimary: guardian.phonePrimary,
        },
      });

      return guardian;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'GUARDIAN_CREATE_FAILED',
        resource: 'guardians',
        status: AuditStatus.FAILURE,
        details: {
          fullName,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListGuardiansDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.GuardianWhereInput = {
      deletedAt: null,
      gender: query.gender,
      idTypeId: query.idTypeId,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              fullName: {
                contains: query.search,
              },
            },
            {
              phonePrimary: {
                contains: query.search,
              },
            },
            {
              whatsappNumber: {
                contains: query.search,
              },
            },
            {
              idNumber: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.guardian.count({ where }),
      this.prisma.guardian.findMany({
        where,
        include: guardianInclude,
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

  async findOne(id: string) {
    const guardian = await this.prisma.guardian.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: guardianInclude,
    });

    if (!guardian) {
      throw new NotFoundException('Guardian not found');
    }

    return guardian;
  }

  async update(id: string, payload: UpdateGuardianDto, actorUserId: string) {
    await this.ensureGuardianExists(id);

    if (payload.idTypeId !== undefined && payload.idTypeId !== null) {
      await this.ensureIdTypeExists(payload.idTypeId);
    }

    try {
      const guardian = await this.prisma.guardian.update({
        where: {
          id,
        },
        data: {
          fullName: payload.fullName?.trim(),
          gender: payload.gender,
          idNumber: payload.idNumber,
          idTypeId: payload.idTypeId === null ? null : payload.idTypeId,
          phonePrimary: payload.phonePrimary,
          phoneSecondary: payload.phoneSecondary,
          whatsappNumber: payload.whatsappNumber,
          residenceText: payload.residenceText,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: guardianInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GUARDIAN_UPDATE',
        resource: 'guardians',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return guardian;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureGuardianExists(id);

    await this.prisma.guardian.update({
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
      action: 'GUARDIAN_DELETE',
      resource: 'guardians',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async ensureGuardianExistsAndActive(id: string) {
    const guardian = await this.prisma.guardian.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian not found');
    }

    if (!guardian.isActive) {
      throw new ConflictException('Guardian is inactive');
    }

    return guardian;
  }

  private async ensureGuardianExists(id: string): Promise<Guardian> {
    const guardian = await this.prisma.guardian.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian not found');
    }

    return guardian;
  }

  private async ensureIdTypeExists(idTypeId: number) {
    const idType = await this.prisma.lookupIdType.findFirst({
      where: {
        id: idTypeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!idType) {
      throw new BadRequestException('idTypeId is not valid');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Guardian unique field conflict');
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
