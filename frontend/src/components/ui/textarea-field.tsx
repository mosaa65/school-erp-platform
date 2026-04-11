import * as React from "react";
import { Asterisk } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIELD_ICON_CLASS_NAME,
  FIELD_ICON_BADGE_CLASS_NAME,
  FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
  FIELD_TEXTAREA_SURFACE_CLASS_NAME,
} from "@/components/ui/field-styles";

export interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  icon?: React.ReactNode;
  containerClassName?: string;
}

const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ className, containerClassName, icon, rows = 4, ...props }, ref) => {
    const resolvedIcon =
      icon ?? (props.required ? <Asterisk className="text-rose-500" /> : null);
    const renderedIcon =
      resolvedIcon && React.isValidElement(resolvedIcon)
        ? React.cloneElement(resolvedIcon as React.ReactElement<{ className?: string }>, {
            className: cn(
              FIELD_ICON_CLASS_NAME,
              (resolvedIcon as React.ReactElement<{ className?: string }>).props.className ??
                "text-[color:var(--app-accent-color)]",
            ),
          })
        : resolvedIcon;

    return (
      <div className={cn("group relative w-full", containerClassName)}>
        {renderedIcon ? (
          <div
            className={cn(
              FIELD_ICON_BADGE_CLASS_NAME,
              FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
              "top-4 translate-y-0 group-focus-within:text-[color:var(--app-accent-color)]",
            )}
          >
            {renderedIcon}
          </div>
        ) : null}
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            FIELD_TEXTAREA_SURFACE_CLASS_NAME,
            "resize-y",
            renderedIcon ? "pr-14" : "pr-4",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

TextareaField.displayName = "TextareaField";

export { TextareaField };
