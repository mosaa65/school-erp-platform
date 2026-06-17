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
  const hasLabel = label !== undefined && label !== "";

  return (
    <button
      type={type}
      className={cn(
        "group relative inline-flex h-11 items-center gap-2.5 rounded-full border border-[color:var(--app-accent-strong)]/25 bg-[color:var(--app-accent-soft)]/18 p-1 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[color:var(--app-accent-soft)]/28 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent-ring)] focus-visible:ring-offset-2",
        hasLabel
          ? hideLabelOnMobile
            ? "w-11 justify-center px-0 sm:w-auto sm:justify-start sm:px-1"
            : "px-1"
          : "w-11 justify-center px-0",
        className,
      )}
      aria-label={props["aria-label"] ?? label}
      {...props}
    >
      <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-background/90 shadow-sm backdrop-blur-sm dark:bg-zinc-950">
        <div className="h-4.5 w-4.5 flex items-center justify-center text-[color:var(--app-accent-color)] transition-transform group-hover:scale-110">
          {icon}
        </div>

        {count > 0 ? (
          <span
            className={cn(
              "absolute -left-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-md outline outline-2 outline-white dark:outline-zinc-950 ring-1 ring-white/20 transition-transform group-hover:scale-110",
              hideCountOnMobile ? "hidden sm:inline-flex" : "",
            )}
          >
            {count > 9 ? "+9" : count}
          </span>
        ) : null}
      </div>

      {hasLabel ? (
        <span
          className={cn(
            "px-2 text-[13px] font-bold tracking-tight text-[color:var(--app-accent-color)] transition-colors group-hover:brightness-110",
            hideLabelOnMobile ? "hidden sm:inline" : "",
          )}
        >
          {label}
        </span>
      ) : null}
    </button>
  );
}
