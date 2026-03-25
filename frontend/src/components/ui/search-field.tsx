import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchFieldProps = React.ComponentProps<"input"> & {
  containerClassName?: string;
};

export function SearchField({
  className,
  containerClassName,
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn("group relative w-full", containerClassName)}>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-primary pointer-events-none">
        <Search className="h-4.5 w-4.5" />
      </div>
      <input
        type="text"
        className={cn(
          "flex h-11 w-full rounded-2xl border border-border/40 bg-background/50 pr-10 pl-4 py-2 text-sm shadow-sm backdrop-blur-md transition-all duration-300 ring-offset-background",
          "placeholder:text-muted-foreground/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
          "hover:border-border/80 hover:bg-background/80",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
}
