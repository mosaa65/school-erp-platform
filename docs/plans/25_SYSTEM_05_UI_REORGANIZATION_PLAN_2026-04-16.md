# خطة ترتيب واجهات التعليم والدرجات

تاريخ الخطة: 2026-04-16

## 1. الهدف

ترتيب واجهات التعليم والدرجات بحيث:

- تكون رحلة الاستخدام أوضح للإدارة والمعلم
- نقلل التشتيت بين الإعدادات والإدخال والنتائج والتقارير
- نحذف الواجهات والمجلدات القديمة أو المكررة
- نوحد أسماء ومسارات `features` بدل وجود أكثر من نسخة لنفس الشاشة

## 2. المشكلة الحالية

بعد مراجعة الواجهة الحالية، توجد ثلاث مشاكل رئيسية:

1. كثرة المجموعات في التنقل
- التعليم والدرجات موزعة اليوم على:
  - الإعدادات
  - سياسات التقييم
  - الواجبات
  - الاختبارات
  - درجات الطلاب
  - الفترات المرنة والنتائج
  - التقارير
- هذا صحيح وظيفيًا، لكنه متعب بصريًا ويجعل المستخدم يتنقل كثيرًا.

2. وجود مجلدات `features` مكررة
- توجد نسخ مزدوجة مثل:
  - `frontend/src/features/homeworks`
  - `frontend/src/features/assignments/homeworks`
- ونفس الشيء في:
  - `homework-types`
  - `student-homeworks`
  - `exam-periods`
  - `exam-assessments`
  - `student-exam-scores`
  - `grading-policies`
  - `grading-outcome-rules`
  - `grading-reports`
  - `annual-results`
  - `annual-statuses`

3. تجميع معلومات كثيرة داخل بعض الصفحات
- بعض الشاشات الحالية تجمع:
  - الفلاتر
  - CRUD
  - عمليات حساب
  - قفل/فتح
  - تفاصيل السجلات
- السبب كان لتسريع الإنجاز وربط النظام الجديد بسرعة، لكنه لم يعد أفضل شكل للاستخدام اليومي.

## 3. القرار المقترح للترتيب

أقترح إعادة تنظيم الواجهات إلى أربع طبقات واضحة فقط داخل التنقل:

1. التقويم الأكاديمي
- `academic-terms`
- `academic-months`
- `exam-periods`

2. التقييم والإعدادات
- `grading-policies`
- `grading-policy-components`
- `grading-outcome-rules`
- `annual-statuses`
- `promotion-decisions`
- `lookup-grade-descriptions`

3. التنفيذ والإدخال
- `homework-types`
- `homeworks`
- `student-homeworks`
- `exam-assessments`
- `student-exam-scores`
- `student-attendance`
- `assessment-periods`
- `student-period-results`

4. النتائج والتقارير
- `annual-results`
- `grading-reports`

## 4. ما سيتم تنفيذه إذا وافقت

### المرحلة A: تنظيف البنية بدون تغيير وظيفي

- توحيد جميع شاشات التعليم والدرجات تحت مسارات `features` المعتمدة فقط
- حذف المجلدات المكررة القديمة بعد التأكد أن الصفحات تستخدم النسخة الجديدة فقط
- توحيد الاستيراد في الصفحات إلى المسارات النهائية

### المرحلة B: إعادة ترتيب التنقل

- تقليل عدد مجموعات التعليم والدرجات في `app-navigation.ts`
- إعادة تسمية المجموعات لتكون أوضح للمستخدم
- إبقاء نفس الصلاحيات الحالية بدون كسر

### المرحلة C: تخفيف ازدحام الصفحات

- عدم كسر منطق النظام، لكن تحسين العرض كالتالي:
  - شاشة `assessment-periods` تبقى لإدارة الفترات فقط
  - شاشة `student-period-results` تركّز على الإدخال والحساب والقفل
  - شاشة `annual-results` تبقى طبقة القرار النهائي فقط
- عند الحاجة سنفصل بعض الكتل داخل الصفحة إلى بطاقات أو أقسام أو مكونات فرعية أوضح

### المرحلة D: حذف الواجهات القديمة

- حذف أي صفحة أو `feature` مكرر قديم لا يُستخدم
- حذف أي وصلات تنقل أو استيرادات قديمة بعد نقل الاعتماد عليها

## 5. الحذف المتوقع

الحذف المتوقع سيكون من المجلدات المكررة فقط، مثل:

- `frontend/src/features/annual-results`
- `frontend/src/features/annual-statuses`
- `frontend/src/features/grading-policies`
- `frontend/src/features/grading-outcome-rules`
- `frontend/src/features/grading-reports`
- `frontend/src/features/homeworks`
- `frontend/src/features/homework-types`
- `frontend/src/features/student-homeworks`
- `frontend/src/features/exam-periods`
- `frontend/src/features/exam-assessments`
- `frontend/src/features/student-exam-scores`

مع الإبقاء على النسخ المنظمة داخل:

- `frontend/src/features/results-decisions/*`
- `frontend/src/features/evaluation-policies/*`
- `frontend/src/features/assignments/*`
- `frontend/src/features/exams/*`
- `frontend/src/features/assessment-periods/*`

## 6. لماذا بعض الصفحات فيها معلومات كثيرة الآن

السبب الحالي عملي أكثر من كونه تصميمًا نهائيًا:

- النظام الجديد للفترات المرنة بُني بسرعة فوق النظام القديم
- كان الهدف أن تكون العمليات الأساسية في مكان واحد:
  - اختيار الفترة
  - إدخال الدرجات
  - الحساب
  - القفل
  - مراجعة التفاصيل
- هذا مفيد في بداية التطوير لأنه يقلل عدد الشاشات ويثبت المنطق بسرعة
- لكنه ليس أفضل شكل نهائي للاستخدام اليومي، لذلك الخطوة القادمة الصحيحة هي ترتيب الواجهة بعد استقرار المنطق

## 7. كيف سيستخدم المستخدم النظام بعد الترتيب

المسار المقترح سيكون:

1. الإدارة تضبط:
- الأشهر والفصول
- سياسات التقييم
- مكونات السياسات
- قواعد النتائج وقرارات الترفيع

2. المعلم أو الإدارة ينفذ:
- إنشاء الواجبات والاختبارات
- إدخال درجات الواجبات والاختبارات
- إنشاء الفترات المرنة ومكوناتها
- إدخال نتائج الفترات أو حسابها

3. الإدارة تعتمد:
- النتائج الفصلية والنهائية
- القرار السنوي والترتيب

4. الإدارة تراجع:
- تقارير الدرجات

## 8. نتيجة التنفيذ المتوقعة

إذا وافقت على هذه الخطة، النتيجة ستكون:

- تنقل أبسط
- مجلدات `features` مرتبة وواضحة
- حذف التكرار القديم
- فصل أفضل بين:
  - الإعدادات
  - الإدخال
  - النتائج
  - التقارير
- تقليل الشعور بأن كل شيء داخل صفحة واحدة

## 9. ما لن أغيره بدون موافقتك

- منطق النظام نفسه
- صلاحيات الوصول
- أسماء الصفحات الأساسية الجديدة
- مسار الفترات المرنة كقلب النظام

## 10. قرار مطلوب

إذا وافقت، سأبدأ بالتنفيذ بهذا الترتيب:

1. توحيد `features` وحذف المكرر
2. إعادة ترتيب التنقل
3. تخفيف ازدحام شاشات التعليم والدرجات
4. تنظيف الاستيرادات والروابط القديمة

## 11. ما تم تنفيذه بعد الموافقة

- تم توحيد الاعتماد على المسارات المنظمة فقط داخل:
  - `features/results-decisions/*`
  - `features/evaluation-policies/*`
  - `features/assignments/*`
  - `features/exams/*`
  - `features/assessment-periods/*`
- تم حذف المجلدات المكررة القديمة التالية من `frontend/src/features`:
  - `annual-results`
  - `annual-statuses`
  - `grading-policies`
  - `grading-outcome-rules`
  - `grading-reports`
  - `homeworks`
  - `homework-types`
  - `student-homeworks`
  - `exam-periods`
  - `exam-assessments`
  - `student-exam-scores`
- تم إعادة ترتيب التنقل في [app-navigation.ts](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/components/layout/app-navigation.ts:401>) ليصبح نظام التعليم والدرجات ضمن أربع مجموعات أوضح:
  - التقويم
  - الإعدادات
  - التنفيذ
  - النتائج
- تم الحفاظ على الصفحات الحية الحالية دون كسر للمسارات الأساسية:
  - `assessment-periods`
  - `student-period-results`
  - `annual-results`
  - `grading-reports`
  - `homeworks`
  - `student-homeworks`
  - `exam-assessments`
  - `student-exam-scores`
- تم التحقق من سلامة الفرونت بعد الحذف والترتيب عبر `npm run typecheck`

## 12. ما بقي اختياريًا

- تحسين تجربة بعض الصفحات الكبيرة عبر تقسيم المحتوى داخل الصفحة نفسها إلى أقسام أو تبويبات أو مكونات أوضح
- نقل بعض العناصر الأكاديمية بين المجموعات إذا أردت ترتيبًا أكثر صرامة حسب دور المستخدم

## 13. ما اكتمل في دفعة الإنهاء

- تم ترتيب شاشة [student-period-results-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/student-period-results/components/student-period-results-workspace.tsx:1>) لتعمل كسير عمل واضح:
  - `نظرة عامة`
  - `النتائج والمكوّنات`
  - `الإدخال الجماعي`
- تم ترتيب شاشة [assessment-periods-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/assessment-periods/components/assessment-periods-workspace.tsx:1>) لتفصل بين:
  - `نظرة عامة`
  - `المكوّنات`
  - `فترات المحصلة`
- تم ترتيب شاشة [annual-results-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/results-decisions/annual-results/components/annual-results-workspace.tsx:1>) لتفصل بين:
  - `نظرة عامة`
  - `الاحتساب السنوي`
  - `النتائج والمواد`
- تم ترتيب شاشة [grading-reports-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/results-decisions/grading-reports/components/grading-reports-workspace.tsx:1>) لتفصل بين:
  - `نظرة عامة`
  - `التفاصيل السنوية`
- أصبحت صفحات التعليم والدرجات الأساسية كلها تعمل بنفس النمط:
  - سياق وفلاتر أعلى الصفحة
  - بطاقات ملخص سريعة
  - سير عمل واضح
  - ثم التفاصيل أو التنفيذ بحسب الشاشة
- تم التحقق من سلامة الفرونت بعد هذه الدفعة أيضًا عبر `npm run typecheck`

## 14. الحالة النهائية

- الخطة مكتملة على مستوى الواجهة والتنقل وحذف التكرار
- لم تعد هناك واجهات تعليم ودرجات مكررة نشطة في `frontend/src/features`
- الواجهات التشغيلية الأساسية صارت أوضح وأقل ازدحامًا من النسخة السابقة
- أي عمل لاحق سيكون تحسين تجربة إضافي وليس استكمالًا لنفس الخطة
