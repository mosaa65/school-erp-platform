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
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={accessibleLabel}
        title={label ?? accessibleLabel}
        className={cn(
          "pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[color:var(--app-accent-strong)] bg-background/55 text-[color:var(--app-accent-color)] shadow-[0_20px_48px_-26px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-accent-soft)] hover:shadow-[0_24px_56px_-24px_rgba(15,23,42,0.58)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,var(--app-accent-soft),transparent_62%)]" />
        <span className="pointer-events-none absolute inset-[1px] rounded-full border border-white/35 dark:border-white/10" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-background/70 shadow-inner shadow-white/20 dark:bg-background/60">
          {icon ?? <Plus className="h-5 w-5" />}
        </span>
      </button>
    </div>
  );
}
