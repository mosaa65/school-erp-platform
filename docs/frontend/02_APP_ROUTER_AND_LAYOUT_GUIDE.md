# App Router and Layout Guide

## Purpose
توضيح كيف بنيّة routes/layout تعمل داخل frontend.

## Routing Structure
1. Public/auth routes:
   - `src/app/auth/*`
2. Protected app routes:
   - `src/app/app/*`
3. Root layout:
   - `src/app/layout.tsx`
4. App layout:
   - `src/app/app/layout.tsx`

## App Shell
مكونات shell الرئيسية:
1. `src/components/layout/app-shell.tsx`
2. `src/components/layout/app-navigation.ts`
3. `src/components/layout/theme-toggle.tsx`
4. `src/components/layout/forbidden-card.tsx`

## Adding New Route
1. أنشئ route folder:
   - `src/app/app/<module-name>/page.tsx`
2. اربط route مع feature workspace.
3. أضف PermissionGuard في الصفحة.
4. حدث navigation entries إذا مطلوب.

## Route Protection
1. Unauthorized user sees forbidden card.
2. nav items تظهر حسب permission.
3. page نفسها تراجع permission المطلوبة.

## Layout Rules
1. لا تكرر shell في كل صفحة.
2. page files تبقى thin (orchestration فقط).
3. business UI في feature components.

## Checklist for New Page
1. هل permission guard مطبق؟
2. هل heading/module label متسق؟
3. هل loading/error/empty states موجودة؟
4. هل route مضافة في nav عند الحاجة؟
