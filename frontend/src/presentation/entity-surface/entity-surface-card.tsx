"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { EntitySurfaceAvatar } from "@/presentation/entity-surface/entity-surface-avatar";
import { EntitySurfaceFieldStack } from "@/presentation/entity-surface/entity-surface-field-stack";
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
  EntitySurfaceField,
  EntitySurfaceInlineActionsMode,
  EntitySurfaceLongPressMode,
  EntitySurfaceMotionPreset,
  EntitySurfaceQuickAction,
  EntitySurfaceRichness,
  EntitySurfaceShapePreset,
  EntitySurfaceStatusChip,
  EntitySurfaceViewMode,
  EntitySurfaceVisualStyle,
} from "@/presentation/entity-surface/entity-surface-types";

export type EntitySurfaceCardProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  avatar?: EntitySurfaceAvatarData;
  headerActions?: React.ReactNode;
  fields?: EntitySurfaceField[];
  statusChips?: EntitySurfaceStatusChip[];
  quickActions?: EntitySurfaceQuickAction[];
  viewMode: EntitySurfaceViewMode;
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
  contextOpen?: boolean;
  detailsAffordance?: boolean;
  className?: string;
  onClick?: () => void;
  onLongPress?: () => void;
};

export function EntitySurfaceCard({
  title,
  subtitle,
  description,
  avatar,
  headerActions,
  fields,
  statusChips,
  viewMode,
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
  contextOpen = false,
  className,
  onClick,
  onLongPress,
}: EntitySurfaceCardProps) {
  const tokens = resolveEntitySurfaceTokens({
    density,
    richness,
    colorMode,
    visualStyle,
    effectsPreset,
    shapePreset,
    entityKey,
    viewMode,
    inlineActionsMode,
  });
  const transitionClassName = resolveEntitySurfaceTransitionClassName(
    motionPreset,
    reducedMotion,
  );
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
      window.navigator.vibrate?.(10);
      onLongPress();
      longPressTimerRef.current = null;
    }, 420);
  };

  const handlePointerUp = () => {
    setIsPressed(false);
    clearLongPress();
  };

  const renderedFields = fields?.slice(0, tokens.maxFields);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={cn(
        "group relative",
        transitionClassName,
        contextOpen ? tokens.longPressScaleClassName : isPressed ? "scale-[0.99]" : "",
      )}
    >
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={cn(
          "w-full text-right",
          contextOpen ? tokens.elevatedContainerClassName : tokens.containerClassName,
          tokens.paddingClassName,
          transitionClassName,
          className,
        )}
        onClick={onClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
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
        <div className={cn("flex items-center justify-between", tokens.contentGapClassName)}>
          <div
            className={cn(
              "min-w-0 flex-1",
              tokens.contentGapClassName,
              viewMode === "smart-card" ? "space-y-3" : "space-y-2.5",
            )}
          >
            <div className={cn("flex items-center", tokens.contentGapClassName)}>
              <EntitySurfaceAvatar
                avatar={avatar}
                sizeClassName={tokens.avatarSizeClassName}
                mode={avatarMode}
                className={tokens.avatarToneClassName}
              />

              <div className="min-w-0 flex-1 space-y-1">
                <div className={cn("flex items-center justify-between gap-2", tokens.contentGapClassName)}>
                  <div className="min-w-0">
                    <p className={cn("truncate", tokens.titleClassName)}>{title}</p>
                    {subtitle ? (
                      <p className={cn("mt-0.5 truncate", tokens.subtitleClassName)}>{subtitle}</p>
                    ) : null}
                  </div>

                  {headerActions ? (
                    <div className="flex shrink-0 items-center gap-1 px-1.5 sm:px-2">
                      {headerActions}
                    </div>
                  ) : null}
                </div>

                <EntitySurfaceStatusChips items={statusChips} />

                {tokens.showDescription && description ? (
                  <p className={tokens.descriptionClassName}>{description}</p>
                ) : null}
              </div>
            </div>

            <EntitySurfaceFieldStack
              fields={renderedFields}
              textClassName={tokens.fieldTextClassName}
              mutedTextClassName={tokens.mutedTextClassName}
              maxItems={tokens.maxFields}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
