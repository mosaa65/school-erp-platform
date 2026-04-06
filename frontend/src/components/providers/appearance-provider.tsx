"use client";

import * as React from "react";
import {
  APPEARANCE_COLOR_PRESETS,
  APPEARANCE_FONT_FAMILIES,
  APPEARANCE_FONT_SCALES,
  DEFAULT_APPEARANCE_PREFERENCES,
  clearAppearancePreferences,
  loadAppearancePreferences,
  resolveAppearanceTokens,
  resolveFontFamilyStack,
  resolveMonoFontFamilyStack,
  resolveFontScaleValue,
  resolveSurfaceMode,
  saveAppearancePreferences,
  type AppearanceColorPreset,
  type AppearanceFontFamily,
  type AppearanceFontScale,
  type AppearancePreferences,
  type AppearanceSurfaceMode,
} from "@/theme/appearance-storage";

export type AppearanceContextValue = {
  preferences: AppearancePreferences;
  isHydrated: boolean;
  resolvedSurfaceMode: Exclude<AppearanceSurfaceMode, "system">;
  mode: AppearanceSurfaceMode;
  preset: AppearanceColorPreset;
  fontFamily: AppearanceFontFamily;
  fontScale: AppearanceFontScale;
  colorPresetOptions: typeof APPEARANCE_COLOR_PRESETS;
  fontFamilyOptions: typeof APPEARANCE_FONT_FAMILIES;
  fontScaleOptions: typeof APPEARANCE_FONT_SCALES;
  setColorPreset: (value: AppearanceColorPreset) => void;
  setSurfaceMode: (value: AppearanceSurfaceMode) => void;
  setFontFamily: (value: AppearanceFontFamily) => void;
  setFontScale: (value: AppearanceFontScale) => void;
  setMode: (value: AppearanceSurfaceMode) => void;
  setPreset: (value: AppearanceColorPreset) => void;
  resetAppearance: () => void;
};

export const AppearanceContext = React.createContext<AppearanceContextValue | undefined>(
  undefined,
);

type AppearanceProviderProps = {
  children: React.ReactNode;
};

function applyAppearanceToDocument(
  preferences: AppearancePreferences,
  resolvedSurfaceMode: Exclude<AppearanceSurfaceMode, "system">,
): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const tokens = resolveAppearanceTokens(preferences.colorPreset, resolvedSurfaceMode);
  const fontFamilyStack = resolveFontFamilyStack(preferences.fontFamily);
  const monoFontFamilyStack = resolveMonoFontFamilyStack(preferences.fontFamily);
  const fontScale = resolveFontScaleValue(preferences.fontScale);

  root.dataset.appearanceColorPreset = preferences.colorPreset;
  root.dataset.appearanceSurfaceMode = preferences.surfaceMode;
  root.dataset.appearanceResolvedSurfaceMode = resolvedSurfaceMode;
  root.dataset.appearanceFontFamily = preferences.fontFamily;
  root.dataset.appearanceFontScale = preferences.fontScale;
  root.classList.toggle("dark", resolvedSurfaceMode === "dark");
  root.style.setProperty("--appearance-font-family", fontFamilyStack);
  root.style.setProperty("--appearance-heading-font-family", fontFamilyStack);
  root.style.setProperty("--appearance-mono-font-family", monoFontFamilyStack);
  root.style.setProperty("--appearance-font-scale", String(fontScale));

  if (tokens) {
    root.style.setProperty("--app-accent-color", tokens.accentColor);
    root.style.setProperty("--app-accent-soft", tokens.accentSoft);
    root.style.setProperty("--app-accent-strong", tokens.accentStrong);
    root.style.setProperty("--app-accent-ring", tokens.accentRing);
  } else {
    root.style.removeProperty("--app-accent-color");
    root.style.removeProperty("--app-accent-soft");
    root.style.removeProperty("--app-accent-strong");
    root.style.removeProperty("--app-accent-ring");
  }
}

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  const [preferences, setPreferences] = React.useState<AppearancePreferences>(
    DEFAULT_APPEARANCE_PREFERENCES,
  );
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [prefersDark, setPrefersDark] = React.useState(false);

  React.useEffect(() => {
    setPreferences(loadAppearancePreferences());
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updatePrefersDark = () => {
      setPrefersDark(mediaQuery.matches);
    };

    updatePrefersDark();
    mediaQuery.addEventListener("change", updatePrefersDark);

    return () => {
      mediaQuery.removeEventListener("change", updatePrefersDark);
    };
  }, []);

  const resolvedSurfaceMode = resolveSurfaceMode(preferences.surfaceMode, prefersDark);

  React.useEffect(() => {
    applyAppearanceToDocument(preferences, resolvedSurfaceMode);
  }, [preferences, resolvedSurfaceMode]);

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveAppearancePreferences(preferences);
  }, [isHydrated, preferences]);

  const setColorPreset = (value: AppearanceColorPreset) => {
    setPreferences((current) => ({ ...current, colorPreset: value }));
  };

  const setSurfaceMode = (value: AppearanceSurfaceMode) => {
    setPreferences((current) => ({ ...current, surfaceMode: value }));
  };

  const setFontFamily = (value: AppearanceFontFamily) => {
    setPreferences((current) => ({ ...current, fontFamily: value }));
  };

  const setFontScale = (value: AppearanceFontScale) => {
    setPreferences((current) => ({ ...current, fontScale: value }));
  };

  const resetAppearance = () => {
    clearAppearancePreferences();
    setPreferences(DEFAULT_APPEARANCE_PREFERENCES);
  };

  const contextValue: AppearanceContextValue = {
    preferences,
    isHydrated,
    resolvedSurfaceMode,
    mode: preferences.surfaceMode,
    preset: preferences.colorPreset,
    fontFamily: preferences.fontFamily,
    fontScale: preferences.fontScale,
    colorPresetOptions: APPEARANCE_COLOR_PRESETS,
    fontFamilyOptions: APPEARANCE_FONT_FAMILIES,
    fontScaleOptions: APPEARANCE_FONT_SCALES,
    setColorPreset,
    setSurfaceMode,
    setFontFamily,
    setFontScale,
    setMode: setSurfaceMode,
    setPreset: setColorPreset,
    resetAppearance,
  };

  return <AppearanceContext.Provider value={contextValue}>{children}</AppearanceContext.Provider>;
}
