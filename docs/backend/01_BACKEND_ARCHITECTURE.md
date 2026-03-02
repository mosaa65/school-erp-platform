# Backend Architecture (NestJS + Prisma)

## Purpose
توضيح المعمارية الحالية في `backend/` بشكل تنفيذي للفريق.

## Stack
1. NestJS 11 (TypeScript).
2. Prisma ORM 6 + MySQL.
3. JWT Authentication.
4. Permission-based RBAC.
5. Swagger documentation.

## Architectural Style
المشروع يطبق modular monolith:
1. كل نطاق business موجود كموديول مستقل.
2. كل موديول يملك:
   - `*.module.ts`
   - `*.controller.ts`
   - `*.service.ts`
   - `dto/*`
3. التكامل بين الموديولات يتم داخل نفس API process.

## Request Lifecycle
1. HTTP request يصل Nest app.
2. Global ValidationPipe يطبق DTO validation/transformation.
3. `JwtAuthGuard` يتحقق من التوكن.
4. `PermissionsGuard` يتحقق من permissions عند وجود `@Permissions`.
5. Controller يستدعي service.
6. Service ينفذ business logic عبر Prisma.
7. الاستجابة تمر عبر global exception filter عند وجود خطأ.

## Shared Layers
1. Auth:
   - `backend/src/auth`
2. Common:
   - `backend/src/common/decorators`
   - `backend/src/common/guards`
   - `backend/src/common/filters`
   - `backend/src/common/logger`
3. Prisma:
   - `backend/src/prisma/prisma.service.ts`

## Module Domains (Current)
1. Shared infra:
   - users, roles, permissions, audit-logs, global-settings.
2. Academic core:
   - academic-years, academic-terms, grade-levels, sections, subjects, grade-level-subjects, term-subject-offerings, timetable-entries.
3. HR:
   - employees and HR submodules (attendance/tasks/courses/talents/violations/evaluations/teaching assignments/reports).
4. Students:
   - students, guardians, student-guardians, enrollments, student-attendance, student-books.
5. Teaching and grades:
   - grading policies, exam periods/assessments/scores, homeworks, monthly grades, annual/semester related modules.

## Cross-Cutting Rules
1. Validation required on DTO.
2. Permission checks required on sensitive actions.
3. Soft delete used in domain tables.
4. Audit fields must be set by service layer.
5. Pagination on list endpoints.

## Architectural Decisions
1. Keep Prisma access centralized in services, not controllers.
2. Keep RBAC at endpoint layer plus business assertions at service layer.
3. Keep API contracts stable; breaking changes require explicit report.

## Anti-Patterns (Do Not Do)
1. لا تضع business logic داخل controller.
2. لا تكتب raw SQL بدون سبب قوي.
3. لا تضف endpoint بدون Swagger decorators.
4. لا تستخدم hardcoded user IDs; استخدم current user context.
