import * as React from "react";

export type StudentInvoiceItem = {
  id: string;
  invoiceNo: string;
  studentName: string;
  gradeLabel: string;
  totalAmount: number;
  balanceAmount: number;
  dueDate: string;
  status: "paid" | "partial" | "overdue" | "pending";
};

const INVOICES: StudentInvoiceItem[] = [
  {
    id: "inv-10031",
    invoiceNo: "INV-10031",
    studentName: "محمد علي حسن",
    gradeLabel: "الصف الرابع",
    totalAmount: 18000,
    balanceAmount: 0,
    dueDate: "2026-04-05",
    status: "paid",
  },
  {
    id: "inv-10032",
    invoiceNo: "INV-10032",
    studentName: "سارة محمد يوسف",
    gradeLabel: "الصف السابع",
    totalAmount: 22000,
    balanceAmount: 5500,
    dueDate: "2026-04-10",
    status: "partial",
  },
  {
    id: "inv-10033",
    invoiceNo: "INV-10033",
    studentName: "عبدالله خالد عمر",
    gradeLabel: "الصف العاشر",
    totalAmount: 26000,
    balanceAmount: 26000,
    dueDate: "2026-03-18",
    status: "overdue",
  },
  {
    id: "inv-10034",
    invoiceNo: "INV-10034",
    studentName: "نور أحمد سالم",
    gradeLabel: "الصف الثاني",
    totalAmount: 18000,
    balanceAmount: 18000,
    dueDate: "2026-04-01",
    status: "pending",
  },
];

export function useStudentInvoicesSummary() {
  const invoices = React.useMemo(() => INVOICES, []);

  const summary = React.useMemo(() => {
    const totals = invoices.reduce(
      (acc, invoice) => {
        acc.totalAmount += invoice.totalAmount;
        acc.totalBalance += invoice.balanceAmount;
        acc[invoice.status] += 1;
        return acc;
      },
      {
        totalAmount: 0,
        totalBalance: 0,
        paid: 0,
        partial: 0,
        overdue: 0,
        pending: 0,
      },
    );

    return totals;
  }, [invoices]);

  return {
    invoices,
    summary,
    notes: "الفواتير تعرض ملخصًا حسب الطالب مع تواريخ الاستحقاق.",
  };
}
