"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  BellRing,
  CircleX,
  LoaderCircle,
  X,
} from "lucide-react";
import { useAppearance } from "@/hooks/use-appearance";
import { cn } from "@/lib/utils";
import {
  getSystemMessageToneLabel,
  resolveSystemMessageDensityTokens,
  resolveSystemMessageMotionTokens,
  resolveSystemMessageTonePalette,
  resolveSystemMessageVariantTokens,
} from "@/theme/system-message-tokens";
import type { SystemMessageActionConfig } from "@/lib/system-message-service";
import type {
  SystemMessageColorMode,
  SystemMessageDensityPreset,
  SystemMessageMotionPreset,
  SystemMessagePosition,
  SystemMessageTone,
  SystemMessageVariant,
} from "@/theme/system-message-preferences";

const TONE_ICONS: Record<SystemMessageTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: CircleX,
  warning: AlertTriangle,
  info: Info,
  neutral: BellRing,
  loading: LoaderCircle,
};

export type SystemMessageCardProps = {
  tone: SystemMessageTone;
  message: string;
  visible: boolean;
  colorMode: SystemMessageColorMode;
  densityPreset: SystemMessageDensityPreset;
  motionPreset: SystemMessageMotionPreset;
  position: SystemMessagePosition;
  variant: SystemMessageVariant;
  showIcon?: boolean;
  dismissible?: boolean;
  swipeEnabled?: boolean;
  clickToDismiss?: boolean;
  inline?: boolean;
  action?: SystemMessageActionConfig;
  repeatCount?: number;
  onDismiss?: () => void;
  onAction?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  className?: string;
};

export function SystemMessageCard({
  tone,
  message,
  visible,
  colorMode,
  densityPreset,
  motionPreset,
  position,
  variant,
  showIcon = true,
  dismissible = true,
  swipeEnabled = false,
  clickToDismiss = false,
  inline = false,
  action,
  repeatCount = 1,
  onDismiss,
  onAction,
  onPause,
  onResume,
  className,
}: SystemMessageCardProps) {
  const { resolvedSurfaceMode } = useAppearance();
  const tonePalette = resolveSystemMessageTonePalette(tone, colorMode, resolvedSurfaceMode);
  const variantTokens = resolveSystemMessageVariantTokens(variant, tonePalette, resolvedSurfaceMode);
  const density = resolveSystemMessageDensityTokens(densityPreset);
  const motion = resolveSystemMessageMotionTokens(motionPreset, false, position);
  const Icon = TONE_ICONS[tone];
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const pointerStartXRef = React.useRef<number | null>(null);
  const pointerIdRef = React.useRef<number | null>(null);

  const resetSwipe = React.useCallback(() => {
    pointerStartXRef.current = null;
    pointerIdRef.current = null;
    setIsDragging(false);
    setSwipeOffset(0);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeEnabled || inline || !dismissible) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, textarea")) {
      return;
    }

    pointerStartXRef.current = event.clientX;
    pointerIdRef.current = event.pointerId;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const startX = pointerStartXRef.current;
    if (startX === null) {
      return;
    }

    const deltaX = event.clientX - startX;
    setSwipeOffset(deltaX);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const shouldDismiss = Math.abs(swipeOffset) >= 96;
    if (shouldDismiss) {
      onDismiss?.();
      resetSwipe();
      return;
    }

    resetSwipe();
  };

  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!clickToDismiss || inline || !dismissible || isDragging) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, textarea")) {
      return;
    }

    onDismiss?.();
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onMouseEnter={inline ? undefined : onPause}
      onMouseLeave={inline ? undefined : onResume}
      onFocusCapture={inline ? undefined : onPause}
      onBlurCapture={inline ? undefined : onResume}
      onClick={handleContainerClick}
      className={cn(
        "group relative w-full transition-transform",
        isDragging ? "cursor-grabbing" : "",
      )}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        opacity: Math.max(0.5, 1 - Math.min(Math.abs(swipeOffset) / 220, 0.5)),
        transitionDuration: isDragging ? "0ms" : "180ms",
      }}
    >
      <div
        className={cn(
          "relative overflow-hidden border backdrop-blur-2xl transition-all",
          "before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:rounded-full before:bg-white/40 before:content-['']",
          density.cardClassName,
          visible ? motion.enterClassName : motion.exitClassName,
          inline ? "shadow-none" : "",
          className,
        )}
        style={{
          transitionDuration: `${motion.durationMs}ms`,
          background: variantTokens.background,
          borderColor: variantTokens.borderColor,
          color: variantTokens.textColor,
          boxShadow: inline
            ? "none"
            : `0 24px 60px -36px ${tonePalette.shadow}, 0 0 0 1px ${variantTokens.borderColor}`,
        }}
        role="status"
        aria-live={tone === "error" ? "assertive" : "polite"}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(circle at top right, ${tonePalette.halo}, transparent 48%)`,
          }}
        />

        <div
          className="absolute inset-y-4 right-0 w-1 rounded-full"
          style={{ backgroundColor: tonePalette.accent }}
        />

        <div className={cn("relative flex items-start", density.contentClassName)}>
          {showIcon ? (
            <div
              className={cn(
                "mt-0.5 flex shrink-0 items-center justify-center rounded-2xl border",
                density.iconSizeClassName,
              )}
              style={{
                backgroundColor: variantTokens.iconSurface,
                color: variantTokens.iconColor,
                borderColor: tonePalette.ring,
              }}
            >
              <Icon className={tone === "loading" ? "animate-spin" : undefined} />
            </div>
          ) : null}

          <div className="min-w-0 flex-1 space-y-1 text-right">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {repeatCount > 1 ? (
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    color: variantTokens.buttonText,
                    borderColor: variantTokens.buttonBorder,
                    backgroundColor: variantTokens.buttonBackground,
                  }}
                >
                  x{repeatCount}
                </span>
              ) : null}
              <p
                className={cn("font-semibold tracking-[0.02em]", density.titleClassName)}
                style={{ color: variantTokens.titleColor }}
              >
                {getSystemMessageToneLabel(tone)}
              </p>
            </div>
            <p className={cn("break-words font-medium", density.messageClassName)}>{message}</p>
            {action ? (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition hover:opacity-90"
                style={{
                  color: variantTokens.buttonText,
                  borderColor: variantTokens.buttonBorder,
                  backgroundColor: variantTokens.buttonBackground,
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {action.label}
              </button>
            ) : null}
          </div>

          {dismissible ? (
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                "mt-0.5 flex shrink-0 items-center justify-center rounded-full border transition hover:scale-[1.03]",
                density.closeButtonClassName,
              )}
              style={{
                borderColor: variantTokens.buttonBorder,
                color: tonePalette.mutedText,
                backgroundColor: variantTokens.buttonBackground,
              }}
              aria-label="إغلاق الرسالة"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
