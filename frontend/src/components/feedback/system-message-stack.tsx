"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { SystemMessageCard } from "@/components/feedback/system-message-card";
import { SystemMessageViewport } from "@/components/feedback/system-message-viewport";
import type { SystemMessageActionConfig } from "@/lib/system-message-service";
import type {
  SystemMessageColorMode,
  SystemMessageDensityPreset,
  SystemMessageIconMode,
  SystemMessageMotionPreset,
  SystemMessagePosition,
  SystemMessageTone,
  SystemMessageVariant,
} from "@/theme/system-message-preferences";
import { resolveSystemMessageIconVisibility } from "@/theme/system-message-tokens";

export type SystemMessageStackItem = {
  id: string;
  tone: SystemMessageTone;
  message: string;
  visible: boolean;
  action?: SystemMessageActionConfig;
  repeatCount: number;
  dedupeKey?: string;
};

type SystemMessageStackProps = {
  items: SystemMessageStackItem[];
  colorMode: SystemMessageColorMode;
  densityPreset: SystemMessageDensityPreset;
  motionPreset: SystemMessageMotionPreset;
  position: SystemMessagePosition;
  variant: SystemMessageVariant;
  iconMode: SystemMessageIconMode;
  dismissible: boolean;
  swipeEnabled: boolean;
  clickToDismiss: boolean;
  onDismiss: (id: string) => void;
  onAction: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
};

export function SystemMessageStack({
  items,
  colorMode,
  densityPreset,
  motionPreset,
  position,
  variant,
  iconMode,
  dismissible,
  swipeEnabled,
  clickToDismiss,
  onDismiss,
  onAction,
  onPause,
  onResume,
}: SystemMessageStackProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || items.length === 0) {
    return null;
  }

  return createPortal(
    <SystemMessageViewport position={position}>
      {items.map((item) => (
        <SystemMessageCard
          key={item.id}
          tone={item.tone}
          message={item.message}
          visible={item.visible}
          colorMode={colorMode}
          densityPreset={densityPreset}
          motionPreset={motionPreset}
          position={position}
          variant={variant}
          showIcon={resolveSystemMessageIconVisibility(iconMode, item.tone, Boolean(item.action))}
          dismissible={dismissible}
          swipeEnabled={swipeEnabled}
          clickToDismiss={clickToDismiss}
          action={item.action}
          repeatCount={item.repeatCount}
          className="pointer-events-auto"
          onDismiss={() => onDismiss(item.id)}
          onAction={() => onAction(item.id)}
          onPause={() => onPause(item.id)}
          onResume={() => onResume(item.id)}
        />
      ))}
    </SystemMessageViewport>,
    document.body,
  );
}
