"use client";

import * as React from "react";
import {
  CheckCircle2,
  CheckSquare2,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type EntitySurfaceRecordsSelectionAction = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  tone?: "default" | "danger" | "accent";
  disabled?: boolean;
  onClick: (ids: string[]) => void | boolean | Promise<void | boolean>;
};

type EntitySurfaceRecordsProps = {
  title: string;
  description?: string;
  total?: number;
  loaded?: number;
  isInitialLoading?: boolean;
  isFetching?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  error?: unknown;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
  className?: string;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  recordIds?: string[];
  selectionLabel?: string;
  onDeleteSelected?: (ids: string[]) => void | boolean | Promise<void | boolean>;
  selectionActions?: EntitySurfaceRecordsSelectionAction[];
};

type EntitySurfaceRecordsSelectionContextValue = {
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  enableSelectionMode: () => void;
  toggleSelected: (id: string) => void;
};

const EntitySurfaceRecordsSelectionContext =
  React.createContext<EntitySurfaceRecordsSelectionContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "تعذّر تحميل السجلات.";
}

export function EntitySurfaceRecords({
  title,
  description,
  total,
  loaded,
  isInitialLoading = false,
  isFetching = false,
  isFetchingMore = false,
  hasMore = false,
  error,
  emptyTitle = "لا توجد سجلات مطابقة.",
  emptyDescription,
  children,
  className,
  onRefresh,
  onLoadMore,
  recordIds = [],
  selectionLabel = "سجل",
  onDeleteSelected,
  selectionActions,
}: EntitySurfaceRecordsProps) {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const lastLoadMoreAtRef = React.useRef(0);
  const touchStartYRef = React.useRef<number | null>(null);
  const lastPullRefreshAtRef = React.useRef(0);
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const loadedCount = typeof loaded === "number" ? loaded : recordIds.length;
  const hasRemainingByCount =
    typeof total === "number" && loadedCount < total;
  const shouldShowMoreState = hasMore || hasRemainingByCount;
  const canLoadMore = Boolean(
    shouldShowMoreState &&
      onLoadMore &&
      !isInitialLoading &&
      !isFetching &&
      !isFetchingMore,
  );
  const hasLoadedItems = Boolean(loaded && loaded > 0);
  const selectedCount = selectedIds.size;
  const pageRecordIdsKey = recordIds.join("|");
  const resolvedSelectionActions = React.useMemo<EntitySurfaceRecordsSelectionAction[]>(
    () => {
      const actions = selectionActions ? [...selectionActions] : [];
      if (onDeleteSelected) {
        actions.push({
          key: "delete",
          label: "حذف",
          icon: <Trash2 className="h-4 w-4" />,
          tone: "danger",
          onClick: onDeleteSelected,
        });
      }
      return actions;
    },
    [onDeleteSelected, selectionActions],
  );

  React.useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) {
        return prev;
      }

      const availableIds = new Set(recordIds);
      const next = new Set(Array.from(prev).filter((id) => availableIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [pageRecordIdsKey, recordIds]);

  React.useEffect(() => {
    if (selectedCount === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [isSelectionMode, selectedCount]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !canLoadMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          const now = Date.now();
          if (now - lastLoadMoreAtRef.current < 650) {
            return;
          }
          lastLoadMoreAtRef.current = now;
          onLoadMore?.();
        }
      },
      { rootMargin: "520px 0px 520px 0px", threshold: 0.01 },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [canLoadMore, onLoadMore]);

  const enableSelectionMode = React.useCallback(() => {
    if (recordIds.length > 0) {
      setIsSelectionMode(true);
    }
  }, [recordIds.length]);

  const toggleSelected = React.useCallback((id: string) => {
    setIsSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllCurrentPage = React.useCallback(() => {
    setIsSelectionMode(true);
    setSelectedIds(new Set(recordIds));
  }, [recordIds]);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const selectionContextValue = React.useMemo(
    () => ({
      isSelectionMode,
      selectedIds,
      enableSelectionMode,
      toggleSelected,
    }),
    [enableSelectionMode, isSelectionMode, selectedIds, toggleSelected],
  );

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (window.scrollY > 2 || !onRefresh || isFetching) {
      touchStartYRef.current = null;
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const startY = touchStartYRef.current;
    if (startY === null || !onRefresh || isFetching) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? startY;
    const pulledDistance = currentY - startY;
    const now = Date.now();
    if (pulledDistance > 90 && now - lastPullRefreshAtRef.current > 1200) {
      lastPullRefreshAtRef.current = now;
      touchStartYRef.current = null;
      window.navigator.vibrate?.(8);
      onRefresh();
    }
  };

  const handleTouchEnd = () => {
    touchStartYRef.current = null;
  };

  return (
    <EntitySurfaceRecordsSelectionContext.Provider value={selectionContextValue}>
      <section
        className={cn(
          "relative isolate overflow-hidden rounded-[2.5rem] bg-white/[0.64] bg-clip-padding p-3 shadow-[0_30px_96px_-48px_rgba(15,23,42,0.5)] backdrop-blur-2xl dark:bg-white/[0.05] sm:rounded-[2.75rem] sm:p-4",
          isSelectionMode
            ? "shadow-[0_30px_96px_-48px_rgba(15,23,42,0.5),0_0_0_2px_color-mix(in_oklab,var(--app-accent-color)_22%,transparent)]"
            : "",
          className,
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[color:var(--app-accent-strong)]/45 dark:border-white/10" />
        <span className="pointer-events-none absolute inset-[1px] rounded-[calc(2.5rem-1px)] border border-white/35 dark:border-white/[0.04] sm:rounded-[calc(2.75rem-1px)]" />
        <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--app-accent-color)]/50 to-transparent" />

        <div className="relative px-1 py-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="truncate text-base font-extrabold tracking-normal text-slate-900 dark:text-white">
                {title}
              </h2>
              {description ? (
                <p className="line-clamp-2 text-xs leading-5 text-slate-500 dark:text-white/55 sm:max-w-3xl">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {onRefresh ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full bg-white/[0.76] px-2.5 text-xs shadow-none dark:bg-white/[0.04] sm:px-3"
                  onClick={onRefresh}
                  disabled={isFetching}
                  aria-label="تحديث السجلات"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isFetching ? "animate-spin" : "")}
                  />
                  <span className="hidden sm:inline">تحديث</span>
                </Button>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-white/[0.76] shadow-none dark:bg-white/[0.04]"
                    aria-label="خيارات السجلات"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-56 overflow-hidden rounded-[1.35rem] border border-white/[0.65] bg-white/[0.88] p-0 text-slate-900 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/[0.88] dark:text-white"
                >
                  <DropdownMenuItem
                    className="h-12 cursor-pointer justify-between rounded-none border-b border-slate-200/80 bg-transparent px-4 text-right text-sm font-semibold focus:bg-slate-100/[0.85] dark:border-white/10 dark:focus:bg-white/10"
                    disabled={recordIds.length === 0}
                    onClick={enableSelectionMode}
                  >
                    <span>تحديد</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                      <CheckSquare2 className="h-4 w-4" />
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn(
                      "h-12 cursor-pointer justify-between rounded-none border-b border-slate-200/80 bg-transparent px-4 text-right text-sm font-semibold focus:bg-slate-100/[0.85] dark:border-white/10 dark:focus:bg-white/10",
                      selectedCount > 0 ? "" : "border-b-0",
                    )}
                    disabled={recordIds.length === 0}
                    onClick={selectAllCurrentPage}
                  >
                    <span>تحديد كل المعروض</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/[0.06] text-slate-600 dark:bg-white/[0.08] dark:text-white/70">
                      <Square className="h-4 w-4" />
                    </span>
                  </DropdownMenuItem>
                  {selectedCount > 0 ? (
                    <DropdownMenuItem
                      className="h-12 cursor-pointer justify-between rounded-none border-b-0 bg-transparent px-4 text-right text-sm font-semibold text-rose-600 focus:bg-rose-500/10 focus:text-rose-700 dark:text-rose-300 dark:focus:text-rose-200"
                      onClick={clearSelection}
                    >
                      <span>إلغاء التحديد</span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10">
                        <X className="h-4 w-4" />
                      </span>
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-3 flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {typeof total === "number" ? (
              <span className="shrink-0 rounded-full border border-white/70 bg-white/[0.68] px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65">
                المعروض {loaded ?? 0} من {total}
              </span>
            ) : null}
            {selectedCount > 0 ? (
              <span className="shrink-0 rounded-full border border-[color:var(--app-accent-strong)]/[0.35] bg-[color:var(--app-accent-soft)]/[0.55] px-3 py-1.5 text-[11px] font-bold text-[color:var(--app-accent-color)]">
                المحدد {selectedCount}
              </span>
            ) : null}
            {isFetching && !isFetchingMore ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900/5 px-3 py-1.5 text-[11px] font-semibold text-slate-500 dark:bg-white/5 dark:text-white/55">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                تحديث
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative mt-3 space-y-3">{children}</div>

        {isInitialLoading ? (
          <div className="mt-3 rounded-[1.35rem] border border-dashed border-slate-300/70 bg-white/[0.45] p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/[0.55]">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              جارٍ تحميل السجلات...
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-[1.35rem] border border-rose-300/[0.45] bg-rose-500/10 p-4 text-sm text-rose-700 dark:border-rose-400/20 dark:text-rose-200">
            {getErrorMessage(error)}
          </div>
        ) : null}

        {!isInitialLoading && !error && !hasLoadedItems ? (
          <div className="mt-3 rounded-[1.35rem] border border-dashed border-slate-300/70 bg-white/[0.45] p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/[0.55]">
            <p className="font-semibold text-slate-700 dark:text-white/75">
              {emptyTitle}
            </p>
            {emptyDescription ? (
              <p className="mt-1 text-xs leading-5">{emptyDescription}</p>
            ) : null}
          </div>
        ) : null}

        <div ref={sentinelRef} className="h-2" aria-hidden="true" />

        {hasLoadedItems ? (
          <div className="mt-3 border-t border-white/60 pt-3 dark:border-white/10">
            {selectedCount > 0 ? (
              <div className="flex flex-col gap-2 rounded-[1.55rem] border border-[color:var(--app-accent-strong)]/[0.35] bg-[color:var(--app-accent-soft)]/[0.45] p-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="rounded-full bg-white/[0.65] px-3 py-2 text-center text-xs font-bold text-[color:var(--app-accent-color)] dark:bg-white/[0.06]">
                  {selectedCount} {selectionLabel} محدد
                </span>
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {resolvedSelectionActions.map((action) => (
                    <Button
                      key={action.key}
                      type="button"
                      size="sm"
                      variant={action.tone === "danger" ? "destructive" : "outline"}
                      className={cn(
                        "h-9 shrink-0 gap-1.5 rounded-full text-xs",
                        action.tone === "danger"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
                          : "",
                      )}
                      disabled={action.disabled}
                      onClick={() => {
                        const ids = Array.from(selectedIds);
                        void Promise.resolve(action.onClick(ids)).then((shouldClear) => {
                          if (shouldClear !== false) {
                            clearSelection();
                          }
                        }).catch(() => undefined);
                      }}
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 shrink-0 rounded-full bg-white/70 text-xs shadow-none dark:bg-white/[0.04]"
                    onClick={clearSelection}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-h-9 flex-1 justify-center">
                  {isFetchingMore ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-accent-strong)]/[0.35] bg-[color:var(--app-accent-soft)]/[0.45] px-3 py-2 text-xs font-semibold text-[color:var(--app-accent-color)]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      يتم تحميل المزيد...
                    </span>
                  ) : shouldShowMoreState ? (
                    <span className="rounded-full bg-slate-900/5 px-3 py-2 text-xs text-slate-500 dark:bg-white/5 dark:text-white/55">
                      انزل للنهاية لتحميل المزيد
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      تم عرض كل السجلات
                    </span>
                  )}
                </div>

              </div>
            )}
          </div>
        ) : null}
      </section>
    </EntitySurfaceRecordsSelectionContext.Provider>
  );
}

type EntitySurfaceRecordSelectableProps = {
  id: string;
  children: React.ReactNode;
};

export function EntitySurfaceRecordSelectable({
  id,
  children,
}: EntitySurfaceRecordSelectableProps) {
  const selection = React.useContext(EntitySurfaceRecordsSelectionContext);
  const selected = Boolean(selection?.selectedIds.has(id));

  const toggle = React.useCallback(() => {
    selection?.toggleSelected(id);
  }, [id, selection]);

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selection?.isSelectionMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggle();
  };

  const handlePointerDownCapture = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === "touch" && !event.isPrimary) {
      event.preventDefault();
      event.stopPropagation();
      selection?.enableSelectionMode();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-[1.4rem] transition",
        selection?.isSelectionMode ? "cursor-pointer" : "",
        selected
          ? "ring-2 ring-[color:var(--app-accent-color)] ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
          : "",
      )}
      onClickCapture={handleClickCapture}
      onPointerDownCapture={handlePointerDownCapture}
    >
      {selection?.isSelectionMode ? (
        <button
          type="button"
          className={cn(
            "absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border text-white shadow-lg backdrop-blur",
            selected
              ? "border-[color:var(--app-accent-color)] bg-[color:var(--app-accent-color)]"
              : "border-white/70 bg-slate-900/[0.45]",
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggle();
          }}
          aria-label={selected ? "إلغاء تحديد السجل" : "تحديد السجل"}
        >
          {selected ? (
            <CheckSquare2 className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
      ) : null}
      {children}
    </div>
  );
}
