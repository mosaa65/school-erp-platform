# نظام 05: مرجعية التنفيذ وخطة إغلاق الفجوات

تاريخ التحديث: 2026-03-07

## 1) قرار مرجعية التنفيذ

1. المرجع التنفيذي الرسمي هو:
   - `backend/prisma/schema.prisma`
   - `backend/prisma/migrations/*`
   - `backend/src/modules/*`
   - `frontend/src/features/*`
2. ملفات `systems/05_التعليم_والدرجات/*.sql` تُعامل كمرجع تحليلي/تصميمي، وليست مصدر تنفيذ مباشر على قاعدة الإنتاج.

## 2) ما تم إغلاقه في هذه الدفعة

1. إضافة Lookup رسمي لأوصاف التقديرات:
   - جدول: `lookup_grade_descriptions`
   - API: `lookup/grade-descriptions`
   - صلاحيات RBAC:
   - `lookup-grade-descriptions.create`
   - `lookup-grade-descriptions.read`
   - `lookup-grade-descriptions.update`
   - `lookup-grade-descriptions.delete`
2. إضافة بذور Core لأوصاف التقديرات (10 مستويات عربية/إنجليزية + ألوان).

## 3) الفجوات المتبقية (System 05)

1. Subsystem 06 (تحضير الدروس): غير منفذ Backend/Frontend.
2. Subsystem 08 (تقارير SQL التفصيلية): المنفذ حاليًا `summary` فقط.
3. Subsystem 09 (النسخ السنوي): إجراءات النسخ غير مكشوفة كخدمة API تشغيلية.
4. Subsystem 11 (دفتر المتابعة الذكي): غير منفذ Backend/Frontend.

## 4) ترتيب التنفيذ التالي (مقترح)

1. إكمال Subsystem 08:
   - API لتشغيل تحويل النسبة إلى تقدير من `lookup_grade_descriptions`.
   - API تقارير شهرية تفصيلية للطالب/المادة.
2. Subsystem 06:
   - نموذج `lesson_preparation` + RBAC + واجهة عربية.
3. Subsystem 09:
   - خدمة نسخ إعدادات سنة دراسية (Policies/ExamPeriods/OutcomeRules) عبر API آمن ومدقق.
