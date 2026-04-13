"use client";

import * as React from "react";
import {
  DEFAULT_NAVIGATION_PREFERENCES,
  NAVIGATION_DENSITY_OPTIONS,
  NAVIGATION_LANDING_PAGE_OPTIONS,
  NAVIGATION_LAYOUT_OPTIONS,
  NAVIGATION_SYSTEMS_VIEW_MODE_OPTIONS,
  MOBILE_NAVIGATOR_PRESENTATION_OPTIONS,
  clearNavigationPreferences,
  loadNavigationPreferences,
  saveNavigationPreferences,
  type MobileNavigatorPresentation,
  type NavigationDensity,
  type NavigationLandingPage,
  type NavigationLayoutMode,
  type NavigationPreferences,
  type NavigationSystemsViewMode,
} from "@/navigation/navigation-preferences";

export type NavigationPreferencesContextValue = {
  preferences: NavigationPreferences;
  isHydrated: boolean;
  layoutMode: NavigationLayoutMode;
  mobilePresentation: MobileNavigatorPresentation;
  landingPage: NavigationLandingPage;
  density: NavigationDensity;
  systemsViewMode: NavigationSystemsViewMode;
  showHeaderMenuButton: boolean;
  layoutOptions: typeof NAVIGATION_LAYOUT_OPTIONS;
  mobilePresentationOptions: typeof MOBILE_NAVIGATOR_PRESENTATION_OPTIONS;
  landingPageOptions: typeof NAVIGATION_LANDING_PAGE_OPTIONS;
  densityOptions: typeof NAVIGATION_DENSITY_OPTIONS;
  systemsViewModeOptions: typeof NAVIGATION_SYSTEMS_VIEW_MODE_OPTIONS;
  setLayoutMode: (value: NavigationLayoutMode) => void;
  setMobilePresentation: (value: MobileNavigatorPresentation) => void;
  setLandingPage: (value: NavigationLandingPage) => void;
  setDensity: (value: NavigationDensity) => void;
  setSystemsViewMode: (value: NavigationSystemsViewMode) => void;
  setShowHeaderMenuButton: (value: boolean) => void;
  resetNavigationPreferences: () => void;
};

export const NavigationPreferencesContext = React.createContext<
  NavigationPreferencesContextValue | undefined
>(undefined);

type NavigationPreferencesProviderProps = {
  children: React.ReactNode;
};

function applyNavigationPreferencesToDocument(preferences: NavigationPreferences): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.navigationLayoutMode = preferences.layoutMode;
  root.dataset.navigationMobilePresentation = preferences.mobilePresentation;
  root.dataset.navigationLandingPage = preferences.landingPage;
  root.dataset.navigationDensity = preferences.density;
  root.dataset.navigationSystemsViewMode = preferences.systemsViewMode;
  root.dataset.navigationHeaderMenuButton = preferences.showHeaderMenuButton
    ? "visible"
    : "hidden";
}

export function NavigationPreferencesProvider({
  children,
}: NavigationPreferencesProviderProps) {
  const [preferences, setPreferences] = React.useState<NavigationPreferences>(
    DEFAULT_NAVIGATION_PREFERENCES,
  );
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setPreferences(loadNavigationPreferences());
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    applyNavigationPreferencesToDocument(preferences);
  }, [preferences]);

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveNavigationPreferences(preferences);
  }, [isHydrated, preferences]);

  const setLayoutMode = (value: NavigationLayoutMode) => {
    setPreferences((current) => ({ ...current, layoutMode: value }));
  };

  const setMobilePresentation = (value: MobileNavigatorPresentation) => {
    setPreferences((current) => ({ ...current, mobilePresentation: value }));
  };

  const setLandingPage = (value: NavigationLandingPage) => {
    setPreferences((current) => ({ ...current, landingPage: value }));
  };

  const setDensity = (value: NavigationDensity) => {
    setPreferences((current) => ({ ...current, density: value }));
  };

  const setSystemsViewMode = (value: NavigationSystemsViewMode) => {
    setPreferences((current) => ({ ...current, systemsViewMode: value }));
  };

  const setShowHeaderMenuButton = (value: boolean) => {
    setPreferences((current) => ({ ...current, showHeaderMenuButton: value }));
  };

  const resetNavigationPreferences = () => {
    clearNavigationPreferences();
    setPreferences(DEFAULT_NAVIGATION_PREFERENCES);
  };

  const contextValue: NavigationPreferencesContextValue = {
    preferences,
    isHydrated,
    layoutMode: preferences.layoutMode,
    mobilePresentation: preferences.mobilePresentation,
    landingPage: preferences.landingPage,
    density: preferences.density,
    systemsViewMode: preferences.systemsViewMode,
    showHeaderMenuButton: preferences.showHeaderMenuButton,
    layoutOptions: NAVIGATION_LAYOUT_OPTIONS,
    mobilePresentationOptions: MOBILE_NAVIGATOR_PRESENTATION_OPTIONS,
    landingPageOptions: NAVIGATION_LANDING_PAGE_OPTIONS,
    densityOptions: NAVIGATION_DENSITY_OPTIONS,
    systemsViewModeOptions: NAVIGATION_SYSTEMS_VIEW_MODE_OPTIONS,
    setLayoutMode,
    setMobilePresentation,
    setLandingPage,
    setDensity,
    setSystemsViewMode,
    setShowHeaderMenuButton,
    resetNavigationPreferences,
  };

  return (
    <NavigationPreferencesContext.Provider value={contextValue}>
      {children}
    </NavigationPreferencesContext.Provider>
  );
}
