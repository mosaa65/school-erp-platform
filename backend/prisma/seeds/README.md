# Prisma Seeds Structure

This directory keeps seed data organized by system and purpose.

## Structure

- `core/`
  - `system-01/`
    - `permissions.seed.ts`: all RBAC permissions baseline.
    - `permissions.runner.ts`: upsert permissions to DB.
    - `lookups.seed.ts`: static System 01 lookup dictionaries.
    - `school-profile.seed.ts`: default school profile baseline.
  - `system-05/`
    - `lookups.seed.ts`: grading-related static lookup dictionaries.
  - `shared/`
    - `admin.seed.ts`: bootstrap `super_admin` role and admin user.
  - `index.ts`: central runner for core seed.

## Execution

- Core static seed (required):
  - `npm run prisma:seed`
- Demo seed (optional for QA/manual testing):
  - `npm run prisma:seed:demo`

## Notes

- Core seed contains stable dictionaries expected in all schools.
- Demo seed contains sample records used for test/demo scenarios.
- Keep static dictionaries in the relevant `system-xx` folder only.
