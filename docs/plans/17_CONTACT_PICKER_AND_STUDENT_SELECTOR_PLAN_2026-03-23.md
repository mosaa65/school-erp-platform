# Contact Picker and Student Selector Plan

Date: 2026-03-23

## Executive Summary

هذه الوثيقة تراجع اقتراحين مطروحين على الواجهة الأمامية:

1. تحسين إدخال أرقام الهواتف عبر زر "اختيار من جهات الاتصال".
2. استبدال قوائم اختيار الطلاب الثقيلة بمحدد ذكي قابل للاستخدام والتوسع.

النتيجة المختصرة:

- اقتراح `Contact Picker` صالح فقط كـ progressive enhancement، وليس كمسار أساسي في الويب.
- اقتراح `Smart Student Selector` هو الأعلى قيمة والأكثر إلحاحًا للمشروع حاليًا.
- الأفضل عمليًا هو تنفيذ محدد الطلاب الذكي أولًا، ثم إضافة دعم اختيار رقم من النظام كتحسين اختياري على الأجهزة المدعومة فقط.

## Current Code Context

أماكن مرتبطة مباشرة بالاقتراحين داخل المشروع:

- `frontend/src/features/guardians/components/guardians-workspace.tsx`
  يحتوي حقول `phonePrimary` و `phoneSecondary` و `whatsappNumber` كحقول إدخال يدوية.
- `frontend/src/features/student-enrollments/components/student-enrollments-workspace.tsx`
  يحتوي اختيار الطالب داخل النموذج وفي الفلاتر باستخدام `select` تقليدي.
- `frontend/src/features/student-guardians/components/student-guardians-workspace.tsx`
  يحتوي اختيار الطالب وولي الأمر باستخدام `select` تقليدي.
- `frontend/src/features/parent-notifications/components/parent-notifications-workspace.tsx`
  يحتوي اختيار الطالب داخل نموذج الإشعارات باستخدام `select` تقليدي.
- `frontend/src/features/*/hooks/use-student-options-query.ts`
  يوجد تكرار لنفس نمط hook في أكثر من شاشة، وكلها تقريبًا تعتمد `listStudents({ page: 1, limit: 100 })`.

ملاحظات مهمة من الكود الحالي:

- الـ API الحالي يدعم `search` في `listStudents` و `listGuardians`.
- `StudentListItem` يحتوي أصلًا على `admissionNo` وبيانات `enrollments` و `section.gradeLevel`، وهذا يكفي لبناء label ذكي أو grouping مبدئي.
- المشكلة الحالية ليست شكل الواجهة فقط، بل أيضًا أن خيارات الطلاب مقصوصة عند `100` عنصر في عدة شاشات.

## Review of Suggestion 1: Contact Picker

### Verdict

الاقتراح صحيح من حيث المبدأ، لكنه لا يصلح كحل أساسي للنظام.

ما نأخذه منه:

- دعم `navigator.contacts.select()` جيد كميزة إضافية على المتصفحات المدعومة.
- اختيار جهة اتصال واحدة فقط يتماشى مع الاحتياج.

ما لا نعتمد عليه كمسار أساسي:

- لا يمكن افتراض دعمه على iPhone/Safari.
- لا يمكن بناء تدفق رئيسي critical flow عليه.
- رابط `tel:` ليس حلًا فعليًا لإرجاع الرقم إلى الحقل داخل الموقع.

### Recommendation

نعتمد الخطة التالية:

- المسار الأساسي:
  يبقى الحقل اليدوي هو الأساس دائمًا.
- المسار المحسّن:
  نضيف زر "اختيار من النظام" فقط إذا كان المتصفح يدعم Contact Picker فعلًا.
- المسار البديل:
  إذا لم يوجد دعم، نعرض مساعدة واضحة للمستخدم بدل كسر التجربة.

## Plan 1: Phone Entry Assistant

### Goal

تحسين تجربة إدخال الهاتف في شاشات مثل `guardians` بدون ربط نجاح العملية بدعم النظام لجهات الاتصال.

### Proposed UX

- يبقى الحقل الأساسي `input[type="tel"]`.
- يضاف زر جانبي صغير: `اختيار من النظام`.
- عند توفر الدعم:
  يفتح `navigator.contacts.select(["name", "tel"], { multiple: false })`.
- إذا رجعت جهة الاتصال بأكثر من رقم:
  نعرض قائمة صغيرة داخل الواجهة لاختيار رقم واحد فقط.
- عند عدم توفر الدعم:
  نظهر helper text واضح مثل:
  `هذا المتصفح لا يدعم جلب جهات الاتصال مباشرة. يمكنك نسخ الرقم ولصقه هنا.`

### Scope

التطبيق المقترح في البداية داخل:

- `guardians-workspace.tsx`

ثم يمكن توسيعه لاحقًا إلى:

- `employees-workspace.tsx`
- أي شاشة فيها حقول هاتف مباشرة

### Technical Design

- إنشاء helper صغير مثل `supportsContactPicker()`.
- إنشاء util مثل `pickSinglePhoneNumber()` يعزل:
  - feature detection
  - استدعاء `navigator.contacts.select`
  - استخراج `tel`
  - التعامل مع تعدد الأرقام
- ربط النتيجة مباشرة بـ `phonePrimary` أو `whatsappNumber`.
- إبقاء جميع validations الحالية كما هي.

### Non-Goals

- لا نحاول سحب كل جهات الاتصال.
- لا نبني integration خاص بـ iPhone.
- لا نغيّر backend.

### Risks

- فائدة هذه الميزة محدودة على أجهزة كثيرة.
- قد تعطي انطباعًا مضللًا إذا ظهر الزر دائمًا رغم عدم الدعم.
- لا تعالج أصل مشكلة جودة البيانات داخل النظام، بل فقط تسهّل الإدخال اليدوي.

### Acceptance Criteria

- إذا كان المتصفح يدعم Contact Picker، يمكن للمستخدم تعبئة الحقل برقم واحد من النظام.
- إذا لم يكن مدعومًا، لا يحدث أي كسر في الواجهة.
- تبقى تجربة الإدخال اليدوي كاملة وسليمة.

### Priority

أولوية متوسطة إلى منخفضة.

هذه ميزة تحسين UX، لكنها ليست أفضل مكان نصرف فيه الجهد أولًا مقارنة بمحدد الطلاب.

## Review of Suggestion 2: Smart Student Selector

### Verdict

هذا الاقتراح صحيح جدًا ومناسب للوضع الحالي في المشروع.

المشكلة الحالية ليست فقط أن الـ dropdown طويل، بل أيضًا:

- القراءة صعبة.
- الاختيار بطيء.
- التوسع ضعيف بسبب `limit: 100`.
- نفس النمط مكرر في عدة شاشات.

### Recommendation

لا نطوّر dropdown تقليدي أكبر.

نعتمد محدد ذكي reusable يعمل كالتالي:

- Trigger field لفتح المحدد.
- Bottom sheet على الجوال.
- Panel/side sheet على الشاشات الأكبر مع نفس المكوّن الحالي `BottomSheetForm`.
- بحث مباشر بالاسم أو رقم الطالب.
- بطاقات نتائج قصيرة متعددة الأسطر بدل سطر طويل واحد.
- عرض آخر اختيار أو آخر اختيارات حديثة.
- grouping حسب الصف/الشعبة عندما تكون المعلومة متاحة.
- جلب نتائج remote حسب البحث بدل تحميل كل الطلاب دفعة واحدة.

## Plan 2: Smart Student Selector Foundation

### Goal

استبدال اختيار الطالب التقليدي بمحدد سريع، واضح، وقابل لإعادة الاستخدام في الشاشات التي تعتمد الطلاب.

### Why This Plan Is Best

- تعالج الألم الحالي مباشرة.
- تزيل اعتماد الواجهة على `100` خيار فقط.
- تصلح لعدة شاشات، وليس شاشة واحدة فقط.
- يمكن بناؤها فوق البنية الحالية بدل إدخال مكتبة جديدة فورًا.

### Recommended UX

الحقل المغلق:

- يظهر اسم الطالب المختار.
- يظهر سطرًا ثانويًا مختصرًا مثل:
  `رقم الطالب + الصف/الشعبة الحالية إن وجدت`

عند الفتح:

- حقل بحث أعلى النافذة.
- قسم `آخر اختيار` أو `آخر اختيارات`.
- قائمة نتائج على شكل بطاقات:
  - الاسم
  - رقم الطالب
  - الصف/الشعبة الحالية
- عند وجود بيانات كافية:
  grouping حسب الصف أو الشعبة.
- عند عدم وجود بحث:
  لا نحمل آلاف السجلات، بل نعرض recent picks ورسالة تطلب البدء بالبحث.

### Recommended Architecture

#### Phase A: Reusable UI Primitive

إنشاء مكوّن مشترك مثل:

- `frontend/src/components/ui/student-picker-sheet.tsx`

مسؤولياته:

- فتح/إغلاق المحدد
- إدارة `searchInput`
- debounce
- عرض النتائج
- إرجاع `studentId` المختار

#### Phase B: Shared Data Hook

توحيد الجلب في hook مشترك مثل:

- `frontend/src/features/students/hooks/use-student-picker-query.ts`

بدل تكرار:

- `use-student-options-query.ts` في كل feature

سلوك الـ hook:

- يستقبل `search`
- يستقبل `limit` صغير مثل `20` أو `30`
- يستدعي `apiClient.listStudents({ search, page: 1, limit, isActive: true })`
- يعيد بيانات جاهزة للعرض داخل picker

#### Phase C: Result Mapping

إنشاء mapper موحد يحوّل `StudentListItem` إلى view model مثل:

- `id`
- `title`
- `subtitle`
- `meta`
- `groupKey`

أمثلة:

- `title`: اسم الطالب
- `subtitle`: `رقم الطالب STU-10B-015`
- `meta`: `الأول الثانوي - شعبة B`
- `groupKey`: الصف/الشعبة الحالية أو `بدون شعبة حالية`

#### Phase D: Progressive Rollout

نطبقه أولًا في الشاشة الأكثر ألمًا:

- `student-enrollments-workspace.tsx`

ثم نوسعه إلى:

- `student-guardians-workspace.tsx`
- `parent-notifications-workspace.tsx`
- `student-attendance-workspace.tsx`
- `student-books-workspace.tsx`
- بقية الشاشات التي تستخدم اختيار الطلاب

### Data Strategy

الأفضل هنا هو عدم تحميل كل الطلاب.

المسار المقترح:

- إذا كان الحقل مغلقًا: لا يوجد fetch كبير.
- عند فتح المحدد: نعرض recent picks.
- عند كتابة 2 أحرف أو أكثر: نرسل query remote.
- نعرض أفضل النتائج المطابقة فقط.

هذا يلغي الحاجة إلى virtualization في المرحلة الأولى، لأننا لن نعرض قائمة ضخمة أصلًا.

إذا ظهر لاحقًا احتياج لتصفح بدون بحث:

- نضيف pagination داخل المحدد أو infinite scroll.

### Grouping Strategy

يمكن البدء client-side باستخدام البيانات الموجودة حاليًا:

- `student.enrollments`
- `academicYear.isCurrent`
- `section.gradeLevel.name`
- `section.name`

إذا وجدنا أن payload ثقيل على المدى الطويل:

- نضيف لاحقًا endpoint خفيف مخصص للـ picker يعيد فقط الحقول اللازمة.

### Testing Strategy

- اختبار فتح المحدد وإغلاقه.
- اختبار البحث بالاسم.
- اختبار البحث برقم الطالب.
- اختبار اختيار طالب وإعادة تعبئة الحقل.
- اختبار حالة عدم وجود نتائج.
- اختبار fallback حين لا يكتب المستخدم شيئًا.
- اختبار responsive behavior على الجوال وسطح المكتب.

### Acceptance Criteria

- لا يعتمد اختيار الطالب على dropdown طويل.
- يمكن العثور على الطالب بالاسم أو رقم الطالب بسرعة.
- لا تضيع النتائج بعد أول 100 عنصر.
- يظهر الطالب المختار بشكل واضح ومختصر بعد الاختيار.
- يمكن إعادة استخدام نفس المكوّن في أكثر من شاشة.

### Priority

أولوية عالية جدًا.

هذه الخطة يجب أن تُنفذ قبل خطة Contact Picker.

## Recommended Delivery Order

1. بناء `student-picker-sheet` reusable.
2. توحيد hook البحث في الطلاب وإلغاء التكرار الأكثر إزعاجًا.
3. تطبيق المحدد الجديد في `student-enrollments`.
4. تعميمه على `student-guardians` و `parent-notifications`.
5. بعد استقرار ذلك، نضيف `Contact Picker` كميزة اختيارية في حقول الهاتف.

## Decision

الخطة التي أوصي باعتمادها:

- اعتماد خطة محدد الطلاب الذكي الآن.
- تأجيل Contact Picker إلى مرحلة لاحقة كتحسين اختياري فقط.

السبب:

- العائد أعلى.
- المشكلة الحالية مؤكدة في الكود الحالي.
- المخاطرة أقل.
- الحل قابل لإعادة الاستخدام على مستوى النظام كله.

## If Approved, Implementation Scope for Next Step

إذا تمت الموافقة، أقترح أن تكون أول دفعة تنفيذ:

- مكوّن `student-picker-sheet`
- hook موحد للبحث
- توصيله أولًا مع `student-enrollments`
- الحفاظ على نفس الـ permissions والـ validation الحالية

وبعدها نراجع النتيجة بصريًا ثم نعممها على بقية الشاشات.

## Implementation Progress (2026-03-24)

تم تنفيذ جزء كبير من الخطة فعليًا في الواجهة الأمامية:

- إنشاء محددات ذكية قابلة لإعادة الاستخدام:
  - `student-picker-sheet.tsx`
  - `guardian-picker-sheet.tsx`
  - `student-enrollment-picker-sheet.tsx`
- دعم جلب تدريجي (دفعات) مع تحميل إضافي أثناء النزول (infinite loading) بدل الاعتماد على dropdown محدود.
- إضافة فلترة وفرز داخل محددات الاختيار عبر `FilterDrawer` منفصل لتقليل ازدحام الواجهة.
- تحسين التعامل مع تداخل النوافذ (form داخل form) عبر `renderInPortal` وطبقات `z-index` مناسبة.
- إضافة بنية مساعدة لـ Contact Picker في الهاتف كـ progressive enhancement:
  - `phone-contact-picker.ts`
  - `phone-contact-input.tsx`
- إصلاح جزء من خطأ تسجيل الدخول المرتبط بـ `trim` في:
  - `frontend/src/lib/auth/session.ts`
- توحيد عدد كبير من الشاشات المتكررة عبر wrappers حتى تنتقل تلقائيًا للنسخة الأحدث من workspace.

### آخر دفعة توحيد تمت

تم تحويل هذه المسارات القديمة إلى wrappers تشير للمسارات الأحدث:

- `annual-grades` -> `grade-aggregation/annual-grades`
- `employee-section-supervisions` -> `teaching-assignments/employee-section-supervisions`
- `employee-teaching-assignments` -> `teaching-assignments/employee-teaching-assignments`
- `exam-assessments` -> `exams/exam-assessments`
- `exam-periods` -> `exams/exam-periods`
- `grading-outcome-rules` -> `evaluation-policies/grading-outcome-rules`
- `grading-policies` -> `evaluation-policies/grading-policies`
- `homeworks` -> `assignments/homeworks`
- `homework-types` -> `assignments/homework-types`
- `monthly-custom-component-scores` -> `grade-aggregation/monthly-custom-component-scores`
- `monthly-grades` -> `grade-aggregation/monthly-grades`
- `semester-grades` -> `grade-aggregation/semester-grades`
- `student-exam-scores` -> `exams/student-exam-scores`
- `student-homeworks` -> `assignments/student-homeworks`

### ما تبقّى كأولوية تالية

- مراجعة بصريّة نهائية على الجوال للشاشات الأوسع استخدامًا (خصوصًا صف الإجراءات العلوي).
- إكمال تعميم نفس نمط المحددات الذكية على أي شاشة ما زالت تستخدم select تقليدي ثقيل.
