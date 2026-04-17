"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type FilterDrawerActionsProps = {
  onClear: () => void;
  onApply: () => void;
  clearLabel?: string;
  applyLabel?: string;
  clearTestId?: string;
  applyTestId?: string;
};

export function FilterDrawerActions({
  onClear,
  onApply,
  clearLabel = "مسح",
  applyLabel = "تطبيق",
  clearTestId,
  applyTestId,
}: FilterDrawerActionsProps) {
  return (
    <div className="flex w-full gap-2">
      <Button
        type="button"
        variant="destructive"
        onClick={onClear}
        className="flex-1 gap-1.5 rounded-2xl"
        data-testid={clearTestId}
      >
        <Trash2 className="h-4 w-4" />
        {clearLabel}
      </Button>
      <Button
        type="button"
        onClick={onApply}
        className="flex-1 gap-1.5 rounded-2xl"
        data-testid={applyTestId}
      >
        {applyLabel}
      </Button>
    </div>
  );
}
