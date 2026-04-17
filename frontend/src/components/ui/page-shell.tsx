import * as React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  filterButton?: React.ReactNode;
  children: React.ReactNode;
  fab?: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  subtitle,
  eyebrow,
  actions,
  filterButton,
  children,
  fab,
  className,
}: PageShellProps) {
  return (
    <div className={cn("relative space-y-6", className)}>
      <header className="overflow-hidden rounded-[2rem] border border-[color:var(--app-accent-strong)]/35 bg-gradient-to-br from-[color:var(--app-accent-soft)]/58 via-background/97 to-background/88 px-5 py-5 shadow-[0_28px_68px_-48px_rgba(15,23,42,0.42)] backdrop-blur-xl sm:px-6">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[color:var(--app-accent-strong)]/60" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--app-accent-color)]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              {title}
            </h1>
          {subtitle ? (
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
          ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filterButton}
            {actions}
          </div>
        </div>
      </header>

      <main className="space-y-6">{children}</main>

      {fab ? <div className="pointer-events-none">{fab}</div> : null}
    </div>
  );
}
