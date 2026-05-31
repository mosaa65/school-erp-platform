"use client";

import * as React from "react";
import { PanelsTopLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProfilePageWrapper, SectionCard } from "./profile-shared";

export function ProfileAdvancedSection() {
  const router = useRouter();

  return (
    <ProfilePageWrapper
      title="خيارات متقدمة"
      description="تخصيص إعدادات التنقل والبطاقات المتقدمة."
      icon={PanelsTopLeft}
    >
      {/* ── Navigation and Layout ────────────────────────── */}
      <SectionCard
        title="إعدادات التنقل والتخطيط"
        description="تحكم في كيفية عرض القوائم وتخطيط واجهة المستخدم للتطبيق في صفحة مستقلة."
        icon={PanelsTopLeft}
      >
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-2xl hover:bg-[color:var(--app-accent-soft)] hover:text-[color:var(--app-accent-color)]"
          onClick={() => router.push("/app/profile/navigation")}
        >
          <PanelsTopLeft className="mr-2 h-4 w-4" />
          فتح إعدادات التنقل
        </Button>
      </SectionCard>

      {/* ── Entity Surface Cards settings ───────────────── */}
      <SectionCard
        title="إعدادات بطاقات العرض والتفاصيل"
        description="تحكم في شكل البطاقات، الألوان، التفاعل، ومعاينة الصلاحيات قبل تطبيقها على واجهة الطلاب."
        icon={PanelsTopLeft}
      >
        <Button
          type="button"
          className="h-11 w-full rounded-2xl"
          onClick={() => router.push("/app/profile/entity-surface")}
        >
          <PanelsTopLeft className="mr-2 h-4 w-4" />
          فتح إعدادات البطاقات
        </Button>
      </SectionCard>
    </ProfilePageWrapper>
  );
}
