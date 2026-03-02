# Database and Prisma Guide

## Purpose
مرجع موحد لكل ما يتعلق بقاعدة البيانات وPrisma داخل backend.

## Source of Truth
1. `backend/prisma/schema.prisma` هو المصدر الأساسي للـ data model.
2. migrations SQL داخل:
   - `backend/prisma/migrations/*/migration.sql`

## Environment
ملف البيئة:
1. `backend/.env`
2. أهم متغير:
   - `DATABASE_URL="mysql://user:pass@host:3306/db_name"`

## Prisma Commands
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:migrate:dev
npm run prisma:seed
npm run prisma:studio
```

## Migration Workflow (Team)
1. Developer يغيّر `schema.prisma`.
2. ينشئ migration (عادة في بيئة التطوير).
3. يرفع migration SQL في PR.
4. reviewer يتحقق من:
   - backward compatibility.
   - indexes.
   - impact على systems الأخرى.
5. production يطبق `prisma:migrate:deploy`.

## DB Design Rules
1. Soft delete على الجداول الدومينية.
2. Audit fields:
   - `created_at`, `updated_at`, غالبا `created_by`, `updated_by`.
3. Unique constraints واضحة.
4. Foreign keys تضمن التكامل.
5. فهارس على مفاتيح البحث/الفلاتر.

## Change Safety Rules
1. لا تعدّل migration قديمة بعد اعتمادها.
2. أي تغيير كاسر يحتاج migration جديدة وخطة rollback.
3. أي تعديل cross-system يحتاج Change Report.

## Seed Data Policy
1. `prisma/seed.ts` للبيانات الأساسية فقط.
2. بيانات seed يجب ألا تحتوي أسرار حقيقية.
3. بيانات login الافتراضية للتطوير فقط.

## Verification Checklist Before Merge
1. `npm run prisma:generate` pass.
2. migration تطبق بدون أخطاء على قاعدة اختبار.
3. endpoints المتأثرة تعمل مع schema الجديدة.
4. التوثيق حدث إذا API contract أو table behavior تغير.
