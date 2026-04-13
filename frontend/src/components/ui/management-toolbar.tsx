"use client";

import * as React from "react";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { SearchField } from "@/components/ui/search-field";
import { cn } from "@/lib/utils";

type ManagementToolbarProps = {
  searchValue: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder: string;
  searchInputProps?: Omit<
    React.ComponentProps<typeof SearchField>,
    "value" | "onChange" | "placeholder" | "containerClassName"
  >;
  filterCount?: number;
  onFilterClick: () => void;
  showFilterButton?: boolean;
  className?: string;
  searchWrapperClassName?: string;
  searchFieldClassName?: string;
  actionsClassName?: string;
  filterButtonClassName?: string;
  actions?: React.ReactNode;
};

export function ManagementToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchInputProps,
  filterCount = 0,
  onFilterClick,
  showFilterButton = true,
  className,
  searchWrapperClassName,
  searchFieldClassName,
  actionsClassName,
  filterButtonClassName,
  actions,
}: ManagementToolbarProps) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-[color:var(--app-accent-strong)]/35 bg-gradient-to-br from-[color:var(--app-accent-soft)]/45 via-background/96 to-background/86 p-2.5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.45)] backdrop-blur-xl",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 md:flex-row md:items-center md:justify-between",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:min-w-[240px]",
          searchWrapperClassName,
        )}
        >
          <SearchField
            containerClassName={cn("min-w-0 flex-1", searchFieldClassName)}
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            {...searchInputProps}
          />
        </div>
        <div className={cn("flex flex-wrap items-center gap-2", actionsClassName)}>
          {showFilterButton ? (
            <FilterTriggerButton
              count={filterCount}
              onClick={onFilterClick}
              className={filterButtonClassName}
            />
          ) : null}
          {actions}
        </div>
      </div>
    </div>
  );
}
