"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { ProfileAppearanceSection } from "@/components/layout/profile-appearance-section";
import { ProfileMessagePreferences } from "@/components/layout/profile-message-preferences";
import { ProfileNavigationSection } from "@/components/layout/profile-navigation-section";
import { ProfileNotificationPreferences } from "@/components/layout/profile-notification-preferences";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";

export function ProfilePreferencesSection() {
  const appearance = useAppearance();

  return (
    <div className="space-y-4">

      {/* ── Appearance ─────────────────────────────────── */}
      <div className="rounded-[1.4rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">المظهر</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-xl border border-white/70 bg-background/75 px-3 text-xs text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
            onClick={() => appearance.resetAppearance()}
          >
            <RotateCcw className="h-3 w-3" />
            إعادة التعيين
          </Button>
        </div>
        <ProfileAppearanceSection />
      </div>

      {/* ── Navigation ─────────────────────────────────── */}
      <div className="rounded-[1.4rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">التنقل والتخطيط</p>
        <ProfileNavigationSection />
      </div>

      {/* ── Message Preferences ────────────────────────── */}
      <div className="rounded-[1.4rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">رسائل النظام</p>
        <ProfileMessagePreferences />
      </div>

      {/* ── Notification Preferences ───────────────────── */}
      <div className="rounded-[1.4rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">الإشعارات</p>
        <ProfileNotificationPreferences />
      </div>

    </div>
  );
}
