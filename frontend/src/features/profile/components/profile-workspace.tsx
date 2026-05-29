"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  LogOut,
  PanelsTopLeft,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ProfileHeader } from "./profile-header";
import { ProfileAccountSection } from "./profile-account-section";
import { ProfileSecuritySection } from "./profile-security-section";
import { ProfilePreferencesSection } from "./profile-preferences-section";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const APP_VERSION_LABEL = "School ERP Web v0.1.0";

type TabId = "account" | "security" | "preferences" | "advanced";

const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "account",     label: "الحساب",    icon: BadgeCheck      },
  { id: "security",    label: "الأمان",    icon: ShieldCheck     },
  { id: "preferences", label: "التفضيلات", icon: Palette         },
  { id: "advanced",    label: "متقدم",     icon: PanelsTopLeft   },
];

export function ProfileWorkspace() {
  const auth = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabId>("account");
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);

  const sessionsQuery = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => apiClient.listAuthSessions(),
    enabled: Boolean(auth.session?.accessToken),
  });

  if (!auth.session) return null;

  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-3 sm:space-y-4" dir="rtl">

      {/* ── Profile Header Card ───────────────────────── */}
      <ProfileHeader
        sessionCount={sessions.length}
        sessionCountLoading={sessionsQuery.isLoading}
      />

      {/* ── Tab Navigation ───────────────────────────── */}
      <div className="rounded-[1.6rem] border border-white/65 bg-white/76 p-1.5 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/58">
        <div className="grid grid-cols-4 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[1.1rem] px-2 py-2.5 text-center transition-all duration-200",
                  active
                    ? "bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)] shadow-sm ring-1 ring-[color:var(--app-accent-strong)]"
                    : "text-slate-500 hover:bg-black/[0.04] hover:text-slate-700 dark:text-white/45 dark:hover:bg-white/[0.05] dark:hover:text-white/70",
                )}
              >
                <Icon className={cn("h-4 w-4 transition-transform duration-200", active ? "scale-110" : "")} />
                <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────── */}
      <div className="overflow-hidden rounded-[1.8rem] border border-white/65 bg-white/76 shadow-[0_26px_68px_-42px_rgba(15,23,42,0.2)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_26px_68px_-42px_rgba(15,23,42,0.9)]">

        {/* Section header */}
        <div className="border-b border-black/5 px-5 py-4 dark:border-white/8">
          {TABS.filter(t => t.id === activeTab).map(tab => {
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[0.9rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{tab.label}</p>
                  <p className="text-[11px] text-slate-400 dark:text-white/40">
                    {tab.id === "account"     && "المعلومات الشخصية ورقم الهاتف"}
                    {tab.id === "security"    && "كلمة المرور، البصمات، والجلسات"}
                    {tab.id === "preferences" && "المظهر، التنقل، والإشعارات"}
                    {tab.id === "advanced"    && "إعدادات بطاقات العرض والتفاصيل"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content body */}
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          {activeTab === "account"     && <ProfileAccountSection />}
          {activeTab === "security"    && <ProfileSecuritySection />}
          {activeTab === "preferences" && <ProfilePreferencesSection />}
          {activeTab === "advanced"    && <AdvancedSection router={router} />}
        </div>
      </div>

      {/* ── Sign Out Button ───────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowSignOutConfirm(true)}
        className="group flex w-full items-center justify-center gap-3 rounded-[1.8rem] border border-rose-500/25 bg-rose-500/8 px-5 py-4 text-rose-700 transition-all hover:border-rose-500/40 hover:bg-rose-500/14 dark:border-rose-500/20 dark:bg-rose-500/[0.06] dark:text-rose-300 dark:hover:bg-rose-500/12"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 transition-all group-hover:bg-rose-500/18">
          <LogOut className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold">تسجيل الخروج</span>
      </button>

      <p className="px-2 pt-0.5 text-center text-[11px] text-muted-foreground">
        {APP_VERSION_LABEL}
      </p>

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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">تسجيل الخروج</h3>
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

function AdvancedSection({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="space-y-3">
      <div className="rounded-[1.25rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
            <PanelsTopLeft className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              إعدادات بطاقات العرض والتفاصيل
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/55">
              تحكم في شكل البطاقات، الألوان، التفاعل، ومعاينة الصلاحيات قبل تطبيقها على واجهة
              الطلاب.
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="mt-3 h-11 w-full rounded-2xl"
          onClick={() => router.push("/app/profile/entity-surface")}
        >
          <PanelsTopLeft className="h-4 w-4" />
          فتح إعدادات البطاقات
        </Button>
      </div>
    </div>
  );
}
