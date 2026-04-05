# Phase C Smoke Evidence (Systems 01-05)

Date: 2026-03-09
Scope: Stabilization follow-up for System 05 UX/labels + operational workflow hardening outputs.

## 1) Commands Executed
- Backend:
  - `npm run prisma:migrate:deploy`
  - `npm run prisma:seed:core`
  - `npm run prisma:seed:demo`
  - `npm run build`
- Frontend:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run e2e -- tests/e2e/system05-section-labels.spec.ts tests/e2e/grading-reports.spec.ts tests/e2e/homeworks-default-dates.spec.ts tests/e2e/employee-section-supervisions.spec.ts`
  - `npm run e2e -- tests/e2e/grading-reports.spec.ts tests/e2e/system05-section-labels.spec.ts`

## 2) Outcomes
- Database migration applied successfully (including `20260308110000_add_system_04_student_extensions`).
- Core and demo seeds completed successfully.
- Backend build passed.
- Frontend typecheck and lint passed.
- E2E smoke suite result: **7 passed / 0 failed**.
- Focused post-polish suite result: **4 passed / 0 failed**.

## 3) New Smoke Coverage Added
- New file: `frontend/tests/e2e/system05-section-labels.spec.ts`
- Covered pages:
  - `/app/exam-assessments`
  - `/app/monthly-grades`
  - `/app/annual-grades`
- Assertion focus:
  - section options must include combined label format: `الصف / الشعبة`.

## 4) Defect Fixed During Smoke Prep
- Issue: `prisma:seed:core` failed on `lookup_grade_descriptions` with unique range conflict.
- Root cause: decimal range keys in seed used float literals; non-deterministic float representation could break idempotent `upsert` matching on decimal composite unique key.
- Fix:
  - Updated decimal range values in `backend/prisma/seeds/core/system-05/lookups.seed.ts` to fixed decimal strings (e.g., `"90.00"`, `"94.99"`).

## 5) Current Status
- Phase C stabilization items in this batch are validated and executable.
- Remaining closure still follows the open items in:
  - `docs/14_SYSTEMS_01_05_PHASE_C_PROGRESS_2026-03-09.md`
  - `docs/15_SYSTEMS_01_05_LOOKUP_TRANSLATION_WORKFLOW_MATRIX_2026-03-09.md`
