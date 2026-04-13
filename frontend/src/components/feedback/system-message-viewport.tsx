"use client";

import * as React from "react";
import type { SystemMessagePosition } from "@/theme/system-message-preferences";
import { cn } from "@/lib/utils";

type SystemMessageViewportProps = {
  position: SystemMessagePosition;
  children: React.ReactNode;
};

function resolveViewportClassName(position: SystemMessagePosition): string {
  switch (position) {
    case "top-center":
      return "top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:w-[min(30rem,calc(100vw-2rem))] sm:-translate-x-1/2";
    case "bottom-center":
      return "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-4 right-4 sm:left-1/2 sm:right-auto sm:w-[min(30rem,calc(100vw-2rem))] sm:-translate-x-1/2";
    case "bottom-left":
      return "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-4 right-4 sm:right-auto sm:w-[min(30rem,calc(100vw-2rem))]";
    case "top-right":
    default:
      return "top-4 left-4 right-4 sm:left-auto sm:w-[min(30rem,calc(100vw-2rem))]";
  }
}

export function SystemMessageViewport({ position, children }: SystemMessageViewportProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[90] flex flex-col gap-3",
        resolveViewportClassName(position),
      )}
    >
      {children}
    </div>
  );
}
