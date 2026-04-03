import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * BranchModeService
 *
 * قراءة إعداد "وضع الفروع المتعددة" من جدول system_settings.
 * يستخدم in-memory cache لتجنب استعلامات DB متكررة.
 * استدعِ invalidateCache() بعد أي تحديث على:
 *   - 'multi_branch_mode'
 *   - 'default_branch_id'
 */
@Injectable()
export class BranchModeService {
  private readonly logger = new Logger(BranchModeService.name);

  /** null = لم يُحمَّل بعد، true/false = قيمة محمَّلة */
  private _isMultiBranch: boolean | null = null;
  private _defaultBranchId: number | null | undefined = undefined; // undefined = لم يُحمَّل

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /**
   * هل وضع الفروع المتعددة مفعَّل؟
   * القيمة الافتراضية: false (مدرسة واحدة)
   */
  async isMultiBranchEnabled(): Promise<boolean> {
    if (this._isMultiBranch !== null) {
      return this._isMultiBranch;
    }

    const setting = await this.prisma.systemSetting.findUnique({
      where: { settingKey: 'multi_branch_mode' },
      select: { settingValue: true },
    });

    this._isMultiBranch = setting?.settingValue === 'true';

    this.logger.debug(
      `multi_branch_mode loaded from DB: ${this._isMultiBranch}`,
    );

    return this._isMultiBranch;
  }

  /**
   * الفرع الافتراضي في وضع المدرسة الواحدة.
   * يُعيد null إذا لم يُضبَط بعد.
   */
  async getDefaultBranchId(): Promise<number | null> {
    if (this._defaultBranchId !== undefined) {
      return this._defaultBranchId;
    }

    const setting = await this.prisma.systemSetting.findUnique({
      where: { settingKey: 'default_branch_id' },
      select: { settingValue: true },
    });

    const raw = setting?.settingValue;
    this._defaultBranchId =
      raw && !isNaN(Number(raw)) ? parseInt(raw, 10) : null;

    this.logger.debug(
      `default_branch_id loaded from DB: ${this._defaultBranchId}`,
    );

    return this._defaultBranchId;
  }

  /**
   * يُعيد معرّف الفرع المناسب للعملية الحالية:
   *  - Multi-branch mode : يُعيد dtoValue أو userBranchId (أيهما موجود)
   *  - Single-branch mode: يُعيد DEFAULT_BRANCH_ID دائماً بغض النظر عن الإدخال
   */
  async resolveBranchId(
    dtoValue: number | null | undefined,
    userBranchId: number | null | undefined,
  ): Promise<number | null> {
    const isMulti = await this.isMultiBranchEnabled();

    if (isMulti) {
      return dtoValue ?? userBranchId ?? null;
    }

    // وضع مدرسة واحدة: تجاهل أي إدخال وإرجاع الفرع الافتراضي
    return this.getDefaultBranchId();
  }

  /**
   * مسح الـ (in-memory cache) — يجب استدعاؤه بعد تحديث
   * 'multi_branch_mode' أو 'default_branch_id' في قاعدة البيانات.
   */
  invalidateCache(): void {
    this._isMultiBranch = null;
    this._defaultBranchId = undefined;
    this.logger.log('BranchModeService cache invalidated.');
  }

  // ─────────────────────────────────────────────────────────────
  // Convenience: حالة الـ Cache (للـ health checks)
  // ─────────────────────────────────────────────────────────────

  getCacheSnapshot(): Record<string, unknown> {
    return {
      isMultiBranch: this._isMultiBranch,
      defaultBranchId: this._defaultBranchId,
      isCacheWarm:
        this._isMultiBranch !== null && this._defaultBranchId !== undefined,
    };
  }
}
