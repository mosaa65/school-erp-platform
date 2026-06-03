"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EntitySurfaceQuickAction } from "@/presentation/entity-surface/entity-surface-types";

type EntitySurfaceQuickActionsProps = {
  actions?: EntitySurfaceQuickAction[];
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  orientation?: "horizontal" | "vertical";
};

function resolveActionVariant(tone: EntitySurfaceQuickAction["tone"]): "default" | "outline" | "ghost" | "destructive" {
  switch (tone) {
    case "danger":
      return "destructive";
    case "ghost":
      return "ghost";
    case "accent":
      return "default";
    case "default":
    default:
      return "outline";
  }
}

export function EntitySurfaceQuickActions({
  actions,
  className,
  buttonClassName,
  compact = false,
  orientation = "horizontal",
}: EntitySurfaceQuickActionsProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        orientation === "vertical"
          ? "flex w-full flex-col overflow-hidden rounded-[1.35rem] border border-white/65 bg-white/88 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/88"
          : "flex flex-wrap items-center gap-2",
        className,
      )}
    >
      {actions.map((action) => (
        <Button
          key={action.key}
          type="button"
          size={compact ? "sm" : "default"}
          variant={resolveActionVariant(action.tone)}
          className={cn(
            orientation === "vertical"
              ? "h-12 w-full justify-between rounded-none border-0 border-b border-slate-200/80 bg-transparent px-4 text-sm font-semibold text-slate-900 shadow-none last:border-b-0 hover:bg-slate-100/85 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              : compact
                ? "h-8 rounded-xl px-2.5 text-[11px]"
                : "h-9 rounded-2xl px-3 text-xs",
            orientation === "vertical" && action.tone === "danger"
              ? "text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
              : "",
            buttonClassName,
          )}
          disabled={action.disabled}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            action.onClick?.();
          }}
        >
          {orientation === "vertical" ? (
            <>
              <span>{action.label}</span>
              {action.icon ? <span className="shrink-0">{action.icon}</span> : null}
            </>
          ) : (
            <>
              {action.icon}
              <span>{action.label}</span>
            </>
          )}
        </Button>
      ))}
    </div>
  );
}
