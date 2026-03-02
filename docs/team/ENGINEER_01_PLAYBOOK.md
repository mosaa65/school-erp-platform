# Engineer 01 Playbook - Platform and Shared Core

## Mission
مسؤول عن أساس المنصة: Auth + RBAC + shared infra quality.

## Owned Backend Modules
1. `backend/src/auth`
2. `backend/src/modules/users`
3. `backend/src/modules/roles`
4. `backend/src/modules/permissions`
5. `backend/src/modules/audit-logs`
6. `backend/src/modules/global-settings`
7. shared guards/decorators in `backend/src/common`

## Owned Frontend Areas
1. `frontend/src/features/auth`
2. `frontend/src/app/auth/*`
3. `frontend/src/app/app/users`
4. `frontend/src/app/app/roles`
5. `frontend/src/app/app/permissions`
6. `frontend/src/app/app/audit-logs`
7. `frontend/src/app/app/global-settings`

## Daily Checklist
1. pull latest `develop`.
2. create branch in own namespace.
3. implement small atomic changes.
4. run local checks:
   - backend lint/build/tests (affected).
   - frontend lint/typecheck/e2e (affected).
5. open PR with change report if required.

## Branch Pattern
`feature/SYS01-<short-description>-eng01`

## Mandatory Commands
```bash
cd backend
npm run lint
npm run build

cd ../frontend
npm run lint
npm run typecheck
```

## Change Report Required When
1. permission model تغير.
2. auth flow تغير.
3. API contract للموديولات المشتركة تغير.
4. DB migration في shared tables.

## Do Not Do
1. لا تغير grading/student modules بدون تنسيق مع owners.
2. لا تكسر permission codes الحالية بدون migration plan.
