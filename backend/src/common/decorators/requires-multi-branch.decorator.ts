import { SetMetadata } from '@nestjs/common';

/**
 * مفتاح الـ metadata المستخدم من MultiBranchGuard
 * لمعرفة هل هذا الـ endpoint يتطلب وضع multi-branch.
 */
export const REQUIRES_MULTI_BRANCH_KEY = 'requiresMultiBranch';

/**
 * @RequiresMultiBranch()
 *
 * Decorator يُطبَّق على Controller أو Method.
 * عند وضعه، يمنع تنفيذ الـ endpoint إذا كان
 * MULTI_BRANCH_MODE = false في إعدادات النظام.
 *
 * مثال:
 *   @Post()
 *   @RequiresMultiBranch()
 *   createBranch(...) { ... }
 */
export const RequiresMultiBranch = () =>
  SetMetadata(REQUIRES_MULTI_BRANCH_KEY, true);
