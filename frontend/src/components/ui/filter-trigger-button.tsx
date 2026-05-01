"use client";

import * as React from "react";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
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
  label,
  icon,
  className,
  ...props
}: FilterTriggerButtonProps) {
  return (
    <ToolbarTriggerButton
      label={label ?? "فلترة"}
      icon={icon ?? <ListFilter className="h-3.5 w-3.5" />}
      count={count}
      hideLabelOnMobile
      className={cn(!label && "w-11 justify-center px-0", className)}
      {...props}
    />
  );
}
