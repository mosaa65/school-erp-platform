"use client";

import * as React from "react";
import { UserCircle2 } from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useBranchMode } from "@/hooks/use-branch-mode";
import { translateRoleCode } from "@/lib/i18n/ar";

function resolveBranchModeLabel(
  isLoaded: boolean,
  isMultiBranchEnabled: boolean,
  defaultBranchId: number | null,
): string {
  if (!isLoaded) return "جارٍ مزامنة الفروع";
  if (isMultiBranchEnabled)
    return defaultBranchId ? `متعدد الفروع • #${defaultBranchId}` : "متعدد الفروع";
  return "مدرسة واحدة";
}

type ProfileHeaderProps = {
  sessionCount: number;
  sessionCountLoading?: boolean;
};

export function ProfileHeader({ sessionCount, sessionCountLoading }: ProfileHeaderProps) {
  const auth = useAuth();
  const branchMode = useBranchMode();

  if (!auth.session) return null;

  const userName = `${auth.session.user.firstName} ${auth.session.user.lastName}`;
  const roleLabels = auth.session.user.roleCodes.map((roleCode) => translateRoleCode(roleCode));
  const branchModeLabel = resolveBranchModeLabel(
    branchMode.isLoaded,
    branchMode.isMultiBranchEnabled,
    branchMode.defaultBranchId,
  );

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/76 text-slate-900 shadow-[0_36px_100px_-56px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58 dark:text-white sm:rounded-[2.25rem]">

      {/* Accent banner */}
      <div className="relative h-24 overflow-hidden sm:h-28">
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--app-accent-color)]/35 via-[color:var(--app-accent-soft)] to-[color:var(--app-accent-color)]/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[color:var(--app-accent-strong)] to-transparent" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[color:var(--app-accent-color)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-white/10 blur-xl" />
        <div className="pointer-events-none absolute right-1/3 top-2 h-12 w-12 rounded-full bg-[color:var(--app-accent-color)]/15 blur-xl" />
      </div>

      {/* Avatar */}
      <div className="absolute left-1/2 top-8 flex h-22 w-22 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-white ring-4 ring-[color:var(--app-accent-color)]/15 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-900 sm:top-10 sm:h-24 sm:w-24">
        <UserCircle2 className="h-11 w-11 text-[color:var(--app-accent-color)] sm:h-13 sm:w-13" />
      </div>

      {/* Content */}
      <div className="px-4 pb-6 pt-16 text-center sm:px-6 sm:pb-7 sm:pt-18">
        <h2 className="text-lg font-bold leading-tight tracking-tight sm:text-xl">{userName}</h2>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-white/50">
          {auth.session.user.email}
        </p>

        {/* Stats row */}
        <div className="mx-auto mt-5 flex w-fit justify-center divide-x divide-x-reverse divide-black/8 rounded-2xl border border-white/70 bg-white/60 px-2 py-2.5 shadow-sm dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col items-center px-5">
            <span className="text-xl font-bold text-[color:var(--app-accent-color)]">
              {roleLabels.length}
            </span>
            <span className="mt-0.5 text-[10px] text-slate-500 dark:text-white/50">الأدوار</span>
          </div>
          <div className="flex flex-col items-center px-5">
            <span className="text-xl font-bold text-[color:var(--app-accent-color)]">
              {auth.session.user.permissionCodes.length}
            </span>
            <span className="mt-0.5 text-[10px] text-slate-500 dark:text-white/50">الصلاحيات</span>
          </div>
          <div className="flex flex-col items-center px-5">
            <span className="text-xl font-bold text-[color:var(--app-accent-color)]">
              {sessionCountLoading ? "—" : sessionCount}
            </span>
            <span className="mt-0.5 text-[10px] text-slate-500 dark:text-white/50">الجلسات</span>
          </div>
        </div>

        {/* Badges */}
        <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
          <span className="rounded-full border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-3 py-1 text-[11px] font-medium text-[color:var(--app-accent-color)]">
            {branchModeLabel}
          </span>
          {roleLabels.slice(0, 2).map((roleLabel) => (
            <span
              key={roleLabel}
              className="rounded-full border border-white/70 bg-white/78 px-3 py-1 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70"
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
      </div>
    </section>
  );
}
