"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  PanelRightClose,
  UserCircle2,
  X,
} from "lucide-react";
import { APP_NAV_GROUPS, type AppNavItem } from "@/components/layout/app-navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { matchesPermissionRequirement } from "@/features/auth/lib";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useUserNotificationsUnreadCountQuery } from "@/features/user-notifications/hooks/use-user-notifications-query";
import { translateRoleCode } from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
};

type VisibleNavGroup = {
  id: string;
  label: string;
  icon: AppNavItem["icon"];
  iconClassName?: string;
  surfaceClassName?: string;
  items: AppNavItem[];
};

type GroupTheme = {
  panelClassName: string;
  activeGlowClassName: string;
  headerClassName: string;
  headerIconClassName: string;
  headerBadgeClassName: string;
  accentVars: React.CSSProperties;
};

const NAV_SCROLL_STORAGE_KEY = "app-shell.nav-scroll-top";

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function resolveGroupTheme(groupId?: string): GroupTheme {
  switch (groupId) {
    case "system-01-shared":
      return {
        panelClassName: "border-violet-500/20 bg-background/55",
        activeGlowClassName: "from-violet-500/18 via-violet-500/7 to-transparent",
        headerClassName:
          "border-violet-500/25 bg-gradient-to-l from-violet-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(139,92,246,0.55)]",
        headerIconClassName:
          "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        headerBadgeClassName:
          "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        accentVars: {
          "--app-accent-color": "rgb(139 92 246)",
          "--app-accent-soft": "rgba(139, 92, 246, 0.12)",
          "--app-accent-strong": "rgba(139, 92, 246, 0.22)",
          "--app-accent-ring": "rgba(139, 92, 246, 0.32)",
        } as React.CSSProperties,
      };
    case "system-02-academic-core":
      return {
        panelClassName: "border-emerald-500/20 bg-background/55",
        activeGlowClassName: "from-emerald-500/18 via-emerald-500/7 to-transparent",
        headerClassName:
          "border-emerald-500/25 bg-gradient-to-l from-emerald-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(16,185,129,0.52)]",
        headerIconClassName:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        headerBadgeClassName:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        accentVars: {
          "--app-accent-color": "rgb(16 185 129)",
          "--app-accent-soft": "rgba(16, 185, 129, 0.12)",
          "--app-accent-strong": "rgba(16, 185, 129, 0.22)",
          "--app-accent-ring": "rgba(16, 185, 129, 0.3)",
        } as React.CSSProperties,
      };
    case "system-03-hr":
      return {
        panelClassName: "border-sky-500/20 bg-background/55",
        activeGlowClassName: "from-sky-500/18 via-sky-500/7 to-transparent",
        headerClassName:
          "border-sky-500/25 bg-gradient-to-l from-sky-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(14,165,233,0.52)]",
        headerIconClassName:
          "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        headerBadgeClassName:
          "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        accentVars: {
          "--app-accent-color": "rgb(14 165 233)",
          "--app-accent-soft": "rgba(14, 165, 233, 0.12)",
          "--app-accent-strong": "rgba(14, 165, 233, 0.22)",
          "--app-accent-ring": "rgba(14, 165, 233, 0.3)",
        } as React.CSSProperties,
      };
    case "system-04-students":
      return {
        panelClassName: "border-indigo-500/20 bg-background/55",
        activeGlowClassName: "from-indigo-500/18 via-indigo-500/7 to-transparent",
        headerClassName:
          "border-indigo-500/25 bg-gradient-to-l from-indigo-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(99,102,241,0.52)]",
        headerIconClassName:
          "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
        headerBadgeClassName:
          "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
        accentVars: {
          "--app-accent-color": "rgb(99 102 241)",
          "--app-accent-soft": "rgba(99, 102, 241, 0.12)",
          "--app-accent-strong": "rgba(99, 102, 241, 0.22)",
          "--app-accent-ring": "rgba(99, 102, 241, 0.32)",
        } as React.CSSProperties,
      };
    case "system-05-grades-config":
    case "system-05-grades-policies":
    case "system-05-grades-homeworks":
    case "system-05-grades-exams":
    case "system-05-grades-student-work":
    case "system-05-grades-aggregation":
    case "system-05-grades-reports":
      return {
        panelClassName: "border-fuchsia-500/20 bg-background/55",
        activeGlowClassName: "from-fuchsia-500/18 via-fuchsia-500/7 to-transparent",
        headerClassName:
          "border-fuchsia-500/25 bg-gradient-to-l from-fuchsia-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(217,70,239,0.52)]",
        headerIconClassName:
          "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
        headerBadgeClassName:
          "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
        accentVars: {
          "--app-accent-color": "rgb(217 70 239)",
          "--app-accent-soft": "rgba(217, 70, 239, 0.12)",
          "--app-accent-strong": "rgba(217, 70, 239, 0.22)",
          "--app-accent-ring": "rgba(217, 70, 239, 0.32)",
        } as React.CSSProperties,
      };
    case "system-07-finance":
      return {
        panelClassName: "border-emerald-500/20 bg-background/55",
        activeGlowClassName: "from-emerald-500/18 via-emerald-500/7 to-transparent",
        headerClassName:
          "border-emerald-500/25 bg-gradient-to-l from-emerald-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(16,185,129,0.52)]",
        headerIconClassName:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        headerBadgeClassName:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        accentVars: {
          "--app-accent-color": "rgb(16 185 129)",
          "--app-accent-soft": "rgba(16, 185, 129, 0.12)",
          "--app-accent-strong": "rgba(16, 185, 129, 0.22)",
          "--app-accent-ring": "rgba(16, 185, 129, 0.3)",
        } as React.CSSProperties,
      };
    default:
      return {
        panelClassName: "border-slate-500/20 bg-background/55",
        activeGlowClassName: "from-slate-500/16 via-slate-500/6 to-transparent",
        headerClassName:
          "border-slate-500/25 bg-gradient-to-l from-slate-500/16 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(100,116,139,0.42)]",
        headerIconClassName:
          "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
        headerBadgeClassName:
          "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
        accentVars: {
          "--app-accent-color": "rgb(100 116 139)",
          "--app-accent-soft": "rgba(100, 116, 139, 0.12)",
          "--app-accent-strong": "rgba(100, 116, 139, 0.22)",
          "--app-accent-ring": "rgba(100, 116, 139, 0.3)",
        } as React.CSSProperties,
      };
  }
}

function resolveNavItemIconClassName(
  item: AppNavItem,
  groupIconClassName?: string,
): string {
  if (item.iconClassName) {
    return item.iconClassName;
  }

  const href = item.href;

  if (href.includes("problems") || href.includes("violations")) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (href.includes("notifications") || href.includes("reminders")) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  if (href.includes("attendance")) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (href.includes("books") || href.includes("subjects") || href.includes("homework")) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (href.includes("exam")) {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
  }

  if (
    href.includes("grades") ||
    href.includes("grading") ||
    href.includes("promotion") ||
    href.includes("annual-results")
  ) {
    return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300";
  }

  if (href.includes("talents") || href.includes("lookup-catalog")) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }

  if (href.includes("school-profiles") || href.includes("buildings") || href.includes("ownership")) {
    return "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  }

  if (href.includes("roles") || href.includes("permissions")) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }

  if (href.includes("settings")) {
    return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  }

  if (href.includes("reports") || href.includes("audit")) {
    return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  }

  if (href.includes("employees") || href.includes("guardians")) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  if (href.includes("students") || href.includes("student-")) {
    return "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
  }

  if (
    href.includes("finance") ||
    href.includes("payment") ||
    href.includes("invoice") ||
    href.includes("payroll") ||
    href.includes("fee")
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (
    href.includes("academic") ||
    href.includes("sections") ||
    href.includes("timetable") ||
    href.includes("term-subject") ||
    href.includes("grade-level")
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (href.includes("users")) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  return groupIconClassName ?? "border-primary/20 bg-primary/10 text-primary";
}

export function AppShell({ children }: AppShellProps) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { hasAnyPermission, hasPermission } = useRbac();
  const canReadUserNotifications = hasPermission("user-notifications.read");
  const navScrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const navScrollTopRef = React.useRef(0);
  const restoreFrameIdsRef = React.useRef<number[]>([]);
  const restoreTimeoutIdsRef = React.useRef<number[]>([]);
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = React.useState<string[]>([]);
  const [navSearch, setNavSearch] = React.useState("");
  const unreadNotificationsQuery = useUserNotificationsUnreadCountQuery({
    enabled: canReadUserNotifications,
  });

  const persistNavScrollPosition = React.useCallback((nextScrollTop?: number) => {
    const resolvedScrollTop =
      nextScrollTop ?? navScrollContainerRef.current?.scrollTop ?? navScrollTopRef.current;

    navScrollTopRef.current = resolvedScrollTop;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(NAV_SCROLL_STORAGE_KEY, String(resolvedScrollTop));
    }
  }, []);

  const restoreNavScrollPosition = React.useCallback(() => {
    const container = navScrollContainerRef.current;
    if (!container) {
      return;
    }

    const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
    const targetScrollTop = Math.min(navScrollTopRef.current, maxScrollTop);

    container.scrollTop = targetScrollTop;
  }, []);

  const clearScheduledNavRestore = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    for (const frameId of restoreFrameIdsRef.current) {
      window.cancelAnimationFrame(frameId);
    }

    for (const timeoutId of restoreTimeoutIdsRef.current) {
      window.clearTimeout(timeoutId);
    }

    restoreFrameIdsRef.current = [];
    restoreTimeoutIdsRef.current = [];
  }, []);

  const scheduleNavScrollRestore = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    clearScheduledNavRestore();
    restoreNavScrollPosition();

    const frameOne = window.requestAnimationFrame(() => {
      restoreNavScrollPosition();

      const frameTwo = window.requestAnimationFrame(() => {
        restoreNavScrollPosition();
      });

      restoreFrameIdsRef.current.push(frameTwo);
    });

    restoreFrameIdsRef.current.push(frameOne);

    restoreTimeoutIdsRef.current.push(
      window.setTimeout(() => {
        restoreNavScrollPosition();
      }, 80),
    );

    restoreTimeoutIdsRef.current.push(
      window.setTimeout(() => {
        restoreNavScrollPosition();
      }, 180),
    );
  }, [clearScheduledNavRestore, restoreNavScrollPosition]);

  React.useEffect(() => {
    if (auth.isHydrated && !auth.session) {
      router.replace("/auth/login");
    }
  }, [auth.isHydrated, auth.session, router]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedScrollTop = Number(window.sessionStorage.getItem(NAV_SCROLL_STORAGE_KEY) ?? "0");
    navScrollTopRef.current = Number.isFinite(savedScrollTop) ? savedScrollTop : 0;

    scheduleNavScrollRestore();
    return () => {
      clearScheduledNavRestore();
    };
  }, [clearScheduledNavRestore, scheduleNavScrollRestore]);

  React.useEffect(() => {
    persistNavScrollPosition();
    setSidebarOpen(false);
    setNavSearch("");
  }, [pathname, persistNavScrollPosition]);

  const visibleNavGroups = React.useMemo<VisibleNavGroup[]>(() => {
    return APP_NAV_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      icon: group.icon,
      iconClassName: group.iconClassName,
      surfaceClassName: group.surfaceClassName,
      items: group.items.filter(
        (item) =>
          matchesPermissionRequirement(item, {
            hasPermission,
            hasAnyPermission,
          }),
      ),
    })).filter((group) => group.items.length > 0);
  }, [hasAnyPermission, hasPermission]);

  const filteredNavGroups = React.useMemo(() => {
    const query = normalizeText(navSearch);

    if (!query) {
      return visibleNavGroups;
    }

    return visibleNavGroups
      .map((group) => {
        const groupMatches = normalizeText(group.label).includes(query);
        if (groupMatches) {
          return group;
        }

        return {
          ...group,
          items: group.items.filter((item) => {
            const haystack = normalizeText([item.label, item.href].join(" "));
            return haystack.includes(query);
          }),
        };
      })
      .filter((group) => group.items.length > 0);
  }, [navSearch, visibleNavGroups]);

  const visibleNavItems = React.useMemo(
    () => visibleNavGroups.flatMap((group) => group.items),
    [visibleNavGroups],
  );

  const activeNavItem =
    visibleNavItems.find((item) => isNavItemActive(pathname, item.href)) ??
    visibleNavItems[0];

  const activeGroupId = React.useMemo(() => {
    if (!activeNavItem) {
      return undefined;
    }

    return visibleNavGroups.find((group) =>
      group.items.some((item) => item.href === activeNavItem.href),
    )?.id;
  }, [activeNavItem, visibleNavGroups]);

  const activeGroup = React.useMemo(
    () => visibleNavGroups.find((group) => group.id === activeGroupId),
    [activeGroupId, visibleNavGroups],
  );
  const activeGroupTheme = React.useMemo(
    () => resolveGroupTheme(activeGroupId),
    [activeGroupId],
  );
  const unreadNotificationsCount = unreadNotificationsQuery.data?.unreadCount ?? 0;

  React.useEffect(() => {
    setExpandedGroupIds((previous) => {
      const validIds = previous.filter((id) =>
        visibleNavGroups.some((group) => group.id === id),
      );
      const next = new Set(validIds);

      if (next.size === 0) {
        for (const group of visibleNavGroups) {
          next.add(group.id);
        }
      }

      if (activeGroupId) {
        next.add(activeGroupId);
      }

      const nextIds = Array.from(next);
      const isSame =
        nextIds.length === previous.length &&
        nextIds.every((id, index) => id === previous[index]);

      return isSame ? previous : nextIds;
    });
  }, [activeGroupId, visibleNavGroups]);

  React.useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    scheduleNavScrollRestore();
    return () => {
      clearScheduledNavRestore();
    };
  }, [
    clearScheduledNavRestore,
    expandedGroupIds,
    filteredNavGroups.length,
    isSidebarOpen,
    pathname,
    scheduleNavScrollRestore,
  ]);

  if (!auth.isHydrated || !auth.session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-8">
        <p className="text-sm text-muted-foreground">جارٍ تحميل مساحة العمل...</p>
      </main>
    );
  }

  const handleLogout = () => {
    auth.signOut();
    router.replace("/auth/login");
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((previous) => {
      const set = new Set(previous);
      if (set.has(groupId)) {
        set.delete(groupId);
      } else {
        set.add(groupId);
      }
      return Array.from(set);
    });
  };

  return (
    <div
      className="relative min-h-screen md:grid md:grid-cols-[300px_1fr]"
      style={activeGroupTheme.accentVars}
    >
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-80 flex-col overflow-hidden border-l border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur-sm transition-transform duration-200 md:static md:w-auto md:translate-x-0 md:border-l-0 md:border-r",
          isSidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">School ERP</p>
              <p className="text-xs text-muted-foreground">لوحة تحكم الويب</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق الشريط الجانبي"
          >
            <PanelRightClose className="h-5 w-5" />
          </Button>
        </div>

        <div className="mb-5 rounded-lg border border-border/70 bg-background/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <UserCircle2 className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {auth.session.user.firstName} {auth.session.user.lastName}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {auth.session.user.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {auth.session.user.roleCodes.slice(0, 2).map((roleCode) => (
              <Badge key={roleCode} variant="secondary">
                {translateRoleCode(roleCode)}
              </Badge>
            ))}
            {auth.session.user.roleCodes.length > 2 ? (
              <Badge variant="outline">+{auth.session.user.roleCodes.length - 2}</Badge>
            ) : null}
          </div>
        </div>

        <div className="relative mb-4">
          <SearchField
            value={navSearch}
            onChange={(event) => setNavSearch(event.target.value)}
            placeholder="ابحث عن صفحة أو نظام..."
            className="h-11 rounded-2xl border-border/70 bg-background/70 pr-9 pl-10"
          />
          {navSearch ? (
            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="مسح البحث"
              onClick={() => setNavSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            null
          )}
        </div>

        <div
          ref={navScrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto pe-1"
          onScroll={(event) => {
            persistNavScrollPosition(event.currentTarget.scrollTop);
          }}
        >
          <nav className="space-y-2">
            {filteredNavGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-4 text-center text-xs text-muted-foreground">
                لا توجد عناصر مطابقة للبحث الحالي.
              </div>
            ) : null}

            {filteredNavGroups.map((group) => {
              const isExpanded = navSearch ? true : expandedGroupIds.includes(group.id);
              const hasActiveItem = group.items.some((item) =>
                isNavItemActive(pathname, item.href),
              );
              const groupTheme = resolveGroupTheme(group.id);

              return (
                <section
                  key={group.id}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-2.5 transition-colors",
                    hasActiveItem
                      ? `${groupTheme.panelClassName} shadow-sm ring-1 ring-border/40`
                      : "border-border/60 bg-background/50",
                  )}
                >
                  {hasActiveItem ? (
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-y-0 right-0 w-[38%] bg-gradient-to-l",
                        groupTheme.activeGlowClassName,
                      )}
                    />
                  ) : null}

                  <div className="relative z-10">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-right hover:bg-background/60"
                      onClick={() => {
                        if (!navSearch) {
                          toggleGroup(group.id);
                        }
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                            group.iconClassName ??
                              "border-primary/20 bg-primary/10 text-primary",
                          )}
                        >
                          <group.icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="flex flex-col items-start leading-tight">
                          <span className="text-sm font-semibold">{group.label}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {group.items.length} صفحة
                          </span>
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded ? "rotate-180" : "",
                        )}
                      />
                    </button>

                    {isExpanded ? (
                      <div className="mt-2 space-y-1.5">
                        {group.items.map((item) => {
                          const active = isNavItemActive(pathname, item.href);
                          const itemIconClassName = resolveNavItemIconClassName(
                            item,
                            group.iconClassName,
                          );
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => {
                                persistNavScrollPosition();
                              }}
                              className={cn(
                                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                                active
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background/80 shadow-sm",
                                  itemIconClassName,
                                )}
                              >
                                <item.icon className="h-4 w-4" />
                              </span>
                              <span className="flex-1">{item.label}</span>
                              {active ? (
                                <span className="h-2 w-2 rounded-full bg-current/80" />
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </nav>
        </div>
      </aside>

      {isSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/35 md:hidden"
          aria-label="Sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 px-4 py-3 md:px-6 md:py-4">
          <div
            className={cn(
              "relative overflow-hidden rounded-[28px] border bg-background/70 px-3 py-3 backdrop-blur-xl md:px-4",
              activeGroupTheme.headerClassName,
            )}
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[color:var(--app-accent-strong)] via-[color:var(--app-accent-soft)] to-transparent opacity-90 sm:w-40" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 md:gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden rounded-2xl border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)] shadow-sm hover:bg-[color:var(--app-accent-strong)] hover:text-[color:var(--app-accent-color)]"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="فتح الشريط الجانبي"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                {activeGroup ? (
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] border shadow-sm md:h-12 md:w-12",
                      activeGroupTheme.headerIconClassName,
                    )}
                  >
                    <activeGroup.icon className="h-5 w-5" />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {activeGroup ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-medium sm:text-[11px]",
                          activeGroupTheme.headerBadgeClassName,
                        )}
                      >
                        {activeGroup.label}
                      </Badge>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground md:text-xs">
                      School ERP
                    </span>
                  </div>
                  <h1 className="truncate text-base font-semibold tracking-tight md:text-xl">
                    {activeNavItem?.label ?? "School ERP"}
                  </h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-[22px] border border-white/35 bg-white/45 p-1.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                {canReadUserNotifications ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative h-11 gap-2 rounded-2xl border-white/40 bg-white/70 px-3.5 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    asChild
                  >
                    <Link
                      href="/app/user-notifications"
                      data-testid="header-user-notifications-link"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                        <BellRing className="h-4 w-4" />
                      </span>
                      <span className="hidden text-sm font-medium sm:inline">إشعاراتي</span>
                      {unreadNotificationsCount > 0 ? (
                        <Badge
                          variant="destructive"
                          className="min-w-6 rounded-full px-1.5 py-0 text-[10px]"
                          data-testid="header-user-notifications-badge"
                        >
                          {unreadNotificationsCount > 99
                            ? "99+"
                            : unreadNotificationsCount}
                        </Badge>
                      ) : null}
                    </Link>
                  </Button>
                ) : null}
                <ThemeToggle
                  label="المظهر"
                  className="border-0 bg-transparent shadow-none hover:bg-white/70 dark:hover:bg-white/10"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 gap-2 rounded-2xl border-white/40 bg-white/70 px-3.5 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  onClick={handleLogout}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="hidden text-sm font-medium sm:inline">تسجيل الخروج</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}




