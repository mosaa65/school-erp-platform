"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToolbarTriggerButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  label: string;
  icon: React.ReactNode;
  count?: number;
  hideLabelOnMobile?: boolean;
  hideCountOnMobile?: boolean;
};

export function ToolbarTriggerButton({
  label,
  icon,
  count = 0,
  hideLabelOnMobile = false,
  hideCountOnMobile = false,
  className,
  type = "button",
  ...props
}: ToolbarTriggerButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "group inline-flex h-11 items-center gap-2.5 rounded-full border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-sm font-semibold text-[color:var(--app-accent-color)] shadow-[0_14px_34px_-22px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-accent-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        hideLabelOnMobile
          ? "w-11 justify-center px-0 sm:w-auto sm:justify-start sm:px-4"
          : "px-4",
        className,
      )}
      aria-label={props["aria-label"] ?? label}
      {...props}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/35 bg-background/75 shadow-sm dark:border-white/10">
        {icon}
      </span>
      <span className={cn(hideLabelOnMobile ? "hidden sm:inline" : "")}>{label}</span>
      {count > 0 ? (
        <span
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--app-accent-color)] px-1.5 text-[10px] font-bold text-white shadow-sm",
            hideCountOnMobile ? "hidden sm:inline-flex" : "",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
