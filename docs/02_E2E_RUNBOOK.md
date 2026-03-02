# School ERP - End-to-End Runbook

## Purpose
مرجع موحد لتشغيل النظام كامل والتحقق من عمله End-to-End.

## Preconditions
1. Node.js LTS مثبت.
2. npm مثبت.
3. Docker Desktop يعمل.
4. Git working tree جاهز.

## Step A - Start Backend
من جذر المشروع:
```bash
cd backend
npm install
```

اضبط env:
1. انسخ `backend/.env.example` إلى `backend/.env`.
2. تأكد أن `DATABASE_URL` يطابق MySQL الحالي.

شغل DB + API:
```bash
docker compose up -d
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

Validation:
1. Swagger يعمل: `http://localhost:3000/api/docs`
2. Health endpoint: `GET http://localhost:3000/health`

## Step B - Start Frontend
في نافذة ثانية:
```bash
cd frontend
npm install
```

اضبط env:
1. انسخ `frontend/.env.example` إلى `frontend/.env.local`.
2. القيمة المتوقعة:
   - `BACKEND_API_URL=http://localhost:3000`
   - `NEXT_PUBLIC_API_PROXY_PREFIX=/backend`

شغل frontend:
```bash
npm run dev
```

Validation:
1. افتح `http://localhost:3001`.
2. يجب التحويل إلى `/auth/login`.

## Step C - Functional Smoke Flow
1. سجل دخول بحساب seed:
   - email: `admin@school.local`
   - password: `ChangeMe123!`
2. ادخل `/app`.
3. تحقق من ظهور عناصر القائمة حسب الصلاحيات.
4. اختبر CRUD سريع على وحدة واحدة مثل `/app/users`.

## Step D - Frontend E2E
```bash
cd frontend
npm run lint
npm run typecheck
npm run e2e:release
```

الاختبارات الحالية موجودة في:
1. `frontend/tests/e2e/employee-courses.spec.ts`
2. `frontend/tests/e2e/employee-talents.spec.ts`
3. `frontend/tests/e2e/employee-performance-evaluations.spec.ts`
4. `frontend/tests/e2e/employee-violations.spec.ts`
5. `frontend/tests/e2e/talents.spec.ts`
6. `frontend/tests/e2e/academic-months.spec.ts`
7. `frontend/tests/e2e/grading-policies.spec.ts`
8. `frontend/tests/e2e/grading-reports.spec.ts`
9. `frontend/tests/e2e/hr-reports.spec.ts`

## Step E - Backend E2E
```bash
cd backend
npm run test:e2e
```

الاختبارات في:
1. `backend/test/app.e2e-spec.ts`
2. `backend/test/hr-core.e2e-spec.ts`

## Common Failures and Fixes
1. `P1001` أو DB connection fail:
   - تأكد Docker/MySQL شغال.
   - راجع `DATABASE_URL`.
2. Prisma migrate fail:
   - تأكد وجود DB فارغة أو schema متوقعة.
3. Frontend لا يصل API:
   - راجع `frontend/.env.local`.
   - تحقق أن backend شغال على 3000.
4. E2E flakiness:
   - أعد تشغيل `npm run e2e`.
   - راجع selectors و mocks في `tests/e2e/helpers`.

## Exit Checklist
يعتبر التشغيل E2E ناجح إذا:
1. Backend يعمل بدون أخطاء startup.
2. Swagger reachable.
3. Frontend login يعمل.
4. `frontend` release gate ناجحة:
   - `npm run qa:release`
5. `backend` release gate ناجحة:
   - `npm run qa:release`
