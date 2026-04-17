import * as React from "react";
import { Asterisk, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIELD_ICON_CLASS_NAME,
  FIELD_ICON_BADGE_CLASS_NAME,
  FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
  FIELD_SELECT_CHEVRON_CLASS_NAME,
  FIELD_SELECT_CHEVRON_ICON_CLASS_NAME,
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
  const fallbackIcon = props.required ? <Asterisk className="text-rose-500" /> : null;
  const resolvedIcon = icon ?? fallbackIcon;
  const hasIcon = Boolean(resolvedIcon);
  const renderedIcon =
    resolvedIcon && React.isValidElement(resolvedIcon)
      ? React.cloneElement(resolvedIcon as React.ReactElement<{ className?: string }>, {
          className: cn(
            (resolvedIcon as React.ReactElement<{ className?: string }>).props.className,
            "text-[color:var(--app-accent-color)]",
            FIELD_ICON_CLASS_NAME,
          ),
        })
      : resolvedIcon;

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
        <ChevronDown
          className={cn(
            FIELD_SELECT_CHEVRON_ICON_CLASS_NAME,
            "transition-transform group-focus-within/select:translate-y-[1px]",
          )}
        />
      </span>
      <select
        className={cn(
          FIELD_SURFACE_CLASS_NAME,
          "appearance-none px-4 text-ellipsis",
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
