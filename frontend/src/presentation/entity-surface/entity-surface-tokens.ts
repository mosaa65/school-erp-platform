"use client";

import type {
  EntitySurfaceDensity,
  EntitySurfaceEffectsPreset,
  EntitySurfaceInlineActionsMode,
  EntitySurfaceMotionPreset,
  EntitySurfaceRichness,
  EntitySurfaceShapePreset,
  EntitySurfaceViewMode,
  EntitySurfaceVisualStyle,
} from "@/presentation/entity-surface/entity-surface-types";

type EntitySurfaceTokenInput = {
  density: EntitySurfaceDensity;
  richness: EntitySurfaceRichness;
  visualStyle: EntitySurfaceVisualStyle;
  effectsPreset: EntitySurfaceEffectsPreset;
  shapePreset: EntitySurfaceShapePreset;
  viewMode?: EntitySurfaceViewMode;
  inlineActionsMode?: EntitySurfaceInlineActionsMode;
};

export type ResolvedEntitySurfaceTokens = {
  containerClassName: string;
  elevatedContainerClassName: string;
  contentGapClassName: string;
  paddingClassName: string;
  avatarSizeClassName: string;
  titleClassName: string;
  subtitleClassName: string;
  descriptionClassName: string;
  fieldTextClassName: string;
  mutedTextClassName: string;
  quickActionsContainerClassName: string;
  quickActionSizeClassName: string;
  overlayClassName: string;
  detailsPanelClassName: string;
  gridClassName: string;
  focusRingClassName: string;
  longPressScaleClassName: string;
  showDescription: boolean;
  maxFields: number;
};

function resolveShapeClassName(shapePreset: EntitySurfaceShapePreset): string {
  switch (shapePreset) {
    case "soft":
      return "rounded-[1.4rem]";
    case "geometric":
      return "rounded-[0.95rem]";
    case "rounded":
    default:
      return "rounded-[1.75rem]";
  }
}

function resolveVisualStyleClassName(
  visualStyle: EntitySurfaceVisualStyle,
  effectsPreset: EntitySurfaceEffectsPreset,
): string {
  const effectClassName =
    effectsPreset === "subtle"
      ? "shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)]"
      : effectsPreset === "rich"
        ? "shadow-[0_28px_72px_-34px_rgba(15,23,42,0.42)]"
        : "shadow-[0_22px_56px_-34px_rgba(15,23,42,0.34)]";

  switch (visualStyle) {
    case "soft":
      return `border border-white/70 bg-background/80 ${effectClassName} dark:border-white/10 dark:bg-black/25`;
    case "outline":
      return `border border-[color:var(--app-accent-strong)]/55 bg-transparent ${effectClassName}`;
    case "solid-soft":
      return `border border-[color:var(--app-accent-strong)]/45 bg-[color:var(--app-accent-soft)]/55 ${effectClassName}`;
    case "glass":
    default:
      return `border border-white/70 bg-white/72 backdrop-blur-xl ${effectClassName} dark:border-white/10 dark:bg-white/[0.05]`;
  }
}

function resolvePaddingClassName(
  density: EntitySurfaceDensity,
  viewMode?: EntitySurfaceViewMode,
): string {
  if (viewMode === "dense-row") {
    return density === "compact"
      ? "px-3 py-2.5"
      : density === "comfortable"
        ? "px-4 py-3.5"
        : "px-3.5 py-3";
  }

  return density === "compact" ? "p-3" : density === "comfortable" ? "p-5" : "p-4";
}

function resolveAvatarSizeClassName(
  density: EntitySurfaceDensity,
  viewMode?: EntitySurfaceViewMode,
): string {
  if (viewMode === "smart-card") {
    return density === "compact"
      ? "h-14 w-14"
      : density === "comfortable"
        ? "h-20 w-20"
        : "h-16 w-16";
  }

  if (viewMode === "dense-row") {
    return density === "comfortable" ? "h-12 w-12" : "h-10 w-10";
  }

  return density === "compact" ? "h-11 w-11" : density === "comfortable" ? "h-14 w-14" : "h-12 w-12";
}

function resolveGridClassName(viewMode: EntitySurfaceViewMode): string {
  switch (viewMode) {
    case "grid":
      return "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3";
    case "smart-card":
      return "grid grid-cols-1 gap-3 lg:grid-cols-2";
    default:
      return "grid grid-cols-1 gap-3";
  }
}

export function resolveEntitySurfaceTokens(input: EntitySurfaceTokenInput): ResolvedEntitySurfaceTokens {
  const {
    density,
    richness,
    visualStyle,
    effectsPreset,
    shapePreset,
    viewMode = "list",
    inlineActionsMode = "always",
  } = input;
  const shapeClassName = resolveShapeClassName(shapePreset);
  const visualStyleClassName = resolveVisualStyleClassName(visualStyle, effectsPreset);
  const showDescription = richness !== "minimal" && viewMode !== "dense-row";
  const maxFields = richness === "minimal" ? 2 : richness === "rich" ? 4 : 3;
  const quickActionSizeClassName =
    density === "compact" ? "h-8 rounded-xl px-2.5 text-[11px]" : "h-9 rounded-2xl px-3 text-xs";

  return {
    containerClassName: `${shapeClassName} ${visualStyleClassName} relative overflow-hidden text-slate-900 transition-all duration-300 dark:text-white`,
    elevatedContainerClassName: `${shapeClassName} ${visualStyleClassName} relative overflow-hidden text-slate-900 ring-1 ring-[color:var(--app-accent-strong)]/70 transition-all duration-300 dark:text-white`,
    contentGapClassName:
      density === "compact" ? "gap-2" : density === "comfortable" ? "gap-4" : "gap-3",
    paddingClassName: resolvePaddingClassName(density, viewMode),
    avatarSizeClassName: resolveAvatarSizeClassName(density, viewMode),
    titleClassName:
      viewMode === "smart-card"
        ? "text-sm font-extrabold sm:text-base"
        : "text-sm font-bold sm:text-[15px]",
    subtitleClassName: "text-[11px] text-slate-500 dark:text-white/55",
    descriptionClassName: "text-[11px] leading-5 text-slate-600 dark:text-white/65",
    fieldTextClassName: "text-[11px] leading-5 text-slate-700 dark:text-white/75",
    mutedTextClassName: "text-[11px] text-slate-500 dark:text-white/50",
    quickActionsContainerClassName:
      inlineActionsMode === "hover"
        ? "flex flex-wrap items-center gap-2 opacity-90 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        : "flex flex-wrap items-center gap-2",
    quickActionSizeClassName,
    overlayClassName:
      effectsPreset === "subtle"
        ? "bg-black/18"
        : effectsPreset === "rich"
          ? "bg-black/32 backdrop-blur-sm"
          : "bg-black/24 backdrop-blur-[2px]",
    detailsPanelClassName:
      effectsPreset === "rich"
        ? "shadow-[0_40px_110px_-30px_rgba(15,23,42,0.6)]"
        : "shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)]",
    gridClassName: resolveGridClassName(viewMode),
    focusRingClassName: "ring-1 ring-[color:var(--app-accent-strong)]/70",
    longPressScaleClassName:
      effectsPreset === "subtle"
        ? "scale-[1.01]"
        : effectsPreset === "rich"
          ? "scale-[1.03]"
          : "scale-[1.02]",
    showDescription,
    maxFields,
  };
}

export function resolveEntitySurfaceTransitionClassName(
  motionPreset: EntitySurfaceMotionPreset,
  reducedMotion: boolean,
): string {
  if (reducedMotion || motionPreset === "minimal") {
    return "transition-opacity duration-150";
  }

  if (motionPreset === "focus") {
    return "transition-all duration-300 ease-out";
  }

  if (motionPreset === "calm") {
    return "transition-all duration-200 ease-out";
  }

  return "transition-all duration-250 ease-out";
}
