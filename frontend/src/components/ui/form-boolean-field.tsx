"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  FIELD_BOOLEAN_SURFACE_CLASS_NAME,
  FIELD_SUPPORTING_TEXT_CLASS_NAME,
} from "@/components/ui/field-styles";

type FormBooleanFieldProps = {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
};

export function FormBooleanField({
  label,
  checked,
  onCheckedChange,
  description,
  required = false,
  disabled = false,
  className,
  labelClassName,
}: FormBooleanFieldProps) {
  return (
    <div className={cn(FIELD_BOOLEAN_SURFACE_CLASS_NAME, className)}>
      <div className="min-w-0 space-y-1">
        <Label required={required} className={cn("mb-0 px-0", labelClassName)}>
          {label}
        </Label>
        {description ? (
          <p className={cn(FIELD_SUPPORTING_TEXT_CLASS_NAME, "px-0")}>{description}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-[color:var(--app-accent-color)]"
      />
    </div>
  );
}
