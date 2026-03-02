# School ERP - Glossary and Terms

## Purpose
قاموس مصطلحات موحد بين الفريق التقني والفريق الإداري حتى لا تختلف المعاني بين المهندسين.

## Product Terms
1. ERP: نظام موحد لإدارة العمليات الأكاديمية والإدارية والمالية.
2. Subsystem: نطاق وظيفي مستقل (مثل HR أو Students) داخل نفس المنظومة.
3. Academic Year: سنة دراسية.
4. Academic Term: فصل دراسي.
5. Grade Level: الصف الدراسي.
6. Section: الشعبة/الفصل.
7. Subject: مادة دراسية.
8. Offering: طرح مادة داخل فصل دراسي وسنة محددة.
9. Timetable Entry: حصة في جدول دراسي.
10. Enrollment: قيد طالب في سنة/صف/شعبة.

## Backend Terms
1. Module (NestJS): وحدة منطقية تضم controller + service + dto + module file.
2. Controller: طبقة REST endpoints.
3. Service: طبقة business logic.
4. DTO: تعريف البيانات المقبولة/المخرجة مع validation decorators.
5. Guard: طبقة حماية للطلب (مثل JWT guard و permissions guard).
6. Decorator: annotation للمعلومات (مثل `@Permissions` و `@CurrentUser`).
7. Prisma Model: تعريف جدول/علاقة في `schema.prisma`.
8. Migration: ملف SQL منضبط يغير schema تدريجيا.
9. Seed: بيانات أولية للتشغيل والاختبار.
10. Soft Delete: حذف منطقي عبر `deleted_at` بدلا من الحذف الفعلي.

## Frontend Terms
1. App Router: نظام routes في Next.js داخل `src/app`.
2. Feature Module: مجموعة من components/hooks مرتبطة بوظيفة واحدة.
3. Workspace: شاشة تشغيل كاملة للموديول (form + list + filters).
4. React Query: إدارة fetch/cache/invalidation للبيانات.
5. RBAC in UI: إظهار/إخفاء العمليات بناء على الصلاحيات.
6. Permission Guard: حماية الصفحة إذا لم توجد صلاحية.
7. Data Test ID: selector ثابت لاختبارات E2E.

## Testing Terms
1. Unit Test: اختبار دالة/وحدة صغيرة.
2. Integration Test: اختبار تكامل عدة أجزاء.
3. E2E Test: اختبار تدفق المستخدم من البداية للنهاية.
4. Playwright: إطار E2E المستخدم في frontend.
5. Mock Route: اعتراض API response في الاختبار.
6. Fixture: بيانات ثابتة يعاد استخدامها في الاختبارات.
7. Runbook: خطوات تشغيل/اختبار موحدة.

## Delivery Terms
1. Branch Protection: قواعد تمنع الدفع المباشر أو الدمج بدون مراجعة.
2. PR (Pull Request): طلب دمج التغييرات.
3. Review: مراجعة تقنية قبل الدمج.
4. Change Report: تقرير إلزامي لأي تغيير حساس (DB/API/Cross-system).
5. DoD (Definition of Done): شروط اعتبار المهمة مكتملة.
6. Rollback: خطة رجوع آمنة عند فشل النشر.

## Security Terms
1. JWT: token للتحقق من الجلسة.
2. RBAC: التحكم بالصلاحيات بحسب الدور والpermission code.
3. Least Privilege: إعطاء أقل صلاحية لازمة لكل شخص.
4. Secret Management: إدارة مفاتيح وسرّيات خارج الكود.
5. NDA: اتفاقية عدم إفشاء.
6. IP Assignment: نقل ملكية العمل التقني لصالح المشروع.
