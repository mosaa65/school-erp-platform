"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  ChevronDown,
  Compass,
  GraduationCap,
  Menu,
  PanelRightClose,
  UserCircle2,
  X,
} from "lucide-react";
import { AppFooterDock } from "@/components/layout/app-footer-dock";
import {
  NavigationFilterControl,
  type NavigationFilterValue,
} from "@/components/layout/navigation-filter-control";
import { APP_NAV_GROUPS, type AppNavItem } from "@/components/layout/app-navigation";
import { NavigationDrawer } from "@/components/layout/navigation-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { useAppearance } from "@/hooks/use-appearance";
import { useNavigationPreferences } from "@/hooks/use-navigation-preferences";
import { matchesPermissionRequirement } from "@/features/auth/lib";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useUserNotificationsUnreadCountQuery } from "@/features/user-notifications/hooks/use-user-notifications-query";
import { translateRoleCode } from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";
import type { ColorPresetId, ColorScheme } from "@/theme/appearance-types";
import { resolveAppearanceThemeTokens } from "@/theme/color-presets";
import type { NavigationDensity } from "@/navigation/navigation-preferences";

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

type GroupTheme = ReturnType<typeof resolveAppearanceThemeTokens>;

type StandalonePageMeta = {
  label: string;
  badgeLabel: string;
  icon: AppNavItem["icon"];
  themeGroupId: string;
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

function resolveGroupTheme(
  groupId: string | undefined,
  presetId: ColorPresetId,
  scheme: ColorScheme,
): GroupTheme {
  return resolveAppearanceThemeTokens(presetId, scheme, groupId);
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

function resolveNavDensityClasses(density: NavigationDensity) {
  if (density === "compact") {
    return {
      searchClassName: "h-10",
      groupSectionClassName: "p-2",
      groupHeaderClassName: "px-2 py-1.5",
      itemClassName: "gap-2.5 px-2.5 py-2",
      railGroupClassName: "p-1.5",
      railButtonClassName: "h-10 w-10",
      railItemClassName: "h-9 w-9",
      railGapClassName: "gap-1.5",
    };
  }

  return {
    searchClassName: "h-11",
    groupSectionClassName: "p-2.5",
    groupHeaderClassName: "px-2 py-2",
    itemClassName: "gap-3 px-3 py-2.5",
    railGroupClassName: "p-2",
    railButtonClassName: "h-11 w-11",
    railItemClassName: "h-10 w-10",
    railGapClassName: "gap-2",
  };
}

export function AppShell({ children }: AppShellProps) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { hasAnyPermission, hasPermission } = useRbac();
  const appearance = useAppearance();
  const navigationPreferences = useNavigationPreferences();
  const canReadUserNotifications = hasPermission("user-notifications.read");
  const showFooterNotifications = false;
  const navScrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const navScrollTopRef = React.useRef(0);
  const restoreFrameIdsRef = React.useRef<number[]>([]);
  const restoreTimeoutIdsRef = React.useRef<number[]>([]);
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const [isNavigationDrawerOpen, setNavigationDrawerOpen] = React.useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = React.useState<string[]>([]);
  const [navSearch, setNavSearch] = React.useState("");
  const [navFilter, setNavFilter] = React.useState<NavigationFilterValue>({
    currentGroupOnly: false,
    selectedGroupIds: [],
  });
  const isHubMode = navigationPreferences.layoutMode === "hub";
  const isRailMode = navigationPreferences.layoutMode === "rail";
  const isNavigationHubPage = pathname === "/app/navigation";
  const isNavigationHubLanding =
    pathname === "/app" &&
    (isHubMode || navigationPreferences.landingPage === "navigation-hub");
  const navDensityClasses = React.useMemo(
    () => resolveNavDensityClasses(navigationPreferences.density),
    [navigationPreferences.density],
  );
  const unreadNotificationsQuery = useUserNotificationsUnreadCountQuery({
    enabled: canReadUserNotifications,
  });
  const standalonePage = React.useMemo<StandalonePageMeta | null>(() => {
    if (isNavigationHubPage || isNavigationHubLanding) {
      return {
        label: "واجهة التنقل",
        badgeLabel: "التنقل",
        icon: Compass,
        themeGroupId: "overview",
      };
    }

    if (pathname.startsWith("/app/profile")) {
      return {
        label: "الملف الشخصي",
        badgeLabel: "الحساب",
        icon: UserCircle2,
        themeGroupId: "system-01-shared",
      };
    }

    return null;
  }, [isNavigationHubLanding, isNavigationHubPage, pathname]);

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
    setNavigationDrawerOpen(false);
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
    const pathActiveGroupId = visibleNavGroups.find((group) =>
      group.items.some((item) => isNavItemActive(pathname, item.href)),
    )?.id;
    const effectiveGroupIds = navFilter.currentGroupOnly
      ? pathActiveGroupId
        ? [pathActiveGroupId]
        : []
      : navFilter.selectedGroupIds;
    const groups = visibleNavGroups.filter(
      (group) =>
        effectiveGroupIds.length === 0 || effectiveGroupIds.includes(group.id),
    );

    if (!query) {
      return groups;
    }

    return groups
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
  }, [
    navFilter.currentGroupOnly,
    navFilter.selectedGroupIds,
    navSearch,
    pathname,
    visibleNavGroups,
  ]);

  const filterGroups = React.useMemo(
    () =>
      visibleNavGroups.map((group) => ({
        id: group.id,
        label: group.label,
      })),
    [visibleNavGroups],
  );

  const pathActiveGroupId = React.useMemo(
    () =>
      visibleNavGroups.find((group) =>
        group.items.some((item) => isNavItemActive(pathname, item.href)),
      )?.id,
    [pathname, visibleNavGroups],
  );

  const visibleNavItems = React.useMemo(
    () => visibleNavGroups.flatMap((group) => group.items),
    [visibleNavGroups],
  );

  const activeNavItem =
    visibleNavItems.find((item) => isNavItemActive(pathname, item.href)) ??
    (standalonePage ? undefined : visibleNavItems[0]);

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
  const activePageLabel = standalonePage?.label ?? activeNavItem?.label ?? "School ERP";
  const activePageBadgeLabel = standalonePage?.badgeLabel ?? activeGroup?.label;
  const ActivePageIcon = standalonePage?.icon ?? activeGroup?.icon;
  const activeThemeGroupId = standalonePage?.themeGroupId ?? activeGroupId;
  const activeGroupTheme = React.useMemo(
    () =>
      resolveGroupTheme(
        activeThemeGroupId,
        appearance.preset,
        appearance.resolvedSurfaceMode,
      ),
    [activeThemeGroupId, appearance.preset, appearance.resolvedSurfaceMode],
  );
  const unreadNotificationsCount = unreadNotificationsQuery.data?.unreadCount ?? 0;
  const navigateTo = React.useCallback(
    (href: string) => {
      persistNavScrollPosition();
      router.push(href);
    },
    [persistNavScrollPosition, router],
  );

  React.useEffect(() => {
    setExpandedGroupIds((previous) => {
      const validIds = previous.filter((id) =>
        visibleNavGroups.some((group) => group.id === id),
      );
      const next = new Set(validIds);

      if (next.size === 0) {
        if (isRailMode) {
          const initialGroupId = activeGroupId ?? visibleNavGroups[0]?.id;
          if (initialGroupId) {
            next.add(initialGroupId);
          }
        } else {
          for (const group of visibleNavGroups) {
            next.add(group.id);
          }
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
  }, [activeGroupId, isRailMode, visibleNavGroups]);

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
    isRailMode ? visibleNavGroups.length : filteredNavGroups.length,
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((previous) => {
      if (isRailMode) {
        return previous.includes(groupId) ? [] : [groupId];
      }

      const set = new Set(previous);
      if (set.has(groupId)) {
        set.delete(groupId);
      } else {
        set.add(groupId);
      }
      return Array.from(set);
    });
  };

  const footerActiveItem = isNavigationDrawerOpen
    ? "navigator"
    : pathname === "/app"
      ? "home"
      : pathname.startsWith("/app/navigation")
        ? isHubMode
          ? "home"
          : "navigator"
      : pathname.startsWith("/app/profile")
        ? "profile"
        : showFooterNotifications && pathname.startsWith("/app/user-notifications")
          ? "notifications"
          : null;

  return (
    <div
      className={cn(
        "relative min-h-screen",
        !isHubMode ? "md:grid" : "",
        !isHubMode
          ? isRailMode
            ? "md:grid-cols-[104px_1fr]"
            : "md:grid-cols-[300px_1fr]"
          : "",
      )}
      style={activeGroupTheme.accentVars}
    >
      {!isHubMode ? (
        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-40 flex w-80 flex-col overflow-hidden border-l border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur-sm transition-transform duration-200 md:static md:translate-x-0 md:border-l-0 md:border-r",
            isRailMode ? "md:w-[104px] md:px-3 md:py-4" : "md:w-auto",
            isSidebarOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className={cn(isRailMode ? "md:hidden" : "")}>
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

        <button
          type="button"
          className={cn(
            "mb-5 w-full rounded-[1.4rem] border border-border/70 bg-background/60 p-3 text-right transition hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-soft)]/35",
            isRailMode ? "md:flex md:flex-col md:items-center md:rounded-[1.6rem] md:px-2 md:py-3 md:text-center" : "",
          )}
          onClick={() => {
            setSidebarOpen(false);
            navigateTo("/app/profile");
          }}
        >
          <div
            className={cn(
              "mb-2 flex items-center gap-2 text-sm",
              isRailMode ? "md:mb-0 md:flex-col md:gap-1" : "",
            )}
          >
            <UserCircle2 className="h-4 w-4 text-[color:var(--app-accent-color)] md:h-5 md:w-5" />
            <span className={cn("font-medium", isRailMode ? "md:hidden" : "")}>
              {auth.session.user.firstName} {auth.session.user.lastName}
            </span>
            {isRailMode ? (
              <span className="hidden text-[10px] font-medium text-muted-foreground md:block">
                الحساب
              </span>
            ) : null}
          </div>
          <p className={cn("truncate text-xs text-muted-foreground", isRailMode ? "md:hidden" : "")}>
            {auth.session.user.email}
          </p>
          <div className={cn("mt-2 flex flex-wrap gap-1", isRailMode ? "md:hidden" : "")}>
            {auth.session.user.roleCodes.slice(0, 2).map((roleCode) => (
              <Badge key={roleCode} variant="secondary">
                {translateRoleCode(roleCode)}
              </Badge>
            ))}
            {auth.session.user.roleCodes.length > 2 ? (
              <Badge variant="outline">+{auth.session.user.roleCodes.length - 2}</Badge>
            ) : null}
          </div>
        </button>

        <div className={cn("relative mb-4", isRailMode ? "md:hidden" : "")}>
          <SearchField
            value={navSearch}
            onChange={(event) => setNavSearch(event.target.value)}
            placeholder="ابحث عن صفحة أو نظام..."
            className={cn(
              navDensityClasses.searchClassName,
              "rounded-2xl border-border/70 bg-background/70 pr-9 pl-10",
            )}
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
          ) : null}
          <div className="mt-2 flex justify-end">
            <NavigationFilterControl
              groups={filterGroups}
              value={navFilter}
              onChange={setNavFilter}
              activeGroupId={pathActiveGroupId}
              className="h-9 rounded-xl px-2.5 text-[11px]"
            />
          </div>
        </div>

        <div
          ref={isRailMode ? null : navScrollContainerRef}
          className={cn("min-h-0 flex-1 overflow-y-auto pe-1", isRailMode ? "md:hidden" : "")}
          onScroll={(event) => {
            if (!isRailMode) {
              persistNavScrollPosition(event.currentTarget.scrollTop);
            }
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
              const groupTheme = resolveGroupTheme(
                group.id,
                appearance.preset,
                appearance.resolvedSurfaceMode,
              );

              return (
                <section
                  key={group.id}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border transition-colors",
                    navDensityClasses.groupSectionClassName,
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
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl text-right hover:bg-background/60",
                        navDensityClasses.groupHeaderClassName,
                      )}
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
                          <group.icon className="h-4 w-4" />
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
                                "flex items-center rounded-xl border text-sm transition-colors",
                                navDensityClasses.itemClassName,
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

        {isRailMode ? (
          <div
            ref={navScrollContainerRef}
            className="hidden min-h-0 flex-1 overflow-y-auto md:block"
            onScroll={(event) => {
              persistNavScrollPosition(event.currentTarget.scrollTop);
            }}
          >
            <nav className={cn("flex flex-col items-center", navDensityClasses.railGapClassName)}>
              {visibleNavGroups.map((group) => {
                const isExpanded = expandedGroupIds.includes(group.id);
                const hasActiveItem = group.items.some((item) =>
                  isNavItemActive(pathname, item.href),
                );
                const groupTheme = resolveGroupTheme(
                  group.id,
                  appearance.preset,
                  appearance.resolvedSurfaceMode,
                );

                return (
                  <section
                    key={group.id}
                    className={cn(
                      "w-full overflow-hidden rounded-[1.6rem] border transition-all",
                      navDensityClasses.railGroupClassName,
                      hasActiveItem
                        ? `${groupTheme.panelClassName} shadow-sm ring-1 ring-border/40`
                        : "border-border/60 bg-background/55",
                    )}
                  >
                    <button
                      type="button"
                      title={group.label}
                      className={cn(
                        "mx-auto flex items-center justify-center rounded-[1rem] border shadow-sm transition-all hover:scale-[1.02]",
                        navDensityClasses.railButtonClassName,
                        group.iconClassName ?? "border-primary/20 bg-primary/10 text-primary",
                        hasActiveItem ? "ring-2 ring-[color:var(--app-accent-ring)]" : "",
                      )}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <group.icon className="h-4 w-4" />
                    </button>

                    {isExpanded ? (
                      <div
                        className={cn(
                          "mt-2 flex flex-col items-center",
                          navDensityClasses.railGapClassName,
                        )}
                      >
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
                              title={item.label}
                              onClick={() => {
                                persistNavScrollPosition();
                              }}
                              className={cn(
                                "relative flex items-center justify-center rounded-[1rem] border shadow-sm transition-all hover:scale-[1.02]",
                                navDensityClasses.railItemClassName,
                                active
                                  ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                                  : cn(
                                      "border-border/70 bg-background/78 text-muted-foreground hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-soft)]/35 hover:text-foreground",
                                      itemIconClassName,
                                    ),
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                              <span className="sr-only">{item.label}</span>
                              {active ? (
                                <span className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-current" />
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </nav>
          </div>
        ) : null}
        </aside>
      ) : null}

      {!isHubMode && isSidebarOpen ? (
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
                {navigationPreferences.showHeaderMenuButton ? (
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden rounded-2xl border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)] shadow-sm hover:bg-[color:var(--app-accent-strong)] hover:text-[color:var(--app-accent-color)]"
                    onClick={() => {
                      if (isHubMode) {
                        setNavigationDrawerOpen(true);
                        return;
                      }

                      setSidebarOpen(true);
                    }}
                    aria-label={isHubMode ? "فتح التنقل" : "فتح الشريط الجانبي"}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                ) : null}
                {ActivePageIcon ? (
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] border shadow-sm md:h-12 md:w-12",
                      activeGroupTheme.headerIconClassName,
                    )}
                  >
                    <ActivePageIcon className="h-5 w-5" />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {activePageBadgeLabel ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-medium sm:text-[11px]",
                          activeGroupTheme.headerBadgeClassName,
                        )}
                      >
                        {activePageBadgeLabel}
                      </Badge>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground md:text-xs">
                      School ERP
                    </span>
                  </div>
                  <h1 className="truncate text-base font-semibold tracking-tight md:text-xl">
                    {activePageLabel}
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
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-32 md:px-6 md:py-6 md:pb-36">{children}</main>
      </div>

      <NavigationDrawer
        open={isNavigationDrawerOpen}
        onClose={() => setNavigationDrawerOpen(false)}
        navGroups={visibleNavGroups}
        activePath={pathname}
        onNavigate={navigateTo}
        navSearch={navSearch}
        onNavSearchChange={setNavSearch}
        title={isHubMode ? "مركز التنقل" : "التنقل السريع"}
        subtitle={
          isHubMode
            ? "تنقل بين الأنظمة والصفحات من لوحة موحدة بدون قائمة جانبية ثابتة."
            : "تصفح الأنظمة والصفحات المسموح بها من مكان واحد."
        }
        presentation={navigationPreferences.mobilePresentation}
        density={navigationPreferences.density}
      />

      <AppFooterDock
        activeItem={footerActiveItem}
        navigatorOpen={isNavigationDrawerOpen}
        unreadCount={unreadNotificationsCount}
        canReadNotifications={showFooterNotifications && canReadUserNotifications}
        onHomeClick={() => navigateTo("/app")}
        onNavigatorClick={() => {
          setSidebarOpen(false);
          setNavigationDrawerOpen((previous) => !previous);
        }}
        onNotificationsClick={
          showFooterNotifications ? () => navigateTo("/app/user-notifications") : undefined
        }
        onProfileClick={() => {
          setNavigationDrawerOpen(false);
          navigateTo("/app/profile");
        }}
      />
    </div>
  );
}




