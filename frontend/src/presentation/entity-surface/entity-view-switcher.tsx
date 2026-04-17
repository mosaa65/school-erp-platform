"use client";

import * as React from "react";
import { Grid2x2, LayoutGrid, Rows3, StretchHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EntitySurfaceViewMode } from "@/presentation/entity-surface/entity-surface-types";

type EntityViewSwitcherProps = {
  value: EntitySurfaceViewMode;
  onChange: (value: EntitySurfaceViewMode) => void;
  allowedModes?: EntitySurfaceViewMode[];
  className?: string;
};

const VIEW_MODE_META: Record<
  EntitySurfaceViewMode,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "dense-row": { label: "صف", icon: Rows3 },
  list: { label: "قائمة", icon: StretchHorizontal },
  grid: { label: "شبكة", icon: Grid2x2 },
  "smart-card": { label: "بطاقة", icon: LayoutGrid },
};

export function EntityViewSwitcher({
  value,
  onChange,
  allowedModes = ["list", "smart-card", "grid", "dense-row"],
  className,
}: EntityViewSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-[1.2rem] border border-white/70 bg-white/70 p-1 dark:border-white/10 dark:bg-white/[0.04]",
        className,
      )}
    >
      {allowedModes.map((mode) => {
        const active = value === mode;
        const Icon = VIEW_MODE_META[mode].icon;

        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[0.95rem] px-3 py-2 text-xs font-semibold transition-all",
              active
                ? "bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)] shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-white/65 dark:hover:bg-white/[0.06] dark:hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{VIEW_MODE_META[mode].label}</span>
          </button>
        );
      })}
    </div>
  );
}
