import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="group relative w-full">
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 transition-colors group-focus-within:text-primary pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-2xl border border-border/40 bg-background/50 px-4 py-2 text-sm shadow-sm backdrop-blur-md transition-all duration-300 ring-offset-background",
            "placeholder:text-muted-foreground/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
            "hover:border-border/80 hover:bg-background/80",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon ? "pr-10" : "pr-4",
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




