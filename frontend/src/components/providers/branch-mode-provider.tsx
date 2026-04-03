"use client";

import * as React from "react";
import { useBranchMode } from "@/hooks/use-branch-mode";

type BranchModeProviderProps = {
  children: React.ReactNode;
};

/**
 * BranchModeProvider
 *
 * يُدرَج داخل AppProviders بعد QueryClientProvider.
 * يُسخِّن cache الـ `branch-config` عند أول تحميل
 * حتى تكون القيمة جاهزة فوراً لجميع المكوِّنات.
 *
 * يستخدم useBranchMode داخلياً — لا يُصدِّر Context.
 * المكوِّنات الأخرى تستدعي useBranchMode() مباشرةً.
 */
export function BranchModeProvider({ children }: BranchModeProviderProps) {
  // يُطلق الجلب في background — لا ينتظر
  useBranchMode();
  return <>{children}</>;
}
