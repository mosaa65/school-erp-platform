# Post Systems 01-05 Improvement Plan

## 1) الهدف
هذه الخطة تغطي المتطلبات الخمسة التالية بعد إنجاز الأنظمة 01 إلى 05:
1. تعريب الواجهة والحقول والتلميحات والقيم الظاهرة للمستخدم.
2. إضافة وتنظيم جداول `lookup` وربطها بالأنظمة بشكل صحيح.
3. فصل الـ seed إلى نوعين: بيانات ثابتة (Core) وبيانات تجريبية (Demo).
4. إعادة هيكلة القائمة الجانبية حسب الأنظمة بدل القائمة المسطحة.
5. إنتاج أدلة استخدام تشغيلية خطوة بخطوة لكل نظام.

## 2) الحالة الحالية (فعليًا من الكود)
1. هناك نصوص كثيرة بالإنجليزية داخل واجهات `frontend/src/features/*` (labels/placeholders/messages).
2. القائمة الجانبية في `frontend/src/components/layout/app-navigation.ts` مسطحة (Flat) بدون تجميع بالأنظمة.
3. في قاعدة البيانات يوجد حاليًا Lookup Domain واضح فقط في:
   - `lookup_annual_statuses`
   - `lookup_promotion_decisions`
4. جداول مثل `lookup_blood_types`, `lookup_id_types`, `lookup_ownership_types`, `lookup_periods` غير موجودة بعد في Prisma schema الحالي.
5. seed الحالي في `backend/prisma/seed.ts` ملف واحد يجمع صلاحيات + بيانات ثابتة محدودة، ولا يوجد فصل Core/Demo حتى الآن.

## 3) قرارات معمارية معتمدة
1. **الأكواد النظامية تبقى إنجليزية (Machine Keys)**:
   - أمثلة: permission codes, enum codes.
   - السبب: الثبات التقني والتوافق مع API والتدقيق.
2. **الواجهة للمستخدم بالعربية (Display Layer)**:
   - يتم التعريب عبر قاموس عرض (UI dictionary) وليس بتغيير machine keys.
3. **إنشاء نطاق مرجعي موحّد Reference Data**:
   - Backend module مخصص للـ lookups مع RBAC وSwagger.
4. **فصل seed إلى مسارين**:
   - `Core Seed`: بيانات مرجعية ثابتة لكل مدرسة.
   - `Demo Seed`: بيانات تجريبية للاختبار (طلاب/معلمين/شعب...).
5. **التنقل يُبنى حسب النظام**:
   - Shared Infrastructure, Academic Core, HR, Students, Teaching & Grades.

## 4) نطاق Lookups المطلوب للمرحلة القادمة
### 4.1 Global Lookups (نبدأ بها أولًا)
1. `lookup_blood_types`
2. `lookup_id_types`
3. `lookup_ownership_types`
4. `lookup_periods`

### 4.2 Students/Internal Lookups (مرحلة تالية مباشرة)
1. `lookup_enrollment_statuses`
2. `lookup_orphan_statuses`
3. `lookup_ability_levels`
4. `lookup_activity_types`

## 5) خطة التنفيذ (ترتيب إلزامي)

## Phase A - التعريب (UI Localization Foundation)
### A1. بناء طبقة تعريب موحدة
1. إنشاء قاموس مركزي: `frontend/src/lib/i18n/ar.ts`.
2. تجميع نصوص الواجهة في ثوابت بدل hardcoded strings.
3. إنشاء helper لترجمة enum values وpermission codes.

### A2. تغطية الصفحات المنفذة (Systems 01-05)
1. استبدال labels/placeholders/messages الإنجليزية بالعربية.
2. إبقاء الأكواد التقنية كما هي في الخلفية.

### DoD (Phase A)
1. لا نص إنجليزي ظاهر للمستخدم في الصفحات الأساسية إلا المصطلحات المقصودة.
2. جميع قيم `gender/status/permission` تظهر بالعربية في UI.
3. E2E smoke للصفحات الأساسية يمر بنجاح.

---

## Phase B - Reference Data + Lookups
### B1. Prisma + Migration
1. إضافة موديلات lookup المطلوبة في `schema.prisma`.
2. إنشاء migration واحدة منظمة (أو موجتين حسب الاعتماديات).
3. ربط الحقول المناسبة تدريجيًا دون كسر السلوك الحالي.

### B2. Backend Modules
1. إنشاء modules/controllers/services للـ lookups.
2. تطبيق Validation + RBAC + Swagger.
3. إضافة list endpoints للاختيار (dropdown-friendly).

### B3. Frontend Integration
1. إضافة hooks لجلب lookup options عبر React Query.
2. توصيل النماذج (Students/Guardians/...) بخيارات lookup الجديدة.

### DoD (Phase B)
1. جداول lookup موجودة في DB ومهاجرة رسميًا.
2. APIs موثقة ومحمية بالصلاحيات.
3. الحقول في الواجهة تعمل من lookup endpoints وليس قيم ثابتة hardcoded.

---

## Phase C - Seed Strategy (Core vs Demo)
### C1. إعادة هيكلة ملفات seed
1. `backend/prisma/seeds/core/*`:
   - permissions
   - system roles
   - global lookups
   - grading lookups
2. `backend/prisma/seeds/demo/*`:
   - demo users
   - demo employees
   - demo students/guardians/enrollments
   - demo academic data

### C2. Seed Runners
1. `prisma/seed-core.ts`
2. `prisma/seed-demo.ts`
3. `prisma/seed.ts` كـ orchestrator

### C3. npm Scripts
1. `npm run prisma:seed:core`
2. `npm run prisma:seed:demo`
3. `npm run prisma:seed:all`
4. Guard: منع demo seed على production (`NODE_ENV=production`).

### DoD (Phase C)
1. Core seed idempotent ومضمون.
2. Demo seed اختياري وآمن.
3. README محدث بأوامر واضحة لكل حالة.

---

## Phase D - Sidebar Information Architecture
### D1. إعادة هيكلة البيانات
1. تحويل nav من `APP_NAV_ITEMS[]` إلى `APP_NAV_GROUPS[]`.
2. كل مجموعة تمثل نظامًا:
   - Shared Infrastructure
   - Academic Core
   - HR
   - Students
   - Teaching & Grades

### D2. واجهة العرض
1. أقسام قابلة للطي (Collapsible).
2. إظهار العناصر حسب الصلاحيات داخل كل قسم.
3. ترتيب موحّد مطابق للتوثيق الرسمي.

### DoD (Phase D)
1. التنقل لا يظهر كقائمة طويلة عشوائية.
2. كل صفحة موجودة تحت نظامها الصحيح.
3. سهولة الوصول لأي وحدة خلال 1-2 نقرات.

---

## Phase E - أدلة الاستخدام التشغيلية
### E1. نموذج التوثيق المعتمد
نستخدم مستويين من الشرح:
1. **Runbook متسلسل للنظام الكامل** (أفضل لبداية المستخدم).
2. **Playbook لكل نظام** (أفضل لعمل المشغل/الموظف يوميًا).

### E2. مخرجات التوثيق
1. `docs/usage/00_END_TO_END_OPERATION_FLOW.md`
2. `docs/usage/01_SHARED_INFRA_USAGE.md`
3. `docs/usage/02_ACADEMIC_CORE_USAGE.md`
4. `docs/usage/03_HR_USAGE.md`
5. `docs/usage/04_STUDENTS_USAGE.md`
6. `docs/usage/05_TEACHING_GRADES_USAGE.md`

كل ملف يحتوي:
1. المتطلبات المسبقة.
2. ترتيب إدخال البيانات (Step-by-Step).
3. سيناريو تشغيل قياسي.
4. أخطاء شائعة وحلول.

### DoD (Phase E)
1. أي مهندس/مشغل جديد يستطيع تشغيل النظام من الوثائق فقط.
2. ترتيب الإدخال واضح (ما الذي يدخل أولًا ثم ثانيًا...).
3. المسار التشغيلي الكامل موثق من البداية للنهاية.

## 6) ترتيب التنفيذ الزمني المقترح (عملي)
1. Week 1: Phase A + بداية Phase D.
2. Week 2: Phase B (Global Lookups) + إكمال Phase D.
3. Week 3: Phase B (Students Lookups) + Phase C.
4. Week 4: Phase E + تثبيت الجودة + Release Gate.

## 7) تقسيم عمل 4 مهندسين (مقترح)
1. Engineer 1 (Backend Data): Prisma/Migrations/Lookup modules.
2. Engineer 2 (Backend Platform): Seed architecture + scripts + tests.
3. Engineer 3 (Frontend UX): تعريب الواجهات + Sidebar grouping.
4. Engineer 4 (QA + Docs): E2E updates + usage runbooks + acceptance checks.

## 8) نقاط قرار مطلوبة قبل التنفيذ
1. هل تريد الإبقاء على enums الحالية (مثل gender) مع تعريب العرض فقط الآن؟
2. أم تريد تحويلها فورًا إلى Lookup FK في قاعدة البيانات؟
3. جدول `lookup_ownership_types`: هل يستخدم في إعدادات المدرسة (Global Settings) أم لديك جدول School Profile مستقل سننشئه الآن؟
4. جدول `lookup_periods`: هل يربط على مستوى `sections` أم على مستوى `timetable template`؟

## 9) معيار النجاح النهائي لهذه الخطة
1. واجهة عربية واضحة ومنضبطة.
2. Lookup data domain كامل ومركزي عبر API.
3. فصل Core/Demo seed بشكل احترافي وآمن.
4. Sidebar منظم حسب الأنظمة فعليًا.
5. أدلة تشغيل تجعل الفريق يعمل بدون اعتماد على الشرح الشفهي.
