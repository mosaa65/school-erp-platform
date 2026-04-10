import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FIELD_ICON_BADGE_CLASS_NAME,
  FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
  FIELD_SURFACE_CLASS_NAME,
} from "@/components/ui/field-styles";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="group relative w-full">
        {icon && (
          <div
            className={cn(
              FIELD_ICON_BADGE_CLASS_NAME,
              FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
              "group-focus-within:text-[color:var(--app-accent-color)]",
            )}
          >
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            FIELD_SURFACE_CLASS_NAME,
            icon ? "pr-14" : "pr-4",
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




