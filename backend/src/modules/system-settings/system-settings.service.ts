import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, type SystemSetting } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BranchModeService } from '../../common/branch-mode/branch-mode.service';
import { CreateSystemSettingDto } from './dto/create-system-setting.dto';
import { ListSystemSettingsDto } from './dto/list-system-settings.dto';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';

/** مفاتيح إعدادات الفروع التي تستدعي مسح الـ Cache عند تعديلها */
const BRANCH_SETTING_KEYS = ['multi_branch_mode', 'default_branch_id'] as const;

const systemSettingInclude: Prisma.SystemSettingInclude = {
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
export class SystemSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly branchModeService: BranchModeService,
  ) {}

  async create(payload: CreateSystemSettingDto, actorUserId: string) {
    const settingKey = this.normalizeSettingKey(payload.settingKey);

    try {
      const item = await this.prisma.systemSetting.create({
        data: {
          settingKey,
          settingValue: payload.settingValue,
          settingType: payload.settingType,
          category: payload.category,
          description: payload.description,
          isEditable: payload.isEditable ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: systemSettingInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'SYSTEM_SETTING_CREATE',
        resource: 'system-settings',
        resourceId: String(item.id),
        details: {
          settingKey: item.settingKey,
          settingType: item.settingType,
        },
      });

      return item;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'SYSTEM_SETTING_CREATE_FAILED',
        resource: 'system-settings',
        status: AuditStatus.FAILURE,
        details: {
          settingKey,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Branch Feature Flag API
  // ─────────────────────────────────────────────────────────────

  /**
   * يُعيد حالة ميزة الفروع المتعددة للفرونت أند.
   * لا يتطلب صلاحية خاصة — أي مستخدم مسجَّل يمكنه قراءتها.
   */
  async getBranchConfig(): Promise<{
    isMultiBranchEnabled: boolean;
    defaultBranchId: number | null;
  }> {
    const [isMultiBranchEnabled, defaultBranchId] = await Promise.all([
      this.branchModeService.isMultiBranchEnabled(),
      this.branchModeService.getDefaultBranchId(),
    ]);

    return { isMultiBranchEnabled, defaultBranchId };
  }

  async findAll(query: ListSystemSettingsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.SystemSettingWhereInput = {
      deletedAt: null,
      category: query.category,
      settingType: query.settingType,
      isEditable: query.isEditable,
      OR: query.search
        ? [
            { settingKey: { contains: query.search } },
            { settingValue: { contains: query.search } },
            { category: { contains: query.search } },
            { description: { contains: query.search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.systemSetting.count({ where }),
      this.prisma.systemSetting.findMany({
        where,
        include: systemSettingInclude,
        orderBy: [
          {
            category: 'asc',
          },
          {
            settingKey: 'asc',
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

  async findOne(id: number) {
    const item = await this.prisma.systemSetting.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: systemSettingInclude,
    });

    if (!item) {
      throw new NotFoundException('System setting not found');
    }

    return item;
  }

  async update(
    id: number,
    payload: UpdateSystemSettingDto,
    actorUserId: string,
  ) {
    await this.ensureExists(id);

    try {
      const item = await this.prisma.systemSetting.update({
        where: { id },
        data: {
          settingValue: payload.settingValue,
          settingType: payload.settingType,
          category: payload.category,
          description: payload.description,
          isEditable: payload.isEditable,
          updatedById: actorUserId,
        },
        include: systemSettingInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'SYSTEM_SETTING_UPDATE',
        resource: 'system-settings',
        resourceId: String(id),
        details: payload as Prisma.InputJsonValue,
      });

      // مسح الـ Cache إذا كان الإعداد المُعدَّل يخص الفروع
      if ((BRANCH_SETTING_KEYS as readonly string[]).includes(item.settingKey)) {
        this.branchModeService.invalidateCache();
      }

      return item;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: number, actorUserId: string) {
    await this.ensureExists(id);

    await this.prisma.systemSetting.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'SYSTEM_SETTING_DELETE',
      resource: 'system-settings',
      resourceId: String(id),
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureExists(id: number): Promise<SystemSetting> {
    const item = await this.prisma.systemSetting.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!item) {
      throw new NotFoundException('System setting not found');
    }

    return item;
  }

  private normalizeSettingKey(value: string): string {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException('settingKey cannot be empty');
    }

    return normalized;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('settingKey must be unique');
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
