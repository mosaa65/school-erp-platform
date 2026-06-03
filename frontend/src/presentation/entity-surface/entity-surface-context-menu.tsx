"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntitySurfaceCard } from "@/presentation/entity-surface/entity-surface-card";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import type { EntitySurfaceQuickAction } from "@/presentation/entity-surface/entity-surface-types";
import type { EntitySurfaceCardProps } from "@/presentation/entity-surface/entity-surface-card";

type EntitySurfaceContextMenuProps = {
  open: boolean;
  card: Omit<EntitySurfaceCardProps, "onClick" | "onLongPress">;
  actions?: EntitySurfaceQuickAction[];
  copyText?: string;
  onClose: () => void;
  className?: string;
};

function getPlainTextFromNode(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getPlainTextFromNode).filter(Boolean).join(" ");
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getPlainTextFromNode(node.props.children);
  }

  return "";
}

async function copyToClipboard(text: string) {
  try {
    if (window.navigator.clipboard?.writeText) {
      await window.navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall back to the hidden textarea method below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function EntitySurfaceContextMenu({
  open,
  card,
  actions,
  copyText,
  onClose,
  className,
}: EntitySurfaceContextMenuProps) {
  const [mounted, setMounted] = React.useState(false);
  const [sidebarOffset, setSidebarOffset] = React.useState("0px");
  const [copySucceeded, setCopySucceeded] = React.useState(false);
  const resolvedCopyText = React.useMemo(
    () => (copyText ?? getPlainTextFromNode(card.title)).trim(),
    [card.title, copyText],
  );

  React.useEffect(() => {
    setCopySucceeded(false);
  }, [open, resolvedCopyText]);

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

  const resolvedActions = React.useMemo<EntitySurfaceQuickAction[]>(() => {
    const baseActions = actions ? [...actions] : [];

    if (!resolvedCopyText) {
      return baseActions;
    }

    return [
      {
        key: "copy-record",
        label: copySucceeded ? "تم النسخ" : "نسخ",
        icon: <Copy className="h-3.5 w-3.5" />,
        tone: "ghost",
        onClick: () => {
          void copyToClipboard(resolvedCopyText).then(() => {
            setCopySucceeded(true);
            window.setTimeout(() => setCopySucceeded(false), 1400);
          }).catch(() => undefined);
        },
      },
      ...baseActions,
    ];
  }, [actions, copySucceeded, resolvedCopyText]);

  if (!open) {
    return null;
  }

  const menu = (
    <div
      className={cn("fixed inset-0 left-0 z-[110] select-none", className)}
      style={{ right: sidebarOffset }}
      onContextMenu={(event) => event.preventDefault()}
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

          {resolvedActions.length > 0 ? (
            <div
              className={cn(
                "w-full max-w-[clamp(12rem,16vw,16rem)] mx-auto transition-all duration-300 ease-out",
                mounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.985] opacity-0",
              )}
            >
              <EntitySurfaceQuickActions
                actions={resolvedActions}
                orientation="vertical"
                buttonClassName="select-none px-3"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}
