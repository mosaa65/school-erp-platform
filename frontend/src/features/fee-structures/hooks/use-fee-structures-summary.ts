import * as React from "react";

export type FeeStructureItem = {
  id: string;
  name: string;
  gradeBand: string;
  billingCycle: string;
  baseAmount: number;
  dueDay: string;
  status: "active" | "draft" | "paused";
};

const FEE_STRUCTURES: FeeStructureItem[] = [
  {
    id: "fs-2026-primary",
    name: "رسوم المرحلة الأساسية",
    gradeBand: "الصف 1 - الصف 6",
    billingCycle: "شهري",
    baseAmount: 18000,
    dueDay: "5 من كل شهر",
    status: "active",
  },
  {
    id: "fs-2026-middle",
    name: "رسوم المرحلة الإعدادية",
    gradeBand: "الصف 7 - الصف 9",
    billingCycle: "شهري",
    baseAmount: 22000,
    dueDay: "10 من كل شهر",
    status: "active",
  },
  {
    id: "fs-2026-secondary",
    name: "رسوم المرحلة الثانوية",
    gradeBand: "الصف 10 - الصف 12",
    billingCycle: "شهري",
    baseAmount: 26000,
    dueDay: "10 من كل شهر",
    status: "draft",
  },
  {
    id: "fs-transport",
    name: "خدمة النقل المدرسي",
    gradeBand: "جميع المراحل",
    billingCycle: "فصلي",
    baseAmount: 35000,
    dueDay: "مع بداية الفصل",
    status: "paused",
  },
];

export function useFeeStructuresSummary() {
  const structures = React.useMemo(() => FEE_STRUCTURES, []);

  const summary = React.useMemo(() => {
    const activeCount = structures.filter((item) => item.status === "active").length;
    const draftCount = structures.filter((item) => item.status === "draft").length;
    const pausedCount = structures.filter((item) => item.status === "paused").length;
    const totalAmount = structures.reduce((total, item) => total + item.baseAmount, 0);

    return {
      totalCount: structures.length,
      activeCount,
      draftCount,
      pausedCount,
      totalAmount,
    };
  }, [structures]);

  return {
    structures,
    summary,
    lastSyncedLabel: "مزامنة البيانات منذ دقائق",
  };
}
