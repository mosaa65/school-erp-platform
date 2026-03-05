# Data Consistency Review (Systems 02/03/05)
Date: 2026-03-05
Scope: `backend/prisma/schema.prisma`, `backend/prisma/seeds`, `frontend/src/features`, and reference DDL docs under `systems/`.

## 1) Executive Summary
- There is a real consistency gap between:
  - Current implementation (`backend-frontend`) and
  - Legacy analysis DDL docs (`systems/02`, `systems/03`, `systems/05`).
- Main issue: mixed master-data strategy.
  - Some domains use `lookup_*` tables.
  - Other domains use enums/free-text for the same concept.
- Result:
  - Arabic/English mix in displayed values.
  - Repeated business meaning in multiple places.
  - Harder filtering/reporting/governance across modules.

## 2) Confirmed Conflicts
### A) Docs vs Implementation Naming/Structure
- `systems/02_النواة_الأكاديمية/DDL.sql` still uses legacy names such as `classrooms`, `name_ar`, and stage labels in Arabic enum.
- Current schema uses:
  - `sections` (not `classrooms`)
  - generic `name` fields + enum stages (`PRIMARY`, `MIDDLE`, ...)
  - explicit `code` fields.
- `systems/05_التعليم_والدرجات/10_البيانات_التجريبية_والأمثلة/README_END_TO_END_EXAMPLE.md` uses legacy entities like `teacher_assignments`, `classroom_id`, `semester_id` in SQL examples not matching current Prisma naming.

### B) Lookup Tables Seeded But Not Used by Domain FKs
From `schema.prisma` relation scan:
- **Used by domain models**
  - `LookupBloodType` (students)
  - `LookupIdType` (employees/guardians)
  - `LookupOwnershipType` (school profile)
  - `LookupPeriod` (timetable template slots)
- **Seeded but not linked by domain FKs (currently only catalog/metadata)**
  - `LookupGender`
  - `LookupQualification`
  - `LookupJobRole`
  - `LookupAttendanceStatus`
  - `LookupRelationshipType`
  - `LookupHealthStatus`
  - `LookupOrphanStatus`
  - `LookupEnrollmentStatus`
  - `LookupSchoolType`
  - `LookupDay`
  - `LookupTalent`
  - `LookupAbilityLevel`
  - `LookupActivityType`
  - `LookupHijriMonth`
  - `LookupWeek`
  - `LookupBuilding`

### C) Enum/String vs Lookup Duplication (Same Business Meaning)
- `Employee.gender` uses enum, while `lookup_genders` exists.
- `Employee.qualification` is free text, while `lookup_qualifications` exists.
- `Employee.jobTitle` is free text, while `lookup_job_roles` exists.
- `Student.healthStatus` uses enum, while `lookup_health_statuses` exists.
- `Student.orphanStatus` uses enum, while `lookup_orphan_statuses` exists.
- `StudentEnrollment.status` uses enum, while `lookup_enrollment_statuses` exists.
- `StudentAttendance.status`/`EmployeeAttendance.status` use enums, while `lookup_attendance_statuses` exists.
- `StudentGuardian.relationship` uses enum, while `lookup_relationship_types` exists.

### D) Missing Lookup Models Referenced in Legacy HR DDL
Legacy HR DDL includes tables not in current Prisma schema:
- `lookup_employment_statuses`
- `lookup_rating_levels`

## 3) Language Consistency Findings
- Core academic seed is mostly Arabic labels with stable English-like `code` values (good pattern).
- Current demo data includes mixed display text (e.g., section name with Latin letter `"الشعبة A"`).
- Frontend shows translated enums in many places, but some pages still surface code-like values directly (`code`, stage/status tokens in filters/lists).

## 4) Root Cause
- The project evolved from analysis DDL to implementation schema without a hard “master-data contract”.
- No single enforced rule for each concept: “Enum vs Lookup FK vs Free Text”.

## 5) Recommended Resolution Strategy (Do This)
## Phase 0: Freeze and Governance (mandatory)
1. Declare `backend/prisma/schema.prisma` as the implementation source of truth.
2. Mark legacy DDL docs as `analysis-only` or `legacy`.
3. Add `Master Data Contract` doc: for each concept define one canonical source.

## Phase 1: Master Data Contract for Systems 02/03/05
Adopt rule:
- **Lookup FK** for values that can vary by school/country or need admin control/translations.
- **Enum** only for internal workflow states (e.g., `DRAFT/APPROVED`, lock states, system flags).
- **Free text** only for truly open text.

Priority conversions:
1. HR:
   - `Employee.gender` -> `genderId` (LookupGender)
   - `Employee.qualification` -> `qualificationId` (LookupQualification) + optional note text
   - `Employee.jobTitle` -> `jobRoleId` (LookupJobRole) + optional custom override
2. Students:
   - `Student.healthStatus` -> `healthStatusId` (LookupHealthStatus)
   - `Student.orphanStatus` -> `orphanStatusId` (LookupOrphanStatus)
   - `StudentEnrollment.status` -> `enrollmentStatusId` (LookupEnrollmentStatus)
   - `StudentGuardian.relationship` -> `relationshipTypeId` (LookupRelationshipType)
3. Attendance:
   - `StudentAttendance.status` / `EmployeeAttendance.status` -> `attendanceStatusId` (LookupAttendanceStatus)

## Phase 2: Migration and Backfill
For each converted field:
1. Add nullable FK column.
2. Backfill from existing enum/string values using deterministic mapping.
3. Switch API/DTO/frontend to new FK field.
4. Make FK non-null where business requires.
5. Keep old field temporarily, then drop after one release cycle.

## Phase 3: API + Frontend Unification
1. Forms must load options from lookup endpoints (not hardcoded enum arrays) for converted concepts.
2. Lists should display Arabic labels from lookup (`nameAr`) and keep `code` secondary.
3. Add standard UI formatting:
   - Primary display: Arabic label
   - Secondary display: technical code in muted style.

## Phase 4: Seed Strategy
Split seeds clearly:
1. `core`:
   - immutable/master tables (lookups, roles, base settings)
2. `demo`:
   - test-only operational records
3. Add validation script:
   - fails if operational tables contain mixed-language label anomalies beyond allowed pattern.

## 6) Immediate Quick Wins (Low Risk)
1. Normalize demo Arabic display fields (e.g., section names with Arabic letters).
2. Standardize list rendering in frontend so all lookup-backed labels show Arabic first.
3. Add audit query/report endpoint for “enum fields still pending migration to lookups”.

## 7) Delivery Plan (Execution Order)
1. HR conversion package (largest governance gain).
2. Students conversion package.
3. Attendance conversion package.
4. Frontend option-source cleanup.
5. Data cleanup and regression tests.

## 8) Acceptance Criteria
1. No duplicated concept represented by both enum and lookup in active domain models.
2. Every selectable business label in systems 02/03/05 comes from one canonical source.
3. Arabic display labels are consistent across forms, lists, and reports.
4. E2E coverage includes lookup-driven create/edit/filter for converted fields.

