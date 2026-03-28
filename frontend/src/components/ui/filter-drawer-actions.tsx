"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type FilterDrawerActionsProps = {
  onClear: () => void;
  onApply: () => void;
  clearLabel?: string;
  applyLabel?: string;
};

export function FilterDrawerActions({
  onClear,
  onApply,
  clearLabel = "مسح",
  applyLabel = "تطبيق",
}: FilterDrawerActionsProps) {
  return (
    <div className="flex w-full gap-2">
      <Button type="button" variant="outline" onClick={onClear} className="flex-1 gap-1.5">
        <Trash2 className="h-4 w-4" />
        {clearLabel}
      </Button>
      <Button type="button" onClick={onApply} className="flex-1 gap-1.5">
        {applyLabel}
      </Button>
    </div>
  );
}
