"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BottomSheetFormProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
  description?: string;
  eyebrow?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  showCancelButton?: boolean;
  showFooter?: boolean;
  panelClassName?: string;
  contentClassName?: string;
  overlayClassName?: string;
  renderInPortal?: boolean;
  contentRef?: React.Ref<HTMLDivElement>;
};

export function BottomSheetForm({
  open,
  title,
  onClose,
  onSubmit,
  children,
  description,
  eyebrow = "نموذج",
  submitLabel = "حفظ",
  isSubmitting = false,
  showCancelButton = false,
  showFooter = true,
  panelClassName,
  contentClassName,
  overlayClassName,
  renderInPortal = false,
  contentRef,
}: BottomSheetFormProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!open) return null;

  const sheet = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:p-4 md:items-center md:justify-end",
        overlayClassName,
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden border border-[color:var(--app-accent-strong)] bg-background/95 shadow-2xl shadow-black/15 backdrop-blur-xl",
          "h-[92dvh] max-h-[92dvh] rounded-t-[30px] rounded-b-none md:h-[min(860px,calc(100vh-2rem))] md:max-w-[480px] md:rounded-[30px]",
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 pt-3 md:hidden">
          <div className="mx-auto h-1.5 w-14 rounded-full bg-[color:var(--app-accent-strong)]" />
        </div>
        <div className="relative border-b border-[color:var(--app-accent-strong)] bg-gradient-to-b from-[color:var(--app-accent-soft)] via-background/96 to-background/84 px-5 py-4 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[color:var(--app-accent-strong)]/70" />
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--app-accent-color)]">
                {eyebrow}
              </p>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              {description ? (
                <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[color:var(--app-accent-strong)] bg-background/80 p-2 text-[color:var(--app-accent-color)] shadow-sm transition hover:bg-[color:var(--app-accent-soft)]"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div
          ref={contentRef}
          className={cn(
            "flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
            contentClassName,
          )}
        >
          {children}
        </div>
        {showFooter ? (
          <div className="border-t border-[color:var(--app-accent-strong)] bg-background/92 px-5 py-4 backdrop-blur-sm">
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

  if (renderInPortal) {
    if (!isMounted) {
      return null;
    }

    return createPortal(sheet, document.body);
  }

  return sheet;
}
