"use client";

import * as React from "react";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { SearchField } from "@/components/ui/search-field";
import { cn } from "@/lib/utils";

type ManagementToolbarProps = {
  searchValue: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder: string;
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
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <div
        className={cn(
          "flex min-w-0 max-w-lg flex-1 flex-wrap items-center gap-2 sm:min-w-[240px]",
          searchWrapperClassName,
        )}
      >
        <SearchField
          containerClassName={cn("flex-1", searchFieldClassName)}
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
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
  );
}
