"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FIELD_SUPPORTING_TEXT_CLASS_NAME } from "@/components/ui/field-styles";

type FormFieldProps = {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  contentClassName?: string;
};

export function FormField({
  label,
  required = false,
  children,
  hint,
  error,
  className,
  labelClassName,
  contentClassName,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label required={required} className={labelClassName}>
        {label}
      </Label>
      <div className={contentClassName}>{children}</div>
      {hint ? <p className={FIELD_SUPPORTING_TEXT_CLASS_NAME}>{hint}</p> : null}
      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
