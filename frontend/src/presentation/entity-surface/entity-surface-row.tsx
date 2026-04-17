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
  EntitySurfaceColorMode,
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
  headerActions?: React.ReactNode;
  statusChips?: EntitySurfaceStatusChip[];
  quickActions?: EntitySurfaceQuickAction[];
  density: EntitySurfaceDensity;
  richness: EntitySurfaceRichness;
  colorMode?: EntitySurfaceColorMode;
  visualStyle: EntitySurfaceVisualStyle;
  effectsPreset: EntitySurfaceEffectsPreset;
  shapePreset: EntitySurfaceShapePreset;
  entityKey?: string;
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
  headerActions,
  statusChips,
  quickActions,
  density,
  richness,
  colorMode = "system",
  visualStyle,
  effectsPreset,
  shapePreset,
  entityKey,
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
    colorMode,
    visualStyle,
    effectsPreset,
    shapePreset,
    entityKey,
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
      <span
        className={cn(
          "pointer-events-none absolute inset-0 opacity-100",
          tokens.tintOverlayClassName,
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r",
          tokens.accentStripeClassName,
        )}
      />
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <EntitySurfaceAvatar
            avatar={avatar}
            sizeClassName={tokens.avatarSizeClassName}
            mode={avatarMode}
            className={tokens.avatarToneClassName}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className={cn("truncate", tokens.titleClassName)}>{title}</p>
              <div className="flex shrink-0 items-center gap-1 px-1.5 sm:px-2">
                {headerActions}
                {detailsAffordance ? (
                  <ChevronLeft className={cn("h-3.5 w-3.5", tokens.mutedTextClassName)} />
                ) : null}
              </div>
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
