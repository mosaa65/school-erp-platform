import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Guardian, Prisma, StudentGender } from '@prisma/client';
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
  locality: {
    select: {
      id: true,
      nameAr: true,
      localityType: true,
      isActive: true,
    },
  },
  genderLookup: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      nameEn: true,
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

    if (payload.localityId !== undefined && payload.localityId !== null) {
      await this.ensureLocalityExists(payload.localityId);
    }

    const gender = await this.resolveGenderOnCreate(payload);

    try {
      const guardian = await this.prisma.guardian.create({
        data: {
          fullName,
          gender: gender.gender,
          genderId: gender.genderId,
          idNumber: payload.idNumber,
          idTypeId: payload.idTypeId === null ? null : payload.idTypeId,
          localityId: payload.localityId === null ? null : payload.localityId,
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
      genderId: query.genderId,
      idTypeId: query.idTypeId,
      localityId: query.localityId,
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
    const existing = await this.ensureGuardianExists(id);

    if (payload.idTypeId !== undefined && payload.idTypeId !== null) {
      await this.ensureIdTypeExists(payload.idTypeId);
    }

    if (payload.localityId !== undefined && payload.localityId !== null) {
      await this.ensureLocalityExists(payload.localityId);
    }

    const gender = await this.resolveGenderOnUpdate(existing, payload);

    try {
      const guardian = await this.prisma.guardian.update({
        where: {
          id,
        },
        data: {
          fullName: payload.fullName?.trim(),
          gender: gender.gender,
          genderId: gender.genderId,
          idNumber: payload.idNumber,
          idTypeId: payload.idTypeId === null ? null : payload.idTypeId,
          localityId: payload.localityId === null ? null : payload.localityId,
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

  private async ensureLocalityExists(localityId: number) {
    const locality = await this.prisma.locality.findFirst({
      where: {
        id: localityId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!locality) {
      throw new BadRequestException('localityId is not valid');
    }

    if (!locality.isActive) {
      throw new BadRequestException('localityId is inactive');
    }
  }

  private mapLookupGenderCodeToEnum(code: string): StudentGender {
    const normalized = code.trim().toUpperCase();

    if (
      normalized !== StudentGender.MALE &&
      normalized !== StudentGender.FEMALE &&
      normalized !== StudentGender.OTHER
    ) {
      throw new BadRequestException(
        `Unsupported lookup gender code for guardians: ${code}`,
      );
    }

    return normalized as StudentGender;
  }

  private async findGenderLookupByCode(code: string) {
    return this.prisma.lookupGender.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });
  }

  private async ensureGenderLookupExists(genderId: number) {
    const gender = await this.prisma.lookupGender.findFirst({
      where: {
        id: genderId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!gender) {
      throw new BadRequestException('genderId is not valid');
    }

    return gender;
  }

  private async resolveGenderOnCreate(payload: CreateGuardianDto) {
    if (payload.genderId !== undefined) {
      const lookup = await this.ensureGenderLookupExists(payload.genderId);
      const mappedGender = this.mapLookupGenderCodeToEnum(lookup.code);

      if (payload.gender && payload.gender !== mappedGender) {
        throw new BadRequestException(
          'gender and genderId do not refer to the same lookup value',
        );
      }

      return {
        gender: payload.gender ?? mappedGender,
        genderId: lookup.id,
      };
    }

    if (!payload.gender) {
      throw new BadRequestException('Either gender or genderId is required');
    }

    const lookup = await this.findGenderLookupByCode(payload.gender);
    return {
      gender: payload.gender,
      genderId: lookup?.id ?? null,
    };
  }

  private async resolveGenderOnUpdate(
    existing: Guardian,
    payload: UpdateGuardianDto,
  ) {
    if (payload.genderId !== undefined) {
      const lookup = await this.ensureGenderLookupExists(payload.genderId);
      const mappedGender = this.mapLookupGenderCodeToEnum(lookup.code);

      if (payload.gender && payload.gender !== mappedGender) {
        throw new BadRequestException(
          'gender and genderId do not refer to the same lookup value',
        );
      }

      return {
        gender: payload.gender ?? mappedGender,
        genderId: lookup.id,
      };
    }

    if (payload.gender !== undefined) {
      const lookup = await this.findGenderLookupByCode(payload.gender);

      return {
        gender: payload.gender,
        genderId: lookup?.id ?? existing.genderId ?? null,
      };
    }

    return {
      gender: existing.gender,
      genderId: existing.genderId ?? null,
    };
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
