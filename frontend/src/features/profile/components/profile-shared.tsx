"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ── SectionCard ────────────────────────────────────── */
export function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/55">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className={Icon ? "mt-3 pr-12" : "mt-3"}>{children}</div>
    </div>
  );
}

/* ── NoticeText ─────────────────────────────────────── */
export function NoticeText({
  notice,
}: {
  notice: { type: "success" | "error"; message: string } | null;
}) {
  if (!notice) return null;
  return (
    <p
      className={cn(
        "mt-2 text-xs font-medium",
        notice.type === "success"
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-rose-700 dark:text-rose-300",
      )}
    >
      {notice.message}
    </p>
  );
}

/* ── InfoRow ────────────────────────────────────────── */
export function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/70 bg-background/78 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-white/65">
        <Icon className="h-4 w-4 shrink-0 text-[color:var(--app-accent-color)]" />
        <span className="text-sm">{label}</span>
      </span>
      <span className="truncate text-left text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

/* ── Page wrapper ───────────────────────────────────── */
export function ProfilePageWrapper({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4" dir="rtl">
      {/* Page header */}
      <div className="flex items-center gap-3 pb-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/50">
            {description}
          </p>
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}

/* ── resolveBranchModeLabel (shared helper) ─────────── */
export function resolveBranchModeLabel(
  isLoaded: boolean,
  isMultiBranchEnabled: boolean,
  defaultBranchId: number | null,
): string {
  if (!isLoaded) return "جارٍ مزامنة الفروع";
  if (isMultiBranchEnabled)
    return defaultBranchId
      ? `متعدد الفروع • #${defaultBranchId}`
      : "متعدد الفروع";
  return "مدرسة واحدة";
}
