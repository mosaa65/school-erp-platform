"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EntitySurfaceStatusChip } from "@/presentation/entity-surface/entity-surface-types";

type EntitySurfaceStatusChipsProps = {
  items?: EntitySurfaceStatusChip[];
  className?: string;
};

function resolveChipClassName(tone: EntitySurfaceStatusChip["tone"]): string {
  switch (tone) {
    case "success":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "destructive":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "accent":
      return "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]";
    case "secondary":
      return "border-transparent bg-secondary text-secondary-foreground";
    case "neutral":
      return "border-white/60 bg-white/60 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75";
    case "default":
      return "border-transparent bg-primary text-primary-foreground";
    case "outline":
    default:
      return "border-white/70 bg-transparent text-slate-700 dark:border-white/10 dark:text-white/75";
  }
}

export function EntitySurfaceStatusChips({
  items,
  className,
}: EntitySurfaceStatusChipsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((item, index) => (
        <Badge
          key={item.key ?? `${item.label}-${index}`}
          variant="outline"
          className={cn(
            "h-auto rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-none",
            resolveChipClassName(item.tone),
          )}
        >
          {item.icon ? <span className="ml-1 inline-flex">{item.icon}</span> : null}
          <span>{item.label}</span>
        </Badge>
      ))}
    </div>
  );
}
