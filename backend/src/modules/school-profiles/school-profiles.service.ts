import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { generateAutoCode } from '../../common/utils/auto-code';
import { CreateSchoolProfileDto } from './dto/create-school-profile.dto';
import { ListSchoolProfilesDto } from './dto/list-school-profiles.dto';
import { UpdateSchoolProfileDto } from './dto/update-school-profile.dto';

const schoolProfileInclude: Prisma.SchoolProfileInclude = {
  ownershipType: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      isActive: true,
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
export class SchoolProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateSchoolProfileDto, actorUserId: string) {
    const normalizedCode =
      payload.code?.trim().toLowerCase() ||
      generateAutoCode('SCHOOL').toLowerCase();
    const normalizedNameAr = this.normalizeRequiredText(
      payload.nameAr,
      'nameAr',
    );
    const normalizedNameEn = payload.nameEn?.trim();
    const normalizedPhone = payload.phone?.trim();
    const normalizedEmail = payload.email?.trim().toLowerCase();
    const normalizedAddress = payload.addressText?.trim();

    if (payload.ownershipTypeId !== undefined) {
      await this.ensureOwnershipTypeExists(payload.ownershipTypeId);
    }

    try {
      const schoolProfile = await this.prisma.schoolProfile.create({
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          nameEn: normalizedNameEn,
          ownershipTypeId: payload.ownershipTypeId,
          phone: normalizedPhone,
          email: normalizedEmail,
          addressText: normalizedAddress,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: schoolProfileInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'SCHOOL_PROFILE_CREATE',
        resource: 'school-profiles',
        resourceId: schoolProfile.id,
        details: {
          code: schoolProfile.code,
          nameAr: schoolProfile.nameAr,
        },
      });

      return schoolProfile;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListSchoolProfilesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const deletedOnly = query.deletedOnly ?? false;

    const where: Prisma.SchoolProfileWhereInput = {
      deletedAt: deletedOnly ? { not: null } : null,
      ownershipTypeId: query.ownershipTypeId,
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
            {
              nameEn: {
                contains: query.search,
              },
            },
            {
              email: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.schoolProfile.count({ where }),
      this.prisma.schoolProfile.findMany({
        where,
        include: schoolProfileInclude,
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

  async findOne(id: string) {
    const schoolProfile = await this.prisma.schoolProfile.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: schoolProfileInclude,
    });

    if (!schoolProfile) {
      throw new NotFoundException('School profile not found');
    }

    return schoolProfile;
  }

  async update(
    id: string,
    payload: UpdateSchoolProfileDto,
    actorUserId: string,
  ) {
    const schoolProfile = await this.ensureSchoolProfileExists(id);

    if (
      schoolProfile.code === 'default_school' &&
      payload.code !== undefined &&
      payload.code.trim().toLowerCase() !== 'default_school'
    ) {
      throw new ConflictException('default_school code cannot be changed');
    }

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedNameAr =
      payload.nameAr === undefined
        ? undefined
        : this.normalizeRequiredText(payload.nameAr, 'nameAr');
    const normalizedNameEn =
      payload.nameEn === undefined ? undefined : payload.nameEn.trim();
    const normalizedPhone =
      payload.phone === undefined ? undefined : payload.phone.trim();
    const normalizedEmail =
      payload.email === undefined
        ? undefined
        : payload.email.trim().toLowerCase();
    const normalizedAddress =
      payload.addressText === undefined
        ? undefined
        : payload.addressText.trim();

    if (payload.ownershipTypeId !== undefined) {
      await this.ensureOwnershipTypeExists(payload.ownershipTypeId);
    }

    try {
      const updated = await this.prisma.schoolProfile.update({
        where: { id },
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          nameEn: normalizedNameEn,
          ownershipTypeId: payload.ownershipTypeId,
          phone: normalizedPhone,
          email: normalizedEmail,
          addressText: normalizedAddress,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: schoolProfileInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'SCHOOL_PROFILE_UPDATE',
        resource: 'school-profiles',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return updated;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const schoolProfile = await this.ensureSchoolProfileExists(id);

    if (schoolProfile.code === 'default_school') {
      throw new ConflictException('default_school profile cannot be deleted');
    }

    await this.prisma.schoolProfile.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'SCHOOL_PROFILE_DELETE',
      resource: 'school-profiles',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureSchoolProfileExists(id: string) {
    const schoolProfile = await this.prisma.schoolProfile.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!schoolProfile) {
      throw new NotFoundException('School profile not found');
    }

    return schoolProfile;
  }

  private async ensureOwnershipTypeExists(ownershipTypeId: number) {
    const ownershipType = await this.prisma.lookupOwnershipType.findFirst({
      where: {
        id: ownershipTypeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!ownershipType) {
      throw new BadRequestException('ownershipTypeId is not valid');
    }
  }

  private normalizeCode(code: string): string {
    const normalized = code.trim().toLowerCase();

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
      throw new ConflictException('School profile code already exists');
    }

    throw error;
  }
}
