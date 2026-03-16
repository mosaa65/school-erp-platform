# Backend Testing Guide

## Purpose
توضيح كيفية اختبار backend محليا وقبل الدمج.

## Test Types in Repository
1. Jest unit/integration pattern عبر `npm run test` (حسب الملفات).
2. E2E عبر:
   - `npm run test:e2e`
   - config: `backend/test/jest-e2e.json`
3. Current e2e specs:
   - `backend/test/app.e2e-spec.ts`
   - `backend/test/hr-core.e2e-spec.ts`

## Prerequisites
1. DB شغالة.
2. migrations مطبقة.
3. seed مطبق إذا الاختبار يعتمد بيانات أساسية.

## Commands
```bash
cd backend
npm run lint
npm run build
npm run test
npm run test:e2e
```

## Expected Workflow per PR
1. local:
   - lint -> build -> affected tests.
2. قبل طلب المراجعة:
   - test:e2e للـ flows المتأثرة.
3. أرفق نتائج الأوامر في change report.

## Writing Test-Friendly Code
1. business logic في service يسهل اختباره.
2. avoid hidden side effects.
3. keep DTO rules explicit.
4. prefer deterministic date handling in critical logic.

## Minimal Quality Gate (Backend)
1. no TypeScript errors.
2. no lint blocking issues.
3. e2e affected flow passes.
4. migration/app startup passes.
