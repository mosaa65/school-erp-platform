import type {
  AssessmentType,
  EmployeeAttendanceStatus,
  EmployeeGender,
  EmployeeSystemAccessStatus,
  EmploymentType,
  ExamAbsenceType,
  GuardianRelationship,
  GradingWorkflowStatus,
  PerformanceRatingLevel,
  ParentNotificationSendMethod,
  ParentNotificationType,
  StudentAttendanceStatus,
  StudentBookStatus,
  StudentEnrollmentStatus,
  StudentGender,
  StudentHealthStatus,
  StudentOrphanStatus,
  StudentSiblingRelationship,
  TimetableDay,
  TieBreakStrategy,
  ViolationSeverity,
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

type AttendanceStatus = EmployeeAttendanceStatus | StudentAttendanceStatus;

const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "حاضر",
  ABSENT: "غائب",
  LATE: "متأخر",
  EXCUSED_ABSENCE: "غياب بعذر",
  EARLY_LEAVE: "انصراف مبكر",
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

const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  MONTHLY: "شهري",
  MIDTERM: "منتصف الفصل",
  FINAL: "نهائي",
  QUIZ: "اختبار قصير",
  ORAL: "شفهي",
  PRACTICAL: "عملي",
  PROJECT: "مشروع",
};

const EXAM_ABSENCE_TYPE_LABELS: Record<ExamAbsenceType, string> = {
  EXCUSED: "بعذر",
  UNEXCUSED: "بدون عذر",
};

const TIE_BREAK_STRATEGY_LABELS: Record<TieBreakStrategy, string> = {
  PERCENTAGE_ONLY: "بالنسبة المئوية فقط",
  PERCENTAGE_THEN_TOTAL: "بالنسبة ثم المجموع",
  PERCENTAGE_THEN_NAME: "بالنسبة ثم الاسم",
};

const GUARDIAN_RELATIONSHIP_LABELS: Record<GuardianRelationship, string> = {
  FATHER: "الأب",
  MOTHER: "الأم",
  BROTHER: "الأخ",
  SISTER: "الأخت",
  UNCLE: "العم/الخال",
  AUNT: "العمة/الخالة",
  GRANDFATHER: "الجد",
  GRANDMOTHER: "الجدة",
  OTHER: "أخرى",
};

const VIOLATION_SEVERITY_LABELS: Record<ViolationSeverity, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  CRITICAL: "حرجة",
};

const PERFORMANCE_RATING_LEVEL_LABELS: Record<PerformanceRatingLevel, string> = {
  EXCELLENT: "ممتاز",
  VERY_GOOD: "جيد جدًا",
  GOOD: "جيد",
  ACCEPTABLE: "مقبول",
  POOR: "ضعيف",
};

const STUDENT_BOOK_STATUS_LABELS: Record<StudentBookStatus, string> = {
  ISSUED: "مسلّم",
  RETURNED: "مُعاد",
  LOST: "مفقود",
  DAMAGED: "تالف",
};

const STUDENT_SIBLING_RELATIONSHIP_LABELS: Record<StudentSiblingRelationship, string> = {
  BROTHER: "أخ",
  SISTER: "أخت",
};

const PARENT_NOTIFICATION_TYPE_LABELS: Record<ParentNotificationType, string> = {
  POSITIVE: "إيجابي",
  NEGATIVE: "سلبي",
};

const PARENT_NOTIFICATION_SEND_METHOD_LABELS: Record<ParentNotificationSendMethod, string> = {
  PAPER: "ورقي",
  WHATSAPP: "واتس",
  PHONE: "هاتف",
  OTHER: "أخرى",
};

const TIMETABLE_DAY_LABELS: Record<TimetableDay, string> = {
  MONDAY: "الاثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
  SUNDAY: "الأحد",
};

const ROLE_CODE_LABELS: Record<string, string> = {
  super_admin: "مدير النظام",
};

export const PERMISSION_RESOURCE_LABELS: Record<string, string> = {
  users: "المستخدمون",
  roles: "الأدوار",
  permissions: "الصلاحيات",
  "audit-logs": "سجل التدقيق",
  sessions: "الجلسات النشطة",
  "file-attachments": "المرفقات",
  "global-settings": "الإعدادات العامة",
  "system-settings": "إعدادات النظام",
  "reminders-ticker": "شريط التنبيهات",
  "user-notifications": "إشعاراتي",
  "user-permissions": "الصلاحيات المباشرة",
  "school-profiles": "ملف المدرسة",
  "calendar-master": "التقويم الرئيسي",
  "calendar-settings": "إعدادات التقويم",
  "calendar-adjustments-log": "سجل تعديلات التقويم",
  "lookup-blood-types": "فصائل الدم",
  "lookup-id-types": "أنواع الهوية",
  "lookup-enrollment-statuses": "حالات القيد",
  "lookup-orphan-statuses": "حالات اليتم",
  "lookup-ability-levels": "مستويات القدرة",
  "lookup-activity-types": "أنواع الأنشطة",
  "lookup-ownership-types": "أنواع الملكية",
  "lookup-periods": "فترات الدوام",
  "lookup-catalog": "قاموس المرجعيات",
  "lookup-grade-descriptions": "أوصاف التقديرات",
  "lookup-school-types": "أنواع المدارس",
  "lookup-genders": "تصنيفات الجنس",
  "lookup-qualifications": "المؤهلات",
  "lookup-job-roles": "المسميات الوظيفية",
  "lookup-days": "أيام الأسبوع",
  "lookup-attendance-statuses": "حالات الحضور",
  "lookup-marital-statuses": "الحالات الاجتماعية",
  "lookup-health-statuses": "الحالات الصحية",
  "lookup-relationship-types": "أنواع القرابة",
  "lookup-talents": "أنواع المواهب",
  "lookup-hijri-months": "الأشهر الهجرية",
  "lookup-weeks": "الأسابيع",
  "lookup-buildings": "المباني والمنشآت",
  governorates: "المحافظات",
  directorates: "المديريات",
  "sub-districts": "العزل",
  villages: "القرى",
  localities: "المحلات",
  "academic-years": "السنوات الأكاديمية",
  "academic-terms": "الفصول الأكاديمية",
  "academic-months": "الأشهر الأكاديمية",
  "grade-levels": "المراحل/الصفوف",
  sections: "الشعب",
  classrooms: "القاعات الدراسية",
  subjects: "المواد",
  "grade-level-subjects": "ربط الصفوف بالمواد",
  "term-subject-offerings": "خطة المواد للفصل",
  "timetable-entries": "الجدول الدراسي",
  students: "الطلاب",
  guardians: "أولياء الأمور",
  "student-guardians": "ربط الطالب وولي الأمر",
  "student-enrollments": "قيود الطلاب",
  "student-attendance": "حضور الطلاب",
  "student-books": "كتب الطلاب",
  "student-talents": "مواهب الطلاب",
  "student-siblings": "الإخوة في المدرسة",
  "student-problems": "مشكلات الطلاب",
  "health-visits": "الزيارات الصحية",
  "parent-notifications": "إشعارات أولياء الأمور",
  employees: "الموظفون",
  talents: "قاموس المواهب",
  "employee-talents": "مواهب الموظفين",
  "employee-contracts": "عقود الموظفين",
  "employee-departments": "أقسام الموظفين",
  "employee-documents": "مستندات الموظفين",
  "employee-leave-balances": "أرصدة الإجازات",
  "employee-leaves": "طلبات الإجازات",
  "employee-lifecycle-checklists": "التهيئة وإنهاء الخدمة",
  "employee-courses": "دورات الموظفين",
  "employee-violations": "مخالفات الموظفين",
  "employee-tasks": "مهام الموظفين",
  "employee-teaching-assignments": "إسناد التدريس",
  "employee-section-supervisions": "نطاقات الإشراف",
  "employee-attendance": "حضور الموظفين",
  "employee-performance-evaluations": "تقييمات الأداء",
  "hr-reports": "تقارير الموارد البشرية",
  "grading-policies": "سياسات الدرجات",
  "grading-policy-components": "مكونات سياسات الدرجات",
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

export const PERMISSION_ACTION_LABELS: Record<string, string> = {
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
  manage: "إدارة كاملة",
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

export function translateAttendanceStatus(value: AttendanceStatus): string {
  return ATTENDANCE_STATUS_LABELS[value] ?? value;
}

export function translateStudentEnrollmentStatus(value: StudentEnrollmentStatus): string {
  return STUDENT_ENROLLMENT_STATUS_LABELS[value] ?? value;
}

export function translateGradingWorkflowStatus(value: GradingWorkflowStatus): string {
  return GRADING_WORKFLOW_STATUS_LABELS[value] ?? value;
}

export function translateAssessmentType(value: AssessmentType): string {
  return ASSESSMENT_TYPE_LABELS[value] ?? value;
}

export function translateExamAbsenceType(value: ExamAbsenceType): string {
  return EXAM_ABSENCE_TYPE_LABELS[value] ?? value;
}

export function translateTieBreakStrategy(value: TieBreakStrategy): string {
  return TIE_BREAK_STRATEGY_LABELS[value] ?? value;
}

export function translateGuardianRelationship(value: GuardianRelationship): string {
  return GUARDIAN_RELATIONSHIP_LABELS[value] ?? value;
}

export function translateViolationSeverity(value: ViolationSeverity): string {
  return VIOLATION_SEVERITY_LABELS[value] ?? value;
}

export function translatePerformanceRatingLevel(value: PerformanceRatingLevel): string {
  return PERFORMANCE_RATING_LEVEL_LABELS[value] ?? value;
}

export function translateStudentBookStatus(value: StudentBookStatus): string {
  return STUDENT_BOOK_STATUS_LABELS[value] ?? value;
}

export function translateStudentSiblingRelationship(value: StudentSiblingRelationship): string {
  return STUDENT_SIBLING_RELATIONSHIP_LABELS[value] ?? value;
}

export function translateParentNotificationType(value: ParentNotificationType): string {
  return PARENT_NOTIFICATION_TYPE_LABELS[value] ?? value;
}

export function translateParentNotificationSendMethod(value: ParentNotificationSendMethod): string {
  return PARENT_NOTIFICATION_SEND_METHOD_LABELS[value] ?? value;
}

export function translateTimetableDay(value: TimetableDay): string {
  return TIMETABLE_DAY_LABELS[value] ?? value;
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
