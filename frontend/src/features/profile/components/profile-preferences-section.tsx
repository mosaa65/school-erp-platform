"use client";

import * as React from "react";
import { Palette, RotateCcw } from "lucide-react";
import { ProfileAppearanceSection } from "@/components/layout/profile-appearance-section";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";
import { ProfilePageWrapper } from "./profile-shared";

export function ProfilePreferencesSection() {
  const appearance = useAppearance();

  return (
    <ProfilePageWrapper
      title="المظهر"
      description="تخصيص سمات وألوان وخطوط التطبيق."
      icon={Palette}
    >
      <div className="rounded-[1.4rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">ألوان وسمات الواجهة</p>
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
    </ProfilePageWrapper>
  );
}
