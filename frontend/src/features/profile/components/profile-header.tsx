"use client";

import * as React from "react";
import { UserCircle2 } from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useBranchMode } from "@/hooks/use-branch-mode";
import { translateRoleCode } from "@/lib/i18n/ar";
import { resolveBranchModeLabel } from "./profile-shared";

type ProfileHeaderProps = {
  sessionCount: number;
  sessionCountLoading?: boolean;
};

export function ProfileHeader({
  sessionCount,
  sessionCountLoading,
}: ProfileHeaderProps) {
  const auth = useAuth();
  const branchMode = useBranchMode();

  if (!auth.session) return null;

  const userName = `${auth.session.user.firstName} ${auth.session.user.lastName}`;
  const roleLabels = auth.session.user.roleCodes.map((roleCode) =>
    translateRoleCode(roleCode),
  );
  const branchModeLabel = resolveBranchModeLabel(
    branchMode.isLoaded,
    branchMode.isMultiBranchEnabled,
    branchMode.defaultBranchId,
  );

  return (
    <section
      className="relative overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/76 backdrop-blur-2xl shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-950/58"
      dir="rtl"
    >
      {/* Subtle accent line at top */}
      <div className="h-1 w-full bg-gradient-to-l from-[color:var(--app-accent-color)]/50 via-[color:var(--app-accent-color)]/25 to-transparent" />

      <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5 sm:py-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[color:var(--app-accent-color)]/20 bg-[color:var(--app-accent-soft)] ring-2 ring-[color:var(--app-accent-color)]/10 sm:h-16 sm:w-16">
          <UserCircle2 className="h-7 w-7 text-[color:var(--app-accent-color)] sm:h-8 sm:w-8" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-slate-900 dark:text-white sm:text-lg">
            {userName}
          </h2>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-white/50">
            {auth.session.user.email}
          </p>
          {/* Role badges inline */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-2.5 py-0.5 text-[10px] font-medium text-[color:var(--app-accent-color)]">
              {branchModeLabel}
            </span>
            {roleLabels.slice(0, 2).map((roleLabel) => (
              <span
                key={roleLabel}
                className="rounded-full border border-white/70 bg-white/78 px-2.5 py-0.5 text-[10px] text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70"
              >
                {roleLabel}
              </span>
            ))}
            {roleLabels.length > 2 ? (
              <span className="rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-[10px] text-slate-500 dark:border-white/15 dark:text-white/50">
                +{roleLabels.length - 2}
              </span>
            ) : null}
          </div>
        </div>

        {/* Stats - compact vertical */}
        <div className="hidden shrink-0 divide-y divide-black/5 rounded-2xl border border-white/70 bg-white/60 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04] sm:block">
          <div className="flex flex-col items-center px-4 py-2">
            <span className="text-lg font-bold text-[color:var(--app-accent-color)]">
              {roleLabels.length}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-white/50">
              الأدوار
            </span>
          </div>
          <div className="flex flex-col items-center px-4 py-2">
            <span className="text-lg font-bold text-[color:var(--app-accent-color)]">
              {auth.session.user.permissionCodes.length}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-white/50">
              الصلاحيات
            </span>
          </div>
          <div className="flex flex-col items-center px-4 py-2">
            <span className="text-lg font-bold text-[color:var(--app-accent-color)]">
              {sessionCountLoading ? "—" : sessionCount}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-white/50">
              الجلسات
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
