"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  PanelRightClose,
  UserCircle2,
} from "lucide-react";
import { APP_NAV_GROUPS, type AppNavItem } from "@/components/layout/app-navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { translateRoleCode } from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
};

type VisibleNavGroup = {
  id: string;
  label: string;
  icon: AppNavItem["icon"];
  items: AppNavItem[];
};

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: AppShellProps) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission } = useRbac();
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (auth.isHydrated && !auth.session) {
      router.replace("/auth/login");
    }
  }, [auth.isHydrated, auth.session, router]);

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const visibleNavGroups = React.useMemo<VisibleNavGroup[]>(() => {
    return APP_NAV_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      icon: group.icon,
      items: group.items.filter(
        (item) =>
          item.requiredPermission === undefined || hasPermission(item.requiredPermission),
      ),
    })).filter((group) => group.items.length > 0);
  }, [hasPermission]);

  const visibleNavItems = React.useMemo(
    () => visibleNavGroups.flatMap((group) => group.items),
    [visibleNavGroups],
  );

  const activeNavItem =
    visibleNavItems.find((item) => isNavItemActive(pathname, item.href)) ??
    visibleNavItems[0];

  const activeGroupId = React.useMemo(() => {
    if (!activeNavItem) {
      return undefined;
    }

    return visibleNavGroups.find((group) =>
      group.items.some((item) => item.href === activeNavItem.href),
    )?.id;
  }, [activeNavItem, visibleNavGroups]);

  React.useEffect(() => {
    setExpandedGroupIds((previous) => {
      const validIds = previous.filter((id) =>
        visibleNavGroups.some((group) => group.id === id),
      );
      const next = new Set(validIds);

      if (next.size === 0) {
        for (const group of visibleNavGroups) {
          next.add(group.id);
        }
      }

      if (activeGroupId) {
        next.add(activeGroupId);
      }

      const nextIds = Array.from(next);
      const isSame =
        nextIds.length === previous.length &&
        nextIds.every((id, index) => id === previous[index]);

      return isSame ? previous : nextIds;
    });
  }, [activeGroupId, visibleNavGroups]);

  if (!auth.isHydrated || !auth.session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-8">
        <p className="text-sm text-muted-foreground">جارٍ تحميل مساحة العمل...</p>
      </main>
    );
  }

  const handleLogout = () => {
    auth.signOut();
    router.replace("/auth/login");
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((previous) => {
      const set = new Set(previous);
      if (set.has(groupId)) {
        set.delete(groupId);
      } else {
        set.add(groupId);
      }
      return Array.from(set);
    });
  };

  return (
    <div className="relative min-h-screen md:grid md:grid-cols-[300px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-80 flex-col overflow-hidden border-l border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur-sm transition-transform duration-200 md:static md:w-auto md:translate-x-0 md:border-l-0 md:border-r",
          isSidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">School ERP</p>
              <p className="text-xs text-muted-foreground">لوحة تحكم الويب</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق الشريط الجانبي"
          >
            <PanelRightClose className="h-5 w-5" />
          </Button>
        </div>

        <div className="mb-5 rounded-lg border border-border/70 bg-background/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <UserCircle2 className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {auth.session.user.firstName} {auth.session.user.lastName}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {auth.session.user.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {auth.session.user.roleCodes.slice(0, 2).map((roleCode) => (
              <Badge key={roleCode} variant="secondary">
                {translateRoleCode(roleCode)}
              </Badge>
            ))}
            {auth.session.user.roleCodes.length > 2 ? (
              <Badge variant="outline">+{auth.session.user.roleCodes.length - 2}</Badge>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pe-1">
          <nav className="space-y-2">
            {visibleNavGroups.map((group) => {
              const isExpanded = expandedGroupIds.includes(group.id);
              const hasActiveItem = group.items.some((item) =>
                isNavItemActive(pathname, item.href),
              );

              return (
                <section
                  key={group.id}
                  className={cn(
                    "rounded-lg border border-border/60 bg-background/50 p-2",
                    hasActiveItem ? "border-primary/40" : "",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-right text-sm font-medium hover:bg-muted/70"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span className="flex items-center gap-2">
                      <group.icon className="h-4 w-4 text-primary" />
                      {group.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded ? "rotate-180" : "",
                      )}
                    />
                  </button>

                  {isExpanded ? (
                    <div className="mt-1 space-y-1">
                      {group.items.map((item) => {
                        const active = isNavItemActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                              active
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </nav>
        </div>
      </aside>

      {isSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/35 md:hidden"
          aria-label="Sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-sm md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="فتح الشريط الجانبي"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-xs text-muted-foreground">الوحدة الحالية</p>
                <h1 className="text-base font-semibold md:text-lg">
                  {activeNavItem?.label ?? "School ERP"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}




