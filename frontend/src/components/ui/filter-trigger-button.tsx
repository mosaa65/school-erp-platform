"use client";

import * as React from "react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

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
  className,
  type = "button",
  ...props
}: FilterTriggerButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "group inline-flex h-11 items-center gap-2.5 rounded-full border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-4 text-sm font-semibold text-[color:var(--app-accent-color)] shadow-[0_14px_34px_-22px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-accent-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={props["aria-label"] ?? label}
      {...props}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-background/75 shadow-sm dark:border-white/10">
        {icon ?? <Filter className="h-4 w-4" />}
      </span>
      <span>{label}</span>
      {count > 0 ? (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--app-accent-color)] px-1.5 text-[10px] font-bold text-white shadow-sm">
          {count}
        </span>
      ) : null}
    </button>
  );
}
