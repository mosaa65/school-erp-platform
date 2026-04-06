"use client";

import * as React from "react";
import {
  Bell,
  House,
  LayoutGrid,
  UserRound,
  X,
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

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={action.onClick}
      aria-pressed={action.active}
      className={cn(
        "group relative h-[4.1rem] min-w-0 flex-col justify-center gap-0.5 rounded-[1.25rem] border-0 bg-transparent px-1.5 py-1 text-slate-500 shadow-none transition-colors duration-150 hover:bg-transparent hover:text-[color:var(--app-accent-color)] focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/30 dark:text-white/58 dark:hover:bg-transparent dark:hover:text-white",
        action.active
          ? "text-[color:var(--app-accent-color)]"
          : "",
        action.featured ? "px-2" : "",
      )}
    >
      <span
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-[1rem] border border-transparent bg-transparent transition-all duration-150 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.04] group-active:translate-y-0 group-active:scale-100 motion-reduce:transition-none",
          action.featured ? "h-11 w-11 rounded-[1.2rem]" : "",
          action.active
            ? "text-[color:var(--app-accent-strong)] drop-shadow-[0_8px_18px_color-mix(in_oklab,var(--app-accent-color)_30%,transparent)]"
            : "text-slate-700 group-hover:text-[color:var(--app-accent-color)] dark:text-white/74 dark:group-hover:text-white",
          action.featured
            ? action.active
              ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-color)] text-white shadow-[0_14px_30px_-20px_color-mix(in_oklab,var(--app-accent-color)_60%,transparent)]"
              : "border-[color:var(--app-accent-strong)]/55 bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
            : "",
        )}
      >
        <Icon
          className={cn("h-[1.45rem] w-[1.45rem]", action.featured ? "h-[1.6rem] w-[1.6rem]" : "")}
          strokeWidth={action.active ? 2.3 : 2.15}
        />
        {typeof action.unreadCount === "number" && action.unreadCount > 0 ? (
          <Badge
            variant="destructive"
            className={cn(
              "absolute min-w-5 rounded-full px-1.5 py-0 text-[10px] leading-none",
              action.featured ? "-right-1 -top-1" : "-right-2 -top-2",
            )}
          >
            {action.unreadCount > 99 ? "99+" : action.unreadCount}
          </Badge>
        ) : null}
      </span>

      <span
        className={cn(
          "truncate text-[10.5px] font-medium leading-none transition-colors duration-150",
          action.featured && action.active
            ? "text-[color:var(--app-accent-color)]"
            : "",
          action.active
            ? "text-[color:var(--app-accent-color)]"
            : "text-slate-700 group-hover:text-[color:var(--app-accent-color)] dark:text-white/64 dark:group-hover:text-white/86",
        )}
      >
        {action.label}
      </span>
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
        "pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] sm:px-4 md:px-6",
        className,
      )}
    >
      <div className="mx-auto flex max-w-lg justify-center">
        <div className="pointer-events-auto relative w-full overflow-visible rounded-[1.9rem] border border-white/20 bg-white/6 px-2 py-1.5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.16)] backdrop-blur-[26px] dark:border-white/8 dark:bg-white/[0.03] dark:shadow-[0_18px_40px_-28px_rgba(2,6,23,0.45)]">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 rounded-l-[1.9rem] bg-gradient-to-r from-[color:var(--app-accent-soft)]/70 via-transparent to-transparent" />
          <div
            className="relative grid items-center gap-1"
            style={{
              gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))`,
            }}
          >
            {actions.map((action) => (
              <FooterButton key={action.key} action={action} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
