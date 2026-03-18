"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BottomSheetFormProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
  submitLabel?: string;
  isSubmitting?: boolean;
  showCancelButton?: boolean;
  showFooter?: boolean;
};

export function BottomSheetForm({
  open,
  title,
  onClose,
  onSubmit,
  children,
  submitLabel = "حفظ",
  isSubmitting = false,
  showCancelButton = false,
  showFooter = true,
}: BottomSheetFormProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] md:items-center md:justify-end"
      onClick={onClose}
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden border border-border/70 bg-background/95 shadow-2xl shadow-black/15 backdrop-blur-xl",
          "h-[86vh] max-w-lg rounded-[30px] md:h-[min(860px,calc(100vh-2rem))] md:max-w-[480px]",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 pt-3 md:hidden">
          <div className="mx-auto h-1.5 w-14 rounded-full bg-border/80" />
        </div>
        <div className="border-b border-border/70 bg-gradient-to-b from-background to-background/80 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Form
              </p>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border/60 bg-background/80 p-2 text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {showFooter ? (
          <div className="border-t border-border/70 bg-background/92 px-5 py-4 backdrop-blur-sm">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {showCancelButton ? (
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="h-11 rounded-2xl px-5 sm:min-w-[120px]"
              >
                إلغاء
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="h-11 rounded-2xl px-5 sm:min-w-[140px]"
            >
              {isSubmitting ? "جاري الحفظ..." : submitLabel}
            </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
