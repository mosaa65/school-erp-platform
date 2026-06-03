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

import { Drawer } from "vaul";

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
  contentRef,
}: BottomSheetFormProps) {
  const pointerIdRef = React.useRef<number | null>(null);
  const startYRef = React.useRef(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startYRef.current = event.clientY;
    setIsDragging(true);
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const offset = event.clientY - startYRef.current;
    setDragOffset(offset > 0 ? offset : 0);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    if (dragOffset > 120) {
      onClose();
    } else {
      setDragOffset(0);
    }

    setIsDragging(false);
    pointerIdRef.current = null;
  };

  const content = (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden border border-border/40 bg-background/40 shadow-2xl backdrop-blur-2xl transition-all duration-300",
        "h-[calc(92dvh-var(--app-footer-dock-offset,0px))] max-h-[calc(92dvh-var(--app-footer-dock-offset,0px))] rounded-t-[32px] rounded-b-none md:h-[min(860px,calc(100vh-2rem))] md:max-w-[520px] md:rounded-[32px] md:border",
        panelClassName,
      )}
      onClick={(event) => event.stopPropagation()}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      style={{
        transform: `translateY(${dragOffset}px)`,
        transition: isDragging ? "none" : "transform 180ms ease",
      }}
    >
      <div
        className="relative border-b border-border/40 bg-gradient-to-b from-[color:var(--app-accent-soft)]/20 via-background/40 to-background/20 px-5 pb-4 pt-3 backdrop-blur-md md:py-5"
        onPointerDown={handlePointerDown}
        style={{ touchAction: "pan-y" }}
      >
        <div className="mb-2.5 flex justify-center md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-border/60" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--app-accent-color)] opacity-80">
              {eyebrow}
            </p>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            {description ? (
              <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="group flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/40 text-muted-foreground shadow-sm transition-all hover:bg-background hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
          </button>
        </div>
      </div>
      
      <div
        ref={contentRef}
        className={cn(
          "flex-1 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          contentClassName,
        )}
      >
        {children}
      </div>

      {showFooter ? (
        <div className="border-t border-border/40 bg-background/40 px-5 py-4 backdrop-blur-md">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
            {showCancelButton ? (
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="h-11 rounded-2xl border-border/60 px-6 font-semibold sm:min-w-[120px]"
              >
                إلغاء
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="h-11 rounded-2xl bg-[color:var(--app-accent-color)] px-6 font-bold text-white shadow-lg shadow-[color:var(--app-accent-soft)] transition-all hover:-translate-y-0.5 hover:shadow-xl sm:min-w-[140px]"
            >
              {isSubmitting ? "جاري الحفظ..." : submitLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <Drawer.Root open={open} onOpenChange={(val) => !val && onClose()} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-x-0 top-0 bottom-[var(--app-footer-dock-offset,0px)] z-20 bg-black/40 backdrop-blur-md" />
        <Drawer.Content className="fixed inset-x-0 bottom-[var(--app-footer-dock-offset,0px)] z-50 flex flex-col items-center focus:outline-none">
          {content}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
