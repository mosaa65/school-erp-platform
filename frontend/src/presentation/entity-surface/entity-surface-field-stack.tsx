"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { EntitySurfaceField } from "@/presentation/entity-surface/entity-surface-types";

type EntitySurfaceFieldStackProps = {
  fields?: EntitySurfaceField[];
  className?: string;
  textClassName?: string;
  mutedTextClassName?: string;
  maxItems?: number;
};

export function EntitySurfaceFieldStack({
  fields,
  className,
  textClassName,
  mutedTextClassName,
  maxItems = 3,
}: EntitySurfaceFieldStackProps) {
  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {fields.slice(0, maxItems).map((field, index) => (
        <div
          key={field.key ?? `${field.label ?? "field"}-${index}`}
          className={cn("flex items-start gap-2", field.className)}
        >
          {field.icon ? (
            <span className={cn("mt-0.5 shrink-0 text-[color:var(--app-accent-color)]/80", mutedTextClassName)}>
              {field.icon}
            </span>
          ) : null}
          <div className="min-w-0">
            {field.label ? (
              <p className={cn("text-[10px] font-medium", mutedTextClassName)}>{field.label}</p>
            ) : null}
            <div className={cn("min-w-0 break-words", textClassName)}>{field.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
