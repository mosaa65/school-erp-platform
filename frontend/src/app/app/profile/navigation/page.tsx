"use client";

import * as React from "react";
import { PanelsTopLeft } from "lucide-react";
import { ProfileNavigationSection } from "@/components/layout/profile-navigation-section";
import { ProfilePageWrapper, SectionCard } from "@/features/profile/components/profile-shared";

export default function ProfileNavigationPage() {
  return (
    <ProfilePageWrapper
      title="التنقل والتخطيط"
      description="تحكم في كيفية عرض القوائم وتخطيط واجهة المستخدم للتطبيق."
      icon={PanelsTopLeft}
    >
      <SectionCard
        title="تفضيلات التنقل"
        description="تعديل نمط القوائم وحالة الشريط الجانبي."
      >
        <ProfileNavigationSection />
      </SectionCard>
    </ProfilePageWrapper>
  );
}
