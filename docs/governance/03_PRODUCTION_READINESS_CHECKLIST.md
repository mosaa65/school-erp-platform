# Production Readiness Checklist (Systems 01-05)

## Purpose
مرجع موحد لإغلاق التنفيذ بشكل إنتاجي قبل أي إطلاق على بيئة أعلى من التطوير.

## Scope
يشمل ما تم تنفيذه حاليًا:
1. `System 01` Shared Infrastructure.
2. `System 02` Academic Core.
3. `System 03` HR.
4. `System 04` Students.
5. `System 05` Teaching & Grades (الجزء المنفذ فعليًا).

## Gate 0 - Environment Lock
قبل الفحص النهائي:
1. تثبيت نسخة Node.js موحدة على الفريق (LTS).
2. تثبيت npm lockfile كما هو بدون تعديل.
3. التأكد أن `backend/.env` و `frontend/.env.local` مضبوطين.
4. إيقاف أي services متعارضة على المنافذ `3000` و `3001`.
5. توثيق commit hash المستهدف للإطلاق.

## Gate 1 - Backend Release Checks
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed:core
npm run qa:release
```

شرط النجاح:
1. `qa:release` تمر بدون أخطاء.
2. Swagger متاح على `http://localhost:3000/api/docs`.
3. Endpoint الصحة يعمل: `GET http://localhost:3000/health`.
4. عدم تشغيل `demo seed` في release production.

## Gate 2 - Frontend Release Checks
```bash
cd frontend
npm install
npm run qa:release
```

شرط النجاح:
1. lint/typecheck/build pass.
2. release E2E pack pass.
3. واجهة login تفتح على `http://localhost:3001/auth/login`.

## Gate 3 - Release E2E Pack (Frontend)
الوحدات المغطاة حاليا:
1. `employee-courses`
2. `employee-talents`
3. `employee-performance-evaluations`
4. `employee-violations`
5. `talents`
6. `academic-months`
7. `grading-policies`
8. `grading-reports`
9. `hr-reports`

## Gate 4 - Manual Smoke Matrix
نفذ التالي على بيئة محلية مستقرة:
1. تسجيل دخول `super_admin` من seed.
2. فتح `/app/users` والتأكد من تحميل القائمة.
3. فتح `/app/talents` وإضافة عنصر جديد.
4. فتح `/app/academic-months` وإضافة شهر أكاديمي صالح.
5. فتح `/app/grading-policies` وإضافة سياسة مرتبطة بسنة/صف/مادة.
6. فتح `/app/grading-reports` والتأكد من رجوع summary.
7. فتح `/app/hr-reports` والتأكد من رجوع summary.

## Gate 5 - Governance and Approvals
لا يوجد إطلاق بدون:
1. PR مراجَع ومغلق الملاحظات الحرجة.
2. Change Report عند أي تعديل DB/API/Cross-system.
3. اعتماد نهائي من:
   - Executive: **موسى العواضي**
   - Supervisor: **عماد الجماعي**

## Go / No-Go Decision
سجل القرار النهائي بالنص التالي:
1. Decision Date:
2. Target Commit:
3. Backend Gate: Pass / Fail
4. Frontend Gate: Pass / Fail
5. Smoke Matrix: Pass / Fail
6. Final Decision: Go / No-Go
7. Approver Name:

### Latest Execution Snapshot (March 1, 2026)
1. Backend Gate: `Pass` (`npm run qa:release` passed, `41/41` tests)
2. Frontend Gate: `Pass` (`npm run qa:release` passed, `16/16` release e2e)
3. Smoke Matrix: `Pass` (see `docs/05_SMOKE_MATRIX_2026-03-01.md`)
4. Final Decision (technical): `Go`
5. Business approval: Pending Executive/Supervisor sign-off

## Rollback Policy
إذا فشل أي شرط بعد الإطلاق:
1. إيقاف نشر النسخة الحالية مباشرة.
2. الرجوع إلى آخر commit مستقر معتمد.
3. إعادة تطبيق migration فقط إذا كانت backward compatible.
4. فتح Change Report جديد بعنوان `Rollback - <date>`.

## Evidence to Archive
احفظ هذه الأدلة قبل الإغلاق النهائي:
1. مخرجات `backend npm run qa:release`.
2. مخرجات `frontend npm run qa:release`.
3. رابط/صورة Swagger.
4. Playwright report النهائي.
5. Change Report (إذا كان مطلوبًا).
