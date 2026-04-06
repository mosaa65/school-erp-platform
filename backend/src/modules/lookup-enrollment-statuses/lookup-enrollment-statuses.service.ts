import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { generateAutoCode } from '../../common/utils/auto-code';
import { CreateLookupEnrollmentStatusDto } from './dto/create-lookup-enrollment-status.dto';
import { ListLookupEnrollmentStatusesDto } from './dto/list-lookup-enrollment-statuses.dto';
import { UpdateLookupEnrollmentStatusDto } from './dto/update-lookup-enrollment-status.dto';

const lookupEnrollmentStatusInclude: Prisma.LookupEnrollmentStatusInclude = {
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
export class LookupEnrollmentStatusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateLookupEnrollmentStatusDto, actorUserId: string) {
    const normalizedCode = payload.code
      ? this.normalizeCode(payload.code)
      : generateAutoCode('ENR', 50);
    const normalizedNameAr = this.normalizeRequiredText(
      payload.nameAr,
      'nameAr',
    );

    try {
      const enrollmentStatus = await this.prisma.lookupEnrollmentStatus.create({
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: lookupEnrollmentStatusInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ENROLLMENT_STATUS_CREATE',
        resource: 'lookup-enrollment-statuses',
        resourceId: String(enrollmentStatus.id),
        details: {
          code: enrollmentStatus.code,
          nameAr: enrollmentStatus.nameAr,
        },
      });

      return enrollmentStatus;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ENROLLMENT_STATUS_CREATE_FAILED',
        resource: 'lookup-enrollment-statuses',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListLookupEnrollmentStatusesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const deletedOnly = query.deletedOnly ?? false;

    const where: Prisma.LookupEnrollmentStatusWhereInput = {
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
      this.prisma.lookupEnrollmentStatus.count({ where }),
      this.prisma.lookupEnrollmentStatus.findMany({
        where,
        include: lookupEnrollmentStatusInclude,
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
    const enrollmentStatus = await this.prisma.lookupEnrollmentStatus.findFirst(
      {
        where: {
          id,
          deletedAt: null,
        },
        include: lookupEnrollmentStatusInclude,
      },
    );

    if (!enrollmentStatus) {
      throw new NotFoundException('Enrollment status not found');
    }

    return enrollmentStatus;
  }

  async update(
    id: number,
    payload: UpdateLookupEnrollmentStatusDto,
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
      const updated = await this.prisma.lookupEnrollmentStatus.update({
        where: { id },
        data: {
          code: normalizedCode,
          nameAr: normalizedNameAr,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: lookupEnrollmentStatusInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'LOOKUP_ENROLLMENT_STATUS_UPDATE',
        resource: 'lookup-enrollment-statuses',
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

    await this.prisma.lookupEnrollmentStatus.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'LOOKUP_ENROLLMENT_STATUS_DELETE',
      resource: 'lookup-enrollment-statuses',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureLookupItemExists(id: number) {
    const enrollmentStatus = await this.prisma.lookupEnrollmentStatus.findFirst(
      {
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
    );

    if (!enrollmentStatus) {
      throw new NotFoundException('Enrollment status not found');
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
      throw new ConflictException('Enrollment status code already exists');
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
