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
  eyebrow?: string;
  children: React.ReactNode;
  actionButtons?: React.ReactNode;
  className?: string;
};

import { Drawer } from "vaul";

export function FilterDrawer({
  open,
  onClose,
  title = "فلترة",
  eyebrow = "فلترة",
  children,
  actionButtons,
  className,
}: FilterDrawerProps) {
  const isDesktop = useMediaQuery(`(min-width: ${DESKTOP_BREAKPOINT}px)`);

  const drawerContent = (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden border border-[color:var(--app-accent-strong)]/30 bg-background/40 shadow-2xl backdrop-blur-2xl transition-all duration-300",
        isDesktop
          ? "h-[min(760px,calc(100vh-2rem))] max-w-[460px] rounded-[32px] border"
          : "h-[88dvh] max-h-[88dvh] rounded-t-[32px] rounded-b-none border-t",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className={cn(
          "relative border-b border-border/40 bg-gradient-to-b from-[color:var(--app-accent-soft)]/20 via-background/40 to-background/20 px-5 backdrop-blur-md",
          isDesktop ? "py-4" : "pt-2 pb-4",
        )}
      >
        {!isDesktop ? (
          <div className="mb-2.5 flex justify-center">
            <div className="h-1.5 w-12 rounded-full bg-border/60" />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--app-accent-color)] opacity-80">
              {eyebrow}
            </p>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="group flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/40 text-muted-foreground shadow-sm transition-all hover:bg-background hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
          </button>
        </div>
      </div>
      
      <div
        className={cn(
          "flex-1 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          isDesktop ? "h-[calc(100%-148px)]" : "max-h-[calc(88dvh-132px)]",
        )}
      >
        {children}
      </div>

      {actionButtons ? (
        <div className="border-t border-border/40 bg-background/40 px-5 py-4 backdrop-blur-md">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
            {actionButtons}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (isDesktop) {
    if (!open) return null;
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-4 backdrop-blur-md",
          overlayClassName,
        )}
        onClick={onClose}
      >
        {drawerContent}
      </div>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={(val) => !val && onClose()} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex flex-col focus:outline-none">
          {drawerContent}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
