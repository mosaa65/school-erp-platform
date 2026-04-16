import * as React from "react";
import { Asterisk } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIELD_ICON_CLASS_NAME,
  FIELD_ICON_BADGE_CLASS_NAME,
  FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
  FIELD_SURFACE_CLASS_NAME,
} from "@/components/ui/field-styles";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, type, icon, ...props }, ref) => {
    const resolvedIcon =
      icon ?? (props.required ? <Asterisk className="text-rose-500" /> : null);
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
      <div className={cn("group relative w-full min-w-0 overflow-hidden", containerClassName)}>
        {renderedIcon ? (
          <div
            className={cn(
              FIELD_ICON_BADGE_CLASS_NAME,
              FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
              "group-focus-within:text-[color:var(--app-accent-color)]",
            )}
          >
            {renderedIcon}
          </div>
        ) : null}
        <input
          type={type}
          className={cn(
            FIELD_SURFACE_CLASS_NAME,
            renderedIcon ? "pr-14" : "pr-4",
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
