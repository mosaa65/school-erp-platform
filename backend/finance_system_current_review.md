# مراجعة وتقييم النظام المالي الحالي
**تاريخ المراجعة:** 12 أبريل 2026

## 1) حالة التشغيل الفعلية
- Backend يعمل على `http://localhost:3000` (تم التحقق من الاستماع على المنفذ 3000).
- Frontend يعمل على `http://localhost:3001` (تم التحقق من الاستماع على المنفذ 3001).
- تم تنفيذ الهجرات بنجاح عبر:
  - `npm run prisma:migrate:deploy`
  - النتيجة: `No pending migrations to apply.`
- ملاحظة تشغيلية: المجدول الدوري للقيود المتكررة يعمل لكن يتخطى التنفيذ بسبب عدم ضبط `FINANCE_SYSTEM_USER_ID` (سجل التحذير ظاهر في `logs/backend-dev-live.log`).

## 2) نتيجة اختبارات المالية (E2E)
تم تشغيل:
`npm run test:e2e:finance`

النتيجة:
- Test Suites: `9 failed / 9`
- Tests: `23 failed, 2 passed`

السبب الأوضح:
- اختبارات تستخدم حقولًا لم تعد موجودة في الـ Prisma schema الحالي:
  - `branch.code` في `test/finance-test-helpers.ts:138-141`
  - `chartOfAccount.accountCode` في `test/finance-test-helpers.ts:749-752` و `:766-769`
- بينما الموديلات الحالية:
  - `Branch` بدون حقل `code` في `prisma/schema.prisma:3956-3986`
  - `ChartOfAccount` بدون حقل `accountCode` في `prisma/schema.prisma:4116-4163`

## 3) الملاحظات (مرتبة حسب الشدة)

### High-1: كسر الضبط المحاسبي عبر مسارات `create/update/delete` في قيود اليومية
**الأثر:** يمكن إدخال/تعديل/حذف قيود بحالة `POSTED` بدون تطبيق نفس منطق الترحيل الرسمي، ما قد يسبب عدم اتساق بين `journal entries` و`chart_of_accounts.currentBalance`.

**الأدلة:**
- إنشاء قيد مباشرة بحالة `POSTED` دون تحديث أرصدة الحسابات في:
  - `src/modules/finance/journal-entries/journal-entries.service.ts:170-231`
- تحديث الأرصدة يحدث فقط في مسار `post()`:
  - `.../journal-entries.service.ts:566-646` (خاصة `603-618`)
- `update()` يسمح بتعديل قيود منشورة أو تحويل الحالة إلى `POSTED` دون إعادة احتساب فروقات الأرصدة:
  - `.../journal-entries.service.ts:341-483`
- `remove()` يحذف القيد منطقيًا دون عكس أثره على الأرصدة:
  - `.../journal-entries.service.ts:499-509`

**التقييم:** خطر محاسبي عالٍ (Audit/Closing Risk).

### High-2: منطق Idempotency في Webhooks يمنع إعادة معالجة الأحداث الفاشلة
**الأثر:** إذا فشل حدث webhook ثم أُعيد إرساله بنفس `idempotencyKey` أو `eventId`، قد يتم اعتباره مكررًا وتجاهله بدل إعادة المعالجة.

**الأدلة:**
- إذا وُجد `idempotencyKey` سابقًا يتم إرجاع `null` مباشرة بغض النظر عن حالة الحدث السابقة:
  - `src/modules/finance/payment-webhooks/payment-webhooks.service.ts:1652-1667`
- عند تعارض `eventId` (P2002) أيضًا يتم إرجاع `null`:
  - `.../payment-webhooks.service.ts:1670-1688`
- وعند `event === null` يتم الرد كمكرر بدون تنفيذ منطق المعالجة:
  - `.../payment-webhooks.service.ts:157-163`, `222-228`, `295-301`

**التقييم:** خطر عالي على موثوقية التحصيل الآلي.

### High-3: احتمال فقدان تحديثات (`lost updates`) في تسويات المدفوعات المتزامنة
**الأثر:** تحديثات `paidAmount/status` للفواتير والأقساط تتم بأسلوب read-modify-write دون قفل/نسخ متفائلة، ما قد يسبب نتائج خاطئة عند التوازي.

**الأدلة:**
- في webhook success/refund يتم حساب قيم جديدة من Snapshot ثم كتابة قيم مطلقة:
  - `src/modules/finance/payment-webhooks/payment-webhooks.service.ts:556-626`
  - `.../payment-webhooks.service.ts:629-692`
- في التسوية اليدوية (`reconcile`) نفس النمط:
  - `src/modules/finance/payment-transactions/payment-transactions.service.ts:383-433`

**التقييم:** خطر عالي على دقة الذمم والتحصيل عند الضغط أو التزامن.

### Medium-1: التحقق من IP في Webhook قابل للتجاوز عبر `x-forwarded-for` spoofing
**الأثر:** في حال تفعيل whitelist، يمكن نظريًا تمرير عنوان IP مزيف عبر الهيدر إذا لم تكن البنية العكسية (proxy) تضبط الهيدر بصرامة.

**الأدلة:**
- قراءة `x-forwarded-for` مباشرة قبل `req.ip`:
  - `src/modules/finance/payment-webhooks/payment-webhooks.service.ts:1540-1547`
- بينما `trust proxy` مفعّل فقط بشرط إعداد منفصل:
  - `src/main.ts:163-170`

**التقييم:** مخاطرة أمنية متوسطة (تعتمد على بنية النشر).

### Medium-2: انكسار الاختبارات المالية مقابل النموذج الحالي
**الأثر:** انخفاض القدرة على اكتشاف الانحدارات (Regression) بسبب عدم صلاحية حزمة E2E المالية الحالية.

**الأدلة:**
- مراجع الاختبارات غير المتوافقة:
  - `test/finance-test-helpers.ts:138-141`
  - `test/finance-test-helpers.ts:749-752`
  - `test/finance-test-helpers.ts:766-769`

**التقييم:** مخاطرة جودة متوسطة إلى عالية (خاصة قبل الإطلاق).

## 4) نقاط قوة حالية
- تغطية وحدات مالية واسعة (دفتر أستاذ، قيود، فواتير، مدفوعات، تكاملات HR/Procurement/Transport).
- وجود RBAC وصلاحيات دقيقة على غالبية endpoints المالية.
- تسجيل تدقيق (audit logging) حاضر في العمليات الجوهرية.
- وجود حماية Webhook بالتوقيع HMAC ومقارنة آمنة (`timingSafeEqual`).

## 5) التقييم العام (Current State)
- **الجاهزية الوظيفية:** جيدة (Features واسعة ومترابطة).
- **الجاهزية المحاسبية/الضبط:** متوسطة إلى منخفضة بسبب ملاحظات High أعلاه.
- **الجاهزية للاعتماد الإنتاجي المالي الكامل:** تحتاج معالجة عاجلة قبل اعتبار النظام “مُحكمًا” ماليًا.

تقدير إجمالي تقريبي: **6/10** في الوضع الحالي.

## 6) أولويات التحسين المقترحة
1. إغلاق مسارات `create/update/delete` على القيود المنشورة وفرض دورة الحالة الرسمية فقط (`DRAFT -> APPROVED -> POSTED -> REVERSED`).
2. إصلاح idempotency لـ webhooks بحيث يسمح بإعادة محاولة الأحداث `FAILED` بشكل آمن.
3. تحويل تحديثات مبالغ الفواتير/الأقساط إلى نمط آمن للتوازي (`increment` أو optimistic locking/versioning).
4. تحديث حزمة اختبارات `finance e2e` لتتوافق مع schema الحالي وإعادتها إلى حالة passing.
5. ضبط `FINANCE_SYSTEM_USER_ID` في البيئات التي تعتمد القيود المتكررة.
