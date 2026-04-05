# مراجعة فجوات الأنظمة 01-05 (2026-03-08)

## النطاق
تمت مراجعة التوافق بين:
1. توثيق التحليل في `systems/01..05` (ملفات `README.md` و `DDL.sql`).
2. التنفيذ الحالي في `backend-frontend` (Prisma schema + Seeds + Backend + Frontend).

## ملخص تنفيذي
1. البنية العامة للأنظمة 01-05 موجودة وقابلة للتشغيل.
2. توجد فجوات "تسمية/نمذجة" ناتجة عن انتقال من DDL التحليلي إلى نموذج Prisma تشغيلي.
3. توجد فجوة بيانات تشغيلية مؤكدة في "المواهب" كانت تسبب ظهور خيارات ناقصة، وتم إغلاقها الآن.
4. تمت إضافة كيانات System 04 الناقصة (`student_talents`, `student_siblings`, `student_problems`, `parent_notifications`) في الـ Backend والـ Frontend والـ Demo Seed.

## الفجوات المؤكدة

### 1) فجوة المواهب (تم إغلاقها)
1. التوثيق يحتوي قائمة مواهب مرجعية كبيرة في `lookup_talents`.
2. التنفيذ السابق كان يزرع عددًا محدودًا فقط من المواهب المرجعية.
3. شاشة `مواهب الموظفين` تعتمد جدول `talents` التشغيلي (وليس `lookup_talents`) وكان غالبًا فارغًا بعد setup جديد.

النتيجة قبل الإصلاح:
1. خيارات المواهب قد لا تظهر أو تظهر ناقصة.
2. ربط المواهب مع الموظف لا يكون جاهزًا مباشرة بعد seed.

الإصلاح المنفذ:
1. توسيع `lookup_talents` في core seed لتغطية القائمة الكاملة من DDL.
2. مزامنة تلقائية من `lookup_talents` إلى `talents` داخل core seed.
3. إضافة demo seed لربط مواهب فعلية مع الموظفين.
4. تحسين عرض فلتر المواهب/الموظفين في الواجهة ليظهر الاسم العربي + الرمز.

### 2) فجوات هيكلية بين DDL التحليلي والتنفيذ الحالي (ما زالت قائمة)
1. System 02:
   - DDL يستخدم `schools / semesters / classrooms / grade_subjects`.
   - التنفيذ يستخدم `school_profiles / academic_terms / sections / grade_level_subjects`.
   - هذه فجوة تسمية/نموذج وليست كسرًا تشغيليًا.
2. System 03:
   - DDL يحتوي `lookup_employment_statuses` و`lookup_rating_levels`.
   - التنفيذ يعتمد `employmentType` و`PerformanceRatingLevel` كـ enums.
3. System 05:
   - جداول/وحدات التحضير والتقارير المتقدمة في ملفات فرعية (06-09) ليست مغلقة بالكامل بعد في الكود الحالي.

## قرارات معمارية للعمل القادم
1. اعتماد `backend/prisma/schema.prisma` كمصدر الحقيقة التشغيلي.
2. أي عنصر من DDL التحليلي غير موجود في schema يُعتبر "Backlog Gap" وليس bug فوري.
3. إغلاق الفجوات بالترتيب:
   1. فجوات البيانات المرجعية والتجريبية (مغلقة الآن للمواهب).
   2. فجوات واجهات التشغيل الحرجة (dropdowns/labels/filters).
   3. فجوات الجداول/الوحدات غير المنفذة حسب الأولوية التشغيلية.

## التعديلات المنفذة في هذه الدفعة
1. `backend/prisma/seeds/core/system-01/lookups.seed.ts`
   - توسيع قائمة مواهب `lookup_talents`.
   - مزامنة تلقائية إلى جدول `talents`.
2. `backend/prisma/seeds/demo/employee-talents.seed.ts` (ملف جديد)
   - إنشاء ربط تجريبي بين الموظفين والمواهب.
3. `backend/prisma/seeds/demo/employee.seed.ts`
   - إرجاع `employeeIdByKey` لاستخدامه في ربط المواهب.
4. `backend/prisma/seeds/demo/index.ts`
   - تشغيل seed مواهب الموظفين ضمن demo runner.
5. `backend/prisma/seed-demo.ts`
   - طباعة ملخص mappings + talents used.
6. `frontend/src/features/employee-talents/components/employee-talents-workspace.tsx`
   - تحسين عرض خيارات الفلترة (اسم الموظف/الموهبة + الكود).
7. `backend/prisma/schema.prisma` + Migration جديدة
   - إضافة موديلات: `StudentTalent`, `StudentSibling`, `StudentProblem`, `ParentNotification`.
8. `backend/src/modules/*`
   - إضافة Modules كاملة (CRUD + RBAC + Audit) للجداول الأربع الجديدة.
9. `backend/prisma/seeds/core/system-01/permissions.seed.ts`
   - إضافة صلاحيات الموارد الجديدة.
10. `backend/prisma/seeds/core/shared/admin.seed.ts`
    - إدخال الموارد الجديدة ضمن أدوار التشغيل الافتراضية.
11. `backend/prisma/seeds/demo/student-extensions.seed.ts` (ملف جديد)
    - إضافة بيانات Demo لربط المواهب/الإخوة/المشكلات/الإشعارات.
12. `frontend/src/features/*` + `frontend/src/app/app/*`
    - إضافة واجهات جديدة: `student-talents`, `student-siblings`, `student-problems`, `parent-notifications`.
13. `frontend/src/components/layout/app-navigation.ts`
    - ربط الصفحات الجديدة في قائمة النظام 04.

## خطوات التحقق بعد السحب
1. `cd backend`
2. `npm run prisma:seed:core`
3. `npm run prisma:seed:demo`
4. تسجيل الدخول ثم فتح:
   - `/app/talents`
   - `/app/employee-talents`
5. التحقق:
   - وجود مواهب كاملة.
   - ظهور خيارات المواهب في نموذج الربط.
   - وجود روابط جاهزة بين موظفين ومواهب.

## الباقي للإغلاق الكامل
1. اعتماد مسار موحد لفجوات DDL التحليلي مقابل schema (ملف mapping رسمي).
2. تحديد قرار نهائي لكل عنصر غير منفذ في System 04 و System 05:
   - تنفيذ الآن.
   - أو تأجيل مع توثيق مبرر زمني.
3. استكمال تدقيق التعريب عبر جميع dropdowns في الأنظمة 01-05.
