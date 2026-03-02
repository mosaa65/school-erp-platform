# School ERP Frontend (Web)

Standalone web frontend for School ERP using:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- React Query
- Dark/Light mode

## Ports
- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:3000`

## Environment
Copy `.env.example` values into `.env.local` if needed:

```env
BACKEND_API_URL=http://localhost:3000
NEXT_PUBLIC_API_PROXY_PREFIX=/backend
```

`/backend/*` is proxied by Next.js to backend API.

## Run

```bash
cd frontend
npm install
npm run dev
```

## Production Check

```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

E2E tests (Playwright):

```bash
npx playwright install
npm run e2e
```

E2E helpers:
- shared API route mocks: `tests/e2e/helpers/api-mocks.ts`
- shared test fixtures (employees/talents/years): `tests/e2e/helpers/fixtures.ts`
- shared permission sets: `tests/e2e/helpers/permissions.ts`
- shared list-item builders (initial + created-from-payload): `tests/e2e/helpers/list-item-builders.ts`
- shared UI assertion helpers: `tests/e2e/helpers/ui-assertions.ts`
- shared form action helpers: `tests/e2e/helpers/form-actions.ts`

On this Windows environment, scripts automatically apply an SWC workaround before `dev/build/start`.

## Step 05 Scope (Current)
- App Shell implemented for `/app/*`:
  - responsive sidebar
  - top header with logout/theme controls
  - current module title
- RBAC-aware navigation:
  - nav items are shown only when user has required permission
- Permission guard at page level:
  - unauthorized access shows `403` module card
- Available modules in shell:
  - `/app`
  - `/app/academic-years`
  - `/app/academic-terms`
  - `/app/academic-months`
  - `/app/grade-levels`
  - `/app/subjects`
  - `/app/sections`
  - `/app/students`
  - `/app/guardians`
  - `/app/student-guardians`
  - `/app/student-enrollments`
  - `/app/student-attendance`
  - `/app/student-books`
  - `/app/homework-types`
  - `/app/homeworks`
  - `/app/student-homeworks`
  - `/app/exam-periods`
  - `/app/exam-assessments`
  - `/app/student-exam-scores`
  - `/app/monthly-grades`
  - `/app/monthly-custom-component-scores`
  - `/app/grading-policies`
  - `/app/semester-grades`
  - `/app/annual-statuses`
  - `/app/promotion-decisions`
  - `/app/grading-outcome-rules`
  - `/app/annual-grades`
  - `/app/annual-results`
  - `/app/grading-reports`
  - `/app/grade-level-subjects`
  - `/app/term-subject-offerings`
  - `/app/timetable-entries`
  - `/app/employees`
  - `/app/employee-teaching-assignments`
  - `/app/employee-attendance`
  - `/app/employee-tasks`
  - `/app/employee-courses`
  - `/app/talents`
  - `/app/employee-talents`
  - `/app/employee-performance-evaluations`
  - `/app/employee-violations`
  - `/app/hr-reports`
  - `/app/users`
  - `/app/roles`
  - `/app/permissions`
  - `/app/audit-logs`
  - `/app/global-settings`
- Users module (`/app/users`) now includes:
  - paginated list with search + active/inactive filter
  - create user
  - edit user
  - soft delete user
  - activate/deactivate user
  - link/unlink employee
- Roles module (`/app/roles`) now includes:
  - paginated list with search
  - create role
  - edit role
  - soft delete role
  - activate/deactivate role
  - assign/replace role permissions
- Permissions module (`/app/permissions`) now includes:
  - paginated list with search
  - create permission
  - edit permission (custom permissions)
  - soft delete permission (custom permissions)
  - UI protection for `isSystem` permissions (read-only in web UI)
- Global Settings module (`/app/global-settings`) now includes:
  - paginated list with search + public/private filter
  - create setting with typed value parsing (`STRING/NUMBER/BOOLEAN/JSON`)
  - edit setting
  - soft delete setting
- Audit Logs module (`/app/audit-logs`) now includes:
  - paginated list
  - advanced filters (`resource`, `action`, `status`, `actorUserId`, `from`, `to`)
  - details preview + metadata (actor, IP, user-agent)
  - soft delete action when `audit-logs.delete` is granted
- Academic Years module (`/app/academic-years`) now includes:
  - paginated list with search + status/current filters
  - create academic year
  - edit academic year
  - soft delete academic year
- Academic Terms module (`/app/academic-terms`) now includes:
  - paginated list with search + filters (year/type/active)
  - create academic term
  - edit academic term
  - soft delete academic term
- Academic Months module (`/app/academic-months`) now includes:
  - paginated list with search + filters (year/term/status/current/active)
  - create academic month
  - edit academic month
  - soft delete academic month
  - UX guard for month range within selected term range
- Grade Levels module (`/app/grade-levels`) now includes:
  - paginated list with search + filters (stage/active)
  - create grade level
  - edit grade level
  - soft delete grade level
- Subjects module (`/app/subjects`) now includes:
  - paginated list with search + filters (category/active)
  - create subject
  - edit subject
  - soft delete subject
- Sections module (`/app/sections`) now includes:
  - paginated list with search + filters (grade level/active)
  - create section
  - edit section
  - soft delete section
- Grade-Level Subjects module (`/app/grade-level-subjects`) now includes:
  - paginated list with search + filters (academic year/grade level/subject/mandatory/active)
  - create grade-level subject mapping
  - edit grade-level subject mapping
  - soft delete grade-level subject mapping
- Term Subject Offerings module (`/app/term-subject-offerings`) now includes:
  - paginated list with search + filters (academic year/term/grade-level subject/active)
  - create term subject offering
  - edit term subject offering
  - soft delete term subject offering
- Timetable Entries module (`/app/timetable-entries`) now includes:
  - paginated list with search + filters (term/section/offering/day/active)
  - create timetable entry
  - edit timetable entry
  - soft delete timetable entry
- Employees module (`/app/employees`) now includes:
  - paginated list with search + filters (gender/employment type/job title/active)
  - create employee profile
  - edit employee profile
  - soft delete employee profile
- Students module (`/app/students`) now includes:
  - paginated list with search + filters (gender/orphan status/active)
  - create student profile
  - edit student profile
  - soft delete student profile
  - activate/deactivate student profile
- Guardians module (`/app/guardians`) now includes:
  - paginated list with search + filters (gender/active)
  - create guardian profile
  - edit guardian profile
  - soft delete guardian profile
  - activate/deactivate guardian profile
- Student-Guardians module (`/app/student-guardians`) now includes:
  - paginated list with search + filters (student/guardian/relationship/primary/active)
  - create student-guardian relationship
  - edit relationship details (relationship/primary/notifications/pickup/dates/notes/active)
  - soft delete relationship
  - activate/deactivate relationship
- Student Enrollments module (`/app/student-enrollments`) now includes:
  - paginated list with search + filters (student/academic year/section/status/active)
  - create student enrollment
  - edit enrollment details (student/year/section/date/status/notes/active)
  - soft delete enrollment
  - activate/deactivate enrollment
- Student Attendance module (`/app/student-attendance`) now includes:
  - paginated list with search + filters (student/enrollment/status/date range/active)
  - create attendance record
  - edit attendance details (enrollment/date/status/check-in/check-out/notes/active)
  - soft delete attendance record
  - activate/deactivate attendance record
- Student Books module (`/app/student-books`) now includes:
  - paginated list with search + filters (student/enrollment/subject/status/issued date range/active)
  - create student book record
  - edit book details (enrollment/subject/bookPart/issued-due-returned/status/notes/active)
  - soft delete student book record
  - activate/deactivate student book record
- Homework Types module (`/app/homework-types`) now includes:
  - paginated list with search + filters (system/custom/active)
  - create homework type
  - edit custom homework type
  - soft delete custom homework type
  - UI protection for `isSystem` homework types (no edit/delete in web UI)
- Homeworks module (`/app/homeworks`) now includes:
  - paginated list with search + filters (year/term/section/subject/type/active)
  - create homework with optional auto-populate students
  - edit homework details
  - populate missing student rows for homework
  - soft delete homework
  - activate/deactivate homework
- Student Homeworks module (`/app/student-homeworks`) now includes:
  - paginated list with search + filters (student/enrollment/homework/completion/submission range/active)
  - create student-homework tracking record
  - edit completion/submission/manual score/teacher notes
  - soft delete tracking record
  - activate/deactivate tracking record
  - UX validation for enrollment-homework compatibility and score <= homework max score
- Exam Periods module (`/app/exam-periods`) now includes:
  - paginated list with search + filters (year/term/assessment type/workflow/lock/active)
  - create exam period
  - edit exam period details
  - lock/unlock and activate/deactivate from web UI
  - soft delete exam period
- Exam Assessments module (`/app/exam-assessments`) now includes:
  - paginated list with search + filters (period/section/subject/date range/active)
  - create exam assessment
  - edit exam assessment details
  - soft delete exam assessment
  - activate/deactivate exam assessment
  - UX guard for locked exam periods and exam date within selected exam period range
- Student Exam Scores module (`/app/student-exam-scores`) now includes:
  - paginated list with search + filters (period/assessment/presence/active)
  - create student exam score
  - edit student exam score
  - soft delete student exam score
  - activate/deactivate student exam score
  - UX guards for locked exam periods, score range, and enrollment-assessment compatibility
- Monthly Grades module (`/app/monthly-grades`) now includes:
  - paginated list with search + filters (month/section/subject/active)
  - create monthly grade
  - recalculate monthly grades by month/section/subject
  - edit manual fields (activity/contribution/status/notes)
  - lock/unlock monthly grade
  - soft delete monthly grade
  - activate/deactivate monthly grade
  - UX guards for policy max limits and lock constraints
- Monthly Custom Component Scores module (`/app/monthly-custom-component-scores`) now includes:
  - paginated list with search + filters (month/section/subject/active)
  - create monthly custom component score
  - edit score/notes/active flag
  - soft delete monthly custom component score
  - activate/deactivate monthly custom component score
  - UX guards for component max score and locked monthly grades
- Grading Policies module (`/app/grading-policies`) now includes:
  - paginated list with search + filters (year/grade/subject/assessment/status/default/active)
  - create grading policy
  - edit grading policy
  - soft delete grading policy
  - UX guard for numeric score limits and passing score range
- Semester Grades module (`/app/semester-grades`) now includes:
  - paginated list with search + filters (term/section/subject/active)
  - create semester grade
  - calculate semester grades from monthly totals
  - fill semester final exam scores from final assessments
  - edit semester totals/status/notes
  - lock/unlock semester grade
  - soft delete semester grade
  - activate/deactivate semester grade
- Annual Statuses module (`/app/annual-statuses`) now includes:
  - paginated list with search + filters (system/custom/active)
  - create annual status
  - edit custom annual status
  - soft delete custom annual status
  - UI protection for `isSystem` statuses (no edit/delete in web UI)
- Promotion Decisions module (`/app/promotion-decisions`) now includes:
  - paginated list with search + filters (system/custom/active)
  - create promotion decision
  - edit custom promotion decision
  - soft delete custom promotion decision
  - UI protection for `isSystem` decisions (no edit/delete in web UI)
- Grading Outcome Rules module (`/app/grading-outcome-rules`) now includes:
  - paginated list with search + filters (academic year/grade level/strategy/active)
  - create grading outcome rule
  - edit grading outcome rule
  - soft delete grading outcome rule
  - UX guards for failed-subject thresholds and required decision links
- Annual Grades module (`/app/annual-grades`) now includes:
  - paginated list with search + filters (year/section/subject/final status/status/lock/active)
  - create annual grade
  - edit annual grade fields (semesters/percentage/final status/status)
  - lock/unlock annual grade
  - soft delete annual grade
  - activate/deactivate annual grade
- Annual Results module (`/app/annual-results`) now includes:
  - paginated list with search + filters (year/section/active)
  - create annual result
  - calculate annual results by year/section
  - edit annual result fields (totals/percentage/counts/decision/status)
  - lock/unlock annual result
  - soft delete annual result
  - activate/deactivate annual result
- Grading Reports module (`/app/grading-reports`) now includes:
  - summary report endpoint integration (`grading-reports/summary`)
  - filters by year/grade/section/term/date range
  - workflow distribution, status breakdown, ranking readiness, and decision/final-status distributions
- Employee Teaching Assignments module (`/app/employee-teaching-assignments`) now includes:
  - paginated list with search + filters (employee/section/subject/academic year/active)
  - create teaching assignment
  - edit teaching assignment
  - soft delete teaching assignment
- Employee Attendance module (`/app/employee-attendance`) now includes:
  - paginated list with search + filters (employee/status/date range/active)
  - create attendance record
  - edit attendance record
  - soft delete attendance record
- Employee Tasks module (`/app/employee-tasks`) now includes:
  - paginated list with search + filters (employee/academic year/day/active)
  - create employee task
  - edit employee task
  - soft delete employee task
- Employee Courses module (`/app/employee-courses`) now includes:
  - paginated list with search + filters (employee/date range/active)
  - create employee course
  - edit employee course
  - soft delete employee course
- Talents module (`/app/talents`) now includes:
  - paginated list with search + filters (active/inactive)
  - create talent
  - edit talent
  - soft delete talent
- Employee Talents module (`/app/employee-talents`) now includes:
  - paginated list with search + filters (employee/talent/active)
  - create employee-talent mapping
  - edit employee-talent mapping
  - soft delete employee-talent mapping
- Employee Performance Evaluations module (`/app/employee-performance-evaluations`) now includes:
  - paginated list with search + filters (employee/academic year/rating/evaluator/active)
  - create performance evaluation
  - edit performance evaluation
  - soft delete performance evaluation
  - UX guard for score/rating consistency before submit
- Employee Violations module (`/app/employee-violations`) now includes:
  - paginated list with search + filters (employee/reporter/severity/date range/active)
  - create employee violation
  - edit employee violation
  - soft delete employee violation
  - UX guard requiring `actionTaken` for `HIGH/CRITICAL`
- HR Reports module (`/app/hr-reports`) now includes:
  - summary report endpoint integration (`hr-reports/summary`)
  - filters by employee/date range
  - operational metrics for attendance, violations, workload, courses, and performance

## Login Test (Seed)
Default seed credentials from `backend/prisma/seed.ts`:

- Email: `admin@school.local`
- Password: `ChangeMe123!`

## Quick Test Flow
1. Ensure backend is running on `http://localhost:3000`.
2. Open frontend: `http://localhost:3001`.
3. You should land on `/auth/login`.
4. Login using seed credentials.
5. You should be redirected to `/app` (dashboard in the new app shell).
6. Open `/app/users` and confirm users data is loaded from protected API.
