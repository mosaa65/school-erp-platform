import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-[12px] font-black uppercase tracking-widest text-primary/60 dark:text-primary/70 mb-2 block px-1 transition-colors group-focus-within:text-primary",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-1 animate-pulse">*</span>}
    </label>
  )
);

Label.displayName = "Label";

export { Label };
