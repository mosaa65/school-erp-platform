import * as React from "react";

export type InvoiceInstallmentPlan = {
  id: string;
  planName: string;
  studentName: string;
  invoiceNo: string;
  totalAmount: number;
  remainingAmount: number;
  nextDueDate: string;
  installmentsCount: number;
  paidInstallments: number;
  status: "on-track" | "at-risk" | "completed";
};

const PLANS: InvoiceInstallmentPlan[] = [
  {
    id: "plan-221",
    planName: "تقسيط 4 دفعات",
    studentName: "ليان سامي",
    invoiceNo: "INV-10032",
    totalAmount: 22000,
    remainingAmount: 5500,
    nextDueDate: "2026-04-10",
    installmentsCount: 4,
    paidInstallments: 3,
    status: "on-track",
  },
  {
    id: "plan-222",
    planName: "تقسيط 3 دفعات",
    studentName: "عمر علي",
    invoiceNo: "INV-10033",
    totalAmount: 26000,
    remainingAmount: 17300,
    nextDueDate: "2026-04-02",
    installmentsCount: 3,
    paidInstallments: 1,
    status: "at-risk",
  },
  {
    id: "plan-223",
    planName: "تقسيط 2 دفعات",
    studentName: "نهى خالد",
    invoiceNo: "INV-10034",
    totalAmount: 18000,
    remainingAmount: 0,
    nextDueDate: "-",
    installmentsCount: 2,
    paidInstallments: 2,
    status: "completed",
  },
];

export function useInvoiceInstallmentsSummary() {
  const plans = React.useMemo(() => PLANS, []);

  const summary = React.useMemo(() => {
    const onTrack = plans.filter((plan) => plan.status === "on-track").length;
    const atRisk = plans.filter((plan) => plan.status === "at-risk").length;
    const completed = plans.filter((plan) => plan.status === "completed").length;

    return {
      totalCount: plans.length,
      onTrack,
      atRisk,
      completed,
    };
  }, [plans]);

  return {
    plans,
    summary,
    helperText: "خطط التقسيط تعرض حالة التحصيل والدفعات المتبقية.",
  };
}
