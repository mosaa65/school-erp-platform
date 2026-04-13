"use client";

import type { SystemMessageCardProps } from "@/components/feedback/system-message-card";
import { SystemMessageCard } from "@/components/feedback/system-message-card";

type SystemMessageInlineProps = Omit<
  SystemMessageCardProps,
  "visible" | "position" | "motionPreset" | "variant"
> & {
  motionPreset?: SystemMessageCardProps["motionPreset"];
  variant?: SystemMessageCardProps["variant"];
};

export function SystemMessageInline({
  motionPreset = "minimal",
  variant = "soft",
  ...props
}: SystemMessageInlineProps) {
  return (
    <SystemMessageCard
      {...props}
      visible
      inline
      swipeEnabled={false}
      position="top-center"
      variant={variant}
      motionPreset={motionPreset}
    />
  );
}
