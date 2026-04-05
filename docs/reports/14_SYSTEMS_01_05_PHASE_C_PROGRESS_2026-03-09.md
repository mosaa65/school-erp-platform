# Phase C Progress - Systems 01-05

Date: 2026-03-09
Scope: Systems 01-05 only (shared infrastructure, academic core, HR, students, teaching & grades).

## 1) Implemented in this batch
- Added operational readiness signals for employee records in backend responses:
  - `operationalScope.activeTeachingAssignments`
  - `operationalScope.activeSectionSupervisions`
- Added frontend readiness indicator in employee cards based on:
  - linked user account
  - active role assignments
  - active academic scope (teaching/supervision)
- Added dedicated readiness filter in employees list (`READY`, `PARTIAL`, `NOT_READY`) end-to-end:
  - backend query filter
  - frontend filter control
- Added quick workflow bridge from employee cards to users page with prefilled query (`?q=`).
- Added direct warnings in:
  - teaching assignments form
  - section supervision form
  when selected employee has no linked user account.
- Added optional strict workflow policy in backend (feature-flagged):
  - blocks activation of teaching assignment/supervision when employee is not operationally ready
  - controlled by env: `STRICT_EMPLOYEE_WORKFLOW=true`
- Improved section clarity in System 05 dropdowns/lists:
  - switched section labels to `الصف / الشعبة` in key screens:
    - exam assessments
    - student exam scores
    - monthly grades
    - semester grades
    - annual grades
    - annual results
    - grading reports
- Completed Arabic message pass for System 05 calculation flows in backend:
  - monthly grades calculation responses
  - semester grades calculation/fill-final responses
  - annual results calculation responses
- Completed Arabic message pass for System 05 backend validation/conflict/not-found messages across:
  - annual grades, annual statuses
  - exam assessments, exam periods
  - grading outcome rules, grading policies, grading reports
  - homework types, homeworks
  - monthly custom component scores
  - promotion decisions
  - student exam scores, student homeworks
- Polished user-facing wording in frontend:
  - replaced technical counters (`متجاهل_مقفل`, `متجاهل_موجود`) with readable Arabic
  - grading reports now prioritizes Arabic grade description display
- Reordered System 05 sidebar pages according to operational data-entry sequence
  (setup -> operations -> outcomes -> reports) to reduce implementation confusion.
- Localized frontend generic API fallback/auth errors:
  - default HTTP error fallback is now Arabic
  - missing token message is now Arabic
- Standardized permission wording across System 01-05 workspaces:
  - `لا تملك الصلاحية المطلوبة: ...`
  - `يتطلب هذا الجزء صلاحيات القراءة: ...`
- Standardized loading/failure UI wording across workspaces:
  - `جارٍ تحميل البيانات...`
  - `تعذّر تحميل البيانات.`
- Added unified Arabic success feedback banners in System 05 key workspaces after CRUD/state actions:
  - grading policies
  - exam periods
  - exam assessments
  - monthly custom component scores
  - grading outcome rules
  - promotion decisions
- Extended unified success feedback coverage across remaining core System 05 operations:
  - homeworks
  - homework types
  - monthly grades
  - semester grades
  - annual grades
  - annual results
  - student exam scores
  - student homeworks
- Extended unified success feedback coverage to key System 02/04 data-entry screens:
  - subjects
  - sections
  - guardians
  - student enrollments
  - student-guardian links
- Updated E2E assertion in grading policies to match Arabic UI label (`نهائي`).

## 2) Current confirmed gaps (remaining)
- Dual representation still exists in student/guardian/employee demographic fields (enum + lookup id).
- Terminology and translation still need final pass in a subset of frontend screens outside System 05 critical flows.
- Master lookup coverage audit is not yet fully closed as a signed checklist.

## 3) Next execution queue
1. Add backend workflow checks for critical operations (optional strict mode):
   - prevent assignment/supervision activation for employees with suspended/no account.
2. Produce final lookup usage matrix for systems 01-05 (DDL + README + schema + seed + API).
3. Run smoke matrix and attach evidence logs for closure.
