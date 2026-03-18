"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DESKTOP_BREAKPOINT = 1024;

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export type FilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actionButtons?: React.ReactNode;
  className?: string;
};

export function FilterDrawer({
  open,
  onClose,
  title = "فلترة",
  children,
  actionButtons,
  className,
}: FilterDrawerProps) {
  const isDesktop = useMediaQuery(`(min-width: ${DESKTOP_BREAKPOINT}px)`);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] md:items-center md:justify-end"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden border border-[color:var(--app-accent-strong)] bg-background/95 shadow-2xl shadow-black/15 backdrop-blur-xl",
          isDesktop
            ? "h-[min(760px,calc(100vh-2rem))] max-w-[460px] rounded-[28px]"
            : "max-h-[85vh] max-w-md rounded-[28px]",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            "border-b border-[color:var(--app-accent-strong)] bg-gradient-to-b from-[color:var(--app-accent-soft)] via-background/96 to-background/84 px-5 backdrop-blur-sm",
            isDesktop ? "py-4" : "pt-2 pb-4",
          )}
        >
          {!isDesktop ? (
            <div className="mb-2 flex justify-center">
              <div className="h-1.5 w-14 rounded-full bg-[color:var(--app-accent-strong)]" />
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--app-accent-color)]">
                فلترة
              </p>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[color:var(--app-accent-strong)] bg-background/80 p-2 text-[color:var(--app-accent-color)] shadow-sm transition hover:bg-[color:var(--app-accent-soft)]"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div
          className={cn(
            "overflow-y-auto px-5 py-4",
            isDesktop ? "h-[calc(100%-148px)]" : "max-h-[calc(85vh-132px)]",
          )}
        >
          {children}
        </div>
        {actionButtons ? (
          <div className="border-t border-[color:var(--app-accent-strong)] bg-background/92 px-5 py-4 backdrop-blur-sm">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              {actionButtons}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
