"use client";

import * as React from "react";
import {
  Bell,
  House,
  UserRound,
  X,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppFooterDockItemKey =
  | "home"
  | "navigator"
  | "notifications"
  | "profile";

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
  onClick?: () => void;
};

function FooterButton({ action }: { action: FooterAction }) {
  const Icon = action.icon;
  const active = action.active;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={action.onClick}
      aria-pressed={active}
      className={cn(
        "group relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full border-0 transition-all duration-300 ease-out",
        active
          ? "w-auto bg-[color:var(--app-accent-color)] px-4 text-white shadow-[0_8px_16px_-6px_color-mix(in_oklab,var(--app-accent-color)_50%,transparent)] hover:bg-[color:var(--app-accent-strong)] hover:text-white"
          : "w-11 bg-transparent px-0 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      )}
    >
      <div className="relative flex items-center justify-center">
        <Icon
          className={cn(
            "h-[1.15rem] w-[1.15rem] shrink-0 transition-transform duration-300",
            active ? "scale-110" : "group-hover:scale-110"
          )}
          strokeWidth={active ? 2.5 : 2}
        />
        {typeof action.unreadCount === "number" && action.unreadCount > 0 && !active ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm outline outline-2 outline-background">
            {action.unreadCount > 99 ? "99+" : action.unreadCount}
          </span>
        ) : null}
      </div>

      <span
        className={cn(
          "overflow-hidden whitespace-nowrap text-[13px] font-semibold tracking-tight transition-all duration-300",
          active ? "max-w-[100px] opacity-100" : "max-w-0 opacity-0"
        )}
      >
        {action.label}
      </span>
      
      {typeof action.unreadCount === "number" && action.unreadCount > 0 && active ? (
          <Badge
            variant="destructive"
            className="ml-1 h-5 min-w-5 rounded-full px-1.5 py-0 text-[10px] shadow-none"
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
  const actions: FooterAction[] = [
    {
      key: "home",
      label: homeLabel,
      icon: House,
      active: activeItem === "home",
      onClick: onHomeClick,
    },
    {
      key: "navigator",
      label: navigatorOpen ? navigatorCloseLabel : navigatorLabel,
      icon: navigatorOpen ? X : LayoutGrid,
      active: navigatorOpen || activeItem === "navigator",
      featured: true,
      onClick: onNavigatorClick,
    },
  ];

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

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex justify-center",
        className,
      )}
    >
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/40 bg-background/85 px-1.5 py-1.5 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-black/60">
        {actions.map((action) => (
          <FooterButton key={action.key} action={action} />
        ))}
      </div>
    </div>
  );
}
