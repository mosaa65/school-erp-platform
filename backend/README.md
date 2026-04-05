# School ERP Backend (NestJS + Prisma + MySQL)

Enterprise backend for School ERP using:

- NestJS (TypeScript)
- Prisma + MySQL
- REST + Swagger
- JWT + RBAC (permissions-based)

## Current System Status

### Completed / in codebase

- `System 01 - Shared Infrastructure`
  - Auth, Users, Roles, Permissions, Audit Logs, Global Settings
- `System 02 - Academic Core`
  - Academic Years, Academic Terms, Grade Levels, Sections, Subjects
  - Grade Level Subjects, Term Subject Offerings, Timetable Entries
- `System 03 - HR`
  - Employees, Attendance, Tasks, Talents, Courses, Violations
  - Teaching Assignments, Performance Evaluations, HR Summary Reports
- `System 04 - Students`
  - Students, Guardians, Student Guardians, Student Enrollments
  - Student Attendance, Student Books
- `System 05 - Teaching & Grades`
  - Grading Policies, Exam Periods, Exam Assessments, Student Exam Scores
  - Homework Types, Homeworks, Student Homeworks
  - Academic Months, Monthly Grades, Monthly Custom Component Scores
  - Semester Grades, Annual Grades, Annual Results
  - Grading Governance Reports

## Architecture Rules Applied

- Strict modular NestJS architecture
- Soft delete (`deleted_at`) across domain tables
- Audit fields (`created_by`, `updated_by`, `created_at`, `updated_at`)
- Global validation (`ValidationPipe`)
- Global HTTP exception envelope
- Structured JSON logging
- Swagger docs for controllers/endpoints

## Project Structure

```text
src/
  auth/
  common/
  modules/
  prisma/
prisma/
  schema.prisma
  migrations/
test/
```

## Environment

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="mysql://school_user:school_password@localhost:3306/school_erp_clean"
JWT_SECRET="change_me_with_very_strong_secret"
JWT_EXPIRES_IN="1d"
SWAGGER_PATH="api/docs"
STRICT_EMPLOYEE_WORKFLOW=false
PAYMENT_WEBHOOK_SECRET="change_me_webhook_secret"
PAYMENT_WEBHOOK_IP_WHITELIST=""
FINANCE_SYSTEM_USER_ID=""
RECURRING_JOURNAL_INTERVAL_MS=900000
SEED_ADMIN_EMAIL="admin@school.local"
SEED_ADMIN_PASSWORD="ChangeMe123!"
```

- `STRICT_EMPLOYEE_WORKFLOW=true` يفعّل التحقق الصارم قبل تفعيل إسناد التدريس/الإشراف (يتطلب: موظف نشط + حساب مستخدم نشط + دور فعّال).
- `SEED_ADMIN_EMAIL` و `SEED_ADMIN_PASSWORD` (اختياري) لإنشاء حساب المدير في البذور الأساسية.
- `FINANCE_SYSTEM_USER_ID` مطلوب فقط لبعض عمليات المالية المؤتمتة مثل webhooks والقيود الدورية. يمكن تركه فارغًا في التشغيل المحلي إذا كنت لا تستخدم هذه المسارات.

## Local Run

1. Start MySQL (Docker or local MySQL/XAMPP on `3306`).
2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

`npm run prisma:generate` أصبح يعيد المحاولة تلقائيًا على Windows إذا كان ملف Prisma engine مقفولًا مؤقتًا، وسيعطيك أسماء عمليات Node المحلية المحتمل أنها تمسك الملف.

4. Apply migrations:

```bash
npm run prisma:migrate:deploy
```

إذا كانت قاعدة البيانات لديك تحتوي على سجل فشل سابق للمهاجرة `20260321113000_add_finance_advanced_foundation` من نسخة أقدم كانت تتطلب امتيازات أعلى لـ MySQL triggers، أصلحه أولًا:

```bash
npx prisma migrate resolve --rolled-back 20260321113000_add_finance_advanced_foundation --schema=prisma/schema.prisma
npm run prisma:migrate:deploy
```

5. Seed core data (ثابتة):

```bash
npm run prisma:seed:core
```

6. (Optional) Seed demo data for testing:

```bash
npm run prisma:seed:demo
```

7. (Optional) Seed all data (core + demo):

```bash
npm run prisma:seed:all
```

8. Run API:

```bash
npm run start:dev
```

## Testing

- Build:

```bash
npm run build
```

- Lint:

```bash
npm run lint
```

- E2E:

```bash
npm run test:e2e
```

E2E tests require running MySQL and applied migrations.

## Deployment Notes

- Backend startup honors `PORT`; لا حاجة لتثبيت منفذ ثابت في الاستضافة.
- Frontend should set `BACKEND_API_URL` to the public backend base URL in production.
- The core Prisma migration path no longer requires MySQL `SUPER`-style privileges for trigger creation.
- Optional DB-level hardening for journal-period enforcement is available in:

```text
prisma/optional/finance-journal-period-triggers.sql
```

Apply that optional SQL only if your MySQL user is allowed to create triggers.

## Recent Changes (Operational Notes)

- **Flexible Academic Terms**: النتائج/الدرجات السنوية لم تعد تفترض فصلين فقط. يتم احتساب النسبة السنوية حسب عدد الفصول النشطة في السنة الدراسية.
- **Annual Grade Term Breakdown**: تمت إضافة جدول `annual_grade_terms` لتخزين مجموع كل فصل على حدة. ما زال النظام يدعم `semester1Total` و `semester2Total` للتوافق الخلفي.
- **Grading Scores**: تم إزالة القيم الافتراضية من سياسات الدرجات والمكونات. يجب إدخال القيم صراحة (أو تعريف المكونات) حتى يتم احتساب الدرجات بشكل صحيح.

## Frontend Start Gate

Frontend implementation starts after this backend gate is met:

1. System 01-05 backend DoD is complete.
2. E2E tests pass on a running DB.
3. Auth + RBAC contracts are stable for frontend integration.

Until that gate, work continues on backend systems and contract hardening.
