# Auth, RBAC, and Security Guide

## Purpose
شرح نموذج الحماية في backend وكيف يطبقه المهندس بشكل صحيح.

## Auth Model
1. المستخدم يعمل login عبر auth endpoint.
2. backend يصدر JWT token.
3. كل طلب محمي يمر عبر `JwtAuthGuard`.
4. user context متاح عبر `@CurrentUser()`.

## RBAC Model
1. Role يحتوي مجموعة permissions.
2. endpoint يعلن permission المطلوبة عبر decorator.
3. `PermissionsGuard` يرفض الطلب إذا permission غير موجودة.
4. UI يعتمد نفس permission codes لإظهار/إخفاء العمليات.

## Relevant Files
1. `backend/src/auth/*`
2. `backend/src/common/guards/jwt-auth.guard.ts`
3. `backend/src/common/guards/permissions.guard.ts`
4. `backend/src/common/decorators/permissions.decorator.ts`
5. `backend/src/common/decorators/current-user.decorator.ts`

## Security Baseline
1. ValidationPipe globally enabled.
2. DTO-based input validation.
3. Password hashing باستخدام bcrypt.
4. structured logging بدون تسريب secrets.
5. centralized exception handling.

## Secure Coding Rules
1. لا تستخدم raw user input مباشرة في queries.
2. لا ترجع بيانات حساسة غير لازمة.
3. لا تكتب secrets داخل الكود أو git.
4. تأكد من permissions على create/update/delete actions.
5. راجع ownership constraints عند البيانات الحساسة.

## Audit and Traceability
1. العمليات المهمة تسجل في audit logs.
2. استخدم `created_by` و `updated_by` حيث متاح.
3. حافظ على metadata المهمة للتتبع.

## Security Review Checklist
1. هل endpoint محمي بـ JWT؟
2. هل endpoint يحتاج permission محددة؟
3. هل DTO validation كاملة؟
4. هل response لا يسرب معلومات حساسة؟
5. هل تم تحديث swagger/tests؟
