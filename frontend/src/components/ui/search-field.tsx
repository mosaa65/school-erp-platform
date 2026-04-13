import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIELD_ICON_CLASS_NAME,
  FIELD_ICON_SMALL_BADGE_CLASS_NAME,
  FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
  FIELD_SURFACE_CLASS_NAME,
} from "@/components/ui/field-styles";

type SearchFieldProps = React.ComponentProps<"input"> & {
  containerClassName?: string;
  "data-testid"?: string;
};

export function SearchField({
  className,
  containerClassName,
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn("group relative w-full min-w-0", containerClassName)}>
      <div
        className={cn(
          FIELD_ICON_SMALL_BADGE_CLASS_NAME,
          FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
          "group-focus-within:text-[color:var(--app-accent-color)]",
        )}
      >
        <Search className={cn(FIELD_ICON_CLASS_NAME, "text-[color:var(--app-accent-color)]")} />
      </div>
      <input
        type="text"
        className={cn(
          FIELD_SURFACE_CLASS_NAME,
          "pr-13 pl-4",
          className,
        )}
        {...props}
      />
    </div>
  );
}
