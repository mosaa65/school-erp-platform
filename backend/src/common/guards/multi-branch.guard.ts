import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BranchModeService } from '../branch-mode/branch-mode.service';
import { REQUIRES_MULTI_BRANCH_KEY } from '../decorators/requires-multi-branch.decorator';

/**
 * MultiBranchGuard
 *
 * يحمي الـ endpoints التي تتطلب وضع "الفروع المتعددة".
 * إذا كان MULTI_BRANCH_MODE=false يُعيد 403 مع رسالة واضحة.
 *
 * يُستخدَم دائماً مع Decorator @RequiresMultiBranch()
 *
 * مثال:
 *   @UseGuards(JwtAuthGuard, PermissionsGuard, MultiBranchGuard)
 *   @RequiresMultiBranch()
 *   @Post('branches')
 *   createBranch(...) { ... }
 *
 * أو عبر تفعيله عالمياً في app.module لتجنب التكرار.
 */
@Injectable()
export class MultiBranchGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly branchModeService: BranchModeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // هل هذا الـ endpoint يتطلب multi-branch?
    const requiresMultiBranch = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_MULTI_BRANCH_KEY,
      [context.getHandler(), context.getClass()],
    );

    // إذا لم يُوسَم بـ @RequiresMultiBranch → السماح دائماً
    if (!requiresMultiBranch) return true;

    const isEnabled = await this.branchModeService.isMultiBranchEnabled();

    if (!isEnabled) {
      throw new ForbiddenException(
        'ميزة الفروع المتعددة (النموذج الهجين) غير مفعَّلة في هذا النظام. ' +
          'فعِّلها من إعدادات النظام أولاً.',
      );
    }

    return true;
  }
}
