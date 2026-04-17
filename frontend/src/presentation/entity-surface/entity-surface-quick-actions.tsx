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
}: EntitySurfaceQuickActionsProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {actions.map((action) => (
        <Button
          key={action.key}
          type="button"
          size={compact ? "sm" : "default"}
          variant={resolveActionVariant(action.tone)}
          className={cn(
            compact ? "h-8 rounded-xl px-2.5 text-[11px]" : "h-9 rounded-2xl px-3 text-xs",
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
          {action.icon}
          <span>{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
