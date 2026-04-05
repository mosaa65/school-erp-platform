# مصفوفة الإغلاق - الأنظمة 01-05 (Lookup + Translation + Workflow)

تاريخ: 2026-03-09
النطاق: الأنظمة 01، 02، 03، 04، 05 فقط.

## 1) الملخص التنفيذي
- تم إغلاق جزء مهم من لخبطة التشغيل في HR عبر ربط واضح بين:
- ملف الموظف
- حساب المستخدم
- الأدوار
- نطاق التشغيل الأكاديمي (إسناد/إشراف)
- تم اعتماد فلتر جاهزية تشغيل رسمي في API وواجهة الموظفين.
- بقيت فجوات منطقية/تنظيمية في موضوع تمثيل بعض الحقول (enum + lookup معًا) وتحتاج مرحلة توحيد منظمة.

## 2) Matrix - Lookup Consistency
| المحور | الحالة | الدليل الفني | القرار |
|---|---|---|---|
| Lookup catalog في النظام 01 | مكتمل بدرجة عالية | `backend/prisma/seeds/core/system-01/lookups.seed.ts` + نماذج `Lookup*` في `backend/prisma/schema.prisma` | معتمد كـ Source of Truth للبيانات الثابتة |
| ربط `Employee` مع lookup (جنس/مؤهل/دور وظيفي/هوية/موقع) | جيد مع تداخل | تحقق lookup في `backend/src/modules/employees/employees.service.ts` | الإبقاء مؤقتًا، ثم إزالة التداخل لاحقًا |
| ربط `Student` مع lookup (جنس/وضع صحي/يتم/موقع) | جيد مع تداخل | تحقق ومزامنة في `backend/src/modules/students/students.service.ts` | يحتاج خطة توحيد enum/lookup |
| ربط `Guardian` مع lookup (جنس/هوية/موقع) | جيد مع تداخل | تحقق ومزامنة في `backend/src/modules/guardians/guardians.service.ts` | يحتاج نفس مسار التوحيد |
| Seed للأنظمة الأكاديمية 02/05 | جيد | `backend/prisma/seeds/core/system-02/academic-core.seed.ts`, `backend/prisma/seeds/core/system-05/lookups.seed.ts` | معتمد |
| Demo Seed (تشغيلي/اختباري) | جيد | `backend/prisma/seeds/demo/*.ts` | معتمد للاختبار فقط |

## 3) Matrix - Translation/UX Clarity
| المحور | الحالة | الملاحظة |
|---|---|---|
| شاشات البنية المشتركة (Users/Roles/Permissions) | جيد | تعريب قوي مع عرض أكواد تقنية عند الحاجة |
| شاشات HR الأساسية | جيد | تم تعزيز وضوح علاقة الحساب/الأدوار/النطاق |
| شاشات التعليم والدرجات | متوسط | بقيت حالات يظهر فيها code تقني بجانب الاسم العربي (مقصود تشغيليًا)، وتحتاج polishing |
| الرسائل الإرشادية التشغيلية | جيد | أضيفت رسائل صريحة داخل الإسناد/الإشراف |

## 4) Matrix - Workflow Closure
| التدفق | الحالة | ما تم |
|---|---|---|
| موظف -> حساب مستخدم -> دور | مغلق جزئيًا | عرض الربط + انتقال سريع لشاشة المستخدمين |
| نطاق التشغيل (إسناد/إشراف) | مغلق جزئيًا | تحذير عند اختيار موظف بدون حساب |
| رؤية جاهزية التشغيل للموظف | مغلق | badge جاهزية + عداد نطاق + فلتر جاهزية |
| فرض الجاهزية قبل تنفيذ بعض العمليات الحساسة | مغلق جزئيًا | `STRICT_EMPLOYEE_WORKFLOW` يفرض جاهزية الموظف قبل تفعيل الإسناد/الإشراف |

## 5) التغييرات المنفذة في Phase C
- Backend:
- إضافة `operationalScope` داخل استجابة الموظفين:
- `activeTeachingAssignments`
- `activeSectionSupervisions`
- إضافة فلتر API: `operationalReadiness = READY | PARTIAL | NOT_READY`
- ملفات:
- `backend/src/modules/employees/dto/list-employees.dto.ts`
- `backend/src/modules/employees/employees.controller.ts`
- `backend/src/modules/employees/employees.service.ts`

- Frontend:
- إضافة فلتر جاهزية تشغيل في صفحة الموظفين.
- إضافة badge جاهزية مبني على: حساب + أدوار + نطاق.
- تحديث عميل API لقبول `operationalReadiness`.
- ملفات:
- `frontend/src/features/employees/components/employees-workspace.tsx`
- `frontend/src/features/employees/hooks/use-employees-query.ts`
- `frontend/src/lib/api/client.ts`

## 6) الفجوات المتبقية (محددة بدقة)
1. ازدواجية تمثيل بعض الحقول (enum + lookup id) في Students/Guardians/Employees.
2. حاجة جولة polishing تعريب نهائية في بعض شاشات النظام 05 لإزالة أي لبس لغوي.

## 7) خطة الإغلاق التالية (تنفيذية)
1. تعريف سياسة توحيد enum/lookup لكل حقل (مع migration path واضح).
2. توسيع strict guard ليشمل عمليات حساسة إضافية عند الحاجة (اختياري حسب سياسة التشغيل).
3. تمرير UX review أخير على النظام 05 (dropdown labels + helper texts).
4. تشغيل smoke matrix نهائي وإصدار تقرير إغلاق 01-05.
