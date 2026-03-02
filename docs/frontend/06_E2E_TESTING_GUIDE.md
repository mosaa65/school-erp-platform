# Frontend E2E Testing Guide (Playwright)

## Purpose
مرجع موحد لكتابة وتشغيل E2E tests في frontend.

## Current Test Location
1. specs:
   - `frontend/tests/e2e/*.spec.ts`
2. shared helpers:
   - `frontend/tests/e2e/helpers/*`

## Existing Coverage
1. employee courses.
2. employee talents.
3. employee performance evaluations.
4. employee violations.
5. talents catalog.
6. academic months.
7. grading policies.
8. grading reports summary.
9. HR reports summary.

## Run Commands
```bash
cd frontend
npm run e2e
npm run e2e:release
npm run qa:release
npm run e2e:headed
npm run e2e:ui
```

## Quality Commands
```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

## Helper Layers
1. API mocks:
   - `helpers/api-mocks.ts`
2. auth session injection:
   - `helpers/auth-session.ts`
3. fixtures:
   - `helpers/fixtures.ts`
4. permissions:
   - `helpers/permissions.ts`
5. list item builders:
   - `helpers/list-item-builders.ts`
6. UI assertions:
   - `helpers/ui-assertions.ts`
7. form actions:
   - `helpers/form-actions.ts`

## Writing New E2E Test
1. inject auth session with proper permission set.
2. mock required option lists and list endpoint.
3. open module page and assert heading/cards.
4. run form actions.
5. assert result and payload behavior.

## E2E Stability Rules
1. استخدم `data-testid` selectors.
2. avoid brittle selectors.
3. keep mocks deterministic.
4. prefer helper reuse over copy-paste.

## CI Gate (Recommended)
1. lint pass.
2. typecheck pass.
3. playwright tests pass.
