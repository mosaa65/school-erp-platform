# UI System and Component Guide

## Purpose
توحيد أسلوب بناء الواجهة حتى لا يختلف الشكل والسلوك بين المهندسين.

## UI Foundation
1. Tailwind CSS for styling.
2. shadcn/ui components in:
   - `frontend/src/components/ui`
3. layout components in:
   - `frontend/src/components/layout`

## Component Layers
1. Base UI components:
   - button, input, card, badge, etc.
2. Shared layout components:
   - shell/navigation/forbidden.
3. Feature components:
   - module workspaces + module-specific blocks.

## Design Consistency Rules
1. reuse existing components first.
2. keep spacing/typography consistent.
3. use semantic colors (muted/destructive/primary).
4. avoid one-off inline styles unless unavoidable.

## Workspace UX Pattern
1. form panel (create/edit).
2. list panel (cards/table).
3. filters/search.
4. pagination + refresh.

## Accessibility and UX
1. labels واضحة في forms.
2. meaningful disabled states.
3. واضحة رسائل validation.
4. keyboard-friendly controls when possible.

## Testability Rules
1. data-testid للحقول والعناصر المهمة.
2. test selectors يجب تكون stable.
3. لا تعتمد E2E على نصوص متغيرة إلا عند الحاجة.
