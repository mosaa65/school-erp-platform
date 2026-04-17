"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveEntitySurfacePaletteClasses } from "@/presentation/entity-surface/entity-surface-tokens";
import type { EntitySurfaceColorMode } from "@/presentation/entity-surface/entity-surface-types";

type EntitySurfaceHeaderActionTone = "preview" | "edit" | "delete";
type EntitySurfaceHeaderActionLabelMode = "always" | "responsive" | "hidden";

type EntitySurfaceHeaderActionButtonProps = {
  label: string;
  icon: React.ReactNode;
  tone: EntitySurfaceHeaderActionTone;
  colorMode?: EntitySurfaceColorMode;
  entityKey?: string;
  labelMode?: EntitySurfaceHeaderActionLabelMode;
  className?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

function resolveToneClassName(
  tone: EntitySurfaceHeaderActionTone,
  colorMode: EntitySurfaceColorMode,
  entityKey?: string,
): string {
  const palette = resolveEntitySurfacePaletteClasses(colorMode, entityKey);

  switch (tone) {
    case "edit":
      return `${palette.borderClassName} bg-transparent ${palette.accentTextClassName} hover:opacity-80`;
    case "delete":
      return "border-rose-500/18 bg-transparent text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300";
    case "preview":
    default:
      return `${palette.borderClassName} bg-transparent ${palette.accentTextClassName} hover:opacity-80`;
  }
}

function renderLabel(label: string, mode: EntitySurfaceHeaderActionLabelMode): React.ReactNode {
  if (mode === "hidden") {
    return <span className="sr-only">{label}</span>;
  }

  if (mode === "responsive") {
    return (
      <>
        <span className="hidden sm:inline">{label}</span>
        <span className="sr-only sm:hidden">{label}</span>
      </>
    );
  }

  return <span>{label}</span>;
}

export function EntitySurfaceHeaderActionButton({
  label,
  icon,
  tone,
  colorMode = "system",
  entityKey,
  labelMode = "responsive",
  className,
  disabled,
  onClick,
}: EntitySurfaceHeaderActionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "h-8 rounded-full border text-[11px] shadow-none [&_svg]:size-3.5",
        resolveToneClassName(tone, colorMode, entityKey),
        labelMode === "hidden" ? "h-8 w-8 min-w-8 px-0" : "gap-1.5 px-2.5",
        className,
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      {icon}
      {renderLabel(label, labelMode)}
    </Button>
  );
}
