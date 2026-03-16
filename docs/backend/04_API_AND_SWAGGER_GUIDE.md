# API and Swagger Guide

## Purpose
مرجع موحد لتصميم API contracts وتوثيقها في Swagger.

## Base Information
1. API base URL local:
   - `http://localhost:3000`
2. Swagger UI:
   - `http://localhost:3000/api/docs`

## REST Design Rules
1. استخدم resource-based endpoints.
2. CRUD pattern واضح:
   - `GET /resource`
   - `GET /resource/:id`
   - `POST /resource`
   - `PATCH /resource/:id`
   - `DELETE /resource/:id` (soft delete)
3. يدعم pagination/filter/search في list endpoints.

## Controller Standards
1. كل endpoint يجب:
   - DTO input/output واضح.
   - RBAC permission check.
   - Swagger decorators.
2. list endpoints:
   - يقبل `page`, `limit` + domain filters.
   - يرجع `data + pagination`.

## Swagger Standards
1. استخدم `@ApiTags` لكل controller.
2. استخدم `@ApiOperation` لوصف endpoint.
3. استخدم `@ApiResponse` للحالات الأساسية.
4. استخدم DTO classes لعرض request schema.

## Contract Stability Policy
1. التغييرات الكاسرة ممنوعة بدون موافقة القيادة.
2. أي تغيير response shape يحتاج:
   - تحديث docs.
   - تحديث frontend consumers.
   - تحديث tests.

## Error Contract
1. global exception filter يوحّد envelope.
2. الأخطاء يجب تكون مفهومة وتفيد debugging.
3. لا تسرب تفاصيل حساسة في message.

## API Review Checklist
1. هل endpoint يحقق business الحاجة؟
2. هل validation كاملة؟
3. هل RBAC مطبق؟
4. هل pagination/filter منطقية؟
5. هل swagger محدث؟
