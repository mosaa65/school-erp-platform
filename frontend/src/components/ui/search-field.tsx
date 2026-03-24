import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type SearchFieldProps = React.ComponentProps<"input"> & {
  containerClassName?: string;
};

export function SearchField({
  containerClassName,
  className,
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn("group/search relative", containerClassName)}>
      <span className="pointer-events-none absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition-colors group-focus-within/search:border-primary/20 group-focus-within/search:bg-primary/5 group-focus-within/search:text-primary">
        <Search className="h-4 w-4" />
      </span>
      <Input
        {...props}
        className={cn(
          "h-11 rounded-2xl border-border/70 bg-background/85 pr-14 shadow-sm transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/80 hover:border-border focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0",
          className,
        )}
      />
    </div>
  );
}
