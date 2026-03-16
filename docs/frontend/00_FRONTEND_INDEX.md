# Frontend Docs Index

## Purpose
فهرس تشغيلي لأي مهندس يعمل داخل `frontend/`.

## Read Order (Recommended)
1. `docs/frontend/01_FRONTEND_ARCHITECTURE.md`
2. `docs/frontend/02_APP_ROUTER_AND_LAYOUT_GUIDE.md`
3. `docs/frontend/03_STATE_QUERY_AND_API_INTEGRATION.md`
4. `docs/frontend/04_UI_SYSTEM_AND_COMPONENT_GUIDE.md`
5. `docs/frontend/05_AUTH_RBAC_IN_UI.md`
6. `docs/frontend/06_E2E_TESTING_GUIDE.md`
7. `docs/frontend/07_FRONTEND_OPERATIONS_RUNBOOK.md`

## Source of Truth
1. App routes:
   - `frontend/src/app`
2. Feature modules:
   - `frontend/src/features`
3. API client:
   - `frontend/src/lib/api/client.ts`
4. E2E tests:
   - `frontend/tests/e2e`

## Commands Quick List
```bash
cd frontend
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run e2e
npm run e2e:release
npm run qa:release
```

## Policy Reminder
1. لا صفحة بدون permission guard إذا كانت محمية.
2. لا fetch عشوائي خارج React Query patterns.
3. أي تعديل contract مع backend يحتاج تنسيق وتقرير.
