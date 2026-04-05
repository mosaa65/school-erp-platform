import { Module } from '@nestjs/common';
import { BranchModeService } from './branch-mode.service';

/**
 * BranchModeModule
 *
 * وحدة مشتركة لـ Feature Flag الخاص بالفروع.
 * استورِدها في أي Module يحتاج الوصول إلى BranchModeService.
 * ملاحظة: PrismaModule هو @Global() لذا لا نحتاج لاستيراده.
 *
 * مثال:
 *   @Module({ imports: [BranchModeModule], ... })
 */
@Module({
  providers: [BranchModeService],
  exports: [BranchModeService],
})
export class BranchModeModule {}

