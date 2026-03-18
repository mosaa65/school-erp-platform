import * as React from "react";
import { cn } from "@/lib/utils";

export type SidebarProps = {
  open?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
  width?: string;
};

export function Sidebar({
  open = true,
  title,
  children,
  className,
  width = "w-72",
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden border-r border-border bg-background",
        width,
        !open && "hidden",
        className
      )}
    >
      {title ? (
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
        </header>
      ) : null}
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </aside>
  );
}
