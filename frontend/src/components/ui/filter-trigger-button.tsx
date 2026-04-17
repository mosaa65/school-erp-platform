"use client";

import * as React from "react";
import { Filter } from "lucide-react";
import { ToolbarTriggerButton } from "@/components/ui/toolbar-trigger-button";

type FilterTriggerButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  count?: number;
  label?: string;
  icon?: React.ReactNode;
};

export function FilterTriggerButton({
  count = 0,
  label = "فلترة",
  icon,
  ...props
}: FilterTriggerButtonProps) {
  return (
    <ToolbarTriggerButton
      label={label}
      icon={icon ?? <Filter className="h-4 w-4" />}
      count={count}
      {...props}
    />
  );
}
