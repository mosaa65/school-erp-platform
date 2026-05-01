"use client";

import * as React from "react";
import { useFooterDockStore } from "@/store/footer-dock-store";

export type FabProps = {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * The Fab component now acts as a portal to the Footer Dock Store.
 * Instead of rendering a floating button, it registers the action with the AppFooterDock.
 */
export function Fab({
  onClick,
  label,
  icon,
  disabled = false,
}: FabProps) {
  const setAddAction = useFooterDockStore((state) => state.setAddAction);

  React.useEffect(() => {
    setAddAction({
      onClick,
      label,
      icon,
      disabled,
    });
    return () => setAddAction(null);
  }, [onClick, label, icon, disabled, setAddAction]);

  return null;
}
