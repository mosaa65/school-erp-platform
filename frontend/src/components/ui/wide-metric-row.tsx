"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type WideMetricRowItem = {
  label: string;
  value: React.ReactNode;
  helper?: string;
  toneClassName?: string;
};

export function WideMetricRow({
  items,
  className,
}: {
  items: WideMetricRowItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-[24px] border border-border/60 bg-card/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.34)] backdrop-blur-sm md:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-[20px] border border-border/60 bg-background/75 p-4",
            item.toneClassName,
          )}
        >
          <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {item.value}
          </div>
          {item.helper ? (
            <div className="mt-2 text-xs leading-5 text-muted-foreground">{item.helper}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
