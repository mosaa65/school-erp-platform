"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { resolveEntitySurfaceTokens } from "@/presentation/entity-surface/entity-surface-tokens";
import type {
  EntitySurfaceDensity,
  EntitySurfaceEffectsPreset,
  EntitySurfaceInlineActionsMode,
  EntitySurfaceRichness,
  EntitySurfaceShapePreset,
  EntitySurfaceViewMode,
  EntitySurfaceVisualStyle,
} from "@/presentation/entity-surface/entity-surface-types";

type EntitySurfaceGridProps = {
  children: React.ReactNode;
  viewMode: EntitySurfaceViewMode;
  density: EntitySurfaceDensity;
  richness: EntitySurfaceRichness;
  visualStyle: EntitySurfaceVisualStyle;
  effectsPreset: EntitySurfaceEffectsPreset;
  shapePreset: EntitySurfaceShapePreset;
  inlineActionsMode?: EntitySurfaceInlineActionsMode;
  className?: string;
};

export function EntitySurfaceGrid({
  children,
  viewMode,
  density,
  richness,
  visualStyle,
  effectsPreset,
  shapePreset,
  inlineActionsMode = "always",
  className,
}: EntitySurfaceGridProps) {
  const tokens = resolveEntitySurfaceTokens({
    density,
    richness,
    visualStyle,
    effectsPreset,
    shapePreset,
    viewMode,
    inlineActionsMode,
  });

  return <div className={cn(tokens.gridClassName, className)}>{children}</div>;
}
