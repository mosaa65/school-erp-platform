import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, HomeworkType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { generateAutoCode } from '../../common/utils/auto-code';
import { CreateHomeworkTypeDto } from './dto/create-homework-type.dto';
import { ListHomeworkTypesDto } from './dto/list-homework-types.dto';
import { UpdateHomeworkTypeDto } from './dto/update-homework-type.dto';

const homeworkTypeInclude: Prisma.HomeworkTypeInclude = {
  _count: {
    select: {
      homeworks: true,
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
export class HomeworkTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateHomeworkTypeDto, actorUserId: string) {
    const normalizedCode = payload.code
      ? this.normalizeCode(payload.code)
      : generateAutoCode('HWT', 40);
    const normalizedName = this.normalizeRequiredText(payload.name, 'name');

    try {
      const homeworkType = await this.prisma.homeworkType.create({
        data: {
          code: normalizedCode,
          name: normalizedName,
          description: payload.description?.trim(),
          isSystem: payload.isSystem ?? false,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: homeworkTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_TYPE_CREATE',
        resource: 'homework-types',
        resourceId: homeworkType.id,
        details: {
          code: homeworkType.code,
          name: homeworkType.name,
        },
      });

      return homeworkType;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_TYPE_CREATE_FAILED',
        resource: 'homework-types',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListHomeworkTypesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.HomeworkTypeWhereInput = {
      deletedAt: null,
      isSystem: query.isSystem,
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
      this.prisma.homeworkType.count({ where }),
      this.prisma.homeworkType.findMany({
        where,
        include: homeworkTypeInclude,
        orderBy: [{ isSystem: 'desc' }, { code: 'asc' }],
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
    const homeworkType = await this.prisma.homeworkType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: homeworkTypeInclude,
    });

    if (!homeworkType) {
      throw new NotFoundException('لم يتم العثور على نوع الواجب');
    }

    return homeworkType;
  }

  async update(
    id: string,
    payload: UpdateHomeworkTypeDto,
    actorUserId: string,
  ) {
    await this.ensureHomeworkTypeExists(id);

    const normalizedCode =
      payload.code === undefined ? undefined : this.normalizeCode(payload.code);
    const normalizedName =
      payload.name === undefined
        ? undefined
        : this.normalizeRequiredText(payload.name, 'name');

    try {
      const homeworkType = await this.prisma.homeworkType.update({
        where: {
          id,
        },
        data: {
          code: normalizedCode,
          name: normalizedName,
          description: payload.description?.trim(),
          isSystem: payload.isSystem,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: homeworkTypeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_TYPE_UPDATE',
        resource: 'homework-types',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return homeworkType;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    const homeworkType = await this.ensureHomeworkTypeExists(id);

    if (homeworkType.isSystem) {
      throw new ConflictException('لا يمكن حذف نوع واجب من النظام');
    }

    const linkedHomeworksCount = await this.prisma.homework.count({
      where: {
        homeworkTypeId: id,
        deletedAt: null,
      },
    });

    if (linkedHomeworksCount > 0) {
      throw new ConflictException(
        'Cannot delete homework type that is linked to active homework records',
      );
    }

    await this.prisma.homeworkType.update({
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
      action: 'HOMEWORK_TYPE_DELETE',
      resource: 'homework-types',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureHomeworkTypeExists(id: string): Promise<HomeworkType> {
    const homeworkType = await this.prisma.homeworkType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!homeworkType) {
      throw new NotFoundException('لم يتم العثور على نوع الواجب');
    }

    return homeworkType;
  }

  private normalizeCode(code: string): string {
    const normalized = code.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('لا يمكن أن يكون الرمز فارغًا');
    }

    return normalized;
  }

  private normalizeRequiredText(value: string, fieldName: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`لا يمكن أن يكون ${fieldName} فارغًا`);
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('رمز نوع الواجب موجود مسبقًا');
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'خطأ غير معروف';
  }
}
