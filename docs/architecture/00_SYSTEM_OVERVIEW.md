# School ERP - System Overview

## Purpose
هذا الملف يشرح الصورة الكاملة للنظام حتى يفهم أي مهندس جديد:
1. ما الذي نبنيه.
2. كيف الأجزاء تتكامل.
3. كيف يبدأ العمل بدون تخمين.

## Product Scope (Current Implementation)
النظام الحالي يغطي عمليا:
1. `System 01`: Shared Infrastructure (Auth, Users, Roles, Permissions, Audit Logs, Global Settings).
2. `System 02`: Academic Core.
3. `System 03`: HR.
4. `System 04`: Students.
5. `System 05`: Teaching & Grades (جزء كبير منفذ، مع أجزاء متبقية للنتائج والتقارير النهائية).

## Repositories and Runtime Model
المشروع يعمل بأسلوب decoupled:
1. `backend/` خدمة API مستقلة (NestJS + Prisma + MySQL).
2. `frontend/` تطبيق Web مستقل (Next.js 14 App Router).
3. قاعدة البيانات MySQL مشتركة عبر Prisma models/migrations.

## High-Level Architecture
1. Frontend يرسل الطلبات إلى `/backend/*` عبر proxy في Next.js.
2. Backend يطبق:
   - JWT Authentication.
   - Permission-based RBAC guards.
   - Validation على DTOs.
   - Global error envelope.
   - Structured logging.
3. Prisma يتعامل مع MySQL ويطبق migrations + seed.

## Core Engineering Rules
1. لا endpoint بدون validation و RBAC.
2. لا list endpoint بدون pagination.
3. لا merge بدون lint/typecheck/tests المطلوبة.
4. أي تغيير DB/API/Cross-system لازم Change Report:
   - `docs/templates/ENGINEERING_CHANGE_REPORT_TEMPLATE.md`

## Directory Map
1. Root planning/analysis docs:
   - `01_البنية_المشتركة/` ... `19_الصحة_المدرسية/` (تحليل وتصميم نطاقات النظام).
2. تنفيذ backend:
   - `backend/src`
   - `backend/prisma`
   - `backend/test`
3. تنفيذ frontend:
   - `frontend/src`
   - `frontend/tests/e2e`
4. governance and delivery docs:
   - `docs/ENGINEERING_EXECUTION_GOVERNANCE.md`
   - `docs/ENGINEERING_DOCS_AND_TEAM_PLAN.md`

## Start Here (For New Engineers)
1. اقرأ `docs/ENGINEERING_EXECUTION_GOVERNANCE.md`.
2. شغّل backend حسب `docs/backend/07_BACKEND_OPERATIONS_RUNBOOK.md`.
3. شغّل frontend حسب `docs/frontend/07_FRONTEND_OPERATIONS_RUNBOOK.md`.
4. نفّذ E2E runbook:
   - `docs/02_E2E_RUNBOOK.md`
5. راجع إغلاق الإنتاج:
   - `docs/03_PRODUCTION_READINESS_CHECKLIST.md`
6. لا تبدأ أي كود قبل فهم playbook الخاص بدورك:
   - `docs/team/ENGINEER_01_PLAYBOOK.md`
   - `docs/team/ENGINEER_02_PLAYBOOK.md`
   - `docs/team/ENGINEER_03_PLAYBOOK.md`
   - `docs/team/ENGINEER_04_PLAYBOOK.md`

## Current Delivery Governance
الاعتماد النهائي لأي تغيير إنتاجي:
1. **Executive**: موسى العواضي.
2. **Supervisor**: عماد الجماعي.

مرجع التنفيذ الرسمي:
`docs/ENGINEERING_EXECUTION_GOVERNANCE.md`
