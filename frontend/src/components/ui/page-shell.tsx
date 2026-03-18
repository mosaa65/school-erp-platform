import * as React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  filterButton?: React.ReactNode;
  children: React.ReactNode;
  fab?: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  subtitle,
  actions,
  filterButton,
  children,
  fab,
  className,
}: PageShellProps) {
  return (
    <div className={cn("relative space-y-6", className)}>
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterButton}
          {actions}
        </div>
      </header>

      <main className="space-y-6">{children}</main>

      {fab ? <div className="pointer-events-none">{fab}</div> : null}
    </div>
  );
}
