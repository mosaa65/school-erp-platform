"use client";

import * as React from "react";
import {
  NavigationPreferencesContext,
  type NavigationPreferencesContextValue,
} from "@/components/providers/navigation-preferences-provider";

export function useNavigationPreferences(): NavigationPreferencesContextValue {
  const context = React.useContext(NavigationPreferencesContext);

  if (!context) {
    throw new Error("يجب استخدام useNavigationPreferences داخل NavigationPreferencesProvider.");
  }

  return context;
}
