"use client";

import * as React from "react";
import type { EntitySurfaceAvatarData, EntitySurfaceAvatarMode } from "@/presentation/entity-surface/entity-surface-types";
import { cn } from "@/lib/utils";

type EntitySurfaceAvatarProps = {
  avatar?: EntitySurfaceAvatarData;
  sizeClassName: string;
  mode?: EntitySurfaceAvatarMode;
  className?: string;
};

function stringToColor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue} 70% 56%)`;
}

function buildFallbackText(input: string | undefined): string {
  if (!input) {
    return "؟";
  }

  const parts = input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "؟";
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}

export function EntitySurfaceAvatar({
  avatar,
  sizeClassName,
  mode = "auto",
  className,
}: EntitySurfaceAvatarProps) {
  if (mode === "hidden") {
    return null;
  }

  const fallbackText = buildFallbackText(avatar?.fallback ?? avatar?.alt);
  const colorSeed = avatar?.colorSeed ?? avatar?.fallback ?? avatar?.alt ?? fallbackText;
  const accentColor = stringToColor(colorSeed);
  const shouldShowImage = mode === "auto" && Boolean(avatar?.src);
  const fallbackStyle = !shouldShowImage && !avatar?.icon
    ? {
        color: accentColor,
        borderColor: `${accentColor}40`,
        backgroundColor: "transparent",
      }
    : undefined;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/8 bg-transparent text-current shadow-none dark:border-white/10 dark:bg-transparent",
        sizeClassName,
        className,
      )}
      style={fallbackStyle}
      aria-hidden="true"
    >
      {shouldShowImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar?.src ?? ""}
          alt={avatar?.alt ?? ""}
          className="h-full w-full object-cover"
        />
      ) : avatar?.icon ? (
        <span className="flex h-full w-full items-center justify-center text-current">
          {avatar.icon}
        </span>
      ) : (
        <span className="text-[11px] font-extrabold tracking-[0.08em] text-current">
          {fallbackText}
        </span>
      )}
    </span>
  );
}
