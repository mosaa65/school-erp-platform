# Frontend Architecture (Next.js 14)

## Purpose
شرح المعمارية الحالية لتطبيق الويب في `frontend/`.

## Stack
1. Next.js 14 App Router.
2. React 18.
3. TypeScript.
4. Tailwind CSS + shadcn/ui.
5. TanStack React Query.
6. Playwright E2E.

## Architectural Style
المشروع يعتمد feature-driven UI:
1. `src/app` للrouting/layout.
2. `src/features/<module>` لكل domain feature.
3. `src/components` للمكونات العامة.
4. `src/lib` للـ infrastructure (api/env/utils/auth constants).

## Runtime Flow
1. المستخدم يدخل route داخل `/app/*`.
2. layout العام يطبق shell/navigation/theme.
3. feature workspace يحمل البيانات عبر React Query.
4. API calls تمر عبر proxy path `/backend/*`.
5. UI behavior يتحدد بالصلاحيات (RBAC in UI).

## Key Frontend Patterns
1. Workspace pattern:
   - form + filters + cards/list + pagination.
2. Hooks separation:
   - query hooks.
   - mutation hooks.
   - options hooks (dropdowns).
3. Permission-driven UX:
   - disable/hide actions when permission missing.
4. Validation guards في form-level UX قبل submit.

## Stability Rules
1. لا endpoint URL hardcoded خارج API client layer.
2. لا state duplication بين local state وquery cache بدون داع.
3. كل شاشة يجب تغطي:
   - loading state.
   - error state.
   - empty state.

## Anti-Patterns (Do Not Do)
1. لا تضع business logic ثقيل داخل page.tsx.
2. لا تكرر form/filter code إذا helper قابل لإعادة الاستخدام.
3. لا تستخدم selectors هشة في E2E.
