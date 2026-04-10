import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIELD_ICON_BADGE_CLASS_NAME,
  FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
  FIELD_SELECT_CHEVRON_CLASS_NAME,
  FIELD_SURFACE_CLASS_NAME,
} from "@/components/ui/field-styles";

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
          className: cn(
            "h-4 w-4 text-[color:var(--app-accent-color)]",
            icon.props.className,
          ),
        })
      : icon;

  return (
    <div className={cn("group/select relative w-full", containerClassName)}>
      {hasIcon ? (
        <span
          className={cn(
            FIELD_ICON_BADGE_CLASS_NAME,
            FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
            "group-focus-within/select:text-[color:var(--app-accent-color)]",
          )}
        >
          {renderedIcon}
        </span>
      ) : null}
      <span className={FIELD_SELECT_CHEVRON_CLASS_NAME}>
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-focus-within/select:translate-y-[1px]" />
      </span>
      <select
        className={cn(
          FIELD_SURFACE_CLASS_NAME,
          "appearance-none px-4",
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
