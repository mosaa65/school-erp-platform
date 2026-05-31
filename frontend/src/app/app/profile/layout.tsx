"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ProfileLayout } from "@/features/profile/components/profile-layout";

export default function ProfileRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Keep entity-surface standalone (does not inherit the profile layout sidebar)
  if (pathname.includes("/profile/entity-surface")) {
    return <>{children}</>;
  }

  return <ProfileLayout>{children}</ProfileLayout>;
}
