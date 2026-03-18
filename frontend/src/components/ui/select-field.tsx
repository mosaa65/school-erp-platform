import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectFieldProps = React.ComponentProps<"select"> & {
  icon?: React.ReactElement;
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
        <span className="pointer-events-none absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition-colors group-focus-within/select:border-primary/20 group-focus-within/select:bg-primary/5 group-focus-within/select:text-primary">
          {renderedIcon}
        </span>
      ) : null}
      <span className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition-colors group-focus-within/select:border-primary/20 group-focus-within/select:bg-primary/5 group-focus-within/select:text-primary">
        <ChevronDown className="h-4 w-4" />
      </span>
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-2xl border border-input bg-background/85 px-4 text-sm shadow-sm ring-offset-background transition-[border-color,box-shadow,background-color]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0",
          "hover:border-border",
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
