# Backend Folder Map

## Purpose
خريطة عملية لمسارات backend حتى لا يضيع المهندس بين الملفات.

## Top-Level Structure
1. `backend/src/` كود التطبيق.
2. `backend/prisma/` schema + migrations + seed.
3. `backend/test/` e2e tests.
4. `backend/dist/` build output.

## `src/` Breakdown
1. `src/main.ts`:
   - app bootstrap.
   - global validation/filter.
   - swagger setup.
2. `src/app.module.ts`:
   - root module imports.
3. `src/auth/`:
   - auth controller/service.
   - jwt strategy.
   - login DTO.
4. `src/common/`:
   - decorators: current user, permissions.
   - guards: jwt, permissions.
   - filters: http exception envelope.
   - logger: structured logger service.
5. `src/prisma/`:
   - prisma module/service wrapper.
6. `src/modules/`:
   - business modules by domain.

## Typical Module Layout
مثال:
1. `src/modules/users/users.module.ts`
2. `src/modules/users/users.controller.ts`
3. `src/modules/users/users.service.ts`
4. `src/modules/users/dto/*`

## `prisma/` Breakdown
1. `prisma/schema.prisma`:
   - source of truth للـ database models.
2. `prisma/migrations/*/migration.sql`:
   - incremental DB changes.
3. `prisma/seed.ts`:
   - base data for first run/testing.

## `test/` Breakdown
1. `test/app.e2e-spec.ts`
2. `test/hr-core.e2e-spec.ts`
3. `test/jest-e2e.json`

## Where to Add New Code
1. Endpoint + logic:
   - add in target module folder under `src/modules/<module-name>/`.
2. New DTO:
   - `src/modules/<module-name>/dto/`.
3. New guard/decorator:
   - `src/common/*` فقط إذا reusable across modules.
4. DB change:
   - update `prisma/schema.prisma` + create migration.

## Naming Rules
1. module folders: plural kebab-case (`employee-violations`).
2. files: `<module>.<layer>.ts` pattern.
3. DTOs: verb/object naming (`create-*.dto.ts`, `update-*.dto.ts`, `list-*.dto.ts`).
