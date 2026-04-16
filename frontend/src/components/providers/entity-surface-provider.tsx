"use client";

import * as React from "react";
import {
  clearEntitySurfacePreferences,
  DEFAULT_ENTITY_SURFACE_PREFERENCES,
  ENTITY_SURFACE_AVATAR_OPTIONS,
  ENTITY_SURFACE_DENSITY_OPTIONS,
  ENTITY_SURFACE_DETAILS_OPEN_MODE_OPTIONS,
  ENTITY_SURFACE_EFFECTS_OPTIONS,
  ENTITY_SURFACE_INLINE_ACTIONS_OPTIONS,
  ENTITY_SURFACE_LONG_PRESS_OPTIONS,
  ENTITY_SURFACE_MOTION_OPTIONS,
  ENTITY_SURFACE_RICHNESS_OPTIONS,
  ENTITY_SURFACE_SHAPE_OPTIONS,
  ENTITY_SURFACE_VIEW_MODE_OPTIONS,
  ENTITY_SURFACE_VISUAL_STYLE_OPTIONS,
  loadEntitySurfacePreferences,
  saveEntitySurfacePreferences,
} from "@/presentation/entity-surface/entity-surface-preferences";
import type {
  EntitySurfaceAvatarMode,
  EntitySurfaceDensity,
  EntitySurfaceDetailsOpenMode,
  EntitySurfaceEffectsPreset,
  EntitySurfaceInlineActionsMode,
  EntitySurfaceLongPressMode,
  EntitySurfaceMotionPreset,
  EntitySurfacePreferences,
  EntitySurfaceRichness,
  EntitySurfaceShapePreset,
  EntitySurfaceViewMode,
  EntitySurfaceVisualStyle,
} from "@/presentation/entity-surface/entity-surface-types";

export type EntitySurfaceContextValue = {
  preferences: EntitySurfacePreferences;
  isHydrated: boolean;
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
  viewModeOptions: typeof ENTITY_SURFACE_VIEW_MODE_OPTIONS;
  densityOptions: typeof ENTITY_SURFACE_DENSITY_OPTIONS;
  richnessOptions: typeof ENTITY_SURFACE_RICHNESS_OPTIONS;
  visualStyleOptions: typeof ENTITY_SURFACE_VISUAL_STYLE_OPTIONS;
  effectsOptions: typeof ENTITY_SURFACE_EFFECTS_OPTIONS;
  shapeOptions: typeof ENTITY_SURFACE_SHAPE_OPTIONS;
  avatarOptions: typeof ENTITY_SURFACE_AVATAR_OPTIONS;
  inlineActionsOptions: typeof ENTITY_SURFACE_INLINE_ACTIONS_OPTIONS;
  detailsOpenModeOptions: typeof ENTITY_SURFACE_DETAILS_OPEN_MODE_OPTIONS;
  longPressOptions: typeof ENTITY_SURFACE_LONG_PRESS_OPTIONS;
  motionOptions: typeof ENTITY_SURFACE_MOTION_OPTIONS;
  setDefaultViewMode: (value: EntitySurfaceViewMode) => void;
  setDensity: (value: EntitySurfaceDensity) => void;
  setRichness: (value: EntitySurfaceRichness) => void;
  setVisualStyle: (value: EntitySurfaceVisualStyle) => void;
  setEffectsPreset: (value: EntitySurfaceEffectsPreset) => void;
  setShapePreset: (value: EntitySurfaceShapePreset) => void;
  setAvatarMode: (value: EntitySurfaceAvatarMode) => void;
  setInlineActionsMode: (value: EntitySurfaceInlineActionsMode) => void;
  setDetailsOpenMode: (value: EntitySurfaceDetailsOpenMode) => void;
  setLongPressMode: (value: EntitySurfaceLongPressMode) => void;
  setMotionPreset: (value: EntitySurfaceMotionPreset) => void;
  setReducedMotion: (value: boolean) => void;
  resetPreferences: () => void;
};

export const EntitySurfaceContext = React.createContext<EntitySurfaceContextValue | undefined>(
  undefined,
);

type EntitySurfaceProviderProps = {
  children: React.ReactNode;
};

function applyEntitySurfacePreferencesToDocument(preferences: EntitySurfacePreferences): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.entitySurfaceViewMode = preferences.defaultViewMode;
  root.dataset.entitySurfaceDensity = preferences.density;
  root.dataset.entitySurfaceRichness = preferences.richness;
  root.dataset.entitySurfaceVisualStyle = preferences.visualStyle;
  root.dataset.entitySurfaceEffects = preferences.effectsPreset;
  root.dataset.entitySurfaceShape = preferences.shapePreset;
  root.dataset.entitySurfaceAvatarMode = preferences.avatarMode;
  root.dataset.entitySurfaceInlineActions = preferences.inlineActionsMode;
  root.dataset.entitySurfaceDetailsMode = preferences.detailsOpenMode;
  root.dataset.entitySurfaceLongPress = preferences.longPressMode;
  root.dataset.entitySurfaceMotion = preferences.motionPreset;
  root.dataset.entitySurfaceReducedMotion = preferences.reducedMotion ? "true" : "false";
}

export function EntitySurfaceProvider({ children }: EntitySurfaceProviderProps) {
  const [preferences, setPreferences] = React.useState<EntitySurfacePreferences>(
    DEFAULT_ENTITY_SURFACE_PREFERENCES,
  );
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setPreferences(loadEntitySurfacePreferences());
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    applyEntitySurfacePreferencesToDocument(preferences);
  }, [preferences]);

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveEntitySurfacePreferences(preferences);
  }, [isHydrated, preferences]);

  const setDefaultViewMode = (value: EntitySurfaceViewMode) => {
    setPreferences((current) => ({ ...current, defaultViewMode: value }));
  };

  const setDensity = (value: EntitySurfaceDensity) => {
    setPreferences((current) => ({ ...current, density: value }));
  };

  const setRichness = (value: EntitySurfaceRichness) => {
    setPreferences((current) => ({ ...current, richness: value }));
  };

  const setVisualStyle = (value: EntitySurfaceVisualStyle) => {
    setPreferences((current) => ({ ...current, visualStyle: value }));
  };

  const setEffectsPreset = (value: EntitySurfaceEffectsPreset) => {
    setPreferences((current) => ({ ...current, effectsPreset: value }));
  };

  const setShapePreset = (value: EntitySurfaceShapePreset) => {
    setPreferences((current) => ({ ...current, shapePreset: value }));
  };

  const setAvatarMode = (value: EntitySurfaceAvatarMode) => {
    setPreferences((current) => ({ ...current, avatarMode: value }));
  };

  const setInlineActionsMode = (value: EntitySurfaceInlineActionsMode) => {
    setPreferences((current) => ({ ...current, inlineActionsMode: value }));
  };

  const setDetailsOpenMode = (value: EntitySurfaceDetailsOpenMode) => {
    setPreferences((current) => ({ ...current, detailsOpenMode: value }));
  };

  const setLongPressMode = (value: EntitySurfaceLongPressMode) => {
    setPreferences((current) => ({ ...current, longPressMode: value }));
  };

  const setMotionPreset = (value: EntitySurfaceMotionPreset) => {
    setPreferences((current) => ({ ...current, motionPreset: value }));
  };

  const setReducedMotion = (value: boolean) => {
    setPreferences((current) => ({ ...current, reducedMotion: value }));
  };

  const resetPreferences = () => {
    clearEntitySurfacePreferences();
    setPreferences(DEFAULT_ENTITY_SURFACE_PREFERENCES);
  };

  const contextValue = React.useMemo<EntitySurfaceContextValue>(
    () => ({
      preferences,
      isHydrated,
      defaultViewMode: preferences.defaultViewMode,
      density: preferences.density,
      richness: preferences.richness,
      visualStyle: preferences.visualStyle,
      effectsPreset: preferences.effectsPreset,
      shapePreset: preferences.shapePreset,
      avatarMode: preferences.avatarMode,
      inlineActionsMode: preferences.inlineActionsMode,
      detailsOpenMode: preferences.detailsOpenMode,
      longPressMode: preferences.longPressMode,
      motionPreset: preferences.motionPreset,
      reducedMotion: preferences.reducedMotion,
      viewModeOptions: ENTITY_SURFACE_VIEW_MODE_OPTIONS,
      densityOptions: ENTITY_SURFACE_DENSITY_OPTIONS,
      richnessOptions: ENTITY_SURFACE_RICHNESS_OPTIONS,
      visualStyleOptions: ENTITY_SURFACE_VISUAL_STYLE_OPTIONS,
      effectsOptions: ENTITY_SURFACE_EFFECTS_OPTIONS,
      shapeOptions: ENTITY_SURFACE_SHAPE_OPTIONS,
      avatarOptions: ENTITY_SURFACE_AVATAR_OPTIONS,
      inlineActionsOptions: ENTITY_SURFACE_INLINE_ACTIONS_OPTIONS,
      detailsOpenModeOptions: ENTITY_SURFACE_DETAILS_OPEN_MODE_OPTIONS,
      longPressOptions: ENTITY_SURFACE_LONG_PRESS_OPTIONS,
      motionOptions: ENTITY_SURFACE_MOTION_OPTIONS,
      setDefaultViewMode,
      setDensity,
      setRichness,
      setVisualStyle,
      setEffectsPreset,
      setShapePreset,
      setAvatarMode,
      setInlineActionsMode,
      setDetailsOpenMode,
      setLongPressMode,
      setMotionPreset,
      setReducedMotion,
      resetPreferences,
    }),
    [isHydrated, preferences],
  );

  return (
    <EntitySurfaceContext.Provider value={contextValue}>
      {children}
    </EntitySurfaceContext.Provider>
  );
}
