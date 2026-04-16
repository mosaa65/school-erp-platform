"use client";

import * as React from "react";
import {
  EntitySurfaceContext,
  type EntitySurfaceContextValue,
} from "@/components/providers/entity-surface-provider";

export function useEntitySurface(): EntitySurfaceContextValue {
  const context = React.useContext(EntitySurfaceContext);

  if (!context) {
    throw new Error("يجب استخدام useEntitySurface داخل EntitySurfaceProvider.");
  }

  return context;
}
