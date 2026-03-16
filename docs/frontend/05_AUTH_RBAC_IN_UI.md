# Auth and RBAC in UI

## Purpose
توضيح كيف المصادقة والصلاحيات تعمل في واجهة المستخدم.

## Auth Session Model
1. login endpoint يرجع session/token.
2. session تخزن بطريقة موحدة في auth provider layer.
3. hydration logic يحدد هل المستخدم authenticated.

## Relevant Areas
1. `frontend/src/features/auth/providers`
2. `frontend/src/features/auth/hooks`
3. `frontend/src/lib/auth/*`
4. `frontend/src/components/layout/app-navigation.ts`

## RBAC in Frontend
1. navigation items تظهر حسب permission codes.
2. pages تستخدم `PermissionGuard`.
3. actions (create/update/delete) تتعطل أو تختفي إذا permission غير موجودة.

## Contract with Backend
1. backend source of truth للصلاحيات.
2. frontend يقرأ `permissionCodes` من session.
3. permission names يجب تبقى متوافقة بين الطرفين.

## Security Notes
1. إخفاء زر في UI لا يغني عن backend guard.
2. backend يجب يرفض الطلب غير المصرح دائما.
3. frontend role مهمته UX فقط.

## Checklist for New Protected Module
1. route protected by PermissionGuard.
2. nav visibility tied to read permission.
3. action buttons tied to create/update/delete permissions.
4. no unauthorized operation path from UI.
