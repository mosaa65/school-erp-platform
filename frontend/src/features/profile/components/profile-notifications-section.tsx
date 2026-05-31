"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { ProfileNotificationPreferences } from "@/components/layout/profile-notification-preferences";
import { ProfileMessagePreferences } from "@/components/layout/profile-message-preferences";
import { ProfilePageWrapper } from "./profile-shared";

export function ProfileNotificationsSection() {
  return (
    <ProfilePageWrapper
      title="الإشعارات"
      description="تحكم في إشعارات التطبيق ورسائل النظام."
      icon={Bell}
    >
      {/* ── Notification Preferences ───────────────────── */}
      <div className="rounded-[1.4rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          الإشعارات
        </p>
        <ProfileNotificationPreferences />
      </div>

      {/* ── Message Preferences ────────────────────────── */}
      <div className="rounded-[1.4rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          رسائل النظام
        </p>
        <ProfileMessagePreferences />
      </div>
    </ProfilePageWrapper>
  );
}
