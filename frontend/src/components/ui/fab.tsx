import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FabProps = {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function Fab({
  onClick,
  label,
  icon,
  ariaLabel,
  className,
  disabled = false,
}: FabProps) {
  const accessibleLabel = ariaLabel ?? label ?? "إجراء سريع";

  return (
    <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+var(--app-footer-dock-offset,5.9rem))] right-[calc(0.9rem+env(safe-area-inset-right)+var(--app-mobile-sidebar-offset,0px))] z-50 md:bottom-[calc(1.5rem+var(--app-footer-dock-offset,5.9rem))] md:right-[calc(1.5rem+var(--app-desktop-sidebar-offset,0px))]">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={accessibleLabel}
        title={label ?? accessibleLabel}
        className={cn(
          "pointer-events-auto relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[color:var(--app-accent-strong)] bg-gradient-to-br from-[color:var(--app-accent-soft)] via-background/70 to-background/55 text-[color:var(--app-accent-color)] shadow-[0_18px_42px_-24px_rgba(15,23,42,0.58)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:from-[color:var(--app-accent-strong)] hover:to-background/60 hover:shadow-[0_22px_54px_-22px_rgba(15,23,42,0.62)] sm:h-14 sm:w-14 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_26%,var(--app-accent-soft),transparent_60%)] opacity-90" />
        <span className="pointer-events-none absolute inset-[1px] rounded-full border border-white/35 dark:border-white/10" />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-background/75 shadow-inner shadow-white/20 dark:bg-background/60 sm:h-10 sm:w-10">
          {icon ?? <Plus className="h-4 w-4 sm:h-5 sm:w-5" />}
        </span>
      </button>
    </div>
  );
}
