# Finance Quality Required Check Runbook

## الهدف

هذا الملف يوضح كيف نجعل فحوصات الجودة المالية مطلوبة على Pull Requests بدون الادعاء بأن هذا تم تفعيله تلقائيًا من داخل المستودع.

## الحالة الحالية داخل المستودع

- يوجد workflow فعلي في:
  - `.github/workflows/finance-quality.yml`
- اسم الـ workflow الظاهر في GitHub Actions:
  - `Finance Quality`
- الفحوصات التي يعرّضها هذا الـ workflow حاليًا:
  - `Backend Finance E2E`
  - `Frontend Finance E2E`

## ما الذي تم إنجازه داخل الريبو

1. تشغيل backend finance suites عبر:
   - `backend/package.json` → `npm run test:e2e:finance`
2. تشغيل frontend finance suites عبر:
   - `frontend/package.json` → `npm run e2e:finance`
3. تشغيل `frontend typecheck` داخل نفس workflow المالي قبل اختبارات الواجهة:
   - `frontend/package.json` → `npm run typecheck`
4. ربط الأوامر السابقة داخل workflow مستقل مخصص للجودة المالية.

## ما الذي لا يمكن تفعيله من داخل الريبو فقط

تفعيل `required status checks` على GitHub يحتاج صلاحيات إدارية على المستودع أو المنظمة.

بالتالي:

- **تم داخل الريبو:** تجهيز الـ workflow وأسماء الـ checks.
- **لم يتم من داخل الريبو:** فرض هذه الـ checks على `main` أو `develop`.

## الإجراء الإداري المطلوب على GitHub

### الفروع المستهدفة

- `main`
- `develop`

### التوصية

- على `main`:
  - اجعل الفحوصات التالية Required:
    - `Backend Finance E2E`
    - `Frontend Finance E2E`
- على `develop`:
  - يوصى بالحد الأدنى نفسه إذا كان الدمج إليه يمثل بيئة تجميع رسمية.

### خطوات التنفيذ

1. افتح المستودع على GitHub.
2. ادخل إلى:
   - `Settings`
   - `Branches`
3. أنشئ أو عدّل Branch Protection Rule للفرع المستهدف.
4. فعّل:
   - `Require a pull request before merging`
   - `Require status checks to pass before merging`
   - `Require conversation resolution before merging`
5. من قائمة الـ checks المطلوبة اختر:
   - `Backend Finance E2E`
   - `Frontend Finance E2E`
6. احفظ القاعدة.

## ملاحظات مهمة

- إذا ظهرت أسماء الـ checks في GitHub بصيغة workflow/job مركبة مثل:
  - `Finance Quality / Backend Finance E2E`
  - `Finance Quality / Frontend Finance E2E`
  فاختر الصيغة التي يعرضها GitHub فعليًا في واجهة Branch Protection.
- لا تعتمد على اسم workflow وحده إذا كانت الواجهة تعرض أسماء jobs المنفصلة.
- يجب التأكد أولًا من أن workflow يعمل بنجاح على PR فعلي واحد على الأقل قبل جعله Required.

## التحقق بعد التفعيل

1. افتح PR يلمس `backend/**` أو `frontend/**`.
2. تأكد أن workflow `Finance Quality` يعمل.
3. تأكد أن الـ PR لا يمكن دمجه قبل نجاح:
   - `Backend Finance E2E`
   - `Frontend Finance E2E`

## ملاحظة حول typecheck

- تم إدخال `frontend typecheck` داخل job `Frontend Finance E2E` نفسه.
- هذا يعني أن نجاح check الواجهة في GitHub أصبح يتطلب:
  - نجاح `npm run typecheck`
  - ثم نجاح `npm run e2e:finance`
- لا يلزم إنشاء required check منفصل إضافي لهذا الغرض ما دام GitHub يعرض job الواجهة كفحص واحد.

## مرجع مرتبط

- `school-erp-docs/07_النظام_المالي/finance_gap_matrix.md`
- `school-erp-docs/07_النظام_المالي/finance_remaining_agents_plan.md`
