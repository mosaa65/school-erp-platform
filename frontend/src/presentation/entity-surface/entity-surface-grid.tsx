"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { resolveEntitySurfaceTokens } from "@/presentation/entity-surface/entity-surface-tokens";
import type {
  EntitySurfaceColorMode,
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
  colorMode?: EntitySurfaceColorMode;
  visualStyle: EntitySurfaceVisualStyle;
  effectsPreset: EntitySurfaceEffectsPreset;
  shapePreset: EntitySurfaceShapePreset;
  entityKey?: string;
  inlineActionsMode?: EntitySurfaceInlineActionsMode;
  className?: string;
};

export function EntitySurfaceGrid({
  children,
  viewMode,
  density,
  richness,
  colorMode = "system",
  visualStyle,
  effectsPreset,
  shapePreset,
  entityKey,
  inlineActionsMode = "always",
  className,
}: EntitySurfaceGridProps) {
  const tokens = resolveEntitySurfaceTokens({
    density,
    richness,
    colorMode,
    visualStyle,
    effectsPreset,
    shapePreset,
    entityKey,
    viewMode,
    inlineActionsMode,
  });

  return <div className={cn(tokens.gridClassName, className)}>{children}</div>;
}
