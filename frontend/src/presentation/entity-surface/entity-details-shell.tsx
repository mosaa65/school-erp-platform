"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EntitySurfaceStatusChips } from "@/presentation/entity-surface/entity-surface-status-chips";
import { resolveEntitySurfaceTokens } from "@/presentation/entity-surface/entity-surface-tokens";
import type {
  EntityDetailsMode,
  EntitySurfaceDensity,
  EntitySurfaceEffectsPreset,
  EntitySurfaceQuickAction,
  EntitySurfaceShapePreset,
  EntitySurfaceStatusChip,
  EntitySurfaceVisualStyle,
} from "@/presentation/entity-surface/entity-surface-types";

type EntityDetailsShellProps = {
  open: boolean;
  mode: EntityDetailsMode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  statusChips?: EntitySurfaceStatusChip[];
  actions?: EntitySurfaceQuickAction[];
  density: EntitySurfaceDensity;
  visualStyle: EntitySurfaceVisualStyle;
  effectsPreset: EntitySurfaceEffectsPreset;
  shapePreset: EntitySurfaceShapePreset;
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
};

export function EntityDetailsShell({
  open,
  mode,
  title,
  subtitle,
  statusChips,
  actions,
  density,
  visualStyle,
  effectsPreset,
  shapePreset,
  className,
  children,
  onClose,
}: EntityDetailsShellProps) {
  const tokens = resolveEntitySurfaceTokens({
    density,
    richness: "rich",
    visualStyle,
    effectsPreset,
    shapePreset,
    viewMode: "smart-card",
  });

  if (!open || mode === "none") {
    return null;
  }

  if (mode === "inline") {
    return (
      <section
        className={cn(tokens.containerClassName, tokens.paddingClassName, className)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={tokens.titleClassName}>{title}</h3>
            {subtitle ? <p className={cn("mt-1", tokens.subtitleClassName)}>{subtitle}</p> : null}
            <EntitySurfaceStatusChips items={statusChips} className="mt-2" />
          </div>
          {onClose ? (
            <Button type="button" variant="ghost" size="icon" className="rounded-2xl" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="mt-4">{children}</div>
      </section>
    );
  }

  const maxWidthClassName =
    mode === "page" ? "max-w-5xl" : mode === "sheet" ? "max-w-3xl" : "max-w-2xl";
  const alignmentClassName = mode === "sheet" ? "items-end pb-4 sm:pb-6" : "items-center";

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className={cn("absolute inset-0", tokens.overlayClassName)}
        onClick={onClose}
      />
      <div className={cn("relative flex min-h-full justify-center p-4", alignmentClassName)}>
        <section
          className={cn(
            tokens.containerClassName,
            tokens.detailsPanelClassName,
            tokens.paddingClassName,
            maxWidthClassName,
            "relative w-full overflow-hidden",
            mode === "sheet" ? "rounded-[2rem] rounded-b-[1.5rem]" : "",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={tokens.titleClassName}>{title}</h3>
              {subtitle ? <p className={cn("mt-1", tokens.subtitleClassName)}>{subtitle}</p> : null}
              <EntitySurfaceStatusChips items={statusChips} className="mt-2" />
            </div>
            <div className="flex items-center gap-2">
              {actions?.map((action) => (
                <Button
                  key={action.key}
                  type="button"
                  variant={action.tone === "danger" ? "destructive" : "outline"}
                  size="sm"
                  className="rounded-2xl"
                  onClick={action.onClick}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </Button>
              ))}
              {onClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5">{children}</div>
        </section>
      </div>
    </div>
  );
}
