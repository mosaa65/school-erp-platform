"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  Clock3,
  KeyRound,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PROFILE_DRAWER_EASING = "transition-all duration-300";

export type ProfileDrawerSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
};

export function ProfileDrawerSection({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  className,
}: ProfileDrawerSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[28px] border border-white/40 bg-white/55 shadow-[0_18px_52px_-34px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45",
        className,
      )}
    >
      <div className="border-b border-white/40 bg-gradient-to-b from-white/70 via-white/45 to-white/20 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-transparent">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)] shadow-sm">
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--app-accent-color)]/85">
                {eyebrow}
              </p>
            ) : null}
            <h3 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export type ProfileDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  userName?: string;
  userEmail?: string;
  avatar?: React.ReactNode;
  roleLabels?: string[];
  permissionCount?: number;
  sessionLabel?: string;
  sessionExpiresIn?: string;
  currentSystemLabel?: string;
  currentContextLabel?: string;
  summaryNote?: string;
  appearanceSection?: React.ReactNode;
  sessionSection?: React.ReactNode;
  children?: React.ReactNode;
  footerActions?: React.ReactNode;
  renderInPortal?: boolean;
  className?: string;
  overlayClassName?: string;
  panelClassName?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
};

function useEscapeToClose(open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);
}

function useLockBodyScroll(open: boolean) {
  React.useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
}

export function ProfileDrawer({
  open,
  onClose,
  title = "الملف الشخصي",
  subtitle = "مساحة الحساب والمظهر والجلسة بأسلوب أكثر فخامة ووضوحًا.",
  eyebrow = "Profile",
  userName = "المستخدم",
  userEmail = "-",
  avatar,
  roleLabels = [],
  permissionCount,
  sessionLabel = "الجلسة",
  sessionExpiresIn,
  currentSystemLabel,
  currentContextLabel,
  summaryNote,
  appearanceSection,
  sessionSection,
  children,
  footerActions,
  renderInPortal = false,
  className,
  overlayClassName,
  panelClassName,
  contentClassName,
  showCloseButton = true,
}: ProfileDrawerProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  useEscapeToClose(open, onClose);
  useLockBodyScroll(open);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!open) {
    return null;
  }

  const sectionCount =
    Number(Boolean(appearanceSection)) +
    Number(Boolean(sessionSection)) +
    Number(Boolean(children));

  const drawer = (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]",
        overlayClassName,
      )}
      onClick={onClose}
      role="presentation"
    >
      <aside
        className={cn(
          "absolute inset-y-0 right-0 flex h-full w-full max-w-[min(100vw,620px)] flex-col overflow-hidden border-l border-white/35 bg-white/60 text-right shadow-[0_30px_90px_-40px_rgba(15,23,42,0.75)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60",
          "sm:max-w-[580px] md:max-w-[640px]",
          PROFILE_DRAWER_EASING,
          className,
          panelClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-white/40 bg-gradient-to-b from-white/75 via-white/50 to-white/20 px-5 pt-4 pb-5 backdrop-blur-xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-transparent sm:px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[color:var(--app-accent-soft)] to-transparent opacity-90" />
          <div className="pointer-events-none absolute -left-8 top-8 h-28 w-28 rounded-full bg-[color:var(--app-accent-soft)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-4 h-24 w-24 rounded-full bg-[color:var(--app-accent-strong)] blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--app-accent-color)]/85">
                {eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
              {subtitle ? (
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {showCloseButton ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onClose}
                className="h-11 w-11 rounded-2xl border-white/45 bg-white/65 text-foreground shadow-sm backdrop-blur-md hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                aria-label="إغلاق الملف الشخصي"
              >
                <X className="h-5 w-5" />
              </Button>
            ) : null}
          </div>

          <div className="relative mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="relative overflow-hidden rounded-[32px] border border-white/45 bg-white/60 p-4 shadow-[0_24px_72px_-46px_rgba(15,23,42,0.5)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 sm:p-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_42%),radial-gradient(circle_at_bottom_left,var(--app-accent-soft),transparent_38%)]" />
              <div className="relative flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)] shadow-[0_16px_36px_-24px_rgba(15,23,42,0.65)]">
                  {avatar ?? <UserCircle2 className="h-10 w-10" />}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-xl font-semibold md:text-2xl">{userName}</h3>
                    {currentSystemLabel ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-3 py-1 text-[10px] font-semibold text-[color:var(--app-accent-color)]"
                      >
                        {currentSystemLabel}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="truncate">{userEmail}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/50 sm:inline-flex" />
                    <span className="inline-flex items-center gap-1.5">
                      <BadgeCheck className="h-4 w-4" />
                      حساب نشط
                    </span>
                  </div>

                  {currentContextLabel ? (
                    <div className="rounded-[24px] border border-white/40 bg-white/55 px-4 py-3 text-xs leading-6 text-foreground/80 dark:border-white/10 dark:bg-white/5">
                      <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--app-accent-color)]/90">
                        <MonitorSmartphone className="h-3.5 w-3.5" />
                        سياق العمل
                      </span>
                      <p>{currentContextLabel}</p>
                    </div>
                  ) : null}

                  {summaryNote ? (
                    <div className="rounded-[24px] border border-dashed border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]/35 px-4 py-3 text-xs leading-6 text-muted-foreground">
                      {summaryNote}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="relative mt-4 flex flex-wrap gap-2">
                {roleLabels.slice(0, 4).map((role) => (
                  <Badge
                    key={role}
                    variant="secondary"
                    className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] font-medium"
                  >
                    <ShieldCheck className="me-1 h-3.5 w-3.5" />
                    {role}
                  </Badge>
                ))}
                {roleLabels.length > 4 ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-dashed px-3 py-1 text-[10px] font-medium"
                  >
                    +{roleLabels.length - 4}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[26px] border border-white/35 bg-white/55 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                      <KeyRound className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-accent-color)]/85">
                        الأدوار
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {roleLabels.length > 0 ? `${roleLabels.length}` : "0"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/35 bg-white/55 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                      <Sparkles className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-accent-color)]/85">
                        الصلاحيات
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {typeof permissionCount === "number"
                          ? `${permissionCount}`
                          : "غير محددة"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/35 bg-white/55 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                    <Clock3 className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-accent-color)]/85">
                      {sessionLabel}
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {sessionExpiresIn ?? "متصلة حاليا"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      الجلسة الحالية تعرض حالة الدخول ووقت الانتهاء التقريبي لتبقى الصورة واضحة دائمًا.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5",
            contentClassName,
          )}
        >
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/35 bg-white/55 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-accent-color)]/85">
                  الهوية
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  الاسم، البريد، والأدوار الأساسية في بطاقة واحدة مختصرة.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/35 bg-white/55 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-accent-color)]/85">
                  المظهر
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  الثيم والخط وحجم العرض من داخل الملف الشخصي فقط.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/35 bg-white/55 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-accent-color)]/85">
                  الجلسة
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  متابعة حالة الدخول والخروج من مكان واحد واضح.
                </p>
              </div>
            </div>

            {appearanceSection}
            {sessionSection}
            {children}

            {sectionCount === 0 ? (
              <div className="rounded-[28px] border border-dashed border-border/70 bg-white/40 p-5 text-sm leading-6 text-muted-foreground backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                لم يتم تمرير أي أقسام بعد. يمكن حقن أقسام المظهر أو الجلسة
                محليًا عند دمج هذا الـ drawer داخل `AppShell`.
              </div>
            ) : null}
          </div>
        </div>

        {footerActions ? (
          <div className="border-t border-white/40 bg-white/55 px-4 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              {footerActions}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );

  if (renderInPortal) {
    if (!isMounted) {
      return null;
    }

    return createPortal(drawer, document.body);
  }

  return drawer;
}
