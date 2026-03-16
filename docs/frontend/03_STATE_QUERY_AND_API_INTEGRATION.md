# State, React Query, and API Integration

## Purpose
توضيح نمط إدارة البيانات بين UI وbackend.

## API Layer
1. API client المركزي:
   - `frontend/src/lib/api/client.ts`
2. جميع requests تمر من هذا الملف.
3. endpoint prefix المستخدم في الواجهة:
   - `/backend/*` (proxy to backend URL).

## React Query Pattern
1. لكل feature:
   - query hooks (`use-*-query.ts`)
   - mutation hooks (`use-*-mutations.ts`)
   - options hooks (`use-*-options-query.ts`)
2. query keys ثابتة ومتسقة.
3. بعد mutation:
   - `invalidateQueries` للمفاتيح المتأثرة.

## Local State vs Server State
1. server state في React Query cache.
2. local state للفلاتر inputs/form/edit mode.
3. لا تخزن بيانات API الكبيرة في local state بدون سبب.

## Error Handling
1. عرض error cards/messages في كل workspace.
2. في حالات 401:
   - sign out عبر auth provider flows.
3. messages تبقى مفيدة للمستخدم بدون تفاصيل حساسة.

## API Contract Safety
1. أي تغيير request/response shape يحتاج:
   - تحديث client types.
   - تحديث hooks.
   - تحديث UI.
   - تحديث E2E إذا affected.

## Checklist Before Merge
1. query key naming واضح.
2. invalidate logic صحيح.
3. empty/loading/error states موجودة.
4. typecheck pass.
