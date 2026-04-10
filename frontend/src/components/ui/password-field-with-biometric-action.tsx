"use client";

import * as React from "react";
import { Eye, EyeOff, Fingerprint, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
  FIELD_ICON_SMALL_BADGE_CLASS_NAME,
  FIELD_SURFACE_CLASS_NAME,
} from "@/components/ui/field-styles";

type PasswordFieldWithBiometricActionProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBiometricAction?: () => void;
  biometricLabel?: string;
  biometricDisabled?: boolean;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
};

export function PasswordFieldWithBiometricAction({
  id,
  value,
  onChange,
  onBiometricAction,
  biometricLabel = "الدخول بالبصمة",
  biometricDisabled = false,
  placeholder = "••••••••",
  required = false,
  minLength,
  autoComplete = "current-password",
  disabled = false,
  className,
}: PasswordFieldWithBiometricActionProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const hasBiometricAction = Boolean(onBiometricAction) && !biometricDisabled;

  return (
    <div className={cn("relative", className)}>
      {hasBiometricAction ? (
        <button
          type="button"
          onClick={onBiometricAction}
          disabled={disabled}
          title={biometricLabel}
          aria-label={biometricLabel}
          className={cn(
            "absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 transition hover:bg-[color:var(--app-accent-soft)] hover:text-[color:var(--app-accent-color)] disabled:cursor-not-allowed disabled:opacity-40",
            "text-[color:var(--app-accent-color)]",
          )}
        >
          <Fingerprint className="h-4 w-4" />
        </button>
      ) : null}

      <div
        className={cn(
          FIELD_ICON_SMALL_BADGE_CLASS_NAME,
          FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
          "text-[color:var(--app-accent-color)]",
        )}
      >
        <LockKeyhole className="h-4 w-4" />
      </div>

      <input
        id={id}
        type={isVisible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        disabled={disabled}
        className={cn(
          FIELD_SURFACE_CLASS_NAME,
          hasBiometricAction ? "pl-11" : "pl-4",
          "pr-20",
        )}
        dir="ltr"
      />

      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        disabled={disabled}
        aria-label={isVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className={cn(
          "absolute right-9 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 transition hover:bg-[color:var(--app-accent-soft)] hover:text-[color:var(--app-accent-color)] disabled:cursor-not-allowed disabled:opacity-40",
          "text-[color:var(--app-accent-color)]",
        )}
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
