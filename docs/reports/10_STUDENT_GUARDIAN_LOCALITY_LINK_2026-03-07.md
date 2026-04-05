# ربط الطلاب وأولياء الأمور بالموقع الجغرافي - 2026-03-07

## النطاق المنفذ

1. إضافة `localityId` اختياري في:
   - `students`
   - `guardians`
2. ربط FK إلى جدول `localities`.
3. دعم كامل في Backend:
   - DTO + Swagger Query
   - Validation (وجود/نشاط locality)
   - Filters في قوائم الطلاب وأولياء الأمور
4. دعم كامل في Frontend:
   - حقول اختيار المحلة في نماذج الإضافة/التعديل
   - فلاتر حسب المحلة في القوائم
   - عرض الموقع في بطاقة الطالب/ولي الأمر

## ملفات قاعدة البيانات

1. `backend/prisma/schema.prisma`
2. `backend/prisma/migrations/20260307120000_add_student_guardian_locality_fk/migration.sql`

## أوامر التشغيل بعد السحب

1. داخل `backend`:
   - `npm run prisma:migrate:deploy`
   - `npm run prisma:generate`
   - `npm run start:dev`
2. داخل `frontend`:
   - `npm run start`

## ملاحظة تشغيلية

1. إذا ظهر خطأ `EPERM` أثناء `prisma generate` على Windows، فهذا يعني غالبًا أن ملف Prisma engine مقفول من عملية Node قيد التشغيل.
2. الحل الموصى به:
   - إيقاف عمليات السيرفر Node العاملة، ثم إعادة تنفيذ `npm run prisma:generate`.
