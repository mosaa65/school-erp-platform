# خطة إعادة بناء نظام الفترات المرنة والدرجات - System 05

تاريخ الخطة: 2026-04-12

## 1. نطاق المراجعة

تمت مراجعة:

- `backend-frontend/backend/prisma/schema.prisma`
- `backend-frontend/backend/src/app.module.ts`
- `backend-frontend/backend/src/modules/evaluation-policies/*`
- `backend-frontend/backend/src/modules/exams/*`
- `backend-frontend/backend/src/modules/assignments/*`
- `backend-frontend/backend/src/modules/term-subject-offerings/*`
- `backend-frontend/backend/src/modules/student-enrollments/*`
- `backend-frontend/frontend/src/features/evaluation-policies/*`
- `backend-frontend/frontend/src/features/exams/*`
- `backend-frontend/frontend/src/features/assignments/*`
- `backend-frontend/frontend/src/features/grade-aggregation/*` وقت المراجعة الأولى قبل حذفه لاحقًا
- `backend-frontend/frontend/src/features/results-decisions/*`
- `backend-frontend/docs/usage/05_TEACHING_GRADES_USAGE.md`
- `backend-frontend/docs/reports/SYSTEM_05_UI_WALKTHROUGH.md`
- `backend-frontend/docs/plans/15_GRADING_POLICY_PLANNING.md`
- `backend-frontend/docs/plans/STUDENT_SYSTEM_MAINTENANCE_PLAN.md`
- `backend-frontend/docs/architecture/academic_evaluation_architecture_2026_03.md`
- `systems/05_التعليم_والدرجات/*`

ملاحظة مهمة:

- لم يتم العثور على أي ملفات `docx` داخل مساحة العمل الحالية وقت المراجعة، لذلك هذه الخطة مبنية على ملفات `md/sql/ts/tsx/prisma` فقط.

## 2. الخلاصة التنفيذية

النظام الحالي لا يحتاج "ترقيعًا" بسيطًا، بل يحتاج تثبيت مصدر الحقيقة أولًا ثم إعادة بناء طبقة الفترات والنتائج فوقه.

الصورة الحالية باختصار:

1. هناك جزء جيد ومهم تم إنجازه فعلا:
   - `GradingPolicy` أصبح يدعم مكونات ديناميكية.
   - الواجبات والاختبارات منفصلة كوحدات مستقلة.
   - `StudentEnrollment` و `TermSubjectOffering` يوفران أساسًا جيدًا للربط الأكاديمي.
2. لكن طبقة الحساب نفسها ما زالت مضطربة:
   - الشهري/الفصلي/السنوي موزعة بين نماذج قديمة وجديدة.
   - صفحات الواجهة موجودة، لكن الوحدات الخلفية الخاصة بها غير موصولة في `AppModule`.
   - هناك خدمات قديمة ما زالت تفترض حقولًا ثابتة لم تعد موجودة في مخطط `Prisma` الحالي.
3. الطلب الجديد الذي تريده أنت أوضح من النظام الحالي:
   - فترة شهرية مستقلة باسم حر ومكونات حرة ومجموع 100.
   - فترة فصلية مستقلة فيها مكون يدوي ومكون "محصلة" مأخوذ من فترات شهرية محددة ويعاد تحجيمه.
   - نتيجة نهائية سنوية مبنية من الفترات الفصلية.
   - بقاء الواجبات كنظام مستقل يمد الفترات فقط بالدرجات عند الحاجة.

القرار المعماري الموصى به:

- لا نكمل على `MonthlyGrade / SemesterGrade / AnnualGrade` بصيغتها الحالية.
- نبني محركًا موحدًا للفترات والنتائج، مع إبقاء الشهري والفصلي والنهائي كأنظمة تشغيل مستقلة في الواجهة والصلاحيات.

## 3. أهم المشاكل الحالية المؤكدة

### 3.1 مصدر الحقيقة غير ثابت

- وثائق `systems/05_التعليم_والدرجات/*.sql` تصف نظامًا.
- `schema.prisma` يطبق نسخة أحدث جزئيًا.
- بعض الخدمات ما زالت تشير إلى حقول قديمة.

النتيجة:

- لا يمكن الاعتماد على اسم الجدول أو الوثيقة وحدها لفهم ما هو "الحقيقي" في التنفيذ.

### 3.2 الواجهة تعرض صفحات لا يقابلها ربط backend كامل

- `frontend/src/components/layout/app-navigation.ts` يعرض:
  - `grading-policies`
  - `grading-policy-components`
  - `monthly-grades`
  - `semester-grades`
  - `annual-grades`
  - `annual-results`
- لكن `backend/src/app.module.ts` لا يستورد:
  - `EvaluationPoliciesModule`
  - `GradeAggregationModule`
  - `ResultsDecisionsModule`

النتيجة:

- عندنا فجوة بين "الموجود في التنقل" و"الموجود فعليًا في التطبيق الخلفي".

### 3.3 توجد وحدات ومسارات مكررة وقديمة

أمثلة:

- `backend/src/modules/monthly-grades/*`
- `backend/src/modules/grade-aggregation/monthly-grades/*` وقت المراجعة الأولى قبل إزالة legacy
- `frontend/src/features/monthly-grades/*` كـ re-export وقت المراجعة الأولى
- `frontend/src/features/grade-aggregation/monthly-grades/*` كالتنفيذ الفعلي وقت المراجعة الأولى

النتيجة:

- صعب معرفة المسار الحقيقي الذي يجب تعديله.
- أي تطوير جديد فوق هذا التكرار سيزيد اللخبطة.

### 3.4 السياسة أصبحت ديناميكية جزئيًا لكن الحساب ما زال ثابتًا

الوضع الحالي:

- `GradingPolicy` يحتوي `totalMaxScore` و `components`.
- `GradingPolicyComponent` يسمح بمكونات غير محدودة.
- لكن خدمات التجميع القديمة ما زالت تفترض:
  - حضور
  - واجبات
  - نشاط
  - مساهمة
  - اختبار

النتيجة:

- النظام يقول "المكونات ديناميكية" في الإعداد.
- لكنه يعود ويفرض نموذجًا ثابتًا في الحساب.

### 3.5 النتائج السنوية ما زالت تحمل افتراض فصلين

الوضع الحالي:

- `AnnualGrade` ما زال يحمل `semester1Total` و `semester2Total`.
- `AnnualResult` يستخدم منطقًا يعتمد على `academicTerm.sequence === 1/2`.

النتيجة:

- أي هيكل غير فصلين سيصطدم فورًا بالحساب الحالي.
- حتى طلبك الحالي "فترة فصل أول + فترة فصل ثاني + نهائي سنوي" يحتاج إعادة تنظيم صريحة بدل الاعتماد على هذه الافتراضات القديمة.

### 3.6 الواجبات منفصلة بالفعل ويجب الحفاظ على هذا الفصل

الوضع الحالي الجيد:

- `AssignmentsModule` مستقل.
- `Homeworks` و `StudentHomeworks` معزولان نسبيًا.

القرار:

- لا نعيد دمج الواجبات داخل نظام الفترات.
- نبقيها مصدرًا تشغيليًا للبيانات فقط.

## 4. المبادئ المعتمدة للتصميم الجديد

1. الفترات الشهرية والفصلية والنهائية تكون مستقلة تشغيليًا، لكنها تعمل فوق محرك نتائج موحد.
2. اسم الفترة يكون حرًا بالكامل:
   - `نتيجة شهر محرم`
   - `اختبار شهر صفر`
   - `نهاية الفصل الأول`
3. كل فترة لها مكونات غير محدودة، والمجموع يجب أن يساوي الدرجة القصوى للفترة.
4. المكونات تدعم الأنواع التالية على الأقل:
   - `MANUAL`
   - `AUTO_HOMEWORK`
   - `AUTO_ATTENDANCE`
   - `AUTO_EXAM`
   - `AGGREGATED_PERIODS`
5. الواجبات والاختبارات والحضور تبقى أنظمة تشغيل مستقلة.
6. المدرس يدخل فقط درجات مكونات فترته ومادته وشعبته ضمن نطاق صلاحياته.
7. الربط مع الطلاب والمواد يتم من خلال:
   - `StudentEnrollment`
   - `TermSubjectOffering`
   - `Teaching Assignments / Data Scope`
8. الأفضل أن يكون الربط الآلي بخدمة تطبيقية واضحة، لا `trigger` ثقيل داخل قاعدة البيانات.

## 5. النموذج المستهدف

### 5.1 نظام الفترات

نضيف كيانًا موحدًا للفترات الفعلية:

- `assessment_periods`

أهم الحقول المقترحة:

- `category`: `MONTHLY | SEMESTER | YEAR_FINAL`
- `academicYearId`
- `academicTermId` nullable للفترة النهائية السنوية
- `name`
- `sequence`
- `maxScore`
- `status`
- `isLocked`

هذا الكيان هو الفترة الفعلية التي ينشئها المستخدم، وليس مجرد نوع ثابت من enum.

### 5.2 مكونات الفترة

- `assessment_period_components`

أهم الحقول:

- `assessmentPeriodId`
- `code`
- `name`
- `entryMode`
- `maxScore`
- `sortOrder`
- `isRequired`

قاعدة صريحة:

- مجموع `maxScore` لكل مكونات الفترة يجب أن يساوي `assessment_periods.maxScore`.

### 5.3 مكونات المحصلة المأخوذة من فترات أخرى

- `assessment_component_source_periods`

الغرض:

- ربط مكوّن من نوع `AGGREGATED_PERIODS` بعدة فترات مصدر.

مثال:

- فترة فصل أول
- مكوّن: `محصلة الأشهر`
- الدرجة القصوى: `50`
- الفترات المصدر:
  - محرم
  - صفر
  - ربيع أول

آلية الحساب:

- يجمع النظام إجمالي الطالب في الفترات المصدر.
- يجمع الدرجة القصوى لتلك الفترات.
- يعيد التحجيم إلى درجة المكون.

مثال:

- 300 من 300 عبر 3 أشهر
- مكوّن المحصلة = 50
- الناتج = 50 من 50

### 5.4 نتائج الطالب في الفترة

- `student_period_results`

أهم الحقول:

- `assessmentPeriodId`
- `studentEnrollmentId`
- `subjectId`
- `termSubjectOfferingId` nullable
- `sectionId` snapshot
- `totalScore`
- `status`
- `isLocked`
- `calculatedAt`

هذا الجدول يحل محل التشعب الحالي بين:

- `monthly_grades`
- `semester_grades`
- جزء من `annual_grades`

### 5.5 درجات الطالب لكل مكوّن

- `student_period_component_scores`

أهم الحقول:

- `studentPeriodResultId`
- `assessmentPeriodComponentId`
- `rawScore`
- `finalScore`
- `isAutoCalculated`
- `notes`

هذا الجدول يوحد:

- `MonthlyCustomComponentScore`
- `PeriodGradeComponent`
- أي إدخال يدوي مستقبلي للشهري أو الفصلي أو النهائي

## 6. الربط الآلي الذي طلبته

المطلوب منك واضح: الفترة لا تكون معزولة، بل ترتبط تلقائيًا بالسنة والترم والمواد والطلاب.

الآلية الموصى بها:

1. عند اعتماد الفترة:
   - يحدد النظام نطاقها: سنة + ترم + نوع فترة.
2. يقرأ `TermSubjectOffering` للترم المحدد.
3. يقرأ `StudentEnrollment` الفعال للسنة، ويربطه بالشعبة والصف.
4. عند فتح المدرس شاشة إدخال الدرجات:
   - يتم توليد `student_period_results` المفقودة تلقائيًا عند أول استخدام.
5. عند الحساب:
   - يتم جلب نفس السياق آليًا بدون حاجة لإنشاء ربط يدوي لكل طالب.

السبب في تفضيل هذه الآلية:

- أوضح من `trigger`.
- أسهل في التدقيق والاختبار.
- لا تخفي منطقًا تجاريًا معقدًا داخل قاعدة البيانات.

## 7. سير العمل المستهدف

### 7.1 الفترة الشهرية

1. الإدارة تنشئ فترة شهرية:
   - سنة
   - ترم
   - اسم حر
   - ترتيب داخل الترم
   - درجة قصوى 100
2. تضيف المكونات كما تريد:
   - اختبار 40
   - واجبات 20
   - مواظبة 20
   - شفهي 20
   - أو 3 أو 7 مكونات حسب الحاجة
3. المعلم يدخل فقط المكونات اليدوية.
4. المكونات الآلية تسحب من:
   - الواجبات
   - الحضور
   - الاختبارات
5. النظام يحسب النتيجة الشهرية للمادة لكل طالب.

### 7.2 الفترة الفصلية

1. الإدارة تنشئ فترة فصلية مستقلة.
2. تضيف مكونين أو أكثر، مثل:
   - اختبار نهاية الفصل = 50
   - محصلة الأشهر = 50
3. في مكوّن `محصلة الأشهر` تحدد الفترات الشهرية المصدر.
4. النظام يعيد تحجيم مجموع الأشهر إلى درجة المكون.
5. المدرس يدخل الاختبار اليدوي فقط إذا كان هذا المكون يدويًا.
6. النظام ينتج النتيجة الفصلية النهائية من 100.

### 7.3 النتيجة النهائية السنوية

1. تنشأ فترة نهائية سنوية مستقلة من نوع `YEAR_FINAL`.
2. مكوناتها تكون مثل:
   - نتيجة الفصل الأول
   - نتيجة الفصل الثاني
3. النظام يعيد تحجيم النتيجتين إلى 100 إذا لزم.
4. بعد اكتمال نتائج المواد، تنتقل طبقة `AnnualResult / Promotion Decisions` إلى إصدار قرار الطالب النهائي.

## 8. إعادة تسمية وتنظيف الوحدات

### 8.1 Backend

الهيكل المقترح:

- `modules/system-05/system-05.module.ts`
- `modules/system-05/evaluation-policies/*`
- `modules/system-05/assessment-periods/*`
- `modules/system-05/period-results/*`
- `modules/system-05/results-decisions/*`
- `modules/assignments/*`
- `modules/exams/*`

قرارات التنظيف:

1. استيراد وحدات System 05 الفعلية في `AppModule`.
2. حذف أو أرشفة المسارات المكررة القديمة بعد النقل.
3. إيقاف الاعتماد على ملفات موجودة في الشجرة لكنها غير موصولة.

### 8.2 Frontend

الهيكل المقترح:

- `features/system-05/evaluation-policies/*`
- `features/system-05/assessment-periods/*`
- `features/system-05/period-results/*`
- `features/system-05/results-decisions/*`

قرارات التسمية:

1. `Monthly Custom Component Scores` يستبدل بـ `درجات مكونات الفترة`.
2. `Monthly Grades` يصبح واجهة نتائج شهرية فقط، لا مكانًا لتعريف منطق خاص ثابت.
3. `Semester Grades` يصبح واجهة نتائج فصلية فقط.
4. `Annual Grades` يتحول إلى نتائج مواد سنوية مبنية من الفترات.

## 9. خطة التنفيذ المرحلية

### Phase 0 - تثبيت الأساس قبل أي تطوير

1. اعتماد مصدر الحقيقة التنفيذي:
   - `schema.prisma`
   - migrations
   - modules الموصولة فقط
2. توصيل وحدات System 05 الناقصة في `AppModule`.
3. حصر المسارات المكررة ووضع قائمة retire واضحة.
4. توثيق أن ملفات `docx` غير موجودة حاليًا في مساحة العمل.

### Phase 1 - نموذج البيانات الجديد

1. إضافة جداول:
   - `assessment_periods`
   - `assessment_period_components`
   - `assessment_component_source_periods`
   - `student_period_results`
   - `student_period_component_scores`
2. إبقاء الجداول الحالية موجودة مؤقتًا للتوافق.
3. إضافة قيود تحقق:
   - uniqueness
   - locking
   - max score integrity

### Phase 2 - بناء نظام الفترات الشهرية

1. شاشة إنشاء فترة شهرية.
2. شاشة مكونات الفترة.
3. شاشة إدخال درجات مكونات الفترة.
4. حساب المكونات الآلية.
5. قفل واعتماد النتيجة الشهرية.

### Phase 3 - بناء نظام الفترات الفصلية

1. شاشة إنشاء فترة فصلية.
2. دعم مكون `AGGREGATED_PERIODS`.
3. اختيار الفترات الشهرية الداخلة في المحصلة.
4. إعادة التحجيم إلى الدرجة المحددة للمكوّن.
5. إدخال الاختبار اليدوي واعتماد النتيجة.

### Phase 4 - بناء النتيجة النهائية السنوية

1. إنشاء فترة `YEAR_FINAL`.
2. ربطها بنتائج الفترات الفصلية.
3. إعادة حساب نتائج المواد السنوية.
4. تحديث `AnnualResult` ليبقى طبقة قرار نهائي للطالب، لا طبقة حساب مكونات.

### Phase 5 - الترحيل والتنظيف

1. Backfill من الجداول القديمة إلى النموذج الجديد.
2. تحويل الواجهات إلى المسارات الجديدة.
3. وضع الجداول والخدمات القديمة في وضع قراءة فقط.
4. حذف الثوابت القديمة بعد نجاح الترحيل.

### Phase 6 - QA والتثبيت

1. سيناريو كامل:
   - فترة شهرية 1
   - فترة شهرية 2
   - فترة شهرية 3
   - فترة فصلية 1
   - فترة فصلية 2
   - نتيجة نهائية سنوية
2. اختبار صلاحيات المدرس.
3. اختبار القفل والاعتماد.
4. اختبار إعادة التحجيم.
5. اختبار الترحيل من بيانات قديمة.

## 10. ما الذي لا أنصح به

1. لا أنصح بإضافة طلبك فوق `MonthlyCustomComponentScores` الحالي.
2. لا أنصح بإصلاح `SemesterGrade` الحالي فقط وترك `AnnualGrade` كما هو.
3. لا أنصح بنقل منطق المحصلة إلى `trigger` معقد داخل قاعدة البيانات.
4. لا أنصح بخلط الواجبات مرة أخرى داخل وحدة النتائج.

## 11. القرارات المعتمدة (تمت الموافقة)

1. النتيجة السنوية النهائية تكون **طبقة تقرير** فوق الفترات الفصلية وليست فترة مستقلة.
2. عند غياب نتيجة شهرية ضمن الأشهر المربوطة بالمحصلة **نعاملها صفرًا** ولا نوقف الحساب.
3. إنشاء الفترات يكون عبر **صلاحيات مثل بقية النظام** (RBAC).
4. **الإبقاء على `AcademicMonth`** ككيان تقويمي مع ربط الفترات الشهرية به.

## 12. التوصية النهائية

التوصية المعمارية هي:

- تثبيت System 05 أولًا كمصدر حقيقة موصول فعليًا.
- ثم بناء محرك فترات موحد.
- ثم تقديم الشهري والفصلي والنهائي كواجهات مستقلة فوق هذا المحرك.

بهذا نحقق طلبك بالكامل:

- كل فترة باسمك الذي تريده
- مكونات غير محدودة
- محصلة فصلية من أشهر مختارة
- نتيجة نهائية من فصلين
- بقاء الواجبات كنظام مستقل
- وربط تلقائي مع الطلاب والمواد والسنة والترم بدون فوضى إضافية

## 13. تنفيذ Phase 0 (تم البدء)

- تم ربط وحدات System 05 الفعلية داخل `AppModule`:
  - `EvaluationPoliciesModule`
  - `GradeAggregationModule`
  - `ResultsDecisionsModule`

## 14. تنفيذ Phase 1 (تم البدء)

- تمت إضافة نماذج Prisma للفترات المرنة والمكونات والنتائج:
  - `AssessmentPeriod`
  - `AssessmentPeriodComponent`
  - `AssessmentComponentSourcePeriod`
  - `StudentPeriodResult`
  - `StudentPeriodComponentScore`
- تمت إضافة enums جديدة لدعم تصنيف الفترات وآلية إدخال المكونات:
  - `AssessmentPeriodCategory`
  - `AssessmentComponentEntryMode`

## 15. تنفيذ Phase 2 (تم البدء)

- تم بناء وحدات Backend للفترات والمكونات وربطها في `AppModule`:
  - `AssessmentPeriodsModule`
  - `AssessmentPeriodComponentsModule`
  - `AssessmentComponentSourcePeriodsModule`
- تم إنشاء CRUD APIs مع RBAC للموارد الجديدة:
  - `assessment-periods`
  - `assessment-period-components`
  - `assessment-component-source-periods`
- تم إضافة صلاحيات الموارد الجديدة في `permissions.seed.ts` وتوسيع صلاحيات الأدوار في `admin.seed.ts`.
- تم إنشاء Migration (بحاجة تطبيق على قاعدة البيانات):
  - `prisma/migrations/20260412090000_add_assessment_periods`
- تمت إضافة CRUD APIs لإدارة:
  - `student-period-results`
  - `student-period-component-scores`

## 16. تنفيذ Phase 3 (تم البدء)

- تم إضافة عملية حساب المكونات المجمعة `AGGREGATED_PERIODS` مع إعادة التحجيم.
- تمت إضافة endpoint للحساب:
  - `POST /student-period-results/calculate`
- تم السماح بإدخال يدوي لمكونات `AUTO_ATTENDANCE` و `AUTO_HOMEWORK` و `AUTO_EXAM` مع بقاء `AGGREGATED_PERIODS` للقراءة فقط.

## 17. تنفيذ إضافي بعد الموافقة (مكتمل جزئيًا)

- تم بناء واجهات Frontend جديدة للنظام المرن:
  - إدارة الفترات ومكوناتها ومصادر المحصلة
  - نتائج الطلاب ودرجات مكونات الفترات
- تم إضافة إدخال جماعي للمعلم داخل نتائج الفترات:
  - اختيار الفترة + الشعبة + المادة
  - توليد النتائج المفقودة تلقائيًا
  - إدخال الدرجات وحفظها دفعة واحدة
- تم إضافة القفل/الاعتماد في النظام الجديد:
  - `assessment-periods/:id/lock`
  - `assessment-periods/:id/unlock`
  - `student-period-results/:id/lock`
  - `student-period-results/:id/unlock`
- تم توسيع صلاحيات RBAC للبنود الجديدة:
  - `assessment-periods.lock`
  - `assessment-periods.unlock`
  - `student-period-results.lock`
  - `student-period-results.unlock`
- تم توسيع حساب نتائج الفترات بحيث يشمل:
  - `AUTO_ATTENDANCE`
  - `AUTO_HOMEWORK`
  - `AUTO_EXAM`
  - `AGGREGATED_PERIODS`
- تم ربط `annual-results` ليدعم الاعتماد على `YEAR_FINAL` ونتائج الفترات الفصلية عند توفرها، مع الإبقاء على المسار القديم كمسار توافق احتياطي.
- تم تعديل شاشة `annual-results` لتعرض تفاصيل المواد من `student-period-results` للفترات النهائية/الفصلية بدل عرضها من `annual-grades` القديمة.
- تم تقليل الاعتماد الداخلي داخل `annual-results.calculate` على إعادة قراءة `annualGrade` لبناء `annualResult`، وأصبح يبني النتائج السنوية من التجميع المرن مباشرة ثم يكتب طبقة التوافق القديمة عند الحاجة.
- تم تحويل صفحات:
  - `monthly-grades`
  - `semester-grades`
  - `annual-grades`
  إلى صفحات انتقالية تشير إلى المسار الجديد بدل الاستمرار كمسار رئيسي.
- تم تحويل صفحة:
  - `monthly-custom-component-scores`
  إلى صفحة انتقالية أيضًا، لأن المكونات الإضافية أصبحت جزءًا من مكونات الفترات المرنة.
- تم فصل التنقل الأمامي أولًا بين النظام الجديد والسجلات القديمة، ثم بعد قرار عدم الاحتفاظ بالبيانات التجريبية القديمة:
  - تم إزالة مجموعة Legacy من التنقل نهائيًا
  - وتم التعامل مع النظام الجديد كمسار وحيد ظاهر للمستخدم
  - وتم حذف مجلدات Frontend legacy المتعلقة بالشهري/الفصلي/السنوي
- تم إدخال وضع `read-only` للخدمات القديمة في:
  - `monthly-grades`
  - `monthly-custom-component-scores`
  - `semester-grades`
  - `annual-grades`
  عبر متغير البيئة:
  - `LEGACY_GRADE_AGGREGATION_WRITE_ENABLED`
- تم إضافة تحكم مستقل لقراءة المسارات القديمة عبر:
  - `LEGACY_GRADE_AGGREGATION_READ_ENABLED`
  بحيث يمكن إبقاء النظام القديم متاحًا للقراءة أثناء الترحيل، ثم إغلاقه بالكامل لاحقًا من الباكند.
- بعد تأكيد أن البيانات القديمة تجريبية وغير مطلوبة:
  - تم إيقاف الاعتماد على `backfill`
  - وتم حذف أمر التشغيل الخاص به من `package.json`
  - وتم حذف سكربت `backfill-flexible-periods.ts` نفسه
  - وتم حذف مجلدات Backend legacy القديمة:
  - `backend/src/modules/monthly-grades`
  - `backend/src/modules/monthly-custom-component-scores`
  - `backend/src/modules/semester-grades`
  - `backend/src/modules/annual-grades`
  - وتم تنظيف التسميات والصلاحيات المرجعية القديمة من الواجهة والـ seeds
  - وتم حذف endpoints legacy الخاصة بالدرجات القديمة من `frontend/src/lib/api/client.ts`
  - وتم جعل `annual-results.calculate` يعتمد على الفترات المرنة فقط دون fallback إلى `semesterGrade` القديم
  - وتم إيقاف كتابة `AnnualGrade` من داخل `annual-results.calculate`، وأصبح احتساب النتيجة السنوية يعمل مباشرة فوق تجميع نتائج الفترات

## 18. الإغلاق الحالي للخطة

- تم فصل `grading-reports` عن `semesterGrade` و`annualGrade` القديمة، وأصبحت تقارير الحوكمة تعتمد على:
  - `studentPeriodResults` للفترات الفصلية
  - `studentPeriodResults` للفترات النهائية
  - `annualResults` للقرار السنوي والترتيب
- تم فصل `annual-statuses` عن عدّادات `annualGrade` القديمة، ولم تعد إدارة الحالة السنوية تعتمد على سجلات legacy النشطة.
- تم حذف البقايا غير المستخدمة من `frontend/src/lib/api/client.ts` الخاصة بأنواع `AnnualGrade`.
- تم حذف البقايا غير المستخدمة من `annual-results.service.ts` والتي كانت تشير إلى `semesterGrade` و`GradingNotificationsService`.

الخلاصة الحالية:

- المحرك الجديد للفترات المرنة موجود ومستخدم فعليًا في الإنشاء والإدخال والحساب والقفل والنتائج السنوية.
- الواجهة الأمامية تعرض الآن المسار الجديد فقط، وتقارير النتائج مبنية على النموذج الجديد.
- بقيت جداول legacy داخل المخطط فقط، لكنها لم تعد جزءًا من المسار التشغيلي الحالي للفترات والنتائج والتقارير التي تم تنظيفها.
- التحقق التشغيلي الأخير:
  - `frontend typecheck` ناجح
  - `http://localhost:3000/api/docs` يستجيب
  - `http://localhost:3001` يستجيب
  - إعادة `npm run build` للباكند أثناء بقاء السيرفر شغال قد تتعطل على ويندوز بسبب قفل Prisma engine، لذلك يلزم إيقاف الباكند أولًا إذا أردنا إعادة build نظيف في نفس اللحظة
