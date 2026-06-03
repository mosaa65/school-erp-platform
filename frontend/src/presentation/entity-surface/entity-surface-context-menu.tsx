"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { EntitySurfaceCard } from "@/presentation/entity-surface/entity-surface-card";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import type { EntitySurfaceQuickAction } from "@/presentation/entity-surface/entity-surface-types";
import type { EntitySurfaceCardProps } from "@/presentation/entity-surface/entity-surface-card";

type EntitySurfaceContextMenuProps = {
  open: boolean;
  card: Omit<EntitySurfaceCardProps, "onClick" | "onLongPress">;
  actions?: EntitySurfaceQuickAction[];
  onClose: () => void;
  className?: string;
};

export function EntitySurfaceContextMenu({
  open,
  card,
  actions,
  onClose,
  className,
}: EntitySurfaceContextMenuProps) {
  const [mounted, setMounted] = React.useState(false);
  const [sidebarOffset, setSidebarOffset] = React.useState("0px");

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));

    const updateOffset = () => {
      const rootStyles = getComputedStyle(document.documentElement);
      const desktopOffset = rootStyles.getPropertyValue("--app-desktop-sidebar-offset").trim() || "0px";
      const mobileOffset = rootStyles.getPropertyValue("--app-mobile-sidebar-offset").trim() || "0px";
      const isMobile = window.innerWidth < 768;

      setSidebarOffset(isMobile ? mobileOffset : desktopOffset);
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);

    return () => {
      window.cancelAnimationFrame(frame);
      setMounted(false);
      window.removeEventListener("resize", updateOffset);
    };
  }, []);

  if (!open) {
    return null;
  }

  const menu = (
    <div
      className={cn("fixed inset-0 left-0 z-[110]", className)}
      style={{ right: sidebarOffset }}
    >
      <div className="absolute inset-0 bg-black/24 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center px-4 py-4" onClick={onClose}>
        <div className="flex w-full max-w-[clamp(18rem,95vw,24rem)] flex-col items-center gap-3 mx-auto" onClick={(event) => event.stopPropagation()}>
          <div
            className={cn(
              "w-full transition-all duration-300 ease-out",
              mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.985] opacity-0",
            )}
          >
            <EntitySurfaceCard
              {...card}
              contextOpen
              onClick={undefined}
              onLongPress={undefined}
            />
          </div>

          {actions && actions.length > 0 ? (
            <div
              className={cn(
                "w-full max-w-[clamp(12rem,16vw,16rem)] mx-auto transition-all duration-300 ease-out",
                mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.985] opacity-0",
              )}
            >
              <EntitySurfaceQuickActions
                actions={actions}
                orientation="vertical"
                buttonClassName="px-3"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}
