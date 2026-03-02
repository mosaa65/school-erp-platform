# System 01 Lookup Coverage

## Scope
This document tracks System 01 lookup tables from:
- `01_البنية_المشتركة/DDL.sql`
- `01_البنية_المشتركة/README.md`

## Implemented in backend schema
All lookup tables from System 01 DDL are now present in Prisma schema and DB migration:

1. `lookup_school_types`
2. `lookup_genders`
3. `lookup_blood_types`
4. `lookup_id_types`
5. `lookup_ownership_types`
6. `lookup_periods`
7. `lookup_qualifications`
8. `lookup_job_roles`
9. `lookup_days`
10. `lookup_attendance_statuses`
11. `lookup_marital_statuses`
12. `lookup_health_statuses`
13. `lookup_relationship_types`
14. `lookup_talents`
15. `lookup_hijri_months`
16. `lookup_weeks`
17. `lookup_buildings`

Migration:
- `backend/prisma/migrations/20260301070000_add_system_01_missing_lookup_tables/migration.sql`

## APIs
- Existing dedicated endpoints remain active:
  - `/lookup/blood-types`
  - `/lookup/id-types`
  - `/lookup/ownership-types`
  - `/lookup/periods`
- New generic catalog endpoints (for the new System 01 lookups):
  - `GET    /lookup/catalog/:type`
  - `GET    /lookup/catalog/:type/:id`
  - `POST   /lookup/catalog/:type`
  - `PATCH  /lookup/catalog/:type/:id`
  - `DELETE /lookup/catalog/:type/:id`

Where `:type` is one of:
- `school-types`
- `genders`
- `qualifications`
- `job-roles`
- `days`
- `attendance-statuses`
- `marital-statuses`
- `health-statuses`
- `relationship-types`
- `talents`
- `hijri-months`
- `weeks`
- `buildings`

## RBAC
Added permissions include:
- `lookup-catalog.manage`
- `lookup-catalog.create|read|update|delete`
- per-lookup permissions (`lookup-school-types.*`, `lookup-genders.*`, ...)

## Seeds
Seed architecture reorganized to:
- `backend/prisma/seeds/core/system-01/...`
- `backend/prisma/seeds/core/system-05/...`
- `backend/prisma/seeds/core/shared/...`
- `backend/prisma/seeds/core/index.ts` (central runner)

Run:
- `npm run prisma:seed` for core static data
- `npm run prisma:seed:demo` for demo data

## Frontend
- New pages:
  - `/app/lookup-catalog`
  - `/app/lookup-catalog/[type]`
- Added sidebar entry:
  - `قاموس المرجعيات`

