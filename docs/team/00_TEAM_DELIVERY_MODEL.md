# Team Delivery Model (4 Engineers)

## Purpose
هذا الملف يحدد طريقة العمل التنفيذية للفريق (4 مهندسين) بشكل ثابت.

## Core Principles
1. Ownership واضح لكل engineer.
2. لا أحد يشتغل على كل شيء.
3. التغييرات cross-owner تتم بتنسيق مسبق.
4. كل merge يمر عبر PR + review + approvals.

## Ownership Split
1. Engineer 01:
   - Platform and Shared Core.
2. Engineer 02:
   - Academic and Scheduling.
3. Engineer 03:
   - HR and Staff flows.
4. Engineer 04:
   - Students and Grading flows.

## Branch Strategy
1. branches الرئيسية:
   - `main`, `develop`
2. branches العمل:
   - `feature/*`, `fix/*`, `hotfix/*`, `docs/*`
3. naming:
   - `feature/SYSxx-short-description-eng0x`

## PR Rules
1. ممنوع direct push على `main`.
2. PR إلى `develop` أثناء التطوير.
3. PR إلى `main` فقط من `develop` أو hotfix approved.
4. required checks:
   - backend: lint/build/e2e حسب النطاق.
   - frontend: lint/typecheck/build/e2e.
5. أي تعديل DB/API/Cross-system يحتاج Change Report.

## Coordination Rules
1. إذا endpoint يتأثر ويستخدمه frontend owner آخر:
   - notify owner قبل الدمج.
2. إذا migration تؤثر أكثر من subsystem:
   - review مشترك.
3. blocker escalation:
   - يرفع مباشرة إلى موسى + عماد.

## Weekly Cadence
1. Planning meeting (بداية الأسبوع).
2. Daily quick sync.
3. Mid-week integration check.
4. End-week demo + risk review.

## Final Approval Authority
1. Executive final approval: موسى العواضي.
2. Supervisor final approval: عماد الجماعي.
