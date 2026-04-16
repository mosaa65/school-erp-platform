"use client";

import * as React from "react";
import { ArrowUpDown } from "lucide-react";
import { ToolbarTriggerButton } from "@/components/ui/toolbar-trigger-button";

type SortTriggerButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  count?: number;
  label?: string;
  icon?: React.ReactNode;
};

export function SortTriggerButton({
  count = 0,
  label = "فرز",
  icon,
  ...props
}: SortTriggerButtonProps) {
  return (
    <ToolbarTriggerButton
      label={label}
      icon={icon ?? <ArrowUpDown className="h-4 w-4" />}
      count={count}
      hideLabelOnMobile
      hideCountOnMobile
      {...props}
    />
  );
}
