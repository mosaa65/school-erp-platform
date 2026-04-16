# تحليل النظام ووحدة الموارد البشرية

تاريخ التحليل: `2026-04-16`

## الهدف

هذا الملف يلخص:

1. الصورة المعمارية العامة للنظام الحالي.
2. كيف ترتبط الموارد البشرية بباقي الأنظمة.
3. أهم المشاكل الفعلية الموجودة حاليًا في HR في الباك إند والفرونت إند.
4. العناصر المكررة أو ضعيفة الفائدة أو غير المترابطة بما يكفي.

## نطاق المراجعة

تمت المراجعة اعتمادًا على التنفيذ الفعلي في:

- `backend/src/app.module.ts`
- `backend/prisma/schema.prisma`
- `backend/src/modules/employees/*`
- `backend/src/modules/employee-*/*`
- `backend/src/modules/teaching-assignments/*`
- `backend/src/modules/finance/hr-integrations/*`
- `backend/src/modules/hr-reports/*`
- `frontend/src/components/layout/app-navigation.ts`
- `frontend/src/features/employees/*`
- `frontend/src/features/employee-*/*`
- `frontend/src/features/hr-reports/*`
- `frontend/src/features/hr-integrations/*`
- `frontend/src/presentation/entity-surface/*`
- `frontend/tests/e2e/*`

## الصورة العامة للنظام

### 1. المعمارية الحالية

النظام يعمل كـ `modular monolith` في الباك إند و `feature-driven UI` في الفرونت إند:

- الباك إند: `NestJS + Prisma + MySQL`
- الفرونت إند: `Next.js 14 + React Query + App Router`
- قاعدة البيانات مشتركة بين الأنظمة كلها
- التنقل في الواجهة مقسم إلى مجموعات أنظمة: البنية المشتركة، الأكاديمي، HR، الطلاب، التعليم والدرجات، المالية

### 2. ترابط الأنظمة

الموارد البشرية ليست نظامًا معزولًا، بل تعتمد فعليًا على:

- `System 01`:
  المستخدمون، الأدوار، الصلاحيات، الإشعارات، وسجل التدقيق
- `System 02`:
  السنوات الأكاديمية، الشعب، المواد، وربط الصفوف بالمواد
- `System 07`:
  الفروع، مراكز التكلفة، القيود المالية، وتكامل الرواتب والخصومات

### 3. معنى هذا الترابط عمليًا

الموظف في النظام ليس مجرد سجل واحد، بل محور تتصل به عدة سلاسل:

- هوية الموظف: `Employee`
- التنظيم: `departmentId`, `branchId`, `costCenterId`, `directManagerEmployeeId`
- الهوية الرقمية: `User.employeeId`
- التكليف الأكاديمي: `EmployeeTeachingAssignment`, `EmployeeSectionSupervision`
- التشغيل اليومي: `EmployeeAttendance`, `EmployeeTask`
- التطوير والسلوك: `EmployeeCourse`, `EmployeeTalent`, `EmployeeViolation`, `EmployeePerformanceEvaluation`
- الامتثال والملفات: `EmployeeContract`, `EmployeeLeaveRequest`, `EmployeeLeaveBalance`, `EmployeeLifecycleChecklist`, `employee-documents`
- الأثر المالي: `finance/hr-integrations`, `JournalEntryLine.employeeId`

## خريطة الموارد البشرية الحالية

### الكيانات الأساسية

الكيانات الأساسية المنفذة في قاعدة البيانات:

- `Employee`
- `EmployeeDepartment`
- `EmployeeSectionSupervision`
- `EmployeeTask`
- `EmployeeTeachingAssignment`
- `EmployeeAttendance`
- `EmployeeLeaveBalance`
- `EmployeeLeaveRequest`
- `EmployeeLifecycleChecklist`
- `EmployeePerformanceEvaluation`
- `Talent`
- `EmployeeTalent`
- `EmployeeCourse`
- `EmployeeContract`
- `EmployeeViolation`

ملاحظات مهمة:

- `Employee` هو الجذر الرئيسي لوحدة HR في `backend/prisma/schema.prisma:2327`
- يوجد ربط جيد مع المستخدم `User.employeeId` في `backend/prisma/schema.prisma:426`
- يوجد ربط جيد مع الأكاديمي عبر `AcademicYear`, `Section`, `Subject`
- يوجد ربط جزئي مع المالية عبر `branchId`, `costCenterId` و `JournalEntryLine.employeeId`

### الواجهات الحالية في HR

الوحدة لديها صفحات مستقلة لكل جزء تقريبًا داخل مجموعة `system-03-hr` في:

- `frontend/src/components/layout/app-navigation.ts`

والشاشات الأساسية هي:

- `employees`
- `employee-teaching-assignments`
- `employee-section-supervisions`
- `employee-attendance`
- `employee-tasks`
- `employee-contracts`
- `employee-departments`
- `employee-documents`
- `employee-leaves`
- `employee-leave-balances`
- `employee-courses`
- `employee-lifecycle-checklists`
- `talents`
- `employee-talents`
- `employee-performance-evaluations`
- `employee-violations`
- `hr-reports`

## أهم المشاكل المكتشفة

## 1. القوائم المرجعية للموظفين مقصوصة عند 100 عنصر

الخطورة: `عالية`

الوصف:

معظم شاشات HR تبني قائمة اختيار الموظف عبر استدعاء `listEmployees(page: 1, limit: 100, isActive: true)` بدل وجود endpoint مخصص للخيارات. هذا يعني أن أي مدرسة فيها أكثر من 100 موظف نشط ستفقد جزءًا من الموظفين في:

- الحضور
- الإجازات
- العقود
- المستندات
- المهام
- التقييم
- المواهب
- التكاملات المالية
- التقارير

الأثر:

- المستخدم لا يستطيع اختيار كل الموظفين من النماذج
- التقارير والفلاتر تصبح ناقصة
- بعض العمليات ستبدو وكأن الموظف “غير موجود” بينما هو موجود فعليًا

أدلة:

- `backend/src/modules/employees/employees.controller.ts:46-79`
  يوجد endpoint عام paginated و endpoint تنظيمي، لكن لا يوجد endpoint lightweight مخصص لخيارات الموظفين
- `frontend/src/features/employee-attendance/hooks/use-employee-options-query.ts:7-31`
- `frontend/src/features/employee-contracts/hooks/use-employee-options-query.ts:7-31`
- `frontend/src/features/hr-reports/hooks/use-employee-options-query.ts:7-31`
- `frontend/src/features/hr-integrations/hooks/use-employee-options-query.ts:11-38`
- بحث المشروع يظهر التكرار نفسه في عدة وحدات: `limit: 100`

## 2. قيد الرواتب المالي لا يُجبر على الاعتماد على بيانات HR الفعلية

الخطورة: `عالية`

الوصف:

النظام يملك معاينة رواتب مبنية على العقود والإجازات غير المدفوعة، لكن إنشاء قيد الرواتب نفسه لا يعتمد على هذه المعاينة كمرجع إلزامي. المستخدم يستطيع إرسال أي أرقام يدويًا:

- `totalSalaries`
- `totalDeductions`

وبالتالي يمكن إنشاء قيد مالي لا يطابق بيانات العقود أو الإجازات أو الواقع التشغيلي.

الأثر:

- انفصال بين HR والمالية
- ضعف “source of truth”
- سهولة إنشاء قيود صحيحة محاسبيًا لكنها غير صحيحة تشغيليًا

أدلة:

- مدخل القيد يدوي بالكامل في `backend/src/modules/finance/hr-integrations/dto/payroll-journal.dto.ts:20-44`
- الخدمة تستخدم الأرقام المرسلة مباشرة في `backend/src/modules/finance/hr-integrations/hr-integrations.service.ts:78-166`
- المعاينة الفعلية موجودة كمسار منفصل فقط في `backend/src/modules/finance/hr-integrations/hr-integrations.service.ts:324-520`
- الواجهة نفسها تعبئ الحقول بعد المعاينة ثم تعيد إرسالها كأرقام عادية قابلة للتغيير في `frontend/src/features/hr-integrations/hooks/use-hr-integrations-actions.ts:194-247`

## 3. يوجد خطر تكرار قيد الرواتب لنفس الشهر بدون حماية كافية

الخطورة: `عالية`

الوصف:

إنشاء قيد الرواتب يستخدم:

- `referenceType = HR_PAYROLL`
- `referenceId = ${year}-${month}`

لكن لا يوجد تحقق يمنع إنشاء أكثر من قيد للراتب لنفس الشهر. كما أن جدول `JournalEntry` لا يفرض unique constraint على `referenceType/referenceId`.

الأثر:

- تكرار القيود الشهرية بالخطأ
- تضخم ملخص الرواتب لأن `payroll-summary` يجمع كل القيود المطابقة
- صعوبة المراجعة المالية لاحقًا

أدلة:

- إنشاء المرجع الشهري في `backend/src/modules/finance/hr-integrations/hr-integrations.service.ts:136-144`
- لا يوجد pre-check داخل `createPostedJournalEntry` في `backend/src/modules/finance/hr-integrations/hr-integrations.service.ts:640-725`
- جدول `JournalEntry` لا يحتوي unique على `referenceType/referenceId` في `backend/prisma/schema.prisma:4165-4224`

## 4. مستندات الموظفين لا تملك سلامة مرجعية حقيقية على مستوى قاعدة البيانات

الخطورة: `عالية`

الوصف:

وحدة `employee-documents` لا تعتمد على كيان `EmployeeDocument` فعلي. بدلًا من ذلك يتم تخزينها في جدول عام `FileAttachment` باستخدام:

- `entityType = 'employee'`
- `entityId = string`

أي أن العلاقة مع الموظف ليست FK حقيقية في قاعدة البيانات، بل اتفاق تطبيقي فقط.

الأثر:

- إمكانية وجود مرفقات يتيمة أو غير مرتبطة فعليًا بسجل موظف صالح
- ضعف الاتساق بين HR والتقارير
- صعوبة بناء علاقات واضحة وعمليات حذف/أرشفة آمنة

أدلة:

- النموذج العام في `backend/prisma/schema.prisma:1699-1715`
- الإنشاء والتحقق يتم على مستوى الخدمة فقط في `backend/src/modules/employee-documents/employee-documents.service.ts:63-85`
- تقارير HR تعتمد على نفس الجدول العام في `backend/src/modules/hr-reports/hr-reports.service.ts:297-405`

## 5. واجهات HR تعمل كشاشات منفصلة أكثر من كونها ملف موظف موحد

الخطورة: `متوسطة إلى عالية`

الوصف:

رغم أن `Employee` هو الكيان الجذري، لا توجد صفحة تفاصيل للموظف أو “سطح كيان” موحد يربط بين:

- الحضور
- العقود
- المستندات
- الإجازات
- التقييم
- المخالفات
- المواهب
- المهام

الواجهة الحالية تعرض بطاقات الموظفين، لكن الربط السريع الظاهر فيها يذهب أساسًا إلى إدارة حساب المستخدم فقط.

الأثر:

- التنقل بين وحدات HR يعتمد على البحث اليدوي المتكرر
- ضعف تجربة “ملف الموظف الكامل”
- صعوبة فهم الحالة التشغيلية للموظف من مكان واحد

أدلة:

- لا يوجد route لتفاصيل الموظف، فقط: `frontend/src/app/app/employees/page.tsx`
- بطاقة الموظف تربط المستخدمين أكثر مما تربط وحدات HR في `frontend/src/features/employees/components/employees-workspace.tsx:1167-1185`
- توجد بنية surface جاهزة ومستخدمة للطلاب في `frontend/src/features/students/presentation/student-surface-definition.tsx:160-184`
- لم يتم العثور على تعريف مقابل للموظفين داخل `src/features/employees/presentation/`

## 6. يوجد تكرار كبير منخفض الفائدة في hooks الخاصة بخيارات الموظفين

الخطورة: `متوسطة`

الوصف:

تم العثور على نسخ كثيرة شبه متطابقة من `useEmployeeOptionsQuery` موزعة على features مختلفة. المنطق فيها متكرر تقريبًا بالكامل:

- نفس الاستدعاء
- نفس `limit: 100`
- نفس منطق `401`
- نفس fallback عند `403`

هذا التكرار لا يضيف قيمة وظيفية حقيقية، لكنه يزيد تكلفة الصيانة ويجعل إصلاحات الأداء أو التوسعة تتكرر في عدة أماكن.

الأثر:

- صعوبة التعديل المركزي
- تكرار الأخطاء نفسها في أكثر من وحدة
- كلفة أعلى في التطوير المستقبلي

أدلة:

- `frontend/src/features/employee-attendance/hooks/use-employee-options-query.ts`
- `frontend/src/features/employee-contracts/hooks/use-employee-options-query.ts`
- `frontend/src/features/hr-reports/hooks/use-employee-options-query.ts`
- `frontend/src/features/hr-integrations/hooks/use-employee-options-query.ts`

## 7. هناك عدم اتساق في تصميم الصلاحيات بين شاشات HR

الخطورة: `متوسطة`

الوصف:

بعض الشاشات تربط تنفيذ العملية بصلاحية `employees.read` حتى لو كانت صلاحية الوحدة الأساسية موجودة، بينما شاشات أخرى توفر fallback بديل.

مثال واضح:

- `hr-integrations` يسمح بإدخال `employeeId` يدويًا إذا لم توجد صلاحية `employees.read`
- `employee-documents` يعطل الإنشاء عمليًا إذا لم توجد صلاحية `employees.read`

هذا يعني أن فلسفة الصلاحيات ليست موحدة بين الوحدات المتشابهة.

الأثر:

- التباس عند تصميم الأدوار والصلاحيات
- مستخدم يستطيع تنفيذ عملية في شاشة ولا يستطيع عملية مشابهة في شاشة أخرى
- زيادة احتمال ظهور “صلاحية موجودة لكن الواجهة لا تسمح”

أدلة:

- fallback اليدوي في `frontend/src/features/hr-integrations/components/hr-integrations-workspace.tsx:205-245`
- تعطيل نموذج المستندات عند غياب `employees.read` في `frontend/src/features/employee-documents/components/employee-documents-workspace.tsx:847-858`

## 8. تغطية الاختبارات الخلفية لا تواكب توسع وحدات HR الجديدة

الخطورة: `متوسطة`

الوصف:

يوجد اختبار backend رئيسي جيد لـ HR core واختبار خاص بتكاملات HR المالية، لكن الوحدات الأحدث مثل:

- المستندات
- العقود
- الإجازات
- أرصدة الإجازات
- الـ lifecycle
- الأقسام
- نطاقات الإشراف

لا تظهر مغطاة باختبارات backend تكاملية مماثلة بالوضوح نفسه.

الأثر:

- زيادة احتمالات regressions في منطق الخدمة
- الاعتماد الأكبر يصبح على اختبارات الواجهة المMocked بدلًا من التحقق من الباك إند الحقيقي

أدلة:

- `backend/test/hr-core.e2e-spec.ts`
- `backend/test/finance-hr-integrations.e2e-spec.ts`
- في المقابل، الجزء الأكبر من الوحدات الجديدة ظاهر أكثر في `frontend/tests/e2e/*` وليس في backend e2e

## عناصر قليلة الفائدة أو غير مترابطة بما يكفي

### 1. بنية `entity-surface` موجودة لكن HR لا يستفيد منها

هذه البنية تخدم الطلاب فعليًا، لكنها لم تُستثمر للموظفين بعد. وجودها دون تطبيق على HR يقلل الفائدة الفعلية منها في هذا النظام.

### 2. تكرار hooks المحلية للخيارات

هذا التكرار لا يضيف وظيفة جديدة، ويعتبر حملًا صيانياً أكثر من كونه قيمة فعلية.

### 3. شاشة `hr-reports` مفيدة كملخص، لكنها غير موصولة بمسارات drill-down

التقرير يعرض أرقامًا مهمة، لكنه لا يقود المستخدم مباشرة إلى:

- قائمة الموظفين الناقصة ملفاتهم
- المستندات المنتهية
- العقود القريبة من الانتهاء
- السجلات التي صنعت الرقم نفسه

وبالتالي تبقى القيمة تشغيلية جزئيًا وليست مكتملة.

## ملاحظات إيجابية مهمة

حتى يكون التقييم متوازنًا، توجد نقاط قوة واضحة أيضًا:

- نموذج `Employee` غني وقابل للتوسع
- الربط مع المستخدمين والأدوار موجود ومفيد
- الربط الأكاديمي في إسناد التدريس مضبوط جيدًا ويتحقق من mapping الصف/المادة/العام
- وجود `operationalReadiness` في الموظفين فكرة ممتازة
- وجود HR reports و HR-finance integration خطوة صحيحة من ناحية المعمارية
- وجود Playwright coverage جيد نسبيًا على مستوى الواجهة

## الأولويات المقترحة

### أولوية 1

- إنشاء endpoint موحد لخيارات الموظفين بدون حد 100 جامد أو مع pagination/search حقيقي
- منع تكرار قيد الرواتب لنفس الشهر/الفرع
- جعل قيد الرواتب يعتمد على snapshot أو preview مرجعي ملزم بدل الأرقام اليدوية الحرة

### أولوية 2

- بناء صفحة/Surface موحد لملف الموظف
- توحيد صلاحيات HR UI عند اختيار الموظف
- تقليل التكرار في hooks الخاصة بالخيارات

### أولوية 3

- تحويل مستندات الموظفين إلى كيان HR صريح أو تقوية العلاقة المرجعية الحالية
- إضافة backend e2e coverage للوحدات الجديدة
- إضافة drill-down links من تقارير HR إلى الوحدات التشغيلية نفسها

## الخلاصة

وحدة الموارد البشرية في هذا المشروع متقدمة نسبيًا من حيث عدد الكيانات وتغطية العمليات، وهي مرتبطة فعليًا بالأكاديمي والمستخدمين والمالية. لكن المشكلة الحالية ليست في غياب الوحدات، بل في:

- ضعف توحيد نقطة الحقيقة بين HR والمالية
- ضعف التصفح حول “ملف الموظف الكامل”
- وجود قيود تقنية صغيرة تتحول لمشكلة كبيرة عند التوسع، مثل حد 100 عنصر والتكرار وفقدان السلامة المرجعية في المستندات

بمعنى آخر:

الأساس المعماري جيد، لكن النظام يحتاج الآن إلى مرحلة `integration hardening` و `employee-centric UX` أكثر من حاجته إلى إضافة وحدات جديدة.
