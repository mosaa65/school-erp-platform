"use client";

import * as React from "react";
import { CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
};

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
}: EntitySurfaceRecordsProps) {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const lastLoadMoreAtRef = React.useRef(0);
  const canLoadMore = Boolean(
    hasMore && onLoadMore && !isInitialLoading && !isFetching && !isFetchingMore,
  );
  const hasLoadedItems = Boolean(loaded && loaded > 0);

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

  return (
    <section
      className={cn(
        "relative overflow-visible rounded-[1.85rem] border border-white/70 bg-white/62 p-3 shadow-[0_28px_90px_-48px_rgba(15,23,42,0.48)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.045]",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--app-accent-color)]/50 to-transparent" />

      <div className="relative flex flex-wrap items-start justify-between gap-3 px-1 py-1">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold tracking-normal text-slate-900 dark:text-white">
              {title}
            </h2>
            {typeof total === "number" ? (
              <Badge variant="secondary" className="rounded-full">
                {loaded ?? 0} من {total}
              </Badge>
            ) : null}
          </div>
          {description ? (
            <p className="text-xs leading-5 text-slate-500 dark:text-white/55">
              {description}
            </p>
          ) : null}
        </div>

        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-full bg-white/70 text-xs shadow-none dark:bg-white/[0.04]"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching ? "animate-spin" : "")} />
            تحديث
          </Button>
        ) : null}
      </div>

      <div className="relative mt-3 space-y-3">{children}</div>

      {isInitialLoading ? (
        <div className="mt-3 rounded-[1.35rem] border border-dashed border-slate-300/70 bg-white/45 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            جارٍ تحميل السجلات...
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-[1.35rem] border border-rose-300/45 bg-rose-500/10 p-4 text-sm text-rose-700 dark:border-rose-400/20 dark:text-rose-200">
          {getErrorMessage(error)}
        </div>
      ) : null}

      {!isInitialLoading && !error && !hasLoadedItems ? (
        <div className="mt-3 rounded-[1.35rem] border border-dashed border-slate-300/70 bg-white/45 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/55">
          <p className="font-semibold text-slate-700 dark:text-white/75">{emptyTitle}</p>
          {emptyDescription ? <p className="mt-1 text-xs leading-5">{emptyDescription}</p> : null}
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-2" aria-hidden="true" />

      {hasLoadedItems ? (
        <div className="mt-3 flex justify-center border-t border-white/60 pt-3 dark:border-white/10">
          {isFetchingMore ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-accent-strong)]/35 bg-[color:var(--app-accent-soft)]/45 px-3 py-2 text-xs font-semibold text-[color:var(--app-accent-color)]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              يتم تحميل المزيد...
            </span>
          ) : hasMore ? (
            <span className="rounded-full bg-slate-900/5 px-3 py-2 text-xs text-slate-500 dark:bg-white/5 dark:text-white/55">
              اسحب للأسفل لعرض المزيد
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              تم عرض كل السجلات
            </span>
          )}
        </div>
      ) : null}
    </section>
  );
}
