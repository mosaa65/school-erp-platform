import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectFieldProps = React.ComponentProps<"select"> & {
  icon?: React.ReactElement<{ className?: string }>;
  containerClassName?: string;
};

export function SelectField({
  icon,
  className,
  containerClassName,
  children,
  ...props
}: SelectFieldProps) {
  const hasIcon = Boolean(icon);
  const renderedIcon =
    icon && React.isValidElement(icon)
      ? React.cloneElement(icon, {
          className: cn("h-4 w-4", icon.props.className),
        })
      : icon;

  return (
    <div className={cn("group/select relative", containerClassName)}>
      {hasIcon ? (
        <span className="pointer-events-none absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary/70 shadow-sm transition-colors group-focus-within/select:border-primary/40 group-focus-within/select:bg-primary/10 group-focus-within/select:text-primary">
          {renderedIcon}
        </span>
      ) : null}
      <span className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary/40 shadow-sm transition-colors group-focus-within/select:border-primary/30 group-focus-within/select:bg-primary/10 group-focus-within/select:text-primary">
        <ChevronDown className="h-4 w-4" />
      </span>
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-2xl border border-border/40 bg-background/50 px-4 text-sm shadow-sm backdrop-blur-md ring-offset-background transition-all duration-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
          "hover:border-border/80 hover:bg-background/80",
          "disabled:cursor-not-allowed disabled:opacity-50",
          hasIcon ? "pr-14" : "pr-4",
          "pl-14",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
