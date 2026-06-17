import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIELD_ICON_CLASS_NAME,
  FIELD_ICON_BADGE_CLASS_NAME,
  FIELD_ICON_EDGE_LEFT_CLASS_NAME,
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
  const isControlled = props.value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string>(
    (props.value as string) ?? "",
  );
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isControlled) {
      setInternalValue((props.value as string) ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalValue(e.target.value);
    props.onChange?.(e);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isControlled) {
      // notify parent
      const event = {
        target: { value: "" },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      props.onChange?.(event);
    } else {
      setInternalValue("");
      const event = {
        target: { value: "" },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      props.onChange?.(event);
    }
    inputRef.current?.focus();
  };

  const value = (props.value as string) ?? internalValue;

  return (
    <div className={cn("group relative w-full min-w-0", containerClassName)}>
      <div
        className={cn(
          FIELD_ICON_BADGE_CLASS_NAME,
          FIELD_ICON_EDGE_RIGHT_CLASS_NAME,
          "group-focus-within:text-[color:var(--app-accent-color)]",
        )}
      >
        <Search className={cn(FIELD_ICON_CLASS_NAME, "text-[color:var(--app-accent-color)]")} />
      </div>

      <input
        ref={inputRef}
        type="text"
        className={cn(
          FIELD_SURFACE_CLASS_NAME,
          "pl-14 pr-12",
          "selection:bg-[color:var(--app-accent-color)]/20 selection:text-foreground",
          className,
        )}
        {...props}
        value={value}
        onChange={handleChange}
      />

      {value?.length ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
          className={cn(
            FIELD_ICON_BADGE_CLASS_NAME.replace("pointer-events-none", "pointer-events-auto"),
            FIELD_ICON_EDGE_LEFT_CLASS_NAME,
          )}
        >
          <X className={FIELD_ICON_CLASS_NAME} />
        </button>
      ) : null}
    </div>
  );
}

// Normalize Arabic text for more forgiving searches.
export function normalizeArabic(input: string) {
  if (!input) return "";
  return input
    .normalize("NFC")
    // remove diacritics/tashkeel
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u0670]/g, "")
    // remove tatweel
    .replace(/\u0640/g, "")
    // normalize Alef variants to bare Alef
    .replace(/[\u0622\u0623\u0625\u0671]/g, "ا")
    // map hamza-on/waw/yeh to base letters
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ي")
    // map alif maqsura to ya
    .replace(/ى/g, "ي")
    // map taa marbuta to heh (helps matching in some datasets)
    .replace(/ة/g, "ه")
    .trim();
}
