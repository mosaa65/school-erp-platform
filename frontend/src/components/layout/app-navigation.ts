import {
  AlertTriangle,
  BookOpenText,
  BookText,
  Building,
  Cable,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Clock3,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  Gauge,
  GraduationCap,
  IdCard,
  KeyRound,
  LayoutGrid,
  Layers3,
  Medal,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiredPermission?: string;
};

export type AppNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AppNavItem[];
};

export const APP_NAV_GROUPS: AppNavGroup[] = [
  {
    id: "overview",
    label: "عام",
    icon: Gauge,
    items: [
      {
        href: "/app",
        label: "لوحة التحكم",
        icon: Gauge,
      },
    ],
  },
  {
    id: "system-01-shared",
    label: "النظام 01 - البنية المشتركة",
    icon: ShieldCheck,
    items: [
      {
        href: "/app/users",
        label: "المستخدمون",
        icon: Users,
        requiredPermission: "users.read",
      },
      {
        href: "/app/roles",
        label: "الأدوار",
        icon: ShieldCheck,
        requiredPermission: "roles.read",
      },
      {
        href: "/app/permissions",
        label: "الصلاحيات",
        icon: KeyRound,
        requiredPermission: "permissions.read",
      },
      {
        href: "/app/audit-logs",
        label: "سجل التدقيق",
        icon: ScrollText,
        requiredPermission: "audit-logs.read",
      },
      {
        href: "/app/global-settings",
        label: "الإعدادات العامة",
        icon: Settings2,
        requiredPermission: "global-settings.read",
      },
      {
        href: "/app/system-settings",
        label: "إعدادات النظام",
        icon: Settings2,
        requiredPermission: "system-settings.read",
      },
      {
        href: "/app/reminders-ticker",
        label: "شريط التنبيهات",
        icon: ScrollText,
        requiredPermission: "reminders-ticker.read",
      },
      {
        href: "/app/user-permissions",
        label: "صلاحيات مباشرة",
        icon: KeyRound,
        requiredPermission: "user-permissions.read",
      },
      {
        href: "/app/school-profiles",
        label: "ملف المدرسة",
        icon: Building,
        requiredPermission: "school-profiles.read",
      },
      {
        href: "/app/lookup-ownership-types",
        label: "أنواع الملكية",
        icon: Building,
        requiredPermission: "lookup-ownership-types.read",
      },
      {
        href: "/app/lookup-id-types",
        label: "أنواع الهوية",
        icon: IdCard,
        requiredPermission: "lookup-id-types.read",
      },
      {
        href: "/app/lookup-blood-types",
        label: "فصائل الدم",
        icon: Droplets,
        requiredPermission: "lookup-blood-types.read",
      },
      {
        href: "/app/lookup-periods",
        label: "فترات الدوام",
        icon: Clock3,
        requiredPermission: "lookup-periods.read",
      },
      {
        href: "/app/lookup-catalog",
        label: "قاموس المرجعيات",
        icon: Layers3,
        requiredPermission: "lookup-catalog.read",
      },
    ],
  },
  {
    id: "system-02-academic-core",
    label: "النظام 02 - النواة الأكاديمية",
    icon: CalendarDays,
    items: [
      {
        href: "/app/academic-years",
        label: "السنوات الأكاديمية",
        icon: CalendarDays,
        requiredPermission: "academic-years.read",
      },
      {
        href: "/app/academic-terms",
        label: "الفصول الأكاديمية",
        icon: CalendarRange,
        requiredPermission: "academic-terms.read",
      },
      {
        href: "/app/academic-months",
        label: "الأشهر الأكاديمية",
        icon: CalendarClock,
        requiredPermission: "academic-months.read",
      },
      {
        href: "/app/grade-levels",
        label: "المراحل/الصفوف",
        icon: Layers3,
        requiredPermission: "grade-levels.read",
      },
      {
        href: "/app/subjects",
        label: "المواد الدراسية",
        icon: BookOpenText,
        requiredPermission: "subjects.read",
      },
      {
        href: "/app/sections",
        label: "الشعب الدراسية",
        icon: LayoutGrid,
        requiredPermission: "sections.read",
      },
      {
        href: "/app/grade-level-subjects",
        label: "ربط الصفوف بالمواد",
        icon: Cable,
        requiredPermission: "grade-level-subjects.read",
      },
      {
        href: "/app/term-subject-offerings",
        label: "عروض المواد للفصول",
        icon: Cable,
        requiredPermission: "term-subject-offerings.read",
      },
      {
        href: "/app/timetable-entries",
        label: "الجدول الدراسي",
        icon: CalendarClock,
        requiredPermission: "timetable-entries.read",
      },
    ],
  },
  {
    id: "system-03-hr",
    label: "النظام 03 - الموارد البشرية",
    icon: Users,
    items: [
      {
        href: "/app/employees",
        label: "الموظفون",
        icon: Users,
        requiredPermission: "employees.read",
      },
      {
        href: "/app/employee-teaching-assignments",
        label: "إسناد التدريس",
        icon: Cable,
        requiredPermission: "employee-teaching-assignments.read",
      },
      {
        href: "/app/employee-attendance",
        label: "حضور الموظفين",
        icon: ClipboardCheck,
        requiredPermission: "employee-attendance.read",
      },
      {
        href: "/app/employee-tasks",
        label: "مهام الموظفين",
        icon: ClipboardList,
        requiredPermission: "employee-tasks.read",
      },
      {
        href: "/app/employee-courses",
        label: "دورات الموظفين",
        icon: BookText,
        requiredPermission: "employee-courses.read",
      },
      {
        href: "/app/talents",
        label: "قاموس المواهب",
        icon: Sparkles,
        requiredPermission: "talents.read",
      },
      {
        href: "/app/employee-talents",
        label: "مواهب الموظفين",
        icon: Sparkles,
        requiredPermission: "employee-talents.read",
      },
      {
        href: "/app/employee-performance-evaluations",
        label: "تقييمات الأداء",
        icon: Medal,
        requiredPermission: "employee-performance-evaluations.read",
      },
      {
        href: "/app/employee-violations",
        label: "مخالفات الموظفين",
        icon: AlertTriangle,
        requiredPermission: "employee-violations.read",
      },
      {
        href: "/app/hr-reports",
        label: "تقارير الموارد البشرية",
        icon: ScrollText,
        requiredPermission: "hr-reports.read",
      },
    ],
  },
  {
    id: "system-04-students",
    label: "النظام 04 - الطلاب",
    icon: GraduationCap,
    items: [
      {
        href: "/app/students",
        label: "الطلاب",
        icon: GraduationCap,
        requiredPermission: "students.read",
      },
      {
        href: "/app/guardians",
        label: "أولياء الأمور",
        icon: Users,
        requiredPermission: "guardians.read",
      },
      {
        href: "/app/student-guardians",
        label: "ربط الطالب وولي الأمر",
        icon: Cable,
        requiredPermission: "student-guardians.read",
      },
      {
        href: "/app/student-enrollments",
        label: "قيود الطلاب",
        icon: ClipboardList,
        requiredPermission: "student-enrollments.read",
      },
      {
        href: "/app/student-attendance",
        label: "حضور الطلاب",
        icon: ClipboardCheck,
        requiredPermission: "student-attendance.read",
      },
      {
        href: "/app/student-books",
        label: "كتب الطلاب",
        icon: BookText,
        requiredPermission: "student-books.read",
      },
    ],
  },
  {
    id: "system-05-teaching-grades",
    label: "النظام 05 - التعليم والدرجات",
    icon: Medal,
    items: [
      {
        href: "/app/homework-types",
        label: "أنواع الواجبات",
        icon: BookOpenText,
        requiredPermission: "homework-types.read",
      },
      {
        href: "/app/homeworks",
        label: "الواجبات",
        icon: ClipboardList,
        requiredPermission: "homeworks.read",
      },
      {
        href: "/app/student-homeworks",
        label: "واجبات الطلاب",
        icon: ClipboardCheck,
        requiredPermission: "student-homeworks.read",
      },
      {
        href: "/app/exam-periods",
        label: "الفترات الاختبارية",
        icon: CalendarClock,
        requiredPermission: "exam-periods.read",
      },
      {
        href: "/app/exam-assessments",
        label: "الاختبارات",
        icon: ClipboardList,
        requiredPermission: "exam-assessments.read",
      },
      {
        href: "/app/student-exam-scores",
        label: "درجات الاختبارات",
        icon: ClipboardCheck,
        requiredPermission: "student-exam-scores.read",
      },
      {
        href: "/app/monthly-grades",
        label: "الدرجات الشهرية",
        icon: Medal,
        requiredPermission: "monthly-grades.read",
      },
      {
        href: "/app/monthly-custom-component-scores",
        label: "مكونات الدرجات الشهرية",
        icon: Medal,
        requiredPermission: "monthly-custom-component-scores.read",
      },
      {
        href: "/app/grading-policies",
        label: "سياسات الدرجات",
        icon: Medal,
        requiredPermission: "grading-policies.read",
      },
      {
        href: "/app/semester-grades",
        label: "الدرجات الفصلية",
        icon: Medal,
        requiredPermission: "semester-grades.read",
      },
      {
        href: "/app/annual-statuses",
        label: "الحالات السنوية",
        icon: Medal,
        requiredPermission: "annual-statuses.read",
      },
      {
        href: "/app/promotion-decisions",
        label: "قرارات الترفيع",
        icon: Medal,
        requiredPermission: "promotion-decisions.read",
      },
      {
        href: "/app/grading-outcome-rules",
        label: "قواعد النتائج",
        icon: Medal,
        requiredPermission: "grading-outcome-rules.read",
      },
      {
        href: "/app/annual-grades",
        label: "الدرجات السنوية",
        icon: Medal,
        requiredPermission: "annual-grades.read",
      },
      {
        href: "/app/annual-results",
        label: "النتائج السنوية",
        icon: Medal,
        requiredPermission: "annual-results.read",
      },
      {
        href: "/app/grading-reports",
        label: "تقارير الدرجات",
        icon: ScrollText,
        requiredPermission: "grading-reports.read",
      },
    ],
  },
];

export const APP_NAV_ITEMS: AppNavItem[] = APP_NAV_GROUPS.flatMap((group) => group.items);


