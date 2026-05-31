import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { generateAutoCode } from '../../../common/utils/auto-code';
import { CreateHomeworkTemplateDto } from './dto/create-homework-template.dto';
import { ListHomeworkTemplatesDto } from './dto/list-homework-templates.dto';
import { UpdateHomeworkTemplateDto } from './dto/update-homework-template.dto';

const homeworkTemplateInclude: Prisma.HomeworkTemplateInclude = {
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
export class HomeworkTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateHomeworkTemplateDto, actorUserId: string) {
    const normalizedCode = payload.code
      ? this.normalizeCode(payload.code)
      : generateAutoCode('HWTPL', 50);
    const normalizedName = this.normalizeRequiredText(payload.name, 'name');
    const normalizedTitle = this.normalizeRequiredText(payload.title, 'title');

    try {
      const template = await this.prisma.homeworkTemplate.create({
        data: {
          code: normalizedCode,
          name: normalizedName,
          title: normalizedTitle,
          content: payload.content?.trim(),
          maxScore: payload.maxScore ?? 10,
          notes: payload.notes?.trim(),
          homeworkTypeId: payload.homeworkTypeId,
          subjectId: payload.subjectId,
          gradeLevelId: payload.gradeLevelId,
          isSystem: payload.isSystem ?? false,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: homeworkTemplateInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_TEMPLATE_CREATE',
        resource: 'homework-templates',
        resourceId: template.id,
        details: {
          code: template.code,
          name: template.name,
        },
      });

      return template;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_TEMPLATE_CREATE_FAILED',
        resource: 'homework-templates',
        status: AuditStatus.FAILURE,
        details: {
          code: normalizedCode,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListHomeworkTemplatesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.HomeworkTemplateWhereInput = {
      deletedAt: null,
      homeworkTypeId: query.homeworkTypeId,
      subjectId: query.subjectId,
      gradeLevelId: query.gradeLevelId,
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
              title: {
                contains: query.search,
              },
            },
            {
              notes: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.homeworkTemplate.count({ where }),
      this.prisma.homeworkTemplate.findMany({
        where,
        include: homeworkTemplateInclude,
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
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

  async update(
    id: string,
    payload: UpdateHomeworkTemplateDto,
    actorUserId: string,
  ) {
    await this.ensureTemplateExists(id);

    try {
      const template = await this.prisma.homeworkTemplate.update({
        where: {
          id,
        },
        data: {
          code: payload.code ? this.normalizeCode(payload.code) : undefined,
          name:
            payload.name === undefined
              ? undefined
              : this.normalizeRequiredText(payload.name, 'name'),
          title:
            payload.title === undefined
              ? undefined
              : this.normalizeRequiredText(payload.title, 'title'),
          content: payload.content?.trim(),
          maxScore: payload.maxScore,
          notes: payload.notes?.trim(),
          homeworkTypeId: payload.homeworkTypeId,
          subjectId: payload.subjectId,
          gradeLevelId: payload.gradeLevelId,
          isSystem: payload.isSystem,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: homeworkTemplateInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'HOMEWORK_TEMPLATE_UPDATE',
        resource: 'homework-templates',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return template;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureTemplateExists(id);

    await this.prisma.homeworkTemplate.update({
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
      action: 'HOMEWORK_TEMPLATE_DELETE',
      resource: 'homework-templates',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureTemplateExists(id: string) {
    const template = await this.prisma.homeworkTemplate.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundException('لم يتم العثور على قالب الواجب');
    }

    return template;
  }

  private normalizeCode(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('لا يمكن أن يكون code فارغًا');
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
      throw new ConflictException('كود قالب الواجب مستخدم مسبقًا');
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
