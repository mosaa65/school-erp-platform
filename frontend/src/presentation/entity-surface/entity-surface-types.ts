"use client";

import type * as React from "react";

export type EntitySurfaceViewMode = "dense-row" | "list" | "grid" | "smart-card";
export type EntityDetailsMode = "none" | "inline" | "sheet" | "dialog" | "page";
export type EntitySurfaceDensity = "comfortable" | "balanced" | "compact";
export type EntitySurfaceRichness = "minimal" | "balanced" | "rich";
export type EntitySurfaceVisualStyle = "soft" | "glass" | "outline" | "solid-soft";
export type EntitySurfaceEffectsPreset = "subtle" | "balanced" | "rich";
export type EntitySurfaceShapePreset = "soft" | "rounded" | "geometric";
export type EntitySurfaceAvatarMode = "auto" | "fallback-only" | "hidden";
export type EntitySurfaceInlineActionsMode = "always" | "hover" | "minimal";
export type EntitySurfaceLongPressMode =
  | "enabled"
  | "enabled-with-blur"
  | "enabled-no-blur"
  | "disabled";
export type EntitySurfaceMotionPreset = "calm" | "elegant" | "focus" | "minimal";
export type EntitySurfaceDetailsOpenMode = "screen-default" | "sheet" | "dialog" | "page";
export type EntitySurfaceChipTone =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "neutral"
  | "accent";
export type EntitySurfaceActionTone = "default" | "accent" | "danger" | "ghost";

export type EntitySurfaceField = {
  key?: string;
  label?: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  priority?: "primary" | "secondary";
  className?: string;
};

export type EntitySurfaceStatusChip = {
  key?: string;
  label: string;
  tone?: EntitySurfaceChipTone;
  icon?: React.ReactNode;
};

export type EntitySurfaceQuickAction = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  tone?: EntitySurfaceActionTone;
  disabled?: boolean;
  onClick?: () => void;
};

export type EntitySurfaceAvatarData = {
  src?: string | null;
  alt?: string;
  fallback?: string;
  icon?: React.ReactNode;
  colorSeed?: string;
};

export type EntitySurfaceSummaryConfig = {
  title: string;
  subtitle?: string;
  hero?: string;
  meta?: string[];
  quickActions?: string[];
};

export type EntitySurfacePermissionConfig = {
  summary?: string;
  details?: string;
  quickActions?: string;
  sensitive?: string;
  quickEdit?: string;
  quickDelete?: string;
  [key: string]: string | undefined;
};

export type EntitySurfacePreview = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  avatar?: EntitySurfaceAvatarData;
  fields?: EntitySurfaceField[];
  statusChips?: EntitySurfaceStatusChip[];
  quickActions?: EntitySurfaceQuickAction[];
};

export type EntitySurfaceDefinition<TRecord = unknown> = {
  entityKey: string;
  displayName?: string;
  allowedViewModes?: EntitySurfaceViewMode[];
  defaultViewMode?: EntitySurfaceViewMode;
  detailsMode?: EntityDetailsMode;
  detailsPath?: (record: TRecord) => string;
  summary: EntitySurfaceSummaryConfig;
  permissions?: EntitySurfacePermissionConfig;
  buildPreview?: (record: TRecord) => EntitySurfacePreview;
};

export type EntitySurfacePreferences = {
  defaultViewMode: EntitySurfaceViewMode;
  density: EntitySurfaceDensity;
  richness: EntitySurfaceRichness;
  visualStyle: EntitySurfaceVisualStyle;
  effectsPreset: EntitySurfaceEffectsPreset;
  shapePreset: EntitySurfaceShapePreset;
  avatarMode: EntitySurfaceAvatarMode;
  inlineActionsMode: EntitySurfaceInlineActionsMode;
  detailsOpenMode: EntitySurfaceDetailsOpenMode;
  longPressMode: EntitySurfaceLongPressMode;
  motionPreset: EntitySurfaceMotionPreset;
  reducedMotion: boolean;
};

export type EntitySurfaceOption<TValue extends string> = {
  value: TValue;
  label: string;
  description: string;
};
