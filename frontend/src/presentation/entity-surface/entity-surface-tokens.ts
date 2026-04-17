"use client";

import { cn } from "@/lib/utils";
import type {
  EntitySurfaceColorMode,
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
  colorMode?: EntitySurfaceColorMode;
  visualStyle: EntitySurfaceVisualStyle;
  effectsPreset: EntitySurfaceEffectsPreset;
  shapePreset: EntitySurfaceShapePreset;
  entityKey?: string;
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
  avatarToneClassName: string;
  quickActionsContainerClassName: string;
  quickActionSizeClassName: string;
  overlayClassName: string;
  detailsPanelClassName: string;
  gridClassName: string;
  focusRingClassName: string;
  longPressScaleClassName: string;
  accentStripeClassName: string;
  tintOverlayClassName: string;
  showDescription: boolean;
  maxFields: number;
};

type ResolvedEntitySurfacePalette = {
  borderClassName: string;
  softBackgroundClassName: string;
  strongBackgroundClassName: string;
  focusRingClassName: string;
  stripeClassName: string;
  accentTextClassName: string;
  mutedTextClassName: string;
  fieldTextClassName: string;
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
  palette: ResolvedEntitySurfacePalette,
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
      return `border ${palette.borderClassName} bg-background/82 ${effectClassName} dark:bg-black/25`;
    case "outline":
      return `border ${palette.borderClassName} bg-transparent ${effectClassName}`;
    case "solid-soft":
      return `border ${palette.borderClassName} ${palette.strongBackgroundClassName} ${effectClassName}`;
    case "transparent":
      return `border ${palette.borderClassName} bg-transparent ${effectClassName}`;
    case "glass":
    default:
      return `border ${palette.borderClassName} bg-white/72 backdrop-blur-xl ${effectClassName} dark:bg-white/[0.05]`;
  }
}

export function resolveEntitySurfacePaletteClasses(
  colorMode: EntitySurfaceColorMode = "system",
  entityKey?: string,
): ResolvedEntitySurfacePalette {
  const systemColorMode: EntitySurfaceColorMode =
    colorMode === "system"
      ? entityKey === "guardians"
        ? "emerald"
        : entityKey === "student-enrollments"
          ? "sunset"
          : "ocean"
      : colorMode;

  switch (systemColorMode) {
    case "accent":
      return {
        borderClassName: "border-[color:var(--app-accent-strong)]/45 dark:border-[color:var(--app-accent-strong)]/50",
        softBackgroundClassName: "bg-[color:var(--app-accent-soft)]/16 dark:bg-[color:var(--app-accent-soft)]/14",
        strongBackgroundClassName: "bg-[color:var(--app-accent-soft)]/58 dark:bg-[color:var(--app-accent-soft)]/24",
        focusRingClassName: "ring-[color:var(--app-accent-strong)]/70",
        stripeClassName:
          "from-[color:var(--app-accent-color)]/12 via-[color:var(--app-accent-color)]/78 to-[color:var(--app-accent-color)]/12",
        accentTextClassName: "text-[color:var(--app-accent-color)]",
        mutedTextClassName: "text-[color:var(--app-accent-color)]/78",
        fieldTextClassName: "text-[color:var(--app-accent-color)]/88",
      };
    case "custom":
      return {
        borderClassName: "border-[color:var(--entity-surface-custom-strong)]/55 dark:border-[color:var(--entity-surface-custom-strong)]/60",
        softBackgroundClassName: "bg-[color:var(--entity-surface-custom-soft)]",
        strongBackgroundClassName: "bg-[color:var(--entity-surface-custom-soft)]/70",
        focusRingClassName: "ring-[color:var(--entity-surface-custom-ring)]",
        stripeClassName:
          "from-[color:var(--entity-surface-custom-color)]/10 via-[color:var(--entity-surface-custom-color)]/80 to-[color:var(--entity-surface-custom-color)]/10",
        accentTextClassName: "text-[color:var(--entity-surface-custom-color)]",
        mutedTextClassName: "text-[color:var(--entity-surface-custom-color)]/78",
        fieldTextClassName: "text-[color:var(--entity-surface-custom-color)]/88",
      };
    case "emerald":
      return {
        borderClassName: "border-emerald-500/28 dark:border-emerald-400/32",
        softBackgroundClassName: "bg-emerald-500/10 dark:bg-emerald-400/10",
        strongBackgroundClassName: "bg-emerald-500/14 dark:bg-emerald-400/14",
        focusRingClassName: "ring-emerald-500/55 dark:ring-emerald-400/55",
        stripeClassName: "from-emerald-400/20 via-emerald-500/85 to-emerald-400/20",
        accentTextClassName: "text-emerald-700 dark:text-emerald-300",
        mutedTextClassName: "text-emerald-700/80 dark:text-emerald-300/80",
        fieldTextClassName: "text-emerald-800/90 dark:text-emerald-200/88",
      };
    case "sunset":
      return {
        borderClassName: "border-amber-500/28 dark:border-orange-400/32",
        softBackgroundClassName: "bg-amber-500/10 dark:bg-orange-400/10",
        strongBackgroundClassName: "bg-amber-500/16 dark:bg-orange-400/14",
        focusRingClassName: "ring-amber-500/55 dark:ring-orange-400/55",
        stripeClassName: "from-amber-400/20 via-orange-500/85 to-amber-400/20",
        accentTextClassName: "text-amber-700 dark:text-orange-300",
        mutedTextClassName: "text-amber-700/80 dark:text-orange-300/80",
        fieldTextClassName: "text-amber-800/90 dark:text-orange-200/88",
      };
    case "berry":
      return {
        borderClassName: "border-fuchsia-500/26 dark:border-rose-400/30",
        softBackgroundClassName: "bg-fuchsia-500/10 dark:bg-rose-400/10",
        strongBackgroundClassName: "bg-fuchsia-500/15 dark:bg-rose-400/14",
        focusRingClassName: "ring-fuchsia-500/55 dark:ring-rose-400/55",
        stripeClassName: "from-fuchsia-400/20 via-rose-500/85 to-fuchsia-400/20",
        accentTextClassName: "text-fuchsia-700 dark:text-rose-300",
        mutedTextClassName: "text-fuchsia-700/80 dark:text-rose-300/80",
        fieldTextClassName: "text-fuchsia-800/90 dark:text-rose-200/88",
      };
    case "ocean":
    default:
      return {
        borderClassName: "border-sky-500/26 dark:border-cyan-400/30",
        softBackgroundClassName: "bg-sky-500/10 dark:bg-cyan-400/10",
        strongBackgroundClassName: "bg-sky-500/14 dark:bg-cyan-400/14",
        focusRingClassName: "ring-sky-500/55 dark:ring-cyan-400/55",
        stripeClassName: "from-sky-400/20 via-cyan-500/85 to-sky-400/20",
        accentTextClassName: "text-sky-700 dark:text-cyan-300",
        mutedTextClassName: "text-sky-700/80 dark:text-cyan-300/80",
        fieldTextClassName: "text-sky-800/90 dark:text-cyan-200/88",
      };
  }
}

function resolvePaddingClassName(
  density: EntitySurfaceDensity,
  viewMode?: EntitySurfaceViewMode,
): string {
  if (viewMode === "dense-row") {
    return density === "compact"
      ? "px-2.75 py-2"
      : density === "comfortable"
        ? "px-3.5 py-2.75"
        : "px-3 py-2.35";
  }

  return density === "compact" ? "p-2.75" : density === "comfortable" ? "p-4" : "p-3.25";
}

function resolveAvatarSizeClassName(
  density: EntitySurfaceDensity,
  viewMode?: EntitySurfaceViewMode,
): string {
  if (viewMode === "smart-card") {
    return density === "compact"
      ? "h-12 w-12"
      : density === "comfortable"
        ? "h-16 w-16"
        : "h-14 w-14";
  }

  if (viewMode === "dense-row") {
    return density === "comfortable" ? "h-10 w-10" : "h-8.5 w-8.5";
  }

  return density === "compact" ? "h-9 w-9" : density === "comfortable" ? "h-11 w-11" : "h-10 w-10";
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
    colorMode = "system",
    visualStyle,
    effectsPreset,
    shapePreset,
    entityKey,
    viewMode = "list",
    inlineActionsMode = "always",
  } = input;
  const palette = resolveEntitySurfacePaletteClasses(colorMode, entityKey);
  const shapeClassName = resolveShapeClassName(shapePreset);
  const visualStyleClassName = resolveVisualStyleClassName(
    palette,
    visualStyle,
    effectsPreset,
  );
  const showDescription = richness !== "minimal" && viewMode !== "dense-row";
  const maxFields = richness === "minimal" ? 2 : richness === "rich" ? 4 : 3;
  const quickActionSizeClassName =
    density === "compact" ? "h-7 rounded-full px-2 text-[11px]" : "h-8 rounded-full px-2.5 text-xs";
  const usesTransparentStyle = visualStyle === "transparent";

  return {
    containerClassName: `${shapeClassName} ${visualStyleClassName} relative overflow-hidden text-slate-900 transition-all duration-300 dark:text-white`,
    elevatedContainerClassName: `${shapeClassName} ${visualStyleClassName} relative overflow-hidden text-slate-900 ring-1 ${palette.focusRingClassName} transition-all duration-300 dark:text-white`,
    contentGapClassName:
      density === "compact" ? "gap-2" : density === "comfortable" ? "gap-4" : "gap-3",
    paddingClassName: resolvePaddingClassName(density, viewMode),
    avatarSizeClassName: resolveAvatarSizeClassName(density, viewMode),
    titleClassName:
      viewMode === "smart-card"
        ? cn("text-sm font-extrabold sm:text-base", usesTransparentStyle ? palette.accentTextClassName : "")
        : cn("text-sm font-bold sm:text-[15px]", usesTransparentStyle ? palette.accentTextClassName : ""),
    subtitleClassName: usesTransparentStyle
      ? `text-[11px] ${palette.mutedTextClassName}`
      : "text-[11px] text-slate-500 dark:text-white/55",
    descriptionClassName: usesTransparentStyle
      ? `text-[11px] leading-5 ${palette.fieldTextClassName}`
      : "text-[11px] leading-5 text-slate-600 dark:text-white/65",
    fieldTextClassName: usesTransparentStyle
      ? `text-[11px] leading-5 ${palette.fieldTextClassName}`
      : "text-[11px] leading-5 text-slate-700 dark:text-white/75",
    mutedTextClassName: usesTransparentStyle
      ? `text-[11px] ${palette.mutedTextClassName}`
      : "text-[11px] text-slate-500 dark:text-white/50",
    avatarToneClassName: palette.accentTextClassName,
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
    focusRingClassName: `ring-1 ${palette.focusRingClassName}`,
    longPressScaleClassName:
      effectsPreset === "subtle"
        ? "scale-[1.01]"
        : effectsPreset === "rich"
          ? "scale-[1.03]"
          : "scale-[1.02]",
    accentStripeClassName: palette.stripeClassName,
    tintOverlayClassName: palette.softBackgroundClassName,
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
