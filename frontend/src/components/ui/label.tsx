import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FIELD_LABEL_CLASS_NAME,
  FIELD_REQUIRED_MARK_CLASS_NAME,
} from "@/components/ui/field-styles";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        FIELD_LABEL_CLASS_NAME,
        className
      )}
      {...props}
    >
      {children}
      {required && <span className={FIELD_REQUIRED_MARK_CLASS_NAME}>*</span>}
    </label>
  )
);

Label.displayName = "Label";

export { Label };
