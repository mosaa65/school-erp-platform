# تقرير صيانة وتدقيق النظام 05 (التعليم والدرجات)

تاريخ التدقيق: 2026-03-07  
النطاق: Frontend + Backend لنظام 05، مع مراجعة فجوة النظام المالي (07)

## 1) ملخص تنفيذي

1. تم تأكيد أن سبب "القوائم غير واضحة/غير عربية" كان غالبًا عرض `code` فقط بدل `name + code` في شاشات أساسية.
2. تم تأكيد وجود تشتت في ترجمة Enums (خصوصًا `AssessmentType` و`ExamAbsenceType`) بين مكونات متعددة بدل مصدر موحد.
3. تم تنفيذ دفعة إصلاح مباشرة في هذا التسليم (تعريب موحد + تحسين labels للقوائم الأكثر استخدامًا).
4. النظام المالي (07) غير موجود حاليًا كتنفيذ برمجي داخل المنصة (Backend/Frontend)، لذلك لا يمكن "إكمال الترجمة" له قبل بناء وحداته.

## 2) أهم المشاكل التي تم رصدها

### عالية الأولوية

1. عرض أكواد فقط في القوائم المنسدلة (يضيع المستخدم بين قيم إنجليزية/غير وصفية).
   - أمثلة قبل الإصلاح:
   - `frontend/src/features/homeworks/components/homeworks-workspace.tsx:465`
   - `frontend/src/features/monthly-grades/components/monthly-grades-workspace.tsx:253`
   - `frontend/src/features/semester-grades/components/semester-grades-workspace.tsx:242`
   - `frontend/src/features/annual-grades/components/annual-grades-workspace.tsx:311`
   - `frontend/src/features/annual-results/components/annual-results-workspace.tsx:263`
   - `frontend/src/features/grading-reports/components/grading-reports-workspace.tsx:114`

2. ترجمة Enums غير موحدة (موجودة محليًا داخل الشاشات بدل `i18n` مركزي).
   - أمثلة:
   - `frontend/src/features/exam-periods/components/exam-periods-workspace.tsx:53`
   - `frontend/src/features/exam-assessments/components/exam-assessments-workspace.tsx:48`
   - `frontend/src/features/student-exam-scores/components/student-exam-scores-workspace.tsx:48`

### متوسطة الأولوية

1. خيارات Select تعتمد `limit: 100` في hooks كثيرة، وهذا غير كافٍ إنتاجيًا (مدارس كبيرة تتجاوز 100 طالب/قيد/كيان بسهولة).
   - أمثلة:
   - `frontend/src/features/homeworks/hooks/use-academic-year-options-query.ts:20`
   - `frontend/src/features/monthly-grades/hooks/use-student-enrollment-options-query.ts:37`
   - `frontend/src/features/student-exam-scores/hooks/use-exam-assessment-options-query.ts:28`

2. لا يزال هناك جزء من الشاشات يعرض `code` منفردًا في نقاط أقل تأثيرًا.
   - مثال متبقي:
   - `frontend/src/features/monthly-custom-component-scores/components/monthly-custom-component-scores-workspace.tsx:428`

## 3) الإصلاحات المنفذة في هذا التسليم

1. توحيد الترجمة في `i18n`:
   - إضافة ترجمة مركزية لـ:
   - `AssessmentType`
   - `ExamAbsenceType`
   - الملف:
   - `frontend/src/lib/i18n/ar.ts`

2. إضافة Utility موحد لتنسيق خيارات القوائم:
   - `formatNameCodeLabel(name, code)`
   - الملف:
   - `frontend/src/lib/option-labels.ts`

3. تحسين Labels القوائم المنسدلة (اسم + كود) في شاشات عالية الاستخدام:
   - `frontend/src/features/homeworks/components/homeworks-workspace.tsx`
   - `frontend/src/features/exam-periods/components/exam-periods-workspace.tsx`
   - `frontend/src/features/exam-assessments/components/exam-assessments-workspace.tsx`
   - `frontend/src/features/student-exam-scores/components/student-exam-scores-workspace.tsx`
   - `frontend/src/features/monthly-grades/components/monthly-grades-workspace.tsx`
   - `frontend/src/features/semester-grades/components/semester-grades-workspace.tsx`
   - `frontend/src/features/annual-grades/components/annual-grades-workspace.tsx`
   - `frontend/src/features/annual-results/components/annual-results-workspace.tsx`
   - `frontend/src/features/grading-outcome-rules/components/grading-outcome-rules-workspace.tsx`
   - `frontend/src/features/grading-policies/components/grading-policies-workspace.tsx`
   - `frontend/src/features/grading-reports/components/grading-reports-workspace.tsx`

4. التحقق الفني:
   - تم تنفيذ: `npm run typecheck`
   - النتيجة: ناجح.

## 4) فجوة النظام المالي (07)

1. لا توجد حاليًا Modules مالية في Backend داخل:
   - `backend/src/app.module.ts:70`
2. لا توجد صفحات/مجموعة تنقل للنظام 07 في Frontend:
   - `frontend/src/components/layout/app-navigation.ts:40`
   - آخر نظام مفعّل حاليًا هو النظام 05:
   - `frontend/src/components/layout/app-navigation.ts:298`

الاستنتاج: "الأكثر غير مترجم هو النظام المالي" صحيح عمليًا لأنه غير مبني بعد، وليس فقط مشكلة ترجمة نصوص.

## 5) خطة الإغلاق المقترحة (الدفعة التالية)

1. إكمال توحيد labels في الشاشات المتبقية داخل النظام 05:
   - `monthly-custom-component-scores`
   - أي شاشة ما زالت تعرض code منفردًا.
2. ترقية خيارات Select من نمط `limit: 100` إلى نمط scalable:
   - Server-side search
   - Pagination/Infinite load
   - Debounced query.
3. بدء System 07 (مالي) رسميًا:
   - Prisma schema + migrations
   - core seed (lookup + chart of accounts)
   - واجهات أولية عربية منذ البداية (بدون دين تقني ترجمة لاحقًا).

## 6) قرار معماري

1. اعتماد `i18n` مركزي لكل Enum وعدم تعريف خرائط ترجمة محلية داخل الشاشات إلا لضرورة خاصة.
2. اعتماد `name + code` كصيغة عرض افتراضية لجميع قوائم الكيانات المرجعية.
3. منع Selects الحرجة من الاعتماد على `limit` ثابت منخفض في بيئة إنتاجية.
