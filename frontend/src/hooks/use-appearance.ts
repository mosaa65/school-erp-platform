"use client";

import * as React from "react";
import {
  AppearanceContext,
  type AppearanceContextValue,
} from "@/components/providers/appearance-provider";

export function useAppearance(): AppearanceContextValue {
  const context = React.useContext(AppearanceContext);

  if (!context) {
    throw new Error("يجب استخدام useAppearance داخل AppearanceProvider.");
  }

  return context;
}

