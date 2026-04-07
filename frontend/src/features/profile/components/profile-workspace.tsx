"use client";

import * as React from "react";
import {
  BadgeCheck,
  ChevronDown,
  KeyRound,
  Layers3,
  LogOut,
  Mail,
  MonitorSmartphone,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  LayoutGrid,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ProfileAppearanceSection } from "@/components/layout/profile-appearance-section";
import { ProfileNavigationSection } from "@/components/layout/profile-navigation-section";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";
import { useBranchMode } from "@/hooks/use-branch-mode";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { translateRoleCode } from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";

type SectionId = "appearance" | "navigation" | "account" | "security";

const APP_VERSION_LABEL = "School ERP Web v0.1.0";

function resolveBranchModeLabel(
  isLoaded: boolean,
  isMultiBranchEnabled: boolean,
  defaultBranchId: number | null,
): string {
  if (!isLoaded) {
    return "جارٍ مزامنة الفروع";
  }

  if (isMultiBranchEnabled) {
    return defaultBranchId ? `متعدد الفروع • #${defaultBranchId}` : "متعدد الفروع";
  }

  return "مدرسة واحدة";
}

function ProfileStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/65 bg-white/72 px-3 py-3 text-center shadow-[0_16px_34px_-26px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.8)]">
      <p className="text-[11px] text-slate-500 dark:text-white/50">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function ProfileSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.8rem] border border-white/65 bg-white/76 text-slate-900 shadow-[0_26px_68px_-42px_rgba(15,23,42,0.2)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58 dark:text-white dark:shadow-[0_26px_68px_-42px_rgba(15,23,42,0.95)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-right transition hover:bg-black/[0.03] dark:hover:bg-white/[0.03] sm:px-5"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold sm:text-base">{title}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform dark:text-white/45",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-black/5 px-4 py-4 dark:border-white/10 sm:px-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ProfileRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/70 bg-background/78 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-white/70">
        <Icon className="h-4 w-4 shrink-0 text-[color:var(--app-accent-color)]" />
        <span>{label}</span>
      </span>
      <span className="truncate text-left text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

export function ProfileWorkspace() {
  const auth = useAuth();
  const router = useRouter();
  const appearance = useAppearance();
  const branchMode = useBranchMode();
  const [expandedSections, setExpandedSections] = React.useState<Record<SectionId, boolean>>({
    appearance: true,
    navigation: false,
    account: false,
    security: false,
  });

  if (!auth.session) {
    return null;
  }

  const userName = `${auth.session.user.firstName} ${auth.session.user.lastName}`;
  const roleLabels = auth.session.user.roleCodes.map((roleCode) => translateRoleCode(roleCode));
  const branchModeLabel = resolveBranchModeLabel(
    branchMode.isLoaded,
    branchMode.isMultiBranchEnabled,
    branchMode.defaultBranchId,
  );

  const toggleSection = (sectionId: SectionId) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/76 px-4 pb-4 pt-14 text-slate-900 shadow-[0_36px_100px_-56px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58 dark:text-white dark:shadow-[0_36px_100px_-56px_rgba(15,23,42,1)] sm:px-5 sm:pb-5">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-l from-transparent via-[color:var(--app-accent-soft)] to-transparent" />
        <div className="pointer-events-none absolute -left-6 bottom-2 h-20 w-20 rounded-full bg-[color:var(--app-accent-soft)] blur-3xl" />
        <div className="pointer-events-none absolute -right-8 top-6 h-24 w-24 rounded-full bg-[color:var(--app-accent-strong)] blur-3xl" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-sky-100/55 via-transparent to-transparent dark:from-sky-400/8" />

        <div className="absolute left-1/2 top-0 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[6px] border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] text-slate-700 shadow-[0_22px_40px_-18px_rgba(15,23,42,0.35)] dark:border-slate-950 dark:bg-white dark:text-slate-900 dark:shadow-[0_18px_36px_-18px_rgba(15,23,42,0.9)]">
          <UserCircle2 className="h-11 w-11" />
        </div>

        <div className="text-center">
          <h2 className="mx-auto max-w-xl text-lg font-bold leading-8 sm:text-[1.45rem]">
            {userName}
          </h2>
          <p className="mt-1 truncate text-[12px] text-slate-500 dark:text-white/55 sm:text-sm">
            {auth.session.user.email}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <ProfileStat label="الأدوار" value={`${roleLabels.length}`} />
          <ProfileStat label="الصلاحيات" value={`${auth.session.user.permissionCodes.length}`} />
          <div className="flex items-center justify-center rounded-[1.15rem] border border-[color:var(--app-accent-strong)] bg-[linear-gradient(180deg,var(--app-accent-soft),rgba(255,255,255,0.88))] text-[color:var(--app-accent-color)] shadow-[0_16px_36px_-24px_rgba(15,23,42,0.28)] dark:bg-[color:var(--app-accent-soft)] dark:shadow-[0_16px_36px_-24px_rgba(15,23,42,0.8)]">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border border-white/70 bg-white/78 px-3 py-1 text-[11px] text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80">
            {branchModeLabel}
          </span>
          {roleLabels.slice(0, 2).map((roleLabel) => (
            <span
              key={roleLabel}
              className="rounded-full border border-white/70 bg-white/78 px-3 py-1 text-[11px] text-slate-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70"
            >
              {roleLabel}
            </span>
          ))}
          {roleLabels.length > 2 ? (
            <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-[11px] text-slate-500 dark:border-white/15 dark:text-white/50">
              +{roleLabels.length - 2}
            </span>
          ) : null}
        </div>
      </section>

      <div className="space-y-3">
        <ProfileSection
          title="المظهر"
          icon={Palette}
          open={expandedSections.appearance}
          onToggle={() => toggleSection("appearance")}
        >
          <ProfileAppearanceSection />
          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-11 w-full rounded-[1.1rem] border border-white/70 bg-background/75 text-slate-800 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] dark:hover:text-white"
            onClick={() => appearance.resetAppearance()}
          >
            <RotateCcw className="h-4 w-4" />
            إعادة المظهر
          </Button>
        </ProfileSection>

        <ProfileSection
          title="التنقل"
          icon={LayoutGrid}
          open={expandedSections.navigation}
          onToggle={() => toggleSection("navigation")}
        >
          <ProfileNavigationSection />
        </ProfileSection>

        <ProfileSection
          title="الحساب"
          icon={BadgeCheck}
          open={expandedSections.account}
          onToggle={() => toggleSection("account")}
        >
          <div className="space-y-2">
            <ProfileRow label="البريد" value={auth.session.user.email} icon={Mail} />
            <ProfileRow label="الأدوار" value={`${roleLabels.length}`} icon={ShieldCheck} />
            <ProfileRow label="سياق العمل" value={branchModeLabel} icon={Layers3} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {roleLabels.map((roleLabel) => (
              <span
                key={roleLabel}
                className="rounded-full border border-white/70 bg-background/78 px-3 py-1 text-[11px] text-slate-700 dark:border-white/10 dark:bg-black/25 dark:text-white/78"
              >
                {roleLabel}
              </span>
            ))}
          </div>
        </ProfileSection>

        <ProfileSection
          title="الجلسة"
          icon={MonitorSmartphone}
          open={expandedSections.security}
          onToggle={() => toggleSection("security")}
        >
          <div className="space-y-2">
            <ProfileRow label="نوع الرمز" value={auth.session.tokenType} icon={KeyRound} />
            <ProfileRow label="مدة الجلسة" value={auth.session.expiresIn} icon={MonitorSmartphone} />
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-11 w-full rounded-[1.1rem] border border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 hover:text-rose-800 dark:text-rose-200 dark:hover:bg-rose-500/20 dark:hover:text-white"
            onClick={() => {
              auth.signOut();
              router.replace("/auth/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </ProfileSection>
      </div>

      <p className="px-2 pt-1 text-[11px] text-muted-foreground">{APP_VERSION_LABEL}</p>
    </div>
  );
}
