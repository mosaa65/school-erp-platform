"use client";

import * as React from "react";
import {
  Bell,
  House,
  UserRound,
  X,
  LayoutGrid,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFooterDockStore } from "@/store/footer-dock-store";

export type AppFooterDockItemKey =
  | "home"
  | "navigator"
  | "notifications"
  | "profile"
  | "add";

export type AppFooterDockProps = {
  activeItem?: AppFooterDockItemKey | null;
  unreadCount?: number;
  canReadNotifications?: boolean;
  className?: string;
  onHomeClick?: () => void;
  onNavigatorClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  homeLabel?: string;
  navigatorLabel?: string;
  notificationsLabel?: string;
  profileLabel?: string;
  navigatorOpen?: boolean;
  navigatorCloseLabel?: string;
};

type FooterAction = {
  key: AppFooterDockItemKey;
  label: string;
  icon: LucideIcon;
  active: boolean;
  featured?: boolean;
  unreadCount?: number;
  disabled?: boolean;
  onClick?: () => void;
};

function FooterButton({ action, mode = "standalone" }: { action: FooterAction; mode?: "standalone" | "pill" }) {
  const Icon = action.icon;
  const active = action.active;
  const disabled = action.disabled;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={action.onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "group relative flex items-center justify-center gap-2.5 rounded-full transition-all duration-300 ease-out hover:-translate-y-0.5",
        
        mode === "standalone" && "shadow-[0_14px_34px_-22px_rgba(15,23,42,0.55)] backdrop-blur-xl border",
        
        "h-14 w-14 sm:h-11 px-0",
        active ? "sm:w-auto sm:px-4" : "sm:w-11 sm:px-0",

        active
          ? "text-[color:var(--app-accent-color)] font-semibold"
          : "text-muted-foreground hover:text-[color:var(--app-accent-color)]",

        mode === "standalone" 
          ? active 
            ? "bg-[color:var(--app-accent-soft)] border-[color:var(--app-accent-strong)]"
            : "bg-background/80 border-border/40 hover:bg-background/90 dark:bg-black/60 dark:hover:bg-black/80"
          : active 
            ? "bg-transparent sm:bg-[color:var(--app-accent-soft)] sm:border-[color:var(--app-accent-strong)]"
            : "bg-transparent hover:bg-black/5 dark:hover:bg-white/10"
      )}
    >
      <div className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
        !active && "border border-transparent group-hover:border-white/35 group-hover:bg-background/75 group-hover:dark:border-white/10 group-hover:shadow-sm"
      )}>
        <Icon
          className={cn(
            "h-5 w-5 sm:h-4.5 sm:w-4.5 shrink-0 transition-transform duration-300",
            active ? "scale-110" : "group-hover:scale-110"
          )}
          strokeWidth={active ? 2.5 : 2}
        />
        {typeof action.unreadCount === "number" && action.unreadCount > 0 ? (
          <span className={cn(
            "absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm outline outline-2 outline-background z-10",
            active && "sm:hidden" 
          )}>
            {action.unreadCount > 99 ? "99+" : action.unreadCount}
          </span>
        ) : null}
      </div>

      <span
        className={cn(
          "whitespace-nowrap text-[13px] tracking-tight transition-all duration-300",
          active ? "max-w-[100px] opacity-100 hidden sm:inline-block" : "max-w-0 opacity-0 hidden sm:inline-block overflow-hidden"
        )}
      >
        {action.label}
      </span>
      
      {typeof action.unreadCount === "number" && action.unreadCount > 0 && active ? (
          <Badge
            variant="destructive"
            className="ml-1 h-5 min-w-5 rounded-full px-1.5 py-0 text-[10px] shadow-none hidden sm:inline-flex"
          >
            {action.unreadCount > 99 ? "99+" : action.unreadCount}
          </Badge>
        ) : null}
    </Button>
  );
}

export function AppFooterDock({
  activeItem = null,
  unreadCount = 0,
  canReadNotifications = true,
  className,
  onHomeClick,
  onNavigatorClick,
  onNotificationsClick,
  onProfileClick,
  homeLabel = "الرئيسية",
  navigatorLabel = "التنقل",
  notificationsLabel = "الإشعارات",
  profileLabel = "الملف",
  navigatorOpen = false,
  navigatorCloseLabel = "إغلاق",
}: AppFooterDockProps) {
  const storeAddAction = useFooterDockStore((state) => state.addAction);
  const actions: FooterAction[] = [];

  if (storeAddAction) {
    actions.push({
      key: "add",
      label: storeAddAction.label ?? "إضافة",
      icon: Plus,
      active: activeItem === "add",
      disabled: storeAddAction.disabled,
      onClick: storeAddAction.onClick,
    });
  }

  actions.push({
    key: "home",
    label: homeLabel,
    icon: House,
    active: activeItem === "home",
    onClick: onHomeClick,
  });

  actions.push({
    key: "navigator",
    label: navigatorOpen ? navigatorCloseLabel : navigatorLabel,
    icon: navigatorOpen ? X : LayoutGrid,
    active: navigatorOpen || activeItem === "navigator",
    featured: true,
    onClick: onNavigatorClick,
  });

  if (canReadNotifications) {
    actions.push({
      key: "notifications",
      label: notificationsLabel,
      icon: Bell,
      active: activeItem === "notifications",
      unreadCount,
      onClick: onNotificationsClick,
    });
  }

  actions.push({
    key: "profile",
    label: profileLabel,
    icon: UserRound,
    active: activeItem === "profile",
    onClick: onProfileClick,
  });

  let rightAction: FooterAction | undefined;
  const leftAction = actions.find((a) => a.key === "profile");
  
  const addAction = actions.find((a) => a.key === "add");
  const homeAction = actions.find((a) => a.key === "home");
  
  if (addAction) {
    rightAction = addAction;
  } else {
    rightAction = homeAction;
  }
  
  const middleActions = actions.filter((a) => a !== rightAction && a !== leftAction);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-30 px-2 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex items-center justify-center",
        className,
      )}
    >
      <div className="flex w-full max-w-[22rem] sm:max-w-lg md:max-w-2xl items-center justify-between">
        {rightAction ? (
          <div className="pointer-events-auto">
            <FooterButton action={rightAction} mode="standalone" />
          </div>
        ) : null}

        {middleActions.length > 0 ? (
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/40 bg-background/80 p-1 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/60">
            {middleActions.map((action) => (
              <FooterButton key={action.key} action={action} mode="pill" />
            ))}
          </div>
        ) : null}

        {leftAction ? (
          <div className="pointer-events-auto">
            <FooterButton action={leftAction} mode="standalone" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
