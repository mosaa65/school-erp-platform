"use client";

import * as React from "react";
import { ArrowLeft, Compass, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { APP_NAV_GROUPS } from "@/components/layout/app-navigation";
import {
  NavigationFilterControl,
  type NavigationFilterValue,
} from "@/components/layout/navigation-filter-control";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { matchesPermissionRequirement } from "@/features/auth/lib";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useNavigationPreferences } from "@/hooks/use-navigation-preferences";
import { cn } from "@/lib/utils";

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function NavigationHubWorkspace() {
  const router = useRouter();
  const { hasAnyPermission, hasPermission } = useRbac();
  const navigationPreferences = useNavigationPreferences();
  const [search, setSearch] = React.useState("");
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>("all");
  const [navFilter, setNavFilter] = React.useState<NavigationFilterValue>({
    currentGroupOnly: false,
    selectedGroupIds: [],
  });
  const deferredSearch = React.useDeferredValue(search);

  const visibleNavGroups = React.useMemo(() => {
    return APP_NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        matchesPermissionRequirement(item, {
          hasPermission,
          hasAnyPermission,
        }),
      ),
    })).filter((group) => group.items.length > 0);
  }, [hasAnyPermission, hasPermission]);

  const filteredNavGroups = React.useMemo(() => {
    const query = normalizeText(deferredSearch);
    const activeGroupId = selectedGroupId !== "all" ? selectedGroupId : undefined;
    const effectiveFilterIds = navFilter.currentGroupOnly
      ? activeGroupId
        ? [activeGroupId]
        : []
      : navFilter.selectedGroupIds;

    return visibleNavGroups
      .filter((group) => selectedGroupId === "all" || group.id === selectedGroupId)
      .filter(
        (group) =>
          effectiveFilterIds.length === 0 || effectiveFilterIds.includes(group.id),
      )
      .map((group) => {
        if (!query) {
          return group;
        }

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
    deferredSearch,
    navFilter.currentGroupOnly,
    navFilter.selectedGroupIds,
    selectedGroupId,
    visibleNavGroups,
  ]);

  const totalItems = React.useMemo(
    () => visibleNavGroups.reduce((count, group) => count + group.items.length, 0),
    [visibleNavGroups],
  );

  const isCompact = navigationPreferences.density === "compact";
  const filterGroups = React.useMemo(
    () =>
      visibleNavGroups.map((group) => ({
        id: group.id,
        label: group.label,
      })),
    [visibleNavGroups],
  );
  const activeGroupId = selectedGroupId !== "all" ? selectedGroupId : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <section className="relative overflow-hidden rounded-[2.1rem] border border-white/70 bg-white/78 px-4 py-4 shadow-[0_28px_72px_-42px_rgba(15,23,42,0.2)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_30px_70px_-38px_rgba(15,23,42,0.92)] sm:px-5 sm:py-5">
        <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-[color:var(--app-accent-soft)]/65 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-cyan-200/45 blur-3xl dark:bg-cyan-400/10" />

        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-accent-color)]"
                >
                  <Sparkles className="me-1 h-3.5 w-3.5" />
                  Navigation Hub
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                  {visibleNavGroups.length} أنظمة
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                  {totalItems} صفحة
                </Badge>
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight sm:text-2xl">
                  مركز التنقل
                </h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  أسلوب لوحة موحّدة: بحث، تصفية، ودخول مباشر بدون تشتيت.
                </p>
              </div>
            </div>

            <div className="flex min-w-[15rem] flex-1 items-center gap-2 sm:max-w-md">
              <div className="relative flex-1">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث عن نظام أو صفحة..."
                  className="h-11 rounded-2xl border-border/70 bg-background/85 pr-10 pl-4"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <NavigationFilterControl
                groups={filterGroups}
                value={navFilter}
                onChange={setNavFilter}
                activeGroupId={activeGroupId}
                className="shrink-0"
              />
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setSelectedGroupId("all")}
              className={cn(
                "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-all",
                selectedGroupId === "all"
                  ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                  : "border-white/70 bg-white/75 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-white/72 dark:hover:bg-white/[0.08] dark:hover:text-white",
              )}
            >
              كل الأنظمة
            </button>
            {visibleNavGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-all",
                  selectedGroupId === group.id
                    ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                    : "border-white/70 bg-white/75 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-white/72 dark:hover:bg-white/[0.08] dark:hover:text-white",
                )}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {filteredNavGroups.length === 0 ? (
        <section className="rounded-[1.8rem] border border-dashed border-border/70 bg-background/60 px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
            <Search className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold">لا توجد نتائج مطابقة</p>
          <p className="mt-1 text-xs text-muted-foreground">
            جرّب اسمًا مختلفًا أو عد إلى كل الأنظمة.
          </p>
        </section>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredNavGroups.map((group) => (
            <section
              key={group.id}
              className="overflow-hidden rounded-[1.7rem] border border-white/70 bg-white/78 shadow-[0_22px_56px_-40px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_24px_64px_-36px_rgba(15,23,42,0.92)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-black/[0.05] px-4 py-3.5 dark:border-white/10 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                      group.iconClassName ??
                        "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]",
                    )}
                  >
                    <group.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold sm:text-[15px]">{group.label}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {group.items.length} صفحة متاحة
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
                  <Compass className="me-1 h-3.5 w-3.5" />
                  {group.items.length}
                </Badge>
              </div>

              <div className="space-y-2 px-3 py-3 sm:px-4 sm:py-4">
                {group.items.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-[1.15rem] border border-white/70 bg-background/86 text-right transition-all hover:-translate-y-0.5 hover:border-[color:var(--app-accent-strong)] hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]",
                      isCompact ? "px-3 py-2.5" : "px-3 py-3",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem] border shadow-sm",
                        item.iconClassName ??
                          "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      {isCompact ? null : (
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {item.href}
                        </span>
                      )}
                    </span>
                    <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-[color:var(--app-accent-color)]" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

