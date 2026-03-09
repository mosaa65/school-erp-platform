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
```

- `STRICT_EMPLOYEE_WORKFLOW=true` يفعّل التحقق الصارم قبل تفعيل إسناد التدريس/الإشراف (يتطلب: موظف نشط + حساب مستخدم نشط + دور فعّال).

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

4. Apply migrations:

```bash
npm run prisma:migrate:deploy
```

5. Seed core data:

```bash
npm run prisma:seed
```

6. (Optional) Seed demo data for testing:

```bash
npm run prisma:seed:demo
```

7. Run API:

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

## API Docs

- Swagger UI: `http://localhost:3000/api/docs`
- Health endpoint: `GET /health`

## Frontend Start Gate

Frontend implementation starts after this backend gate is met:

1. System 01-05 backend DoD is complete.
2. E2E tests pass on a running DB.
3. Auth + RBAC contracts are stable for frontend integration.

Until that gate, work continues on backend systems and contract hardening.
# School System (NestJS + React + MySQL)

Monorepo for a school MVP:
- `apps/api`: NestJS API
- `apps/web`: React web app
- `apps/mobile`: mobile starter (Expo-ready skeleton)

## Included MVP modules
- Students
- Classes
- Attendance
- Grades

## Local setup
1. Start MySQL:
   - `docker compose up -d`
2. Install packages:
   - `npm install`
3. Configure API env:
   - Copy `apps/api/.env.example` to `apps/api/.env`
4. Run Prisma migration:
   - `npm run prisma:migrate -w apps/api`
5. Start API:
   - `npm run dev:api`
6. Start web app:
   - `npm run dev:web`

## Notes
- Existing Arabic SQL/analysis folders are preserved.
- This implementation is a clean MVP foundation using your selected stack.
