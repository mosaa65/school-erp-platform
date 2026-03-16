# Engineer 03 Playbook - HR and Staff Flows

## Mission
مسؤول عن نطاق الموارد البشرية وتدفقات الموظفين.

## Owned Backend Modules
1. `backend/src/modules/employees`
2. `backend/src/modules/employee-attendance`
3. `backend/src/modules/employee-tasks`
4. `backend/src/modules/employee-courses`
5. `backend/src/modules/employee-talents`
6. `backend/src/modules/employee-violations`
7. `backend/src/modules/employee-performance-evaluations`
8. `backend/src/modules/employee-teaching-assignments`
9. `backend/src/modules/hr-reports`
10. `backend/src/modules/talents`

## Owned Frontend Areas
1. `frontend/src/app/app/employees`
2. `frontend/src/app/app/employee-attendance`
3. `frontend/src/app/app/employee-tasks`
4. `frontend/src/app/app/employee-courses`
5. `frontend/src/app/app/employee-talents`
6. `frontend/src/app/app/employee-violations`
7. `frontend/src/app/app/employee-performance-evaluations`
8. `frontend/src/app/app/employee-teaching-assignments`

## Core Responsibilities
1. HR business rules consistency.
2. stable forms and filters UX.
3. maintain and extend HR E2E tests.

## Branch Pattern
`feature/SYS03-<short-description>-eng03`

## Mandatory Commands
```bash
cd backend
npm run lint
npm run build
npm run test:e2e

cd ../frontend
npm run lint
npm run typecheck
npm run e2e
```

## Change Report Required When
1. HR tables تتغير.
2. HR APIs تتغير.
3. أي تغيير يؤثر Academic/Students via shared relations.

## Do Not Do
1. لا تعدل student grading modules بدون owner coordination.
2. لا تدمج PR بدون تحديث E2E إذا behavior تغيّر.
