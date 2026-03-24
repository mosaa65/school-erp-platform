import * as React from "react";
import { cn } from "@/lib/utils";

export type IconButtonProps = {
  icon: React.ReactNode;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "solid";
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

export function IconButton({
  icon,
  onClick,
  size = "md",
  variant = "ghost",
  disabled = false,
  ariaLabel,
  className,
}: IconButtonProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const variantClasses = {
    ghost: "bg-transparent hover:bg-muted",
    solid: "bg-primary text-primary-foreground hover:bg-primary/90",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        sizeClasses[size],
        variantClasses[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {icon}
    </button>
  );
}
