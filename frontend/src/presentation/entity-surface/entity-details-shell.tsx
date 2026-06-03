"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EntitySurfaceCard } from "@/presentation/entity-surface/entity-surface-card";
import { EntitySurfaceStatusChips } from "@/presentation/entity-surface/entity-surface-status-chips";
import { resolveEntitySurfaceTokens } from "@/presentation/entity-surface/entity-surface-tokens";
import type { EntitySurfaceCardProps } from "@/presentation/entity-surface/entity-surface-card";
import type {
  EntitySurfaceColorMode,
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
  colorMode?: EntitySurfaceColorMode;
  entityKey?: string;
  previewCard?: Omit<EntitySurfaceCardProps, "onClick" | "onLongPress">;
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
  colorMode = "system",
  entityKey,
  previewCard,
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
    colorMode,
    entityKey,
    viewMode: "smart-card",
  });

  if (!open || mode === "none") {
    return null;
  }

  const actionsBar = actions && actions.length > 0 ? (
    <div className="mt-3 flex max-w-full items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {actions.map((action) => (
        <Button
          key={action.key}
          type="button"
          variant={action.tone === "danger" ? "destructive" : "outline"}
          size="sm"
          className={cn(
            "h-9 shrink-0 rounded-full px-3 text-xs",
            action.tone === "danger"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
              : "",
          )}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.icon}
          <span>{action.label}</span>
        </Button>
      ))}
    </div>
  ) : null;

  const previewCardNode = previewCard ? (
    <div className="mt-3 shrink-0">
      <EntitySurfaceCard
        {...previewCard}
        contextOpen
        longPressMode="disabled"
        onClick={undefined}
        onLongPress={undefined}
      />
    </div>
  ) : null;

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
        {actionsBar}
        {previewCardNode}
        <div className="mt-4">{children}</div>
      </section>
    );
  }

  const maxWidthClassName =
    mode === "page" ? "max-w-5xl" : mode === "sheet" ? "max-w-3xl" : "max-w-2xl";
  const alignmentClassName = mode === "sheet" ? "items-end pb-4 sm:pb-6" : "items-center";
  const heightClassName =
    mode === "sheet"
      ? "h-[min(58dvh,36rem)] sm:h-auto sm:max-h-[82dvh]"
      : "max-h-[min(86dvh,50rem)]";

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden">
      <div
        className={cn("absolute inset-0", tokens.overlayClassName)}
        onClick={onClose}
      />
      <div className={cn("relative flex min-h-dvh justify-center p-3 sm:p-4", alignmentClassName)}>
        <section
          className={cn(
            tokens.containerClassName,
            tokens.detailsPanelClassName,
            tokens.paddingClassName,
            maxWidthClassName,
            heightClassName,
            "relative flex w-full flex-col overflow-hidden",
            mode === "sheet" ? "rounded-[2rem] rounded-b-[1.5rem]" : "",
            className,
          )}
        >
          <div className="shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={tokens.titleClassName}>{title}</h3>
              {subtitle ? <p className={cn("mt-1", tokens.subtitleClassName)}>{subtitle}</p> : null}
              <EntitySurfaceStatusChips items={statusChips} className="mt-2" />
            </div>
              {onClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-2xl"
                  onClick={onClose}
                  aria-label="إغلاق المعاينة"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            {actionsBar}
            {previewCardNode}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[1.35rem] pr-0.5 [scrollbar-width:thin]">
            <div className="pb-1">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
