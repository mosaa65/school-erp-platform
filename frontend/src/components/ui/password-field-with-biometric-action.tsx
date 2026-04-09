"use client";

import * as React from "react";
import { Eye, EyeOff, Fingerprint, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn("relative", className)}>
      {onBiometricAction ? (
        <button
          type="button"
          onClick={onBiometricAction}
          disabled={disabled || biometricDisabled}
          title={biometricLabel}
          aria-label={biometricLabel}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 text-primary/80 transition hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Fingerprint className="h-4 w-4" />
        </button>
      ) : null}

      <div className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-primary/80">
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
          "flex h-11 w-full rounded-2xl border border-border/40 bg-background/50 py-2 text-sm shadow-sm backdrop-blur-md transition-all duration-300 ring-offset-background",
          "placeholder:text-muted-foreground/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
          "hover:border-border/80 hover:bg-background/80",
          "disabled:cursor-not-allowed disabled:opacity-50",
          onBiometricAction ? "pl-11" : "pl-4",
          "pr-20",
        )}
        dir="ltr"
      />

      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        disabled={disabled}
        aria-label={isVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute right-9 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 text-slate-500 transition hover:bg-black/5 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
