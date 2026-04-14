"use client";

import * as React from "react";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type NavigationFilterGroup = {
  id: string;
  label: string;
};

export type NavigationFilterValue = {
  selectedGroupIds: string[];
  currentGroupOnly: boolean;
};

type NavigationFilterControlProps = {
  groups: NavigationFilterGroup[];
  value: NavigationFilterValue;
  onChange: (next: NavigationFilterValue) => void;
  activeGroupId?: string;
  className?: string;
};

function sanitizeSelectedGroupIds(
  selectedGroupIds: string[],
  groups: NavigationFilterGroup[],
): string[] {
  const validIds = new Set(groups.map((group) => group.id));
  return selectedGroupIds.filter((groupId) => validIds.has(groupId));
}

export function NavigationFilterControl({
  groups,
  value,
  onChange,
  activeGroupId,
  className,
}: NavigationFilterControlProps) {
  const [open, setOpen] = React.useState(false);
  const [draftValue, setDraftValue] = React.useState<NavigationFilterValue>(value);

  React.useEffect(() => {
    if (!open) {
      setDraftValue(value);
    }
  }, [open, value]);

  const activeCount = React.useMemo(() => {
    const selectedCount = sanitizeSelectedGroupIds(value.selectedGroupIds, groups).length;
    return selectedCount + (value.currentGroupOnly ? 1 : 0);
  }, [groups, value.currentGroupOnly, value.selectedGroupIds]);

  const applyDraft = React.useCallback(() => {
    onChange({
      currentGroupOnly: draftValue.currentGroupOnly,
      selectedGroupIds: sanitizeSelectedGroupIds(draftValue.selectedGroupIds, groups),
    });
    setOpen(false);
  }, [draftValue.currentGroupOnly, draftValue.selectedGroupIds, groups, onChange]);

  const clearDraft = React.useCallback(() => {
    const resetValue: NavigationFilterValue = {
      currentGroupOnly: false,
      selectedGroupIds: [],
    };
    setDraftValue(resetValue);
    onChange(resetValue);
    setOpen(false);
  }, [onChange]);

  return (
    <>
      <FilterTriggerButton
        count={activeCount}
        label="فلترة"
        className={cn("h-11 -translate-y-px rounded-full px-3.5 text-xs", className)}
        onClick={() => setOpen(true)}
      />

      <FilterDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="فلترة التنقل"
        actionButtons={<FilterDrawerActions onClear={clearDraft} onApply={applyDraft} />}
        renderInPortal
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-[color:var(--app-accent-strong)]/40 bg-[color:var(--app-accent-soft)]/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">النظام الحالي فقط</p>
                <p className="text-xs text-muted-foreground">
                  يقيّد النتائج على النظام النشط في الصفحة.
                </p>
              </div>
              <Switch
                checked={draftValue.currentGroupOnly}
                onCheckedChange={(checked) =>
                  setDraftValue((previous) => ({
                    ...previous,
                    currentGroupOnly: checked,
                  }))
                }
                disabled={!activeGroupId}
                aria-label="تفعيل فلترة النظام الحالي"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">الأنظمة</p>
            <p className="text-xs text-muted-foreground">
              اختر نظامًا أو أكثر لإظهار صفحاته فقط.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {groups.map((group) => {
              const selected = draftValue.selectedGroupIds.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() =>
                    setDraftValue((previous) => ({
                      ...previous,
                      selectedGroupIds: selected
                        ? previous.selectedGroupIds.filter((groupId) => groupId !== group.id)
                        : [...previous.selectedGroupIds, group.id],
                    }))
                  }
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm transition-all",
                    selected
                      ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                      : "border-border/70 bg-background/70 text-foreground hover:bg-muted/50",
                  )}
                >
                  <span className="truncate">{group.label}</span>
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      selected
                        ? "bg-[color:var(--app-accent-color)]"
                        : "bg-border",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </FilterDrawer>
    </>
  );
}
