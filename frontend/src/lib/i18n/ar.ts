import type {
  EmployeeGender,
  EmployeeSystemAccessStatus,
  EmploymentType,
  GradingWorkflowStatus,
  StudentEnrollmentStatus,
  StudentGender,
  StudentHealthStatus,
  StudentOrphanStatus,
  TieBreakStrategy,
} from "@/lib/api/client";

const STUDENT_GENDER_LABELS: Record<StudentGender, string> = {
  MALE: "ذكر",
  FEMALE: "أنثى",
  OTHER: "آخر",
};

const EMPLOYEE_GENDER_LABELS: Record<EmployeeGender, string> = {
  MALE: "ذكر",
  FEMALE: "أنثى",
  OTHER: "آخر",
};

const STUDENT_HEALTH_STATUS_LABELS: Record<StudentHealthStatus, string> = {
  HEALTHY: "سليم",
  CHRONIC_DISEASE: "مرض مزمن",
  SPECIAL_NEEDS: "احتياجات خاصة",
  DISABILITY: "إعاقة",
  OTHER: "أخرى",
};

const STUDENT_ORPHAN_STATUS_LABELS: Record<StudentOrphanStatus, string> = {
  NONE: "غير يتيم",
  FATHER_DECEASED: "يتيم الأب",
  MOTHER_DECEASED: "يتيم الأم",
  BOTH_DECEASED: "يتيم الأبوين",
};

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  PERMANENT: "دائم",
  CONTRACT: "متعاقد",
  VOLUNTEER: "متطوع",
};

const EMPLOYEE_SYSTEM_ACCESS_STATUS_LABELS: Record<EmployeeSystemAccessStatus, string> = {
  GRANTED: "ممنوح",
  SUSPENDED: "موقوف",
};

const STUDENT_ENROLLMENT_STATUS_LABELS: Record<StudentEnrollmentStatus, string> = {
  NEW: "مستجد",
  TRANSFERRED: "منقول",
  ACTIVE: "نشط",
  PROMOTED: "مرفّع",
  REPEATED: "معيد",
  WITHDRAWN: "منسحب",
  GRADUATED: "متخرج",
  SUSPENDED: "موقوف",
};

const GRADING_WORKFLOW_STATUS_LABELS: Record<GradingWorkflowStatus, string> = {
  DRAFT: "مسودة",
  IN_REVIEW: "قيد المراجعة",
  APPROVED: "معتمد",
  ARCHIVED: "مؤرشف",
};

const TIE_BREAK_STRATEGY_LABELS: Record<TieBreakStrategy, string> = {
  PERCENTAGE_ONLY: "بالنسبة المئوية فقط",
  PERCENTAGE_THEN_TOTAL: "بالنسبة ثم المجموع",
  PERCENTAGE_THEN_NAME: "بالنسبة ثم الاسم",
};

const ROLE_CODE_LABELS: Record<string, string> = {
  super_admin: "مدير النظام",
};

const PERMISSION_RESOURCE_LABELS: Record<string, string> = {
  users: "المستخدمون",
  roles: "الأدوار",
  permissions: "الصلاحيات",
  "audit-logs": "سجل التدقيق",
  "global-settings": "الإعدادات العامة",
  "system-settings": "إعدادات النظام",
  "reminders-ticker": "شريط التنبيهات",
  "user-permissions": "الصلاحيات المباشرة",
  "school-profiles": "ملف المدرسة",
  "lookup-blood-types": "فصائل الدم",
  "lookup-id-types": "أنواع الهوية",
  "lookup-ownership-types": "أنواع الملكية",
  "lookup-periods": "فترات الدوام",
  "lookup-catalog": "قاموس المرجعيات",
  "academic-years": "السنوات الأكاديمية",
  "academic-terms": "الفصول الأكاديمية",
  "academic-months": "الأشهر الأكاديمية",
  "grade-levels": "المراحل/الصفوف",
  sections: "الشعب",
  subjects: "المواد",
  "grade-level-subjects": "ربط الصفوف بالمواد",
  "term-subject-offerings": "عروض المواد",
  "timetable-entries": "الجدول الدراسي",
  students: "الطلاب",
  guardians: "أولياء الأمور",
  "student-guardians": "ربط الطالب وولي الأمر",
  "student-enrollments": "قيود الطلاب",
  "student-attendance": "حضور الطلاب",
  "student-books": "كتب الطلاب",
  employees: "الموظفون",
  talents: "قاموس المواهب",
  "employee-talents": "مواهب الموظفين",
  "employee-courses": "دورات الموظفين",
  "employee-violations": "مخالفات الموظفين",
  "employee-tasks": "مهام الموظفين",
  "employee-teaching-assignments": "إسناد التدريس",
  "employee-attendance": "حضور الموظفين",
  "employee-performance-evaluations": "تقييمات الأداء",
  "hr-reports": "تقارير الموارد البشرية",
  "grading-policies": "سياسات الدرجات",
  "exam-periods": "الفترات الاختبارية",
  "exam-assessments": "الاختبارات",
  "student-exam-scores": "درجات الاختبارات",
  "homework-types": "أنواع الواجبات",
  homeworks: "الواجبات",
  "student-homeworks": "واجبات الطلاب",
  "monthly-grades": "الدرجات الشهرية",
  "monthly-custom-component-scores": "مكونات الدرجات الشهرية",
  "annual-statuses": "الحالات السنوية",
  "promotion-decisions": "قرارات الترفيع",
  "grading-outcome-rules": "قواعد النتائج",
  "semester-grades": "الدرجات الفصلية",
  "annual-grades": "الدرجات السنوية",
  "annual-results": "النتائج السنوية",
  "grading-reports": "تقارير الدرجات",
};

const PERMISSION_ACTION_LABELS: Record<string, string> = {
  create: "إضافة",
  read: "عرض",
  update: "تعديل",
  delete: "حذف",
  revoke: "سحب",
  lock: "قفل",
  unlock: "فتح القفل",
  calculate: "احتساب",
  "fill-final-exam": "تعبئة الاختبار النهائي",
  "assign-permissions": "تعيين الصلاحيات",
};

export function translateStudentGender(value: StudentGender): string {
  return STUDENT_GENDER_LABELS[value] ?? value;
}

export function translateEmployeeGender(value: EmployeeGender): string {
  return EMPLOYEE_GENDER_LABELS[value] ?? value;
}

export function translateStudentHealthStatus(value: StudentHealthStatus): string {
  return STUDENT_HEALTH_STATUS_LABELS[value] ?? value;
}

export function translateStudentOrphanStatus(value: StudentOrphanStatus): string {
  return STUDENT_ORPHAN_STATUS_LABELS[value] ?? value;
}

export function translateEmploymentType(value: EmploymentType): string {
  return EMPLOYMENT_TYPE_LABELS[value] ?? value;
}

export function translateEmployeeSystemAccessStatus(
  value: EmployeeSystemAccessStatus,
): string {
  return EMPLOYEE_SYSTEM_ACCESS_STATUS_LABELS[value] ?? value;
}

export function translateStudentEnrollmentStatus(value: StudentEnrollmentStatus): string {
  return STUDENT_ENROLLMENT_STATUS_LABELS[value] ?? value;
}

export function translateGradingWorkflowStatus(value: GradingWorkflowStatus): string {
  return GRADING_WORKFLOW_STATUS_LABELS[value] ?? value;
}

export function translateTieBreakStrategy(value: TieBreakStrategy): string {
  return TIE_BREAK_STRATEGY_LABELS[value] ?? value;
}

export function translateRoleCode(roleCode: string): string {
  return ROLE_CODE_LABELS[roleCode] ?? roleCode;
}

export function translatePermissionCode(permissionCode: string): string {
  const [resourceCode, actionCode] = permissionCode.split(".", 2);
  const resourceLabel = PERMISSION_RESOURCE_LABELS[resourceCode] ?? resourceCode;
  const actionLabel = actionCode ? PERMISSION_ACTION_LABELS[actionCode] ?? actionCode : "";

  return actionLabel ? `${resourceLabel} - ${actionLabel}` : resourceLabel;
}


