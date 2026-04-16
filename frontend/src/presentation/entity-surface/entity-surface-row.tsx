"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntitySurfaceAvatar } from "@/presentation/entity-surface/entity-surface-avatar";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import { EntitySurfaceStatusChips } from "@/presentation/entity-surface/entity-surface-status-chips";
import {
  resolveEntitySurfaceTokens,
  resolveEntitySurfaceTransitionClassName,
} from "@/presentation/entity-surface/entity-surface-tokens";
import type {
  EntitySurfaceAvatarData,
  EntitySurfaceDensity,
  EntitySurfaceEffectsPreset,
  EntitySurfaceInlineActionsMode,
  EntitySurfaceLongPressMode,
  EntitySurfaceMotionPreset,
  EntitySurfaceQuickAction,
  EntitySurfaceRichness,
  EntitySurfaceShapePreset,
  EntitySurfaceStatusChip,
  EntitySurfaceVisualStyle,
} from "@/presentation/entity-surface/entity-surface-types";

type EntitySurfaceRowProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  avatar?: EntitySurfaceAvatarData;
  statusChips?: EntitySurfaceStatusChip[];
  quickActions?: EntitySurfaceQuickAction[];
  density: EntitySurfaceDensity;
  richness: EntitySurfaceRichness;
  visualStyle: EntitySurfaceVisualStyle;
  effectsPreset: EntitySurfaceEffectsPreset;
  shapePreset: EntitySurfaceShapePreset;
  inlineActionsMode?: EntitySurfaceInlineActionsMode;
  motionPreset?: EntitySurfaceMotionPreset;
  reducedMotion?: boolean;
  longPressMode?: EntitySurfaceLongPressMode;
  avatarMode?: "auto" | "fallback-only" | "hidden";
  detailsAffordance?: boolean;
  contextOpen?: boolean;
  className?: string;
  onClick?: () => void;
  onLongPress?: () => void;
};

export function EntitySurfaceRow({
  title,
  subtitle,
  meta,
  avatar,
  statusChips,
  quickActions,
  density,
  richness,
  visualStyle,
  effectsPreset,
  shapePreset,
  inlineActionsMode = "always",
  motionPreset = "elegant",
  reducedMotion = false,
  longPressMode = "enabled-with-blur",
  avatarMode = "auto",
  detailsAffordance = false,
  contextOpen = false,
  className,
  onClick,
  onLongPress,
}: EntitySurfaceRowProps) {
  const tokens = resolveEntitySurfaceTokens({
    density,
    richness,
    visualStyle,
    effectsPreset,
    shapePreset,
    viewMode: "dense-row",
    inlineActionsMode,
  });
  const longPressTimerRef = React.useRef<number | null>(null);
  const [isPressed, setIsPressed] = React.useState(false);
  const clearLongPress = React.useCallback(() => {
    if (typeof longPressTimerRef.current === "number") {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => clearLongPress, [clearLongPress]);

  const handlePointerDown = () => {
    setIsPressed(true);

    if (!onLongPress || longPressMode === "disabled") {
      return;
    }

    longPressTimerRef.current = window.setTimeout(() => {
      onLongPress();
      longPressTimerRef.current = null;
    }, 420);
  };

  const handlePointerUp = () => {
    setIsPressed(false);
    clearLongPress();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={cn(
        "group w-full text-right",
        contextOpen ? tokens.longPressScaleClassName : isPressed ? "scale-[0.995]" : "",
        contextOpen ? tokens.elevatedContainerClassName : tokens.containerClassName,
        tokens.paddingClassName,
        resolveEntitySurfaceTransitionClassName(motionPreset, reducedMotion),
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <EntitySurfaceAvatar
            avatar={avatar}
            sizeClassName={tokens.avatarSizeClassName}
            mode={avatarMode}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className={cn("truncate", tokens.titleClassName)}>{title}</p>
              {detailsAffordance ? (
                <ChevronLeft className={cn("h-4 w-4 shrink-0", tokens.mutedTextClassName)} />
              ) : null}
            </div>
            {subtitle ? <p className={cn("mt-0.5 truncate", tokens.subtitleClassName)}>{subtitle}</p> : null}
            {meta ? <div className={cn("mt-1 truncate", tokens.fieldTextClassName)}>{meta}</div> : null}
            <EntitySurfaceStatusChips items={statusChips} className="mt-1.5" />
          </div>
        </div>

        {quickActions && quickActions.length > 0 ? (
          <EntitySurfaceQuickActions
            actions={quickActions.slice(0, inlineActionsMode === "minimal" ? 1 : 2)}
            className={tokens.quickActionsContainerClassName}
            buttonClassName={tokens.quickActionSizeClassName}
            compact
          />
        ) : null}
      </div>
    </div>
  );
}
