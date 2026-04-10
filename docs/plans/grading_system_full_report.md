# 📊 تقرير وخطة تطوير نظام التعليم والدرجات (System 05 — SGAS)
## المرجع: مراجعة شاملة بتاريخ 2026-03-22

---

## 🔭 نظرة عامة: ما تم بناؤه حتى الآن

النظام الحالي يتكون من **11 نظاماً فرعياً** مبنياً بـ SQL (إجراءات، triggers، views):

| # | النظام الفرعي | الجداول الرئيسية | الحالة |
|---|---|---|---|
| 01 | سياسات الدرجات | `grading_policies`, `grading_policy_custom_components`, `teacher_assignments` | ✅ موجود |
| 02 | الاختبارات والفترات | `exam_periods`, `student_exam_scores` | ✅ موجود |
| 03 | الواجبات المنزلية | `homeworks`, `student_homeworks` | ✅ موجود |
| 04 | المحصلة الشهرية | `monthly_grades`, `monthly_custom_component_scores` | ✅ موجود |
| 05 | نتائج الفصل والعام | `semester_grades`, `annual_grades`, `annual_result` | ✅ موجود |
| 06 | تحضير الدروس | `lesson_preparations` | ⚠️ موجود جزئياً |
| 07 | التدقيق والحوكمة | Triggers القفل | ✅ موجود |
| 08 | التقارير والمخرجات | Views | ✅ موجود |
| 09 | أدوات النسخ السنوي | Stored Procedures النسخ | ✅ موجود |
| 10 | البيانات التجريبية | DEMO_DATA.sql | ✅ موجود |
| 11 | دفتر المتابعة الذكي | Smart Notebook generation | ⚠️ موجود جزئياً |

---

## 🔍 الجزء الأول: تحليل ما الذي يعمل تلقائياً وما يتطلب يدوياً

### ✅ ما يحدث تلقائياً (Triggers & Procedures)

#### 1. عند إنشاء واجب جديد → يُنشئ سجلات تلقائياً لكل طلاب الفصل
```
المُشغّل: trg_homework_auto_populate  (AFTER INSERT ON homeworks)
يستدعي: sp_populate_student_homeworks(homework_id)
النتيجة: INSERT IGNORE INTO student_homeworks لكل طالب نشط في الفصل
```
**مثالك:** معلمة الرياضيات تنشئ واجباً للصف الأول → يُنشأ تلقائياً سجل في `student_homeworks` لكل طالب في الصف الأول.

#### 2. تحديد الشهر الأكاديمي للواجب تلقائياً
```
المُشغّل: trg_homework_set_month_insert / trg_homework_set_month_update
النتيجة: month_id يُحسب تلقائياً من homework_date بدون إدخال يدوي
```

#### 3. التحقق من درجات الاختبارات تلقائياً
```
المُشغّلات: trg_exam_score_validate_insert/update/delete
يتحقق من: درجة أقصى، قفل الفترة، صف الطالب، تكليف المعلم
الغياب: يُضبط درجة الغائب تلقائياً = 0
```

#### 4. حساب المحصلة الشهرية (إجراء يُستدعى)
```
الإجراء: sp_calculate_monthly_grades(month_id, subject_id, classroom_id)
يحسب تلقائياً: attendance_score, homework_score, exam_score, custom_score
يدوي فقط: activity_score, contribution_score
```

#### 5. حساب النتيجة الفصلية (إجراء يُستدعى)
```
الإجراء: sp_calculate_semester_totals(semester_id, subject_id, classroom_id)
يجمع: كل المحصلات الشهرية → semester_work_total
الإجراء: sp_fill_final_exam_score → يُدرج درجة الاختبار النهائي
```

#### 6. حساب النتيجة السنوية + قرار النقل + الترتيب (إجراء يُستدعى)
```
الإجراء: sp_calculate_annual_results(academic_year_id, classroom_id)
يحسب: annual_grades, annual_result, promotion_decision, rank_in_class, rank_in_grade
قرار النقل: من grading_outcome_rules (قابل للتخصيص لكل عام/صف)
كسر التعادل: من tie_break_strategy (PERCENTAGE_ONLY / PERCENTAGE_THEN_TOTAL / PERCENTAGE_THEN_NAME)
```

---

## 🚨 الجزء الثاني: المشاكل والأخطاء المكتشفة

### المشكلة الأولى: ❌ السياسة مرتبطة بـ exam_type_id = 1 (MONTHLY) فقط — محدودية خطيرة

**الوضع الحالي:**
في `grading_policies` يوجد عمود `exam_type_id` يُقيّد السياسة بنوع اختبار واحد. الإجراءات دائماً تبحث عن `exam_type_id = 1 (MONTHLY)`.

**المشكلة:**
- إذا المدرسة تريد سياسة منفصلة للاختبار النهائي (exam_type_id = 3 FINAL)، يوجد جدول منفصل؛ لكن منطق حساب نسبة المحصلة يعمل فقط على MONTHLY.
- **لا يوجد تعريف مرن لـ "ما هو وزن الاختبار النهائي مقارنة بأعمال الفصل"** في الجدول.

**المطلوب:**
إضافة حقلين في `grading_policies` أو جدول مستقل:
- `semester_work_weight` — وزن أعمال الفصل (المشروع + المحصلات) من 100
- `final_exam_weight` — وزن الاختبار النهائي من 100
- مجموعهما = 100 (مثال: أعمال 60 + نهائي 40)

---

### المشكلة الثانية: ❌ عدد الأشهر في الفصل غير محدد من السياسة — يعتمد على academic_months فقط

**الوضع الحالي:**
بعض المدارس لها شهرين في الفصل (محرم + صفر) وبعضها ثلاثة (محرم + صفر + ربيع أول). النظام يعتمد على `academic_months` في System 02 لتحديد الأشهر.

**المشكلة:**
- لا يوجد إعداد في System 05 يُحدد "كم شهراً" تُعقد للفصل.
- النظام **يجمع كل المحصلات الشهرية** الموجودة في `monthly_grades` بدون حد أدنى/أقصى.
- إذا أُنشئت محصلة بالخطأ لشهر لا ينتمي للفصل، ستُحسب في النتيجة.

**المطلوب:**
- تعريف الأشهر الأكاديمية الرسمية للفصل في System 02 يكفي إذا كان الإدخال مقيداً.
- إضافة validation في `sp_calculate_semester_totals` للتحقق أن الشهر ينتمي للفصل.
- إضافة `min_months_required` و `max_months_allowed` في إعدادات الفصل (System 02).

---

### المشكلة الثالثة: ❌ حساب `monthly_total` بسيط جداً — لا يحترم الأوزان الصحيحة

**الوضع الحالي:**
```sql
monthly_total GENERATED ALWAYS AS (
    attendance_score + homework_score + activity_score + contribution_score + custom_components_score + exam_score
) STORED
```

**المشكلة:**
المجموع الشهري مجرد جمع. لكن المطلوب أن يكون كل مكون **من درجة معينة وليس مطلقة**. مثال:
- مدرسة A: الحضور 5 درجات، الواجبات 5 درجات، الاختبار 20 درجة = 30 وليس 100
- مدرسة B: الحضور 10 درجات، الواجبات 20 درجات، الاختبار 40 درجة = 70 وليس 100

**الحل:**
النظام الحالي يعمل صح إذا كان **مجموع الأوزان = 100** في السياسة. لكن لا يوجد `CHECK` يتحقق من أن:
```
max_exam_score + max_homework_score + max_attendance_score + max_activity_score + max_contribution_score + SUM(custom_max) = 100 (أو أي رقم محدد)
```

يجب إضافة trigger للتحقق من أن مجموع الأوزان = `target_monthly_total` (100 افتراضياً) جديد في `grading_policies`.

---

### المشكلة الرابعة: ❌ لا يوجد auto-populate لـ student_exam_scores عند إنشاء فترة اختبار

**الوضع الحالي:**
في الواجبات: `trg_homework_auto_populate` يُنشئ سجلات للطلاب **تلقائياً**.

في الاختبارات: **لا يوجد مثيل!**
- عند إنشاء اختبار في `exam_timetable`، لا تُنشأ سجلات `student_exam_scores` تلقائياً.
- المعلم يجب أن يُنشئ كل سجل يدوياً أو عبر النظام.

**المطلوب:**
إضافة trigger مشابه:
```sql
AFTER INSERT ON exam_timetable → sp_populate_student_exam_scores(exam_timetable_id)
```
يُنشئ سجلات بـ `is_present = TRUE, score = 0` لكل طالب في الفصل/الصف.

---

### المشكلة الخامسة: ❌ لا يوجد ربط تلقائي بين درجة الحضور ونظام الحضور في بيانات monthly_grades

**الوضع الحالي:**
يوجد `v_auto_attendance_score` (View) يحسب نسبة الحضور من `student_attendance`. لكن هذا الحساب **لا يُحوّل تلقائياً** إلى `monthly_grades.attendance_score`.

- الإجراء `sp_calculate_monthly_grades` يملأ هذا، لكنه **يُستدعى يدوياً**.
- لا يوجد trigger على `student_attendance` يُحدّث `monthly_grades` عند تغيير سجل حضور.

**المطلوب:**
إما:
1. **Scheduled Job** يُشغّل `sp_calculate_monthly_grades` دورياً (end of month).
2. أو trigger على `student_attendance` (AFTER INSERT/UPDATE) يُعيد حساب attendance_score.

---

### المشكلة السادسة: ❌ لا يوجد إعداد لـ "درجة اختبار الفصل النهائي" في policy منفصل عن MONTHLY

**الوضع الحالي:**
`sp_fill_final_exam_score` يبحث عن `gp_final` بـ `exam_type_id = 3`.
لكن: إذا لم تُعرّف المدرسة سياسة منفصلة للاختبار النهائي → `gp_final.max_exam_score` تكون NULL → يُستخدم `final_data.total_final_max` مباشرة.

**المشكلة:**
- بعض المدارس: الاختبار النهائي من 40 درجة، والمحصلة من 60 درجة = 100.
- بعضها: الاختبار من 50، المحصلة 50 = 100.
- لا يوجد تعريف واضح لهذه الأوزان في سياسة مرتبطة بالفصل.

**المطلوب:**
جدول إضافي أو حقول في `grading_policies`:
- `max_semester_work_score` — وزن أعمال الفصل الإجمالية (مثل 60)
- `max_final_exam_score` — وزن الاختبار النهائي (مثل 40)
- مجموعهما = `target_semester_total` (100 افتراضياً)

---

### المشكلة السابعة: ❌ حالة الواجب محدودة — فقط is_completed (TRUE/FALSE)

**الوضع الحالي:**
```sql
is_completed BOOLEAN DEFAULT FALSE
```

**المشكلة:**
الواقع العملي يحتاج:
- `نفّذ` ← الطالب نفّذ ولم يُصحح بعد
- `صُحِّح` ← المعلم صحّح الواجب
- `توبع` ← تمت المتابعة
- `لم ينفذ` ← لم يُنفّذ

**المطلوب:**
إضافة جدول مرجعي `lookup_homework_completion_statuses` وربطه بـ `student_homeworks`:
```
status_id → 1:لم_ينفذ، 2:نفّذ، 3:صُحِّح، 4:توبع
```

---

### المشكلة الثامنة: ❌ لا يوجد أوصاف تقديرات (Grade Descriptions) في النظام

**الوضع الحالي:**
لا يوجد جدول `grade_descriptors` يُعرّف:
- 90-100% = ممتاز
- 80-89% = جيد جداً
- 70-79% = جيد
- 60-69% = مقبول
- أقل من 60% = ضعيف

**المطلوب:**
جدول `lookup_grade_descriptors` يشمل:
```sql
min_percentage, max_percentage, name_ar, name_en, color_code
```
ومرونة: كل مدرسة تُعدّل هذه النطاقات بدون مبرمج.

---

### المشكلة التاسعة: ❌ حالات النتيجة السنوية محدودة — 4 حالات فقط

**الوضع الحالي:**
```sql
('ناجح', 'PASS'), ('راسب', 'FAIL'), ('مكمل', 'MAKEUP'), ('محروم بسبب الغياب', 'DEPRIVED')
```

**المشكلة:**
بعض المدارس تحتاج حالات إضافية مثل:
- `ناجح للمادة فقط` (PASS_SUBJECT_ONLY)
- `يحق له دخول الاختبار التكميلي` (ELIGIBLE_MAKEUP)
- `منقول مع إعادة مادة` (PROMOTED_WITH_REPEAT)

**المطلوب:**
`lookup_annual_statuses` يكون قابلاً للإضافة من الواجهة (Admin Panel).

---

## 📋 الجزء الثالث: ما يوجد في الواجهة المطلوبة (UI Pages) وما ينقص

من ملف `m` (قائمة الصفحات المطلوبة):

### التعليم والدرجات — الإعدادات (4 صفحات)
| الصفحة | الجداول المقابلة | الحالة |
|---|---|---|
| أوصاف التقديرات | `lookup_grade_descriptors` | ❌ **غير موجود** |
| الحالات السنوية | `lookup_annual_statuses` | ✅ موجود (4 حالات فقط) |
| قرارات الترفيع | `lookup_promotion_decisions` | ✅ موجود (4 قرارات) |
| قواعد النتائج | `grading_outcome_rules` | ✅ موجود |

### سياسات التقييم (2 صفحات)
| الصفحة | الجداول المقابلة | الحالة |
|---|---|---|
| سياسات التقييم والدرجات | `grading_policies` | ✅ موجود (ناقص وزن نهائي الفصل) |
| مكوّنات سياسات التقييم | `grading_policy_custom_components` | ✅ موجود |

### الواجبات (2 صفحات)
| الصفحة | الجداول المقابلة | الحالة |
|---|---|---|
| أنواع الواجبات | `lookup_homework_types` | ✅ موجود |
| الواجبات | `homeworks` + `student_homeworks` | ✅ موجود (حالة محدودة) |

### الاختبارات (2 صفحات)
| الصفحة | الجداول المقابلة | الحالة |
|---|---|---|
| الفترات الاختبارية | `exam_periods` | ✅ موجود |
| التقييمات والاختبارات | `exam_timetable` (System 08) + `student_exam_scores` | ⚠️ ناقص auto-populate |

### درجات الطلاب (2 صفحات)
| الصفحة | الجداول المقابلة | الحالة |
|---|---|---|
| واجبات الطلاب | `student_homeworks` | ✅ موجود |
| درجات الاختبارات | `student_exam_scores` | ✅ موجود |

### التجميع والنتائج (5 صفحات)
| الصفحة | الجداول المقابلة | الحالة |
|---|---|---|
| الدرجات الشهرية | `monthly_grades` | ✅ موجود (الحساب يدوي الاستدعاء) |
| مكوّنات شهرية إضافية | `monthly_custom_component_scores` | ✅ موجود |
| الدرجات الفصلية | `semester_grades` | ✅ موجود (ناقص وزن الاختبار النهائي) |
| الدرجات السنوية | `annual_grades` | ✅ موجود |
| النتائج السنوية | `annual_result` | ✅ موجود |

---

## 🏗️ الجزء الرابع: الخطة الكاملة للتطوير والإصلاح

### المرحلة 1 — إصلاحات عاجلة في قاعدة البيانات

#### 1.1 إضافة جدول أوصاف التقديرات
```sql
CREATE TABLE lookup_grade_descriptors (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    academic_year_id INT UNSIGNED NULL COMMENT 'NULL = افتراضي لكل السنوات',
    grade_level_id INT UNSIGNED NULL COMMENT 'NULL = كل الصفوف',
    min_percentage DECIMAL(5,2) NOT NULL,
    max_percentage DECIMAL(5,2) NOT NULL,
    name_ar VARCHAR(50) NOT NULL,   -- ممتاز / جيد جداً / جيد / مقبول / ضعيف
    name_en VARCHAR(50) NULL,
    color_hex VARCHAR(7) NULL,       -- للعرض في الواجهة مثل #28a745
    sort_order TINYINT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE KEY uk_grade_desc (academic_year_id, grade_level_id, min_percentage)
);
```

#### 1.2 إضافة وزن الاختبار النهائي في سياسة الدرجات
```sql
ALTER TABLE grading_policies ADD COLUMN 
    max_semester_work_score DECIMAL(5,2) DEFAULT 60.00 
    COMMENT 'الدرجة العظمى لأعمال الفصل (المحصلات الشهرية)';

ALTER TABLE grading_policies ADD COLUMN 
    max_final_exam_score DECIMAL(5,2) DEFAULT 40.00 
    COMMENT 'الدرجة العظمى للاختبار النهائي';

ALTER TABLE grading_policies ADD COLUMN 
    target_semester_total DECIMAL(5,2) DEFAULT 100.00 
    COMMENT 'المجموع المستهدف للفصل (عادةً 100)';

-- ملاحظة: max_semester_work_score + max_final_exam_score يجب = target_semester_total
```

#### 1.3 إضافة trigger تحقق من أوزان السياسة
```sql
-- Trigger بعد INSERT/UPDATE على grading_policies
-- يتحقق: SUM(max_*) = target_monthly_total
-- يتحقق: max_semester_work_score + max_final_exam_score = target_semester_total
```

#### 1.4 إضافة حالات الواجب التفصيلية
```sql
CREATE TABLE lookup_homework_statuses (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name_ar VARCHAR(30) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_completed_flag BOOLEAN DEFAULT FALSE COMMENT 'هل تُحتسب كمنفذ؟',
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO lookup_homework_statuses VALUES
(1, 'لم ينفذ', 'NOT_DONE', FALSE),
(2, 'نفّذ', 'DONE', TRUE),
(3, 'صُحِّح', 'CORRECTED', TRUE),
(4, 'توبع', 'FOLLOWED_UP', TRUE);

ALTER TABLE student_homeworks 
    ADD COLUMN status_id TINYINT UNSIGNED DEFAULT 1,
    ADD FOREIGN KEY (status_id) REFERENCES lookup_homework_statuses(id);
```

#### 1.5 إضافة Auto-Populate لدرجات الاختبارات
```sql
-- Stored Procedure
CREATE PROCEDURE sp_populate_student_exam_scores(IN p_exam_timetable_id INT)
BEGIN
    DECLARE v_classroom_id INT;
    DECLARE v_grade_level_id INT;
    
    SELECT et.classroom_id, et.grade_level_id 
    INTO v_classroom_id, v_grade_level_id
    FROM exam_timetable et WHERE et.id = p_exam_timetable_id;
    
    INSERT IGNORE INTO student_exam_scores (exam_timetable_id, enrollment_id, score, is_present)
    SELECT p_exam_timetable_id, se.id, 0, TRUE
    FROM student_enrollments se
    JOIN classrooms c ON se.classroom_id = c.id
    WHERE (v_classroom_id IS NOT NULL AND se.classroom_id = v_classroom_id)
       OR (v_classroom_id IS NULL AND c.grade_level_id = v_grade_level_id)
       AND se.is_active = TRUE;
END;

-- Trigger
CREATE TRIGGER trg_exam_auto_populate
AFTER INSERT ON exam_timetable
FOR EACH ROW
BEGIN
    CALL sp_populate_student_exam_scores(NEW.id);
END;
```

---

### المرحلة 2 — تحسينات في منطق الحساب

#### 2.1 إصلاح sp_calculate_semester_totals
يجب أن يأخذ بعين الاعتبار:
- وزن أعمال الفصل (`max_semester_work_score`) من السياسة.
- تطبيع المجموع الشهري بحسب هذا الوزن.
- الصيغة: `semester_work_total = (sum_of_monthly_totals / max_possible_monthly_total) * max_semester_work_score`

#### 2.2 إصلاح sp_fill_final_exam_score
- `final_exam_score = (raw_score / raw_max) * max_final_exam_score`
- حيث `max_final_exam_score` تُقرأ من `grading_policies` للفصل المعني.

#### 2.3 إضافة خيار الحساب التلقائي للمحصلة (Scheduled vs Trigger)
خيار في إعدادات المدرسة:
- `AUTO_CALC_MODE = 'SCHEDULED'` → إجراء يُشغّل في نهاية كل شهر.
- `AUTO_CALC_MODE = 'ON_CHANGE'` → trigger على student_attendance و student_homeworks.

---

### المرحلة 3 — إعدادات قابلة للتخصيص من الواجهة (بدون مبرمج)

هذه الجداول يجب أن تكون قابلة للإدارة 100% من لوحة الإدارة:

| الجدول | ما يمكن تعديله من الواجهة |
|---|---|
| `lookup_grade_descriptors` | إضافة/تعديل/حذف أوصاف التقديرات، تغيير النطاقات والألوان |
| `lookup_annual_statuses` | إضافة حالات نتيجة جديدة |
| `lookup_promotion_decisions` | إضافة قرارات ترفيع جديدة |
| `grading_outcome_rules` | تعديل حد الرسوب للنقل/الإعادة لكل صف وعام |
| `grading_policies` | تعريف الأوزان لكل مادة/صف/عام |
| `grading_policy_custom_components` | إضافة مكونات مخصصة (سلوك، مشروع، شفوي...) |
| `lookup_homework_statuses` | إضافة حالات واجب جديدة |
| `teacher_assignments` | تكليف المعلمين |

---

### المرحلة 4 — التحقق والتكامل مع باقي الأنظمة

#### تكامل System 04 (الحضور) ↔ System 05
- **حالياً:** View تعرض حساب الحضور، لكن يجب الاستدعاء اليدوي.
- **مطلوب:** إما trigger أو Job يُحدّث `monthly_grades.attendance_score` تلقائياً.

#### تكامل System 08 (لجان الاختبارات) ↔ System 05
- **حالياً:** `exam_timetable` في System 08 هي المصدر.
- **مطلوب:** عند تعيين طالب للجنة في System 08 → يُنشئ سجل `student_exam_scores` تلقائياً.

#### تكامل System 11 (جدول الحصص) ↔ System 05
- تكليف المعلم في `teacher_assignments` يجب أن يُزوّد من جدول الحصص تلقائياً.

---

## 📐 الجزء الخامس: مخطط تدفق البيانات الكامل

```
[Admin] سياسات الدرجات
grading_policies (أوزان كل مكون + وزن نهائي الفصل)
grading_policy_custom_components (مكونات مخصصة)
grading_outcome_rules (قرارات النقل لكل صف)
        ↓
[Admin/Teacher] تكليف المعلمين
teacher_assignments
        ↓
[System 02] تعريف الفترات
exam_periods (شهرية/نهائية)
exam_timetable (جدول الاختبارات مع التواريخ) [System 08]
        ↓
[Auto Trigger] إنشاء السجلات التلقائي
student_exam_scores ← trg_exam_auto_populate (جديد)
student_homeworks ← trg_homework_auto_populate (موجود)
        ↓
[Teacher] إدخال يدوي أو تلقائي
student_exam_scores.score (يدوي)
student_homeworks.status_id (يدوي)
student_attendance (System 04)
monthly_custom_component_scores (يدوي/تلقائي)
monthly_grades.activity_score (يدوي فقط)
        ↓
[Auto Procedure] حساب المحصلة الشهرية
sp_calculate_monthly_grades(month, subject, classroom)
→ monthly_grades (attendance + homework + exam + custom + activity)
        ↓
[Auto Procedure] حساب النتيجة الفصلية
sp_calculate_semester_totals(semester, subject, classroom)
→ semester_grades.semester_work_total

sp_fill_final_exam_score(semester, classroom)
→ semester_grades.final_exam_score
semester_grades.semester_total = work_total + final_exam_score
        ↓
[Auto Procedure] النتيجة السنوية + قرار النقل
sp_calculate_annual_results(year, classroom)
→ annual_grades (semester1 + semester2 + percentage + status)
→ annual_result (total + percentage + rank_class + rank_grade + promotion_decision)
        ↓
[Reports] التقارير والكشوفات
v_exam_results_summary, v_sgas_class_ranking, etc.
lookup_grade_descriptors → وصف التقدير (ممتاز/جيد..)
```

---

## ✅ الجزء السادس: ملخص جدول التعديلات المطلوبة

| الأولوية | التعديل | النوع | الملف |
|---|---|---|---|
| 🔴 عاجل | إضافة `lookup_grade_descriptors` | جدول جديد | DDL_POLICIES.sql |
| 🔴 عاجل | إضافة `max_semester_work_score` + `max_final_exam_score` في `grading_policies` | ALTER TABLE | DDL_POLICIES.sql |
| 🔴 عاجل | إضافة `lookup_homework_statuses` + تعديل `student_homeworks.status_id` | جدول جديد + ALTER | DDL_HOMEWORKS.sql |
| 🔴 عاجل | `sp_populate_student_exam_scores` + Trigger | Procedure + Trigger | DDL_EXAMS.sql |
| 🟡 مهم | إصلاح `sp_calculate_semester_totals` ليحترم الأوزان | تعديل إجراء | DDL_RESULTS.sql |
| 🟡 مهم | إصلاح `sp_fill_final_exam_score` ليستخدم `max_final_exam_score` | تعديل إجراء | DDL_RESULTS.sql |
| 🟡 مهم | Trigger التحقق من مجموع الأوزان في السياسة | Trigger جديد | DDL_POLICIES.sql |
| 🟡 مهم | إضافة Job/Trigger تلقائي لحساب attendance_score | Procedure/Trigger | DDL_MONTHLY.sql |
| 🟢 تحسين | `lookup_annual_statuses` قابل للإضافة من الواجهة | تعديل بيانات | DDL_RESULTS.sql |
| 🟢 تحسين | `target_monthly_total` في `grading_policies` | ALTER TABLE | DDL_POLICIES.sql |

---

## 🗂️ الجزء السابع: ترتيب التنفيذ الموصى به

```
الخطوة 1: تعديل DDL_POLICIES.sql
  - إضافة lookup_grade_descriptors
  - إضافة max_semester_work_score, max_final_exam_score, target_monthly_total, target_semester_total
  - إضافة trigger تحقق الأوزان

الخطوة 2: تعديل DDL_HOMEWORKS.sql
  - إضافة lookup_homework_statuses
  - تعديل student_homeworks (status_id بدلاً من is_completed وحده)
  - تحديث trg_student_homework_validate_insert/update

الخطوة 3: تعديل DDL_EXAMS.sql
  - إضافة sp_populate_student_exam_scores
  - إضافة trg_exam_auto_populate

الخطوة 4: تعديل DDL_MONTHLY.sql
  - إضافة sp_auto_refresh_attendance_score (يُستدعى عند تغيير الحضور)
  - إضافة trigger/stored procedure للتحديث التلقائي

الخطوة 5: تعديل DDL_RESULTS.sql
  - إصلاح sp_calculate_semester_totals (احترام max_semester_work_score)
  - إصلاح sp_fill_final_exam_score (احترام max_final_exam_score)
  - تحديث sp_calculate_annual_results (استخدام lookup_grade_descriptors)

الخطوة 6: تحديث DEMO_DATA.sql
  - بيانات تجريبية للجداول الجديدة

الخطوة 7: تحديث README والتوثيق
```

---

## 📌 ملاحظات مهمة للتنفيذ

> [!IMPORTANT]
> قبل تطبيق أي تعديل، يجب عمل نسخة احتياطية كاملة من قاعدة البيانات الحالية. بعض التعديلات `ALTER TABLE` ستؤثر على الجداول الموجودة.

> [!WARNING]
> `is_completed` في `student_homeworks` يجب الإبقاء عليه كـ computed column يُعيد `TRUE` إذا `status_id IN (DONE, CORRECTED, FOLLOWED_UP)` للحفاظ على التوافق مع الكود الحالي.

> [!NOTE]
> التعديلات لا تكسر البنية الموجودة — كلها إضافية (ADD COLUMN, ADD TABLE, ADD TRIGGER). الإجراءات الموجودة ستُعدّل لتستفيد من الحقول الجديدة فقط.

---

*تاريخ التقرير: 2026-03-22*
*المرحلة: تخطيط — يجب الموافقة قبل التطبيق*
