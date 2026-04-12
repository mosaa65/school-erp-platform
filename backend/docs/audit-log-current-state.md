# الحالة الحالية لسجل التدقيق (Audit Log)

تاريخ التوثيق: 2026-04-12  
هذا الملف يشرح **الوضع الحالي الفعلي في الكود** لسجل التدقيق، ويغطي:
- الواجهة الأمامية (Frontend)
- الواجهة الخلفية (Backend API + Service)
- قاعدة البيانات (Prisma/MySQL)
- تدفق البيانات من لحظة تسجيل العملية حتى عرضها
- الملاحظات العملية وحدود التطبيق الحالية

---

## 1) الملخص التنفيذي

سجل التدقيق الحالي يعمل بنمط من مرحلتين:
- عرض مختصر لكل عملية في قائمة رئيسية مناسبة للإدارة.
- عرض تفصيلي كامل عبر زر "عرض التفاصيل" داخل نافذة سفلية (Bottom Sheet).

الفلترة الحالية قوية وتدعم:
- نوع العملية (Action Type)
- المجال (Domain)
- الحالة (Success/Failure)
- المستخدم
- التاريخ من/إلى
- بحث نصي عام

الـ Backend يدعم هذه الفلاتر فعليًا على `/audit-logs`، ويعيد السجلات مرتبة من الأحدث إلى الأقدم.

---

## 2) الواجهة الأمامية (Frontend)

## 2.1 الصفحة والملاحة والصلاحيات

- صفحة سجل التدقيق موجودة على المسار: `/app/audit-logs`.
- الوصول لها محمي بصلاحية: `audit-logs.read`.
- رابط الصفحة موجود في قائمة التنقل.

الملفات:
- `frontend/src/app/app/audit-logs/page.tsx`
- `frontend/src/components/layout/app-navigation.ts`

---

## 2.2 مكوّن الصفحة الرئيسي

المكوّن الأساسي هو:
- `frontend/src/features/audit-logs/components/audit-logs-workspace.tsx`

ما الذي يفعله:
- يحمل السجلات بشكل paginated.
- يعرض كل سجل مختصرًا: المنفذ، نوع العملية، المجال، وقت العملية، الحالة، وصف تنفيذي.
- يضيف زر "عرض التفاصيل" لكل سجل.
- يفتح نافذة تفاصيل (BottomSheetForm) عند الضغط.

---

## 2.3 شكل العرض المختصر الحالي

لكل عنصر في القائمة يتم عرض:
- اسم المنفذ (اسم كامل أو بريد أو actorUserId أو "خدمة النظام")
- شارة نوع العملية (مثل: إضافة/تعديل/حذف...)
- شارة المجال (attendance/grades/fees... مترجمة)
- ملخص تنفيذي عربي مبسّط
- وقت العملية بصيغة محلية
- حالة العملية:
  - `SUCCESS` => ناجحة
  - `FAILURE` => فاشلة
- زر: `عرض التفاصيل`

الملخص التنفيذي يولّد من:
- `action`
- `resource`
- `actor`
- `status`
- `details.errorMessage/outcome` إن وُجد

---

## 2.4 الفلاتر الحالية (UI)

موجودة في Drawer علوي وتشمل:
- بحث نصي
- المستخدم
- نوع العملية
- المجال
- الحالة
- تاريخ من
- تاريخ إلى

القيم تُحوَّل إلى query params وتُرسل للـ API.

ملاحظات تطبيقية:
- `actionType` يرسل كقيمة normalized (CREATE/UPDATE/...)
- `domain` يرسل كأحد المجالات المحددة
- `from/to` تتحول إلى ISO مع حدود اليوم (00:00:00 و23:59:59.999)

---

## 2.5 التفاصيل الكاملة (Bottom Sheet)

عند فتح "عرض التفاصيل" يتم إظهار أقسام:

### أ) ملخص تنفيذي
- Audit ID
- المستخدم المنفذ
- الدور الوظيفي
- نوع العملية
- المجال
- النتيجة النهائية
- وصف كامل لما حدث
- وقت التنفيذ
- رسالة الخطأ

### ب) بيانات التغيير
- البيانات قبل التعديل
- البيانات بعد التعديل

### ج) بيانات تقنية
- IP
- User Agent
- الإجراء التقني (`action`)
- المورد التقني (`resource`)
- معرف المورد
- Outcome إضافي
- Request ID
- Correlation ID
- HTTP Method
- Path
- بيانات تقنية إضافية (إن وجدت)
- Raw details كـ fallback

---

## 2.6 Hooks والـ API Client

### Hooks
- `useAuditLogsQuery`:
  - يقرأ القائمة
  - يدعم جميع الفلاتر
  - query key شامل لكل فلتر
- `useAuditLogDetailsQuery`:
  - يقرأ سجلًا واحدًا بالـ id
  - fetch عند اختيار سجل

الملف:
- `frontend/src/features/audit-logs/hooks/use-audit-logs-query.ts`

### API Client
تم تعريف:
- `listAuditLogs(query)`
- `getAuditLogById(auditLogId)`
- `AuditLogListItem` مع `actorUser.userRoles`

الملف:
- `frontend/src/lib/api/client.ts`

---

## 3) الواجهة الخلفية (Backend)

## 3.1 الـ Module والـ Controller

الملفات:
- `backend/src/modules/audit-logs/audit-logs.module.ts`
- `backend/src/modules/audit-logs/audit-logs.controller.ts`

Endpoints الحالية:
- `GET /audit-logs` (requires `audit-logs.read`)
- `GET /audit-logs/:id` (requires `audit-logs.read`)

ملاحظة:
- لا يوجد endpoint DELETE في Controller حاليًا، رغم وجود `remove` في service.

---

## 3.2 DTO الفلاتر

الملف:
- `backend/src/modules/audit-logs/dto/list-audit-logs.dto.ts`

الحقول المدعومة:
- `page`, `limit`
- `resource`, `action`
- `actionType`
- `domain`
- `status`
- `actorUserId`
- `user`
- `search`
- `from`, `to`

---

## 3.3 Service: القراءة والفلترة

الملف:
- `backend/src/modules/audit-logs/audit-logs.service.ts`

### `findAll`
- يبني where clause عبر `buildWhereClause`.
- يرتّب بـ `occurredAt DESC` (الأحدث أولًا).
- يعيد `actorUser` مع الأدوار (role code/name).

### منطق الفلاتر الحالي
- `actionType`:
  - يطابق action مباشرًا (`UPDATE`)
  - أو suffix مثل `USER_UPDATE`
  - aliases خاصة `REJECT => REJECT/UNAPPROVE/REVOKE`
- `domain`:
  - يعتمد على كلمات مفتاحية داخل `resource`
- `user`:
  - يبحث في actorUserId والبريد والاسم الأول والأخير
- `search`:
  - يبحث في action/resource/resourceId/ip/userAgent + بيانات actor
- `from/to`:
  - فلترة على `occurredAt`

---

## 3.4 Service: التسجيل الفعلي للـ Audit

الدالة الأساسية:
- `record(input: RecordAuditLogInput)`

ما يحدث عند التسجيل:
- يتم دمج context الطلب داخل `details` عبر `_requestContext`.
- تخزين:
  - `actorUserId`
  - `action`
  - `resource`
  - `resourceId`
  - `status`
  - `details`
  - `ipAddress`
  - `userAgent`
  - `createdById`
  - `updatedById`

---

## 3.5 Request Context Middleware

الملف:
- `backend/src/common/request-context/request-context.ts`
- يتم تفعيله في `backend/src/main.ts`.

المحتوى الذي يُحقن في `_requestContext`:
- requestId
- correlationId
- method
- path
- ip
- userAgent
- startedAt

هذا يظهر لاحقًا في شاشة تفاصيل سجل التدقيق.

---

## 4) قاعدة البيانات (Prisma / MySQL)

## 4.1 Model: AuditLog

الملف:
- `backend/prisma/schema.prisma`

الحقول:
- `id`
- `actorUserId`
- `action`
- `resource`
- `resourceId`
- `status` (`SUCCESS`/`FAILURE`)
- `ipAddress`
- `userAgent`
- `details` (Json)
- `occurredAt`
- `createdAt`
- `updatedAt`
- `deletedAt`
- `createdById`
- `updatedById`

العلاقات:
- `actorUser` (relation: `audit_actor`)
- `createdBy`, `updatedBy`

الفهارس:
- `@@index([resource, resourceId])`
- `@@index([actorUserId, occurredAt])`
- `@@index([deletedAt])`

اسم الجدول:
- `audit_logs`

---

## 4.2 ملاحظات بنيوية

- لا توجد أعمدة منفصلة لـ:
  - `actionType`
  - `domain`
  - `errorMessage`
  - `before/after`
  - `requestId`
- هذه تُستنتج أو تُقرأ من `details` JSON.

ميزة هذا الأسلوب:
- مرن جدًا وسهل التوسعة.

التكلفة:
- الفلترة التحليلية الدقيقة تعتمد على parsing بدل أعمدة مفهرسة مباشرة.

---

## 5) تدفق البيانات من البداية للنهاية

1. أي Service يستدعي `auditLogsService.record(...)`.
2. `record` يدمج `_requestContext` في `details`.
3. يُخزن السجل في `audit_logs`.
4. صفحة Frontend تستدعي `GET /audit-logs` مع الفلاتر.
5. القائمة تظهر مختصرة مع ملخص تنفيذي.
6. عند "عرض التفاصيل" يتم طلب `GET /audit-logs/:id`.
7. تفاصيل السجل تُقسم إداريًا + تقنيًا.

---

## 6) ما هو مدعوم الآن مقابل ما يُستنتج

## 6.1 مدعوم صريحًا
- عرض مختصر نظيف
- زر عرض التفاصيل لكل سجل
- تفاصيل كاملة مقسمة
- فلترة قوية (actionType/domain/status/user/date/search)
- ترتيب الأحدث أولًا
- إبراز الحالة بألوان/بادجات
- دعم actor roles في الـ response

## 6.2 مستنتج (وليس حقلاً ثابتًا دائمًا)
- وصف العملية (من `details` أو عبر narrative)
- before/after (من مفاتيح متعددة محتملة داخل `details`)
- error message/outcome (من `details`)
- domain (من `resource` keywords)

---

## 7) الاختبارات المرتبطة

يوجد اختبار E2E للواجهة:
- `frontend/tests/e2e/audit-logs.spec.ts`

يغطي:
- الفلاتر (action/domain)
- فتح التفاصيل
- التأكد من ظهور أجزاء أساسية من البيانات

---

## 8) حدود حالية وفرص تحسين

## 8.1 حدود حالية
- استخراج `domain` و`actionType` يعتمد على naming conventions.
- `details` غير موحد 100% بين كل الموديولات.
- endpoint الحذف غير مفعل في Controller.

## 8.2 تحسينات مستقبلية مقترحة
- توحيد Audit Details Contract (واجهة JSON ثابتة).
- إضافة أعمدة مشتقة مفهرسة (`domain`, `action_type`) إذا زاد الحجم.
- إضافة retention policy وأرشفة.
- إضافة export/reporting خاص بسجل التدقيق.

---

## 9) الملفات المرجعية الأساسية

Frontend:
- `frontend/src/app/app/audit-logs/page.tsx`
- `frontend/src/features/audit-logs/components/audit-logs-workspace.tsx`
- `frontend/src/features/audit-logs/hooks/use-audit-logs-query.ts`
- `frontend/src/lib/api/client.ts`
- `frontend/tests/e2e/audit-logs.spec.ts`

Backend:
- `backend/src/modules/audit-logs/audit-logs.module.ts`
- `backend/src/modules/audit-logs/audit-logs.controller.ts`
- `backend/src/modules/audit-logs/audit-logs.service.ts`
- `backend/src/modules/audit-logs/dto/list-audit-logs.dto.ts`
- `backend/src/common/request-context/request-context.ts`
- `backend/src/main.ts`

Database:
- `backend/prisma/schema.prisma` (model: `AuditLog`)

