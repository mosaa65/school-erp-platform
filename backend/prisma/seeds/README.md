# Prisma Seeds Structure

This directory keeps seed data organized by system and purpose.

## Structure

- `core/`
  - `system-01/`
    - `permissions.seed.ts`: all RBAC permissions baseline.
    - `permissions.runner.ts`: upsert permissions to DB.
    - `lookups.seed.ts`: static System 01 lookup dictionaries.
    - `school-profile.seed.ts`: default school profile baseline.
  - `system-02/`
    - `academic-core.seed.ts`: static grade levels and subject dictionaries.
  - `system-05/`
    - `lookups.seed.ts`: grading-related static lookup dictionaries.
  - `shared/`
    - `admin.seed.ts`: bootstrap `super_admin` role and admin user.
  - `index.ts`: central runner for core seed.
- `demo/`
  - `academic-foundation.seed.ts`: demo year/term/grade/section.
  - `subject.seed.ts`: demo subject records.
  - `employee.seed.ts`: demo employee baseline.
  - `student.seed.ts`: demo student + guardian + enrollment.
  - `teaching-grades.seed.ts`: demo exams, assignments, grading policies, and scores.
  - `timetable.seed.ts`: demo timetable template/slot.
  - `index.ts`: central runner for demo seed.

## Execution

- Core static seed (required):
  - `npm run prisma:seed`
- Demo seed (optional for QA/manual testing):
  - `npm run prisma:seed:demo`

## Notes

- Core seed contains stable dictionaries expected in all schools.
- Demo seed contains sample records used for test/demo scenarios.
- Keep static dictionaries in the relevant `system-xx` folder only.
