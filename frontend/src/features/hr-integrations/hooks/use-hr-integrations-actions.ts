import * as React from "react";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

export type HrIntegrationLog = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  status: "success" | "warning";
};

type PayrollForm = {
  month: string;
  year: string;
  totalSalaries: string;
  totalDeductions: string;
  branchId: string;
  description: string;
};

type DeductionForm = {
  employeeId: string;
  amount: string;
  branchId: string;
  reason: string;
};

type PayrollJournalResponse = {
  journalEntryId: string;
  entryNumber: string;
  totalSalaries: number;
  totalDeductions: number;
  netSalaries: number;
};

type DeductionJournalResponse = {
  journalEntryId: string;
  entryNumber: string;
  amount: number;
};

type PayrollPreviewResponse = {
  month: number;
  year: number;
  branchId: number | null;
  totals: {
    grossSalaries: number;
    estimatedDeductions: number;
    estimatedNetSalaries: number;
  };
  assumptions: {
    daysInMonth: number;
    deductionSource: string;
    contractsIncluded: number;
    employeesIncluded: number;
    employeesWithUnpaidLeave: number;
    totalUnpaidLeaveDays: number;
  };
  recommendedJournal: {
    month: number;
    year: number;
    totalSalaries: number;
    totalDeductions: number;
    netSalaries: number;
    description: string;
  };
  employeeBreakdown: Array<{
    employeeId: string;
    employeeName: string;
    jobNumber: string | null;
    branchId: number | null;
    grossSalary: number;
    activeDays: number;
    unpaidLeaveDays: number;
    estimatedDeductions: number;
    estimatedNetSalary: number;
  }>;
};

function buildTimestamp() {
  return new Date().toLocaleString("ar-SA");
}

function toOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toMoneyInput(value: number): string {
  return value.toFixed(2);
}

export function useHrIntegrationsActions() {
  const auth = useAuth();
  const [payrollForm, setPayrollForm] = React.useState<PayrollForm>({
    month: "",
    year: "",
    totalSalaries: "",
    totalDeductions: "",
    branchId: "",
    description: "",
  });
  const [deductionForm, setDeductionForm] = React.useState<DeductionForm>({
    employeeId: "",
    amount: "",
    branchId: "",
    reason: "",
  });
  const [isPayrollSubmitting, setIsPayrollSubmitting] = React.useState(false);
  const [isDeductionSubmitting, setIsDeductionSubmitting] = React.useState(false);
  const [isPayrollPreviewLoading, setIsPayrollPreviewLoading] = React.useState(false);
  const [payrollPreview, setPayrollPreview] = React.useState<PayrollPreviewResponse | null>(null);
  const [logs, setLogs] = React.useState<HrIntegrationLog[]>([]);

  const pushLog = React.useCallback(
    (title: string, detail: string, status: "success" | "warning") => {
      setLogs((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title,
            detail,
            timestamp: buildTimestamp(),
            status,
          },
          ...prev,
        ].slice(0, 6),
      );
    },
    [],
  );

  const handlePayrollJournal = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isPayrollSubmitting) return;

      if (!payrollForm.month || !payrollForm.year || !payrollForm.totalSalaries) {
        pushLog("قيد الرواتب", "يرجى إدخال الشهر والسنة وإجمالي الرواتب.", "warning");
        return;
      }

      const month = Number(payrollForm.month);
      const year = Number(payrollForm.year);
      const totalSalaries = Number(payrollForm.totalSalaries);

      if ([month, year, totalSalaries].some((value) => Number.isNaN(value))) {
        pushLog("قيد الرواتب", "تأكد من إدخال أرقام صحيحة للحقول المطلوبة.", "warning");
        return;
      }

      try {
        setIsPayrollSubmitting(true);
        const result = await financeRequest<PayrollJournalResponse>(
          "/finance/hr/payroll-journal",
          {
            method: "POST",
            json: {
              month,
              year,
              totalSalaries,
              totalDeductions: toOptionalNumber(payrollForm.totalDeductions),
              branchId: toOptionalNumber(payrollForm.branchId),
              description: payrollForm.description.trim() || undefined,
            },
          },
        );

        pushLog(
          "قيد الرواتب",
          `تم إنشاء القيد رقم ${result.entryNumber} بصافي ${result.netSalaries.toLocaleString()} ر.س (إجمالي: ${result.totalSalaries.toLocaleString()}، خصومات: ${result.totalDeductions.toLocaleString()}).`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "قيد الرواتب",
          error instanceof Error ? error.message : "تعذر إنشاء قيد الرواتب.",
          "warning",
        );
      } finally {
        setIsPayrollSubmitting(false);
      }
    },
    [auth, isPayrollSubmitting, payrollForm, pushLog],
  );

  const handlePayrollPreview = React.useCallback(async () => {
    if (isPayrollPreviewLoading) return;

    if (!payrollForm.month || !payrollForm.year) {
      pushLog("معاينة الرواتب", "يرجى إدخال الشهر والسنة أولًا.", "warning");
      return;
    }

    const month = Number(payrollForm.month);
    const year = Number(payrollForm.year);
    if ([month, year].some((value) => Number.isNaN(value))) {
      pushLog("معاينة الرواتب", "الرجاء إدخال قيم رقمية صحيحة للشهر والسنة.", "warning");
      return;
    }

    try {
      setIsPayrollPreviewLoading(true);
      const preview = await financeRequest<PayrollPreviewResponse>(
        `/finance/hr/payroll-preview/${month}`,
        {
          method: "GET",
          params: {
            year,
            branchId: toOptionalNumber(payrollForm.branchId),
          },
        },
      );

      setPayrollPreview(preview);
      setPayrollForm((prev) => ({
        ...prev,
        totalSalaries: toMoneyInput(preview.recommendedJournal.totalSalaries),
        totalDeductions: toMoneyInput(preview.recommendedJournal.totalDeductions),
        description: prev.description.trim() || preview.recommendedJournal.description,
      }));

      pushLog(
        "معاينة الرواتب",
        `تمت المعاينة لعدد ${preview.assumptions.employeesIncluded} موظف، بصافي تقديري ${preview.totals.estimatedNetSalaries.toLocaleString()} ر.س.`,
        "success",
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
      pushLog(
        "معاينة الرواتب",
        error instanceof Error ? error.message : "تعذّر إنشاء معاينة الرواتب.",
        "warning",
      );
    } finally {
      setIsPayrollPreviewLoading(false);
    }
  }, [auth, isPayrollPreviewLoading, payrollForm, pushLog]);

  const handleDeductionJournal = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isDeductionSubmitting) return;

      const employeeId = deductionForm.employeeId.trim();
      if (!employeeId || !deductionForm.amount) {
        pushLog("قيد خصم موظف", "يرجى اختيار الموظف وإدخال المبلغ.", "warning");
        return;
      }

      const amount = Number(deductionForm.amount);
      if (Number.isNaN(amount)) {
        pushLog("قيد خصم موظف", "أدخل مبلغاً رقمياً صحيحاً.", "warning");
        return;
      }

      try {
        setIsDeductionSubmitting(true);
        const result = await financeRequest<DeductionJournalResponse>(
          "/finance/hr/deduction-journal",
          {
            method: "POST",
            json: {
              employeeId,
              amount,
              branchId: toOptionalNumber(deductionForm.branchId),
              reason: deductionForm.reason.trim() || undefined,
            },
          },
        );

        pushLog(
          "قيد خصم موظف",
          `تم إنشاء القيد رقم ${result.entryNumber} بمبلغ ${result.amount.toLocaleString()} ر.س.`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "قيد خصم موظف",
          error instanceof Error ? error.message : "تعذر إنشاء قيد الخصم.",
          "warning",
        );
      } finally {
        setIsDeductionSubmitting(false);
      }
    },
    [auth, deductionForm, isDeductionSubmitting, pushLog],
  );

  return {
    payrollForm,
    setPayrollForm,
    deductionForm,
    setDeductionForm,
    isPayrollSubmitting,
    isDeductionSubmitting,
    isPayrollPreviewLoading,
    payrollPreview,
    logs,
    handlePayrollPreview,
    handlePayrollJournal,
    handleDeductionJournal,
  };
}
