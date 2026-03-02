# Backend Docs Index

## Purpose
هذا الفهرس هو نقطة الدخول لكل مهندس يعمل على `backend/`.

## Read Order (Recommended)
1. `docs/backend/01_BACKEND_ARCHITECTURE.md`
2. `docs/backend/02_BACKEND_FOLDER_MAP.md`
3. `docs/backend/03_DATABASE_AND_PRISMA_GUIDE.md`
4. `docs/backend/04_API_AND_SWAGGER_GUIDE.md`
5. `docs/backend/05_AUTH_RBAC_SECURITY_GUIDE.md`
6. `docs/backend/06_BACKEND_TESTING_GUIDE.md`
7. `docs/backend/07_BACKEND_OPERATIONS_RUNBOOK.md`

## Source of Truth
1. Runtime code:
   - `backend/src`
2. Data model and migrations:
   - `backend/prisma/schema.prisma`
   - `backend/prisma/migrations`
3. Tests:
   - `backend/test`
4. App entry:
   - `backend/src/main.ts`
   - `backend/src/app.module.ts`

## Commands Quick List
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
npm run qa:release
```

## Quality Gates
```bash
cd backend
npm run lint:check
npm run build
npm run test:e2e
```

## Policy Reminder
أي تغيير DB/API/Cross-system يتطلب تقرير:
`docs/templates/ENGINEERING_CHANGE_REPORT_TEMPLATE.md`
