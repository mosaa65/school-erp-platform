"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  filterCountryDialCodeOptions,
  findCountryDialCodeOption,
  type CountryDialCodeOption,
  type CountryIso2,
} from "@/lib/intl/phone";

type CountryDialCodePickerProps = {
  value?: CountryIso2 | string | null;
  onChange: (country: CountryDialCodeOption) => void;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
};

export function CountryDialCodePicker({
  value,
  onChange,
  disabled = false,
  className,
  contentClassName,
}: CountryDialCodePickerProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedCountry = React.useMemo(
    () => findCountryDialCodeOption(value) ?? findCountryDialCodeOption("YE"),
    [value],
  );

  const filteredCountries = React.useMemo(
    () => filterCountryDialCodeOptions(query),
    [query],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");
    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className={cn("relative", className)} dir="ltr" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        className="h-11 min-w-[124px] justify-between gap-2 rounded-2xl border-border/50 bg-background/75 px-3 text-left font-medium"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-base leading-none">{selectedCountry?.flag ?? "🌐"}</span>
          <span className="truncate text-sm">
            {selectedCountry?.dialCode ?? "+967"}
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,26rem)] overflow-hidden rounded-[1.4rem] border border-border/60 bg-background/95 shadow-[0_24px_64px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl",
            contentClassName,
          )}
        >
          <div className="border-b border-border/50 p-3">
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن الدولة أو المفتاح"
              icon={<Search className="h-4 w-4" />}
              className="h-10 rounded-xl"
              dir="rtl"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredCountries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.iso2 === selectedCountry?.iso2;
                return (
                  <button
                    key={`${country.iso2}-${country.dialCode}`}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      "hover:bg-primary/5",
                      isSelected && "bg-primary/10 text-primary",
                    )}
                    onClick={() => {
                      onChange(country);
                      setOpen(false);
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="text-lg leading-none">{country.flag}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {country.nameAr}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {country.nameEn}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium">{country.dialCode}</span>
                      {isSelected ? <Check className="h-4 w-4" /> : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
