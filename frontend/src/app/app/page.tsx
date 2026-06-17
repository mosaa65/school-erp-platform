"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpLeft,
  BellRing,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Gauge,
  GraduationCap,
  HeartPulse,
  Layers3,
  Inbox,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAV_GROUPS, type AppNavGroup, type AppNavItem } from "@/components/layout/app-navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useHealthCheck } from "@/features/system-foundation/hooks/use-health-check";
import { useNavigationPreferences } from "@/hooks/use-navigation-preferences";
import { loadLastVisitedAppPath } from "@/navigation/navigation-preferences";
import { cn } from "@/lib/utils";

type DashboardAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  permissions?: string[];
  tone: string;
};

type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
};

const QUICK_ACTIONS: DashboardAction[] = [
  {
    title: "إدخال واجبات الطلاب",
    description: "بطاقات سريعة لكل طالب مع نفذ/لم ينفذ والدرجة.",
    href: "/app/student-homeworks",
    icon: ClipboardCheck,
    permission: "student-homeworks.read",
    tone: "border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    title: "استوديو الواجبات",
    description: "تصميم الواجب مع القالب والدرجة والتجهيز الذكي.",
    href: "/app/homework-studio",
    icon: Sparkles,
    permissions: ["homeworks.create", "homeworks.read"],
    tone: "border-violet-300/60 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    title: "التسليمات والتصحيح",
    description: "مراجعة السجلات، الدرجات، والملاحظات بسرعة.",
    href: "/app/homework-submissions",
    icon: Inbox,
    permissions: ["student-homeworks.read", "student-homeworks.bulk-update"],
    tone: "border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    title: "تقويم الواجبات",
    description: "رؤية الحمل والواجبات القادمة قبل أن تتكدس.",
    href: "/app/homework-calendar",
    icon: CalendarDays,
    permission: "homeworks.read",
    tone: "border-cyan-300/60 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  {
    title: "معايير التصحيح",
    description: "إنشاء معايير تصحيح ذكية مرتبطة بالمواد والصفوف.",
    href: "/app/homework-rubrics",
    icon: Medal,
    permission: "homework-rubrics.read",
    tone: "border-fuchsia-300/60 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  },
  {
    title: "قيود الطلاب",
    description: "الوصول إلى قيد الطالب والشعبة والصف بسرعة.",
    href: "/app/student-enrollments",
    icon: GraduationCap,
    permissions: ["student-enrollments.read.summary", "student-enrollments.read"],
    tone: "border-indigo-300/60 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  {
    title: "الفترة الشهرية",
    description: "متابعة المكونات والنتائج الشهرية من مكان واحد.",
    href: "/app/monthly-period-results",
    icon: CalendarClock,
    permission: "student-period-results.read",
    tone: "border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    title: "الفواتير والتحصيل",
    description: "متابعة فواتير الطلاب، الدفعات، والأقساط.",
    href: "/app/student-invoices",
    icon: Coins,
    permission: "student-invoices.read",
    tone: "border-teal-300/60 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  {
    title: "إشعاراتي",
    description: "تنبيهات المستخدم والمهام التي تحتاج انتباهك.",
    href: "/app/user-notifications",
    icon: BellRing,
    permission: "user-notifications.read",
    tone: "border-rose-300/60 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
];

const HIGHLIGHT_GROUP_IDS = [
  "system-05-assignments",
  "system-04-students",
  "system-02-academic-core",
  "system-05-monthly-periods",
  "system-07-finance",
  "system-03-hr",
];

function canUseItem(
  item: AppNavItem,
  hasPermission: (permissionCode: string) => boolean,
  hasAnyPermission: (permissionCodes: string[]) => boolean,
) {
  if (item.requiredPermission) {
    return hasPermission(item.requiredPermission);
  }

  if (item.requiredAnyPermission) {
    return hasAnyPermission(item.requiredAnyPermission);
  }

  return true;
}

function canUseAction(
  action: DashboardAction,
  hasPermission: (permissionCode: string) => boolean,
  hasAnyPermission: (permissionCodes: string[]) => boolean,
) {
  if (action.permission) {
    return hasPermission(action.permission);
  }

  if (action.permissions) {
    return hasAnyPermission(action.permissions);
  }

  return true;
}

function getGroupPreviewItems(
  group: AppNavGroup,
  hasPermission: (permissionCode: string) => boolean,
  hasAnyPermission: (permissionCodes: string[]) => boolean,
) {
  return group.items
    .filter((item) => canUseItem(item, hasPermission, hasAnyPermission))
    .slice(0, 4);
}

export default function AppDashboardPage() {
  const auth = useAuth();
  const router = useRouter();
  const navigationPreferences = useNavigationPreferences();
  const { hasPermission, hasAnyPermission } = useRbac();
  const healthQuery = useHealthCheck();

  React.useEffect(() => {
    if (navigationPreferences.landingPage !== "last-visited") {
      return;
    }

    const lastVisitedPath = loadLastVisitedAppPath();
    if (lastVisitedPath && lastVisitedPath !== "/app") {
      router.replace(lastVisitedPath);
    }
  }, [navigationPreferences.landingPage, router]);

  const availableActions = React.useMemo(
    () =>
      QUICK_ACTIONS.filter((action) =>
        canUseAction(action, hasPermission, hasAnyPermission),
      ),
    [hasAnyPermission, hasPermission],
  );

  const highlightedGroups = React.useMemo(
    () =>
      HIGHLIGHT_GROUP_IDS.map((groupId) =>
        APP_NAV_GROUPS.find((group) => group.id === groupId),
      ).filter((group): group is AppNavGroup => Boolean(group)),
    [],
  );

  if (!auth.session) {
    return null;
  }

  if (navigationPreferences.landingPage === "last-visited") {
    const lastVisitedPath = loadLastVisitedAppPath();
    if (lastVisitedPath && lastVisitedPath !== "/app") {
      return null;
    }
  }

  const user = auth.session.user;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const todayLabel = new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const accessibleItemsCount = APP_NAV_GROUPS.flatMap((group) => group.items).filter((item) =>
    canUseItem(item, hasPermission, hasAnyPermission),
  ).length;

  const metrics: DashboardMetric[] = [
    {
      label: "المسارات المتاحة",
      value: String(accessibleItemsCount),
      detail: "واجهة يمكنك الوصول إليها حسب صلاحياتك",
      icon: Layers3,
      tone: "border-sky-300/60 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    },
    {
      label: "الأدوار",
      value: String(user.roleCodes.length),
      detail: "دور مفعّل لهذا الحساب",
      icon: ShieldCheck,
      tone: "border-violet-300/60 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
    {
      label: "الصلاحيات",
      value: String(user.permissionCodes.length),
      detail: "صلاحية تشغيلية ممنوحة",
      icon: CheckCircle2,
      tone: "border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "حالة الربط",
      value: healthQuery.isSuccess && healthQuery.data.status === "ok" ? "متصل" : "فحص",
      detail: healthQuery.data?.service ?? "API",
      icon: healthQuery.isFetching ? RefreshCw : Gauge,
      tone:
        healthQuery.isSuccess && healthQuery.data.status === "ok"
          ? "border-teal-300/60 bg-teal-500/10 text-teal-700 dark:text-teal-300"
          : "border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-[color:var(--app-accent-strong)]/30 bg-gradient-to-br from-[color:var(--app-accent-soft)]/65 via-background/95 to-background p-4 shadow-[0_28px_90px_-62px_rgba(15,23,42,0.65)] md:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="w-fit border-[color:var(--app-accent-strong)] bg-background/75 px-3 py-1 text-[11px]">
                  {todayLabel}
                </Badge>
                <Badge variant="secondary" className="w-fit px-3 py-1 text-[11px]">
                  {user.roleCodes.length} أدوار
                </Badge>
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  مرحبًا {displayName || user.email}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                  لوحة قيادة يومية هادئة وواضحة تجمع أهم المسارات والمؤشرات والإجراءات
                  السريعة في مساحة واحدة قابلة للقراءة بسرعة.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="rounded-[22px] border border-border/60 bg-background/75 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-2xl border",
                          metric.tone,
                        )}
                      >
                        <Icon className={cn("h-5 w-5", healthQuery.isFetching && Icon === RefreshCw ? "animate-spin" : "")} />
                      </span>
                      <p className="text-2xl font-bold tracking-tight">{metric.value}</p>
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-semibold">{metric.label}</p>
                      <p className="text-xs text-muted-foreground">{metric.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-background/75 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">مركز اليوم</p>
                <p className="text-xs text-muted-foreground">أقصر طريق لأكثر الأعمال تكرارًا</p>
              </div>
              <Sparkles className="h-5 w-5 text-[color:var(--app-accent-color)]" />
            </div>
            <div className="mt-4 grid gap-2">
              {availableActions.slice(0, 4).map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.href}
                    asChild
                    variant="outline"
                    className="h-auto justify-between rounded-2xl border-border/70 px-3 py-3 text-right transition hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-soft)]/30"
                  >
                    <Link href={action.href}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("flex h-9 w-9 items-center justify-center rounded-2xl border", action.tone)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{action.title}</span>
                          <span className="block truncate text-[11px] font-normal text-muted-foreground">
                            {action.description}
                          </span>
                        </span>
                      </span>
                      <ArrowUpLeft className="h-4 w-4 shrink-0" />
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {availableActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-[24px] border border-border/60 bg-card/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.38)] transition hover:-translate-y-0.5 hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-soft)]/30"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", action.tone)}>
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpLeft className="h-4 w-4 text-muted-foreground transition group-hover:text-[color:var(--app-accent-color)]" />
              </div>
              <div className="mt-4 space-y-1">
                <h2 className="text-base font-semibold">{action.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">أنظمة نشطة</h2>
              <p className="text-sm text-muted-foreground">أهم المساحات التي يرجع لها الفريق يوميًا</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/app/navigation">
                كل التنقل
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {highlightedGroups.map((group) => {
              const Icon = group.icon;
              const previewItems = getGroupPreviewItems(group, hasPermission, hasAnyPermission);
              return (
                <div
                  key={group.id}
                  className="rounded-[24px] border border-border/60 bg-card/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl border",
                        group.iconClassName,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{group.label}</p>
                      <p className="text-xs text-muted-foreground">{previewItems.length} اختصار متاح</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {previewItems.length > 0 ? (
                      previewItems.map((item) => (
                        <Button
                          key={item.href}
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                        >
                          <Link href={item.href}>{item.label}</Link>
                        </Button>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">لا توجد اختصارات متاحة لهذا الحساب.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-[24px] border border-border/70 bg-card/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">صحة النظام</h2>
                <p className="text-xs text-muted-foreground">مراقبة سريعة للربط</p>
              </div>
              <Badge
                variant={
                  healthQuery.isSuccess && healthQuery.data.status === "ok"
                    ? "default"
                    : "secondary"
                }
              >
                {healthQuery.isSuccess && healthQuery.data.status === "ok" ? "متصل" : "قيد الفحص"}
              </Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
                <span className="text-muted-foreground">الخدمة</span>
                <span className="font-medium">{healthQuery.data?.service ?? "API"}</span>
              </div>
              <div className="flex justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
                <span className="text-muted-foreground">آخر فحص</span>
                <span className="font-medium">
                  {healthQuery.data?.timestamp
                    ? new Date(healthQuery.data.timestamp).toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full rounded-2xl"
              onClick={() => void healthQuery.refetch()}
              disabled={healthQuery.isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", healthQuery.isFetching ? "animate-spin" : "")} />
              تحديث الفحص
            </Button>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-card/80 p-4">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-[color:var(--app-accent-color)]" />
              <h2 className="text-base font-semibold">نبض العمل</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>ابدأ من الواجبات، الحضور، أو القيود حسب المهمة اليومية.</p>
              <p>كل الاختصارات هنا تحترم صلاحيات الحساب الحالي.</p>
              <p>التنقل الكامل موجود دائمًا في زر “كل التنقل”.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
