 اسمع الان ار# خطة فصل أنظمة التعليم والدرجات والواجهات

تاريخ الخطة: 2026-04-16

## 1. الهدف

إعادة تنظيم نظام التعليم والدرجات بحيث:

- يكون `الواجبات` نظامًا مستقلًا بواجهاته الخاصة
- يكون `حضور وغياب الطلاب` نظامًا مستقلًا بواجهاته الخاصة
- يكون `الاختبارات` نظامًا مستقلًا بواجهاته الخاصة
- تبقى هذه الأنظمة قادرة على تغذية `مكونات الفترات الشهرية` تلقائيًا
- يتم فصل `الفترات الشهرية` عن `الفترات الفصلية` وعن `الفترات النهائية` بواجهات مستقلة
- يتم فصل كل عملية رئيسية في واجهة مستقلة بدل تجميع كل شيء في صفحة واحدة
- يتم توحيد تجربة الإضافة والفلترة على `BottomSheetForm` و`FilterDrawer` والأنماط الأنيقة الموجودة أصلًا في النظام

## 2. المشكلة الحالية

بعد مراجعة الوضع الحالي، المشاكل الأساسية هي:

1. أنظمة التنفيذ موجودة، لكن العرض ما زال ممزوجًا
- الواجبات موجودة في:
  - `homeworks`
  - `student-homeworks`
- حضور الطلاب موجود في:
  - `student-attendance`
- الاختبارات موجودة في:
  - `exam-periods`
  - `exam-assessments`
  - `student-exam-scores`
- لكن الربط المفاهيمي بينها وبين الفترات المرنة غير ظاهر للمستخدم بشكل واضح ومنظم

2. الفترات المرنة تجمع أكثر من وظيفة في صفحة واحدة
- صفحة [assessment-periods](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/assessment-periods/page.tsx:1>) تجمع:
  - الفترات
  - المكونات
  - فترات المحصلة
- وصفحة [student-period-results](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/student-period-results/page.tsx:1>) تجمع:
  - النتائج
  - درجات المكونات
  - الإدخال الجماعي
  - الحساب
  - القفل

3. الفترات الشهرية والفصلية ما زالت تحت نفس المسار الذهني
- رغم أن المنطق يفرق بين `MONTHLY` و`SEMESTER` و`YEAR_FINAL`
- إلا أن المستخدم لا يرى هذا الفصل بوضوح على مستوى الصفحات والرحلة

4. يوجد خلل واجهي واضح في `الفترات الاختبارية`
- في [exam-periods-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/exams/exam-periods/components/exam-periods-workspace.tsx:671>) يوجد `showFooter={false}`
- لذلك نموذج الإضافة/التعديل لا يعرض زر الحفظ في الفوتر بالشكل المتوقع

## 3. القرار المعماري المقترح

### أ. فصل الأنظمة التنفيذية الثلاثة

#### 1. نظام الواجبات

يبقى مستقلاً وظيفيًا، ويتكون من:

- `أنواع الواجبات`
- `الواجبات`
- `واجبات الطلاب`

ويرتبط مع الفترات الشهرية فقط كمصدر لمكوّنات:

- `AUTO_HOMEWORK`

#### 2. نظام حضور وغياب الطلاب

يبقى مستقلاً وظيفيًا، ويتكون من:

- `حضور الطلاب`

ويرتبط مع الفترات الشهرية فقط كمصدر لمكوّنات:

- `AUTO_ATTENDANCE`

#### 3. نظام الاختبارات

يبقى مستقلاً وظيفيًا، ويتكون من:

- `الفترات الاختبارية`
- `التقييمات والاختبارات`
- `درجات الاختبارات`

ويرتبط مع الفترات الشهرية فقط كمصدر لمكوّنات:

- `AUTO_EXAM`

## 4. القرار الخاص بالفترات

سيتم فصل الفترات إلى عائلة صفحات واضحة:

### 1. الفترات الشهرية

صفحات مستقلة:

- `الفترات الشهرية`
- `مكونات الفترات الشهرية`
- `ربط مكونات الشهر بالمصادر`
- `نتائج الفترات الشهرية`
- `درجات مكونات الفترات الشهرية`
- `الإدخال الجماعي الشهري`

### 2. الفترات الفصلية

صفحات مستقلة:

- `الفترات الفصلية`
- `مكونات الفترات الفصلية`
- `فترات المحصلة للفصل`
- `نتائج الفترات الفصلية`
- `درجات مكونات الفترات الفصلية`
- `احتساب المحصلة الفصلية`

### 3. الفترات النهائية

صفحات مستقلة:

- `الفترات النهائية`
- `مكونات الفترات النهائية`
- `مصادرها الفصلية`
- `النتائج النهائية`

## 5. المسارات المقترحة

بدل مسارين عامين فقط، نقترح هذه المسارات:

### أنظمة مستقلة

- `/app/homework-types`
- `/app/homeworks`
- `/app/student-homeworks`
- `/app/student-attendance`
- `/app/exam-periods`
- `/app/exam-assessments`
- `/app/student-exam-scores`

### الفترات الشهرية

- `/app/monthly-assessment-periods`
- `/app/monthly-assessment-components`
- `/app/monthly-component-links`
- `/app/monthly-period-results`
- `/app/monthly-period-component-scores`
- `/app/monthly-period-bulk-entry`

### الفترات الفصلية

- `/app/semester-assessment-periods`
- `/app/semester-assessment-components`
- `/app/semester-aggregate-links`
- `/app/semester-period-results`
- `/app/semester-period-component-scores`
- `/app/semester-period-calculation`

### الفترات النهائية

- `/app/year-final-assessment-periods`
- `/app/year-final-assessment-components`
- `/app/year-final-source-links`
- `/app/year-final-period-results`

### القرار السنوي والتقارير

- `/app/annual-results`
- `/app/grading-reports`

## 6. كيف سيتم الربط مع مكونات الفترات

لن ندمج الواجبات أو الحضور أو الاختبارات داخل صفحات الفترات نفسها.

بدل ذلك:

- عند إنشاء مكوّن شهري من النوع `AUTO_HOMEWORK`
  - نعرض في واجهة الربط أن مصدره هو `نظام الواجبات`
- عند إنشاء مكوّن شهري من النوع `AUTO_ATTENDANCE`
  - نعرض أن مصدره هو `نظام حضور الطلاب`
- عند إنشاء مكوّن شهري من النوع `AUTO_EXAM`
  - نعرض أن مصدره هو `نظام الاختبارات`

وإذا كان المكوّن `MANUAL`
- يبقى يدويًا في واجهة درجات مكونات الفترة

وإذا كان `AGGREGATED_PERIODS`
- يبقى خاصًا بالفصل أو النهائي ومربوطًا بفترات مصدر

## 7. قواعد واجهات الاستخدام

كل عملية رئيسية تكون في واجهة مستقلة:

- إدارة السجل الأساسي في صفحة
- إدارة المكونات في صفحة
- الربط بالمصادر في صفحة
- إدخال النتائج في صفحة
- الإدخال الجماعي في صفحة
- الحساب أو القفل في صفحة أو إجراء مستقل داخل صفحة مخصصة له

ويجب الالتزام في كل واجهة بـ:

- `FilterDrawer`
- `BottomSheetForm`
- نفس بطاقات الملخص
- نفس أسلوب الرسائل والتنبيهات
- نفس أنماط الأزرار والحفظ والإلغاء

## 8. ما سيتم إصلاحه مباشرة ضمن هذه الخطة

### أ. مشكلة زر الحفظ في الفترات الاختبارية

سيتم إصلاح [exam-periods-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/exams/exam-periods/components/exam-periods-workspace.tsx:671>) بحيث:

- يظهر زر الحفظ بشكل واضح
- لا يبقى النموذج بدون فوتر
- نحافظ على نفس أسلوب النماذج المعتمد في النظام

### ب. تفكيك الواجهات المجمعة

سيتم تفكيك:

- `assessment-periods-workspace`
- `student-period-results-workspace`

إلى عدة Workspaces وصفحات متخصصة

## 9. خطة التنفيذ

### المرحلة 1: إصلاحات سريعة وبنية التنقل

- إصلاح زر الحفظ في `exam-periods`
- تعديل `app-navigation.ts` لعرض الأنظمة المستقلة بوضوح
- إضافة مجموعات جديدة:
  - الواجبات
  - حضور الطلاب
  - الاختبارات
  - الفترات الشهرية
  - الفترات الفصلية
  - الفترات النهائية
  - النتائج والتقارير

### المرحلة 2: فصل الفترات الشهرية

- إنشاء صفحات خاصة بالشهري
- نقل منطق الفترة الشهرية من `assessment-periods` العام إلى صفحات شهرية
- نقل منطق نتائج الشهري من `student-period-results` العام إلى صفحات شهرية
- إظهار ربط:
  - حضور
  - واجبات
  - اختبارات
  بشكل واضح داخل صفحات مكونات الشهري
- إضافة طبقة API شهرية مستقلة للمسارات:
  - `monthly-assessment-periods`
  - `monthly-assessment-components`
  - `monthly-student-results`
  - `monthly-student-component-scores`
- إضافة مخطط Prisma وجداول قاعدة بيانات شهرية مستقلة:
  - `monthly_assessment_periods`
  - `monthly_assessment_components`
  - `monthly_student_results`
  - `monthly_student_component_scores`
- تحويل خدمات الشهري في الباكند لتقرأ وتكتب مباشرة من الجداول الشهرية الجديدة بدل الجداول العامة:
  - `monthly-assessment-periods.service.ts`
  - `monthly-assessment-components.service.ts`
  - `monthly-student-results.service.ts`
  - `monthly-student-component-scores.service.ts`
- إعادة حساب مجموع النتيجة الشهرية مباشرة من `monthly_student_component_scores`

### المرحلة 3: فصل الفترات الفصلية

- إنشاء صفحات خاصة بالفصلي
- إنشاء صفحة مستقلة لفترات المحصلة
- إنشاء صفحة مستقلة لنتائج الفصلي
- إنشاء صفحة مستقلة لحساب المحصلة الفصلية

### المرحلة 4: فصل الفترات النهائية

- إنشاء صفحات مستقلة للنهائي
- ربطها بمصادرها الفصلية
- إبقاء القرار السنوي في `annual-results`

### المرحلة 5: التنظيف النهائي

- إزالة الصفحات العامة القديمة:
  - `assessment-periods`
  - `student-period-results`
  بعد التأكد أن كل الوظائف انتقلت لصفحات مستقلة
- تنظيف الاستيرادات والتنقل والعناوين

## 10. أثر هذه الخطة على الاستخدام

بعد التنفيذ، المستخدم سيفهم النظام بهذا الشكل:

1. `الواجبات` نظام مستقل
2. `حضور الطلاب` نظام مستقل
3. `الاختبارات` نظام مستقل
4. `الفترات الشهرية` تجمع من هذه الأنظمة أو من الإدخال اليدوي
5. `الفترات الفصلية` تعتمد على الأشهر والاختبار النهائي
6. `الفترات النهائية` تعتمد على الفصول
7. `النتيجة السنوية` تأتي فوق ذلك

وهذا أقرب بكثير لطريقتك التي شرحتها من البداية.

## 11. المخاطر والقرارات التي يجب تثبيتها

قبل التنفيذ الكامل، سأفترض القرارات التالية ما لم تطلب غيرها:

- الربط التلقائي يبقى داخل `مكونات الفترات الشهرية` فقط
- صفحات الشهري والفصلي والنهائي تكون منفصلة فعلاً، لا مجرد تبويبات داخل صفحة واحدة
- سيتم إلغاء الصفحات العامة القديمة بعد النقل، وليس الإبقاء عليها
- `annual-results` سيبقى كطبقة قرار نهائي، وليس جزءًا من صفحات الفترات

## 12. المطلوب منك

إذا وافقت على هذه الخطة، سأبدأ بالتنفيذ بهذا الترتيب:

1. إصلاح `exam-periods`
2. إنشاء بنية المسارات الجديدة
3. فصل الشهري كاملًا
4. فصل الفصلي كاملًا
5. فصل النهائي
6. حذف الصفحات العامة القديمة

## 13. ما تم تنفيذه بعد الموافقة

- تم إصلاح مشكلة زر الحفظ في [exam-periods-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/exams/exam-periods/components/exam-periods-workspace.tsx:671>) عبر إعادة فوتر `BottomSheetForm`
- تم توضيح هوية الأنظمة المستقلة في عناوين الصفحات:
  - [homeworks](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/homeworks/page.tsx:1>)
  - [student-homeworks](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/student-homeworks/page.tsx:1>)
  - [student-attendance](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/student-attendance/page.tsx:1>)
  - [exam-periods](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/exam-periods/page.tsx:1>)
  - [exam-assessments](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/exam-assessments/page.tsx:1>)
  - [student-exam-scores](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/student-exam-scores/page.tsx:1>)
- تم تحويل محرك الفترات العام إلى Workspace قابل للتقييد حسب الفئة والعملية في [assessment-periods-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/assessment-periods/components/assessment-periods-workspace.tsx:1>)
- تم تحويل محرك النتائج العام إلى Workspace قابل للتقييد حسب الفئة والعملية في [student-period-results-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/student-period-results/components/student-period-results-workspace.tsx:1>)
- تم إنشاء صفحات منفصلة للفترات الشهرية:
  - [monthly-assessment-periods](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-assessment-periods/page.tsx:1>)
  - [monthly-assessment-components](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-assessment-components/page.tsx:1>)
  - [monthly-component-links](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-component-links/page.tsx:1>)
  - [monthly-period-results](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-period-results/page.tsx:1>)
  - [monthly-period-component-scores](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-period-component-scores/page.tsx:1>)
  - [monthly-period-bulk-entry](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-period-bulk-entry/page.tsx:1>)
- تم إنشاء صفحات منفصلة للفترات الفصلية:
  - [semester-assessment-periods](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/semester-assessment-periods/page.tsx:1>)
  - [semester-assessment-components](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/semester-assessment-components/page.tsx:1>)
  - [semester-aggregate-links](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/semester-aggregate-links/page.tsx:1>)
  - [semester-period-results](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/semester-period-results/page.tsx:1>)
  - [semester-period-component-scores](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/semester-period-component-scores/page.tsx:1>)
  - [semester-period-calculation](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/semester-period-calculation/page.tsx:1>)
- تم إنشاء صفحات منفصلة للفترات النهائية:
  - [year-final-assessment-periods](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/year-final-assessment-periods/page.tsx:1>)
  - [year-final-assessment-components](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/year-final-assessment-components/page.tsx:1>)
  - [year-final-source-links](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/year-final-source-links/page.tsx:1>)
  - [year-final-period-results](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/year-final-period-results/page.tsx:1>)
- تم تحويل الصفحتين العامتين القديمتين إلى صفحات انتقالية تقود إلى الواجهات الجديدة:
  - [assessment-periods/page.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/assessment-periods/page.tsx:1>)
  - [student-period-results/page.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/student-period-results/page.tsx:1>)
- تم إنشاء واجهة شهرية متخصصة وواضحة للمصادر في [monthly-component-links-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/assessment-periods/components/monthly-component-links-workspace.tsx:1>) تعرض مكونات الشهر حسب المصدر:
  - `الواجبات`
  - `الحضور والغياب`
  - `الاختبارات`
  - `الإدخال اليدوي`
  - `مكونات تحتاج مراجعة`
  مع أزرار انتقال مباشرة إلى النظام المصدر المناسب
- تم إنشاء واجهة فصلية متخصصة للمحصلة في [semester-aggregate-links-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/assessment-periods/components/semester-aggregate-links-workspace.tsx:1>) تعرض:
  - مكونات المحصلة فقط داخل الفترة الفصلية
  - الفترات الشهرية المرتبطة بكل مكوّن محصلة
  - شرحًا واضحًا لكيفية إعادة التحجيم والاحتساب
  - أزرار انتقال مباشرة إلى صفحات الفترات الشهرية ونتائجها
- تم إنشاء واجهة نهائية متخصصة في [year-final-source-links-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/assessment-periods/components/year-final-source-links-workspace.tsx:1>) تعرض:
  - مكونات النهائي المجمعة فقط
  - الفترات الفصلية المرتبطة بكل مكوّن نهائي
  - شرحًا واضحًا لكيفية بناء النهائي فوق نتائج الفصول
  - أزرار انتقال مباشرة إلى صفحات الفترات الفصلية ونتائجها
- تم تحديث التنقل في [app-navigation.ts](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/components/layout/app-navigation.ts:1>) ليعرض:
  - نظام الواجبات
  - حضور الطلاب
  - نظام الاختبارات
  - الفترات الشهرية
  - الفترات الفصلية
  - الفترات النهائية
  - النتائج والتقارير
- تم توحيد محرك صفحات الفترات في [assessment-periods-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/assessment-periods/components/assessment-periods-workspace.tsx:1>) ليستخدم:
  - `ManagementToolbar`
  - `FilterDrawer`
  - سجلات واضحة للفترات والمكوّنات والربط
  - عناوين قابلة للتخصيص لكل صفحة شهرية أو فصلية أو نهائية
- تم توحيد محرك صفحات النتائج في [student-period-results-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/student-period-results/components/student-period-results-workspace.tsx:1>) ليستخدم:
  - `ManagementToolbar`
  - `FilterDrawer`
  - سجلات نتائج ومكوّنات وإدخال جماعي
  - عناوين وصفحات متخصصة للشهري والفصلي والنهائي
- تم ربط صفحات الشهري والفصلي والنهائي بعناوين وسجلات مخصصة حسب العملية نفسها:
  - صفحة الفترات
  - صفحة المكوّنات
  - صفحة الربط أو المحصلة
  - صفحة النتائج
  - صفحة درجات المكوّنات
  - صفحة الإدخال الجماعي أو الاحتساب بحسب الفئة
- تم فصل الأزرار والإجراءات داخل الصفحات المتخصصة نفسها حتى لا تختلط العمليات:
  - صفحات الفترات تعرض إنشاء الفترات فقط
  - صفحات المكوّنات تعرض إنشاء المكوّنات فقط
  - صفحات الربط الفصلية والنهائية تعرض الربط فقط
  - صفحات النتائج تعرض إنشاء النتائج وتوليد الناقص
  - صفحات درجات المكوّنات تعرض إضافة الدرجة فقط
  - صفحات الإدخال الجماعي أو الاحتساب تعرض الإجراء المرتبط بها فقط
- تم بدء فصل الفترات الشهرية فعليًا عن محرك الفترات العام عبر وحدات شهرية مستقلة:
  - [monthly-periods-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/monthly-assessment/components/monthly-periods-workspace.tsx:1>)
  - [monthly-results-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/monthly-assessment/components/monthly-results-workspace.tsx:1>)
- تم ربط صفحات الشهري الست مباشرة بالوحدات الشهرية المستقلة:
  - [monthly-assessment-periods](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-assessment-periods/page.tsx:1>)
  - [monthly-assessment-components](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-assessment-components/page.tsx:1>)
  - [monthly-component-links](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-component-links/page.tsx:1>)
  - [monthly-period-results](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-period-results/page.tsx:1>)
  - [monthly-period-component-scores](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-period-component-scores/page.tsx:1>)
  - [monthly-period-bulk-entry](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-period-bulk-entry/page.tsx:1>)
- الواجهات الشهرية الجديدة تستخدم:
  - شريط بحث موحد `ManagementToolbar`
  - فلترة موحدة `FilterDrawer`
  - سجلات تشغيلية مباشرة
  - زر إنشاء عائم `Fab` أسفل اليمين
  - نماذج إنشاء/تعديل مستقلة `BottomSheetForm`
- تم بدء فصل الباكند الشهري بمسارات مستقلة خاصة بالشهري:
  - [monthly-assessment.module.ts](</c:/Users/mousa/Desktop/New folder/backend-frontend/backend/src/modules/monthly-assessment/monthly-assessment.module.ts:1>)
  - [monthly-assessment-periods.controller.ts](</c:/Users/mousa/Desktop/New folder/backend-frontend/backend/src/modules/monthly-assessment/monthly-assessment-periods.controller.ts:1>)
  - [monthly-assessment-components.controller.ts](</c:/Users/mousa/Desktop/New folder/backend-frontend/backend/src/modules/monthly-assessment/monthly-assessment-components.controller.ts:1>)
  - [monthly-student-results.controller.ts](</c:/Users/mousa/Desktop/New folder/backend-frontend/backend/src/modules/monthly-assessment/monthly-student-results.controller.ts:1>)
  - [monthly-student-component-scores.controller.ts](</c:/Users/mousa/Desktop/New folder/backend-frontend/backend/src/modules/monthly-assessment/monthly-student-component-scores.controller.ts:1>)
- هذه الطبقة الجديدة تفصل الشهري على مستوى الـ API أولًا، مع بقاء الجداول العامة تحته مؤقتًا حتى نكمل فصل Prisma والجداول نفسها في المرحلة التالية
- تم تحويل وحدات الفرونت الشهرية الجديدة لتستخدم المسارات الشهرية المستقلة مباشرة بدل الـ endpoints العامة، عبر:
  - [client.ts](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/lib/api/client.ts:1>)
  - [monthly-periods-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/monthly-assessment/components/monthly-periods-workspace.tsx:1>)
  - [monthly-results-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/monthly-assessment/components/monthly-results-workspace.tsx:1>)
- تم إكمال صفحة [monthly-component-links](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/monthly-component-links/page.tsx:1>) لتستخدم الواجهة الشهرية المتخصصة فعليًا بدل عرض عام، وربطها مباشرة بالمسارات الشهرية المستقلة:
  - [monthly-component-links-workspace.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/features/assessment-periods/components/monthly-component-links-workspace.tsx:1>)
  - `monthly-assessment-periods`
  - `monthly-assessment-components`
- تم تنظيف بعض روابط الانتقال التي كانت ما تزال تمر عبر الصفحات الانتقالية القديمة، مثل روابط [annual-results/page.tsx](</c:/Users/mousa/Desktop/New folder/backend-frontend/frontend/src/app/app/annual-results/page.tsx:1>) لتقود مباشرة إلى الواجهات النهائية الجديدة
- تم التحقق من سلامة الفرونت بعد هذه الدفعة عبر `npm run typecheck`

## 14. ما بقي تحسينًا إضافيًا

- إزالة الصفحات الانتقالية القديمة نهائيًا بدل إبقائها كدلائل توجيه داخلية، إذا قررت أنك لا تحتاجها كدلائل وصول داخلية
- متابعة فصل الفصلي والنهائي على مستوى Workspaces مستقلة تمامًا كما حصل في الشهري، إذا أردت إكمال نفس مستوى العزل هناك أيضًا
