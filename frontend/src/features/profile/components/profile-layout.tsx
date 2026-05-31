"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  LogOut,
  MonitorSmartphone,
  Palette,
  PanelsTopLeft,
  ShieldCheck,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ProfileHeader } from "./profile-header";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const APP_VERSION_LABEL = "School ERP Web v0.1.0";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/app/profile", label: "الحساب", icon: BadgeCheck },
  { href: "/app/profile/security", label: "الأمان", icon: ShieldCheck },
  {
    href: "/app/profile/sessions",
    label: "الجلسات",
    icon: MonitorSmartphone,
  },
  { href: "/app/profile/appearance", label: "المظهر", icon: Palette },
  { href: "/app/profile/notifications", label: "الإشعارات", icon: Bell },
  { href: "/app/profile/advanced", label: "متقدم", icon: PanelsTopLeft },
];

export function ProfileLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);

  const sessionsQuery = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => apiClient.listAuthSessions(),
    enabled: Boolean(auth.session?.accessToken),
  });

  if (!auth.session) return null;

  const sessions = sessionsQuery.data ?? [];

  const isActive = (href: string) => {
    if (href === "/app/profile") return pathname === "/app/profile";
    if (href === "/app/profile/advanced") {
      return (
        pathname.startsWith("/app/profile/advanced") ||
        pathname === "/app/profile/navigation" ||
        pathname.startsWith("/app/profile/entity-surface")
      );
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-3 sm:space-y-4 pb-8" dir="rtl">
      {/* ── Compact Horizontal Profile Header ─────────── */}
      <ProfileHeader
        sessionCount={sessions.length}
        sessionCountLoading={sessionsQuery.isLoading}
      />

      {/* ── Mobile Nav (horizontal scrollable) ────────── */}
      <div className="block sm:hidden">
        <div className="overflow-x-auto rounded-[1.4rem] border border-white/65 bg-white/76 p-1.5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/58">
          <div className="flex gap-1 min-w-max">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[1rem] px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition-all duration-200",
                    active
                      ? "bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)] shadow-sm ring-1 ring-[color:var(--app-accent-strong)]"
                      : "text-slate-500 hover:bg-black/[0.04] hover:text-slate-700 dark:text-white/45 dark:hover:bg-white/[0.05] dark:hover:text-white/70",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Desktop Layout: Sidebar + Content ─────────── */}
      <div className="flex gap-4">
        {/* Sidebar Navigation - desktop only */}
        <aside className="hidden w-52 shrink-0 sm:block">
          <div className="sticky top-4 space-y-2">
            <nav className="overflow-hidden rounded-[1.6rem] border border-white/65 bg-white/76 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/58">
              <div className="p-2 space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[1.1rem] px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)] shadow-sm ring-1 ring-[color:var(--app-accent-strong)]"
                          : "text-slate-600 hover:bg-black/[0.04] hover:text-slate-800 dark:text-white/55 dark:hover:bg-white/[0.05] dark:hover:text-white/80",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          active ? "scale-110" : "",
                        )}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="mx-3 h-px bg-black/5 dark:bg-white/8" />

              {/* Sign out button */}
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(true)}
                  className="flex w-full items-center gap-2.5 rounded-[1.1rem] px-3 py-2.5 text-sm font-medium text-rose-600 transition-all hover:bg-rose-500/8 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              </div>
            </nav>

            {/* Version label */}
            <p className="px-2 text-center text-[10px] text-muted-foreground">
              {APP_VERSION_LABEL}
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* ── Mobile Sign Out ───────────────────────────── */}
      <div className="block sm:hidden">
        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="group flex w-full items-center justify-center gap-3 rounded-[1.6rem] border border-rose-500/25 bg-rose-500/8 px-5 py-3.5 text-rose-700 transition-all hover:border-rose-500/40 hover:bg-rose-500/14 dark:border-rose-500/20 dark:bg-rose-500/[0.06] dark:text-rose-300 dark:hover:bg-rose-500/12"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 transition-all group-hover:bg-rose-500/18">
            <LogOut className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold">تسجيل الخروج</span>
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          {APP_VERSION_LABEL}
        </p>
      </div>

      {/* ── Sign Out Confirmation Modal ────────────────── */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSignOutConfirm(false)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_36px_100px_-30px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_36px_100px_-30px_rgba(0,0,0,0.8)]">
            <div className="h-1 w-full bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600" />
            <div className="p-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10">
                <LogOut className="h-7 w-7 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  تسجيل الخروج
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-white/60">
                  هل أنت متأكد من تسجيل الخروج؟
                  <br />
                  سيتم إنهاء جلستك الحالية.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[1rem] bg-rose-600 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,0.55)] transition-all hover:bg-rose-700 active:scale-[0.98]"
                  onClick={() => {
                    auth.signOut();
                    router.replace("/auth/login");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  تأكيد تسجيل الخروج
                </button>
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-center rounded-[1rem] border border-black/8 bg-transparent text-sm font-medium text-slate-600 transition-all hover:bg-black/[0.04] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.05]"
                  onClick={() => setShowSignOutConfirm(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
