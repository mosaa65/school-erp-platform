import * as React from "react";
import { Info, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FinanceAlertTone = "error" | "warning" | "info" | "success";

const ALERT_TONE_CLASSES: Record<FinanceAlertTone, string> = {
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  info: "border-border/60 bg-muted/40 text-muted-foreground",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
};

export function FinanceAlert({
  tone = "info",
  className,
  children,
}: {
  tone?: FinanceAlertTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-md border p-3 text-sm", ALERT_TONE_CLASSES[tone], className)}>
      {children}
    </div>
  );
}

export function FinanceEmptyState({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed p-4 text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FinanceInlineHint({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="space-y-1.5">
          {title ? <p className="font-medium text-foreground">{title}</p> : null}
          <div className="leading-6 text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function FinanceAppliedFiltersSummary({
  items,
  onClear,
  emptyLabel = "لا توجد فلاتر إضافية مطبقة.",
  className,
}: {
  items: Array<{ key: string; label: string; value: string }>;
  onClear?: () => void;
  emptyLabel?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <Info className="h-4 w-4" />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 rounded-xl border bg-card/70 p-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">الفلاتر المطبقة الآن</p>
        {onClear ? (
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onClear}>
            <X className="h-4 w-4" />
            مسح الكل
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item.key} variant="outline" className="gap-1.5">
            <span className="text-muted-foreground">{item.label}:</span>
            <span>{item.value}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function confirmFinanceAction(message: string) {
  return window.confirm(message);
}
