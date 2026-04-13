"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Compass,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { AppNavGroup } from "@/components/layout/app-navigation";
import {
  NavigationFilterControl,
  type NavigationFilterValue,
} from "@/components/layout/navigation-filter-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useNavigationPreferences } from "@/hooks/use-navigation-preferences";
import { cn } from "@/lib/utils";
import type {
  MobileNavigatorPresentation,
  NavigationDensity,
} from "@/navigation/navigation-preferences";

type NavigationDrawerProps = {
  open: boolean;
  onClose: () => void;
  navGroups: AppNavGroup[];
  activePath: string;
  onNavigate: (href: string) => void;
  navSearch?: string;
  onNavSearchChange?: (value: string) => void;
  className?: string;
  title?: string;
  subtitle?: string;
  presentation?: MobileNavigatorPresentation;
  density?: NavigationDensity;
};

type VisibleNavGroup = AppNavGroup & {
  items: AppNavGroup["items"];
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function isPathActive(activePath: string, href: string): boolean {
  if (href === "/app") {
    return activePath === "/app";
  }

  return activePath === href || activePath.startsWith(`${href}/`);
}

function resolveGroupAccent(group: AppNavGroup): string {
  if (group.iconClassName) {
    return group.iconClassName;
  }

  return "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]";
}

export function NavigationDrawer({
  open,
  onClose,
  navGroups,
  activePath,
  onNavigate,
  navSearch,
  onNavSearchChange,
  className,
  title = "التنقل السريع",
  subtitle = "تصفح الأنظمة والصفحات المسموح بها من مكان واحد.",
  presentation = "drawer",
  density = "comfortable",
}: NavigationDrawerProps) {
  const navigationPreferences = useNavigationPreferences();
  const [internalSearch, setInternalSearch] = React.useState("");
  const contentScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = React.useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [navFilter, setNavFilter] = React.useState<NavigationFilterValue>({
    currentGroupOnly: false,
    selectedGroupIds: [],
  });
  const isFocusedSystemMode =
    navigationPreferences.systemsViewMode === "focused-system";
  const isSearchControlled = navSearch !== undefined && onNavSearchChange !== undefined;
  const searchValue = isSearchControlled ? navSearch : internalSearch;
  const setSearchValue = React.useCallback(
    (value: string) => {
      if (onNavSearchChange) {
        onNavSearchChange(value);
        return;
      }

      setInternalSearch(value);
    },
    [onNavSearchChange],
  );

  React.useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const activeGroup = React.useMemo(
    () =>
      navGroups.find((group) => group.items.some((item) => isPathActive(activePath, item.href))),
    [activePath, navGroups],
  );

  const visibleGroups = React.useMemo<VisibleNavGroup[]>(() => {
    const query = normalizeText(searchValue);
    const effectiveGroupIds = navFilter.currentGroupOnly
      ? activeGroup?.id
        ? [activeGroup.id]
        : []
      : navFilter.selectedGroupIds;

    const groups = query
      ? navGroups
          .map((group) => {
            const groupMatches = normalizeText(group.label).includes(query);
            if (groupMatches) {
              return group;
            }

            const filteredItems = group.items.filter((item) => {
              const haystack = normalizeText([item.label, item.href].join(" "));
              return haystack.includes(query);
            });

            return {
              ...group,
              items: filteredItems,
            };
          })
          .filter((group) => group.items.length > 0)
      : navGroups;

    return groups.filter(
      (group) =>
        effectiveGroupIds.length === 0 || effectiveGroupIds.includes(group.id),
    );
  }, [
    activeGroup?.id,
    navFilter.currentGroupOnly,
    navFilter.selectedGroupIds,
    navGroups,
    searchValue,
  ]);

  const totalItems = React.useMemo(
    () => visibleGroups.reduce((count, group) => count + group.items.length, 0),
    [visibleGroups],
  );

  const selectedGroup = React.useMemo(
    () =>
      selectedGroupId
        ? navGroups.find((group) => group.id === selectedGroupId) ?? null
        : null,
    [navGroups, selectedGroupId],
  );

  const focusedGroupItems = React.useMemo(() => {
    if (!selectedGroup) {
      return [];
    }

    const query = normalizeText(searchValue);
    if (!query) {
      return selectedGroup.items;
    }

    return selectedGroup.items.filter((item) => {
      const haystack = normalizeText([item.label, item.href].join(" "));
      return haystack.includes(query);
    });
  }, [searchValue, selectedGroup]);

  const filterGroups = React.useMemo(
    () =>
      navGroups.map((group) => ({
        id: group.id,
        label: group.label,
      })),
    [navGroups],
  );
  const isBottomSheet = presentation === "bottom-sheet";
  const isCompact = density === "compact";
  const useTightMode = isCompact || isBottomSheet;

  React.useEffect(() => {
    if (!isFocusedSystemMode) {
      setSelectedGroupId(null);
      return;
    }

    if (activeGroup?.id) {
      setSelectedGroupId((previous) =>
        previous === activeGroup.id ? previous : activeGroup.id,
      );
    }
  }, [activeGroup?.id, isFocusedSystemMode]);

  React.useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    const stillExists = navGroups.some((group) => group.id === selectedGroupId);
    if (!stillExists) {
      setSelectedGroupId(null);
    }
  }, [navGroups, selectedGroupId]);

  React.useEffect(() => {
    setExpandedGroupIds((previous) => {
      const validIds = previous.filter((id) => visibleGroups.some((group) => group.id === id));
      if (isFocusedSystemMode && selectedGroupId) {
        return [selectedGroupId];
      }

      if (validIds.length > 0) {
        return validIds;
      }

      return activeGroup?.id ? [activeGroup.id] : [];
    });
  }, [activeGroup?.id, isFocusedSystemMode, selectedGroupId, visibleGroups]);

  const visibleSystemsCount =
    isFocusedSystemMode && selectedGroup ? 1 : visibleGroups.length;
  const visiblePagesCount =
    isFocusedSystemMode && selectedGroup ? focusedGroupItems.length : totalItems;

  React.useEffect(() => {
    if (!open || !isBottomSheet) {
      return;
    }

    // Ensure the sheet always opens from the top content position on phones.
    const frameId = window.requestAnimationFrame(() => {
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTop = 0;
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isBottomSheet, open]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-50 transition-all duration-300",
        className,
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300",
          isBottomSheet ? "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]" : "",
          open ? "pointer-events-auto" : "pointer-events-none",
          open ? "opacity-100" : "opacity-0",
        )}
        aria-label="إغلاق التنقل السريع"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          open ? "pointer-events-auto" : "pointer-events-none",
          isBottomSheet
            ? "absolute inset-x-0 top-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] mx-auto flex w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/45 bg-background/85 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)] backdrop-blur-2xl transition-[transform,opacity] duration-300 dark:border-white/10 md:bottom-auto md:left-auto md:right-0 md:top-0 md:mx-0 md:h-full md:max-h-none md:max-w-[38rem] md:rounded-none md:border-l"
            : "absolute right-0 top-0 flex h-full w-full max-w-[38rem] flex-col border-l border-white/35 bg-background/80 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.8)] backdrop-blur-2xl transition-transform duration-300 dark:border-white/10",
          isBottomSheet
            ? open
              ? "translate-y-0 opacity-100 md:translate-x-0 md:opacity-100"
              : "translate-y-6 opacity-0 md:translate-y-0 md:translate-x-full md:opacity-100"
            : open
              ? "translate-x-0"
              : "translate-x-full",
        )}
      >
        {isBottomSheet ? (
          <div className="flex justify-center pt-3 md:hidden">
            <span className="h-1.5 w-14 rounded-full bg-black/10 dark:bg-white/15" />
          </div>
        ) : null}

        <div
          className={cn(
            "relative overflow-hidden border-b border-border/70",
            isBottomSheet ? "px-4 py-4 sm:px-5" : "px-5 py-5 sm:px-6",
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[color:var(--app-accent-soft)] via-transparent to-transparent opacity-90" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]",
                  )}
                >
                  <Sparkles className="me-1 h-3.5 w-3.5" />
                  Navigator
                </Badge>
                {activeGroup ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                      resolveGroupAccent(activeGroup),
                    )}
                  >
                    {activeGroup.label}
                  </Badge>
                ) : null}
              </div>
              <h2 className={cn("font-semibold tracking-tight", isBottomSheet ? "text-sm sm:text-base" : "text-lg sm:text-xl")}>
                {title}
              </h2>
              <p className={cn("mt-1 text-muted-foreground", isBottomSheet ? "text-[11px]" : "text-sm")}>
                {subtitle}
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-2xl border border-border/60 bg-background/70 shadow-sm hover:bg-background",
                isBottomSheet ? "h-9 w-9" : "h-11 w-11",
              )}
              onClick={onClose}
              aria-label="إغلاق"
            >
              <X className={cn(isBottomSheet ? "h-4 w-4" : "h-5 w-5")} />
            </Button>
          </div>
        </div>

        <div className={cn("border-b border-border/70", isBottomSheet ? "px-4 py-3 sm:px-5" : "px-5 py-4 sm:px-6")}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="ابحث عن نظام أو صفحة..."
                className={cn(
                  "rounded-2xl border-border/70 bg-background/75 pr-10 pl-10",
                  useTightMode ? "h-9 text-xs" : "h-11",
                )}
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {searchValue ? (
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="مسح البحث"
                  onClick={() => setSearchValue("")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <NavigationFilterControl
              groups={filterGroups}
              value={navFilter}
              onChange={setNavFilter}
              activeGroupId={activeGroup?.id}
              className="h-9 shrink-0 rounded-xl px-2.5 text-[11px]"
            />
          </div>

          <div
            className={cn(
              "mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground",
              isBottomSheet ? "mt-2" : "",
            )}
          >
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-3 py-1.5">
              <Menu className="h-3 w-3 text-[color:var(--app-accent-color)]" />
              {visibleSystemsCount} نظام
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-3 py-1.5">
              <Compass className="h-3 w-3 text-[color:var(--app-accent-color)]" />
              {visiblePagesCount} صفحة
            </span>
          </div>
        </div>

        <div
          ref={contentScrollRef}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            isBottomSheet ? "px-3 py-2.5 sm:px-4" : "px-4 py-4 sm:px-5",
          )}
        >
          {isFocusedSystemMode && selectedGroup ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setSelectedGroupId(null)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-background/70 text-right transition hover:bg-muted/60",
                  useTightMode ? "px-3 py-2.5" : "px-4 py-3",
                )}
              >
                <span className="flex items-center justify-center rounded-xl border border-border/70 bg-background/80 text-muted-foreground shadow-sm h-9 w-9">
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">الرجوع إلى الأنظمة</span>
                  <span className="block text-[11px] text-muted-foreground">
                    اعرض كل الأنظمة من جديد
                  </span>
                </span>
              </button>

              <section
                className={cn(
                  "rounded-[24px] border bg-background/55",
                  useTightMode ? "p-2.5" : "p-3",
                )}
              >
                <div className={cn("flex items-center gap-3", useTightMode ? "mb-2.5" : "mb-3")}>
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                      useTightMode ? "h-9 w-9" : "h-11 w-11",
                      resolveGroupAccent(selectedGroup),
                    )}
                  >
                    <selectedGroup.icon className={cn(useTightMode ? "h-4 w-4" : "h-5 w-5")} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn("truncate font-semibold", useTightMode ? "text-xs" : "text-sm")}>
                      {selectedGroup.label}
                    </h3>
                    <p className={cn("mt-0.5 text-muted-foreground", useTightMode ? "text-[10px]" : "text-[11px]")}>
                      {focusedGroupItems.length} صفحة
                    </p>
                  </div>
                </div>

                {focusedGroupItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-center text-xs text-muted-foreground">
                    لا توجد صفحات مطابقة داخل هذا النظام.
                  </div>
                ) : (
                  <div className={cn("grid gap-2", isBottomSheet ? "grid-cols-1" : "sm:grid-cols-2")}>
                    {focusedGroupItems.map((item) => {
                      const active = isPathActive(activePath, item.href);

                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => {
                            onNavigate(item.href);
                            onClose();
                          }}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-2xl border text-right transition-all duration-200",
                            useTightMode ? "px-2.5 py-2 text-xs" : "px-3 py-3 text-sm",
                            active
                              ? "border-[color:var(--app-accent-strong)] bg-background text-foreground shadow-[0_14px_36px_-26px_rgba(15,23,42,0.55)]"
                              : "border-border/70 bg-background/70 text-muted-foreground hover:-translate-y-0.5 hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-soft)]/35 hover:text-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "flex shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors",
                              useTightMode ? "h-8 w-8" : "h-10 w-10",
                              active
                                ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                                : item.iconClassName ??
                                    "border-border/70 bg-background/80 text-muted-foreground group-hover:border-[color:var(--app-accent-strong)] group-hover:bg-[color:var(--app-accent-soft)] group-hover:text-[color:var(--app-accent-color)]",
                            )}
                          >
                            <item.icon className={cn(useTightMode ? "h-3.5 w-3.5" : "h-4 w-4")} />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate font-medium", useTightMode ? "text-xs" : "")}>
                              {item.label}
                            </span>
                            {useTightMode ? null : (
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {item.href}
                              </span>
                            )}
                          </span>

                          {active ? (
                            <ArrowLeft
                              className={cn(
                                "shrink-0 text-[color:var(--app-accent-color)]",
                                useTightMode ? "h-3.5 w-3.5" : "h-4 w-4",
                              )}
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-sm rounded-3xl border border-dashed border-border/70 bg-background/60 p-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                  <Search className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold">لا توجد نتائج مطابقة</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  جرّب اسم نظام مختلف أو افتح البحث من جديد.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {visibleGroups.map((group) => {
                const groupAccent = resolveGroupAccent(group);
                const groupHasActiveItem = group.items.some((item) =>
                  isPathActive(activePath, item.href),
                );
                const isExpanded = expandedGroupIds.includes(group.id);

                return (
                  <section
                    key={group.id}
                    className={cn(
                      "relative overflow-hidden border transition-all",
                      useTightMode ? "rounded-[22px] p-2" : "rounded-[28px] p-3",
                      "self-start",
                      groupHasActiveItem
                        ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]/30 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.5)]"
                        : "border-border/70 bg-background/55 hover:border-border/90",
                    )}
                  >
                    {groupHasActiveItem ? (
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[color:var(--app-accent-strong)] via-[color:var(--app-accent-soft)] to-transparent opacity-80" />
                    ) : null}

                    <div className="relative z-10">
                      <div className={cn("flex items-center justify-between gap-3", useTightMode ? "mb-2.5" : "mb-3")}>
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "flex shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                              useTightMode ? "h-9 w-9" : "h-11 w-11",
                              groupAccent,
                            )}
                          >
                            <group.icon className={cn(useTightMode ? "h-4 w-4" : "h-5 w-5")} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className={cn(
                                  "truncate font-semibold",
                                  useTightMode ? "text-xs" : "text-sm",
                                )}
                              >
                                {group.label}
                              </h3>
                            </div>
                            <p
                              className={cn(
                                "mt-0.5 text-muted-foreground",
                                useTightMode ? "text-[10px]" : "text-[11px]",
                              )}
                            >
                              {isFocusedSystemMode
                                ? "اضغط لعرض صفحات هذا النظام فقط"
                                : isExpanded
                                  ? "اضغط السهم لإخفاء الصفحات"
                                  : "اضغط السهم لإظهار الصفحات"}
                            </p>
                          </div>
                        </div>
                        {isFocusedSystemMode ? null : (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedGroupIds((previous) =>
                                previous.includes(group.id)
                                  ? previous.filter((id) => id !== group.id)
                                  : [...previous, group.id],
                              )
                            }
                            aria-label={isExpanded ? "إخفاء صفحات النظام" : "إظهار صفحات النظام"}
                            className={cn(
                              "inline-flex shrink-0 items-center justify-center rounded-full border transition-all",
                              useTightMode ? "h-9 w-9" : "h-10 w-10",
                              groupAccent,
                            )}
                          >
                            <ChevronDown
                              className={cn(
                                "transition-transform",
                                isExpanded ? "rotate-180" : "",
                                useTightMode ? "h-3.5 w-3.5" : "h-4 w-4",
                              )}
                            />
                          </button>
                        )}
                      </div>

                      {isFocusedSystemMode ? (
                        <button
                          type="button"
                          onClick={() => setSelectedGroupId(group.id)}
                          className={cn(
                            "flex w-full items-center justify-center rounded-2xl border border-border/70 bg-background/75 text-center font-medium transition hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-soft)]/35",
                            useTightMode ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm",
                          )}
                        >
                          عرض صفحات النظام
                        </button>
                      ) : isExpanded ? (
                        <div className={cn("grid gap-2", isBottomSheet ? "grid-cols-1" : "sm:grid-cols-2")}>
                          {group.items.map((item) => {
                            const active = isPathActive(activePath, item.href);

                            return (
                              <button
                                key={item.href}
                                type="button"
                                onClick={() => {
                                  onNavigate(item.href);
                                  onClose();
                                }}
                                className={cn(
                                  "group flex w-full items-center gap-3 rounded-2xl border text-right transition-all duration-200",
                                  useTightMode ? "px-2.5 py-2 text-xs" : "px-3 py-3 text-sm",
                                  active
                                    ? "border-[color:var(--app-accent-strong)] bg-background text-foreground shadow-[0_14px_36px_-26px_rgba(15,23,42,0.55)]"
                                    : "border-border/70 bg-background/70 text-muted-foreground hover:-translate-y-0.5 hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-soft)]/35 hover:text-foreground",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors",
                                    useTightMode ? "h-8 w-8" : "h-10 w-10",
                                    active
                                      ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                                      : item.iconClassName ??
                                          "border-border/70 bg-background/80 text-muted-foreground group-hover:border-[color:var(--app-accent-strong)] group-hover:bg-[color:var(--app-accent-soft)] group-hover:text-[color:var(--app-accent-color)]",
                                  )}
                                >
                                  <item.icon className={cn(useTightMode ? "h-3.5 w-3.5" : "h-4 w-4")} />
                                </span>

                                <span className="min-w-0 flex-1">
                                  <span className={cn("block truncate font-medium", useTightMode ? "text-xs" : "")}>
                                    {item.label}
                                  </span>
                                  {useTightMode ? null : (
                                    <span className="block truncate text-[11px] text-muted-foreground">
                                      {item.href}
                                    </span>
                                  )}
                                </span>

                                {active ? (
                                  <ArrowLeft
                                    className={cn(
                                      "shrink-0 text-[color:var(--app-accent-color)]",
                                      useTightMode ? "h-3.5 w-3.5" : "h-4 w-4",
                                    )}
                                  />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {isBottomSheet ? null : (
          <div className={cn("border-t border-border/70", isBottomSheet ? "px-4 py-3 sm:px-5" : "px-5 py-4 sm:px-6")}>
            <Separator className="mb-4 bg-border/70" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                يمكنك الوصول السريع للأقسام المسموح بها من هنا.
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-4 text-[color:var(--app-accent-color)] shadow-sm hover:bg-[color:var(--app-accent-strong)] hover:text-[color:var(--app-accent-color)]"
                onClick={onClose}
              >
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
