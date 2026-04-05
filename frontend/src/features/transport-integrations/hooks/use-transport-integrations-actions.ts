import * as React from "react";
import { ApiError, type PaymentMethod } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

export type TransportIntegrationLog = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  status: "success" | "warning";
};

export type TransportRevenueReport = {
  filters: {
    branchId: number | null;
    dateFrom: string | null;
    dateTo: string | null;
  };
  summary: {
    invoiceCount: number;
    transactionCount: number;
    totalRevenue: number;
    collectedRevenue: number;
    outstandingRevenue: number;
  };
};

type GenerateInvoicesForm = {
  academicYearId: string;
  enrollmentIds: string;
  amount: string;
  vatRate: string;
  invoiceDate: string;
  dueDate: string;
  branchId: string;
  description: string;
};

type SubscriptionFeeForm = {
  invoiceId: string;
  amount: string;
  vatRate: string;
  description: string;
};

type MaintenanceForm = {
  amount: string;
  branchId: string;
  paymentMethod: PaymentMethod | "";
  description: string;
};

type GenerateTransportInvoicesResponse = {
  generated: number;
  errors: Array<{ enrollmentId: string; error: string }>;
  invoices: Array<{ enrollmentId: string; invoiceNumber: string; totalAmount: number }>;
};

type TransportSubscriptionResponse = {
  success: boolean;
  invoiceId: string;
};

type TransportMaintenanceResponse = {
  journalEntryId: string;
  entryNumber: string;
  amount: number;
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

function splitIds(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function useTransportIntegrationsActions() {
  const auth = useAuth();
  const [generateForm, setGenerateForm] = React.useState<GenerateInvoicesForm>({
    academicYearId: "",
    enrollmentIds: "",
    amount: "",
    vatRate: "",
    invoiceDate: "",
    dueDate: "",
    branchId: "",
    description: "",
  });
  const [subscriptionForm, setSubscriptionForm] = React.useState<SubscriptionFeeForm>({
    invoiceId: "",
    amount: "",
    vatRate: "",
    description: "",
  });
  const [maintenanceForm, setMaintenanceForm] = React.useState<MaintenanceForm>({
    amount: "",
    branchId: "",
    paymentMethod: "",
    description: "",
  });
  const [isGenerateSubmitting, setIsGenerateSubmitting] = React.useState(false);
  const [isSubscriptionSubmitting, setIsSubscriptionSubmitting] = React.useState(false);
  const [isMaintenanceSubmitting, setIsMaintenanceSubmitting] = React.useState(false);
  const [revenueReport, setRevenueReport] = React.useState<TransportRevenueReport | null>(null);
  const [isRevenueReportLoading, setIsRevenueReportLoading] = React.useState(true);
  const [revenueReportError, setRevenueReportError] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<TransportIntegrationLog[]>([]);

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

  const handleGenerateInvoices = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isGenerateSubmitting) return;

      const enrollmentIds = splitIds(generateForm.enrollmentIds);
      if (!generateForm.academicYearId || enrollmentIds.length === 0 || !generateForm.amount) {
        pushLog(
          "فواتير النقل",
          "يرجى إدخال العام الدراسي، المبلغ، ومعرفات القيد.",
          "warning",
        );
        return;
      }

      const amount = Number(generateForm.amount);
      if (Number.isNaN(amount)) {
        pushLog("فواتير النقل", "تأكد من إدخال مبلغ صحيح.", "warning");
        return;
      }

      try {
        setIsGenerateSubmitting(true);
        const result = await financeRequest<GenerateTransportInvoicesResponse>(
          "/finance/transport/generate-invoices",
          {
            method: "POST",
            json: {
              academicYearId: generateForm.academicYearId.trim(),
              enrollmentIds,
              amount,
              vatRate: toOptionalNumber(generateForm.vatRate),
              invoiceDate: generateForm.invoiceDate || undefined,
              dueDate: generateForm.dueDate || undefined,
              branchId: toOptionalNumber(generateForm.branchId),
              description: generateForm.description.trim() || undefined,
            },
          },
        );

        const errorCount = result.errors.length;
        const hint = errorCount > 0
          ? `، مع ${errorCount} خطأ (مثال: ${result.errors[0].enrollmentId}).`
          : ".";
        pushLog(
          "فواتير النقل",
          `تم توليد ${result.generated} فاتورة${hint}`,
          errorCount > 0 ? "warning" : "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "فواتير النقل",
          error instanceof Error ? error.message : "تعذر توليد فواتير النقل.",
          "warning",
        );
      } finally {
        setIsGenerateSubmitting(false);
      }
    },
    [auth, generateForm, isGenerateSubmitting, pushLog],
  );

  const handleSubscriptionFee = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isSubscriptionSubmitting) return;

      if (!subscriptionForm.invoiceId || !subscriptionForm.amount) {
        pushLog("رسوم اشتراك النقل", "يرجى إدخال رقم الفاتورة والمبلغ.", "warning");
        return;
      }

      const amount = Number(subscriptionForm.amount);
      if (Number.isNaN(amount)) {
        pushLog("رسوم اشتراك النقل", "تأكد من إدخال مبلغ صحيح.", "warning");
        return;
      }

      try {
        setIsSubscriptionSubmitting(true);
        const result = await financeRequest<TransportSubscriptionResponse>(
          "/finance/transport/subscription-fee",
          {
            method: "POST",
            json: {
              invoiceId: subscriptionForm.invoiceId.trim(),
              amount,
              vatRate: toOptionalNumber(subscriptionForm.vatRate),
              description: subscriptionForm.description.trim() || undefined,
            },
          },
        );

        pushLog(
          "رسوم اشتراك النقل",
          result.success
            ? `تمت إضافة الرسوم إلى الفاتورة ${result.invoiceId}.`
            : "لم يتم تحديث الفاتورة.",
          result.success ? "success" : "warning",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "رسوم اشتراك النقل",
          error instanceof Error ? error.message : "تعذر إضافة رسوم النقل.",
          "warning",
        );
      } finally {
        setIsSubscriptionSubmitting(false);
      }
    },
    [auth, isSubscriptionSubmitting, pushLog, subscriptionForm],
  );

  const handleMaintenanceExpense = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isMaintenanceSubmitting) return;

      if (!maintenanceForm.amount) {
        pushLog("مصروف صيانة النقل", "يرجى إدخال مبلغ الصيانة.", "warning");
        return;
      }

      const amount = Number(maintenanceForm.amount);
      if (Number.isNaN(amount)) {
        pushLog("مصروف صيانة النقل", "تأكد من إدخال مبلغ صحيح.", "warning");
        return;
      }

      try {
        setIsMaintenanceSubmitting(true);
        const result = await financeRequest<TransportMaintenanceResponse>(
          "/finance/transport/maintenance-expense",
          {
            method: "POST",
            json: {
              amount,
              branchId: toOptionalNumber(maintenanceForm.branchId),
              paymentMethod: maintenanceForm.paymentMethod || undefined,
              description: maintenanceForm.description.trim() || undefined,
            },
          },
        );

        pushLog(
          "مصروف صيانة النقل",
          `تم إنشاء القيد رقم ${result.entryNumber} بمبلغ ${result.amount.toLocaleString()} ر.س.`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "مصروف صيانة النقل",
          error instanceof Error ? error.message : "تعذر تسجيل مصروف الصيانة.",
          "warning",
        );
      } finally {
        setIsMaintenanceSubmitting(false);
      }
    },
    [auth, isMaintenanceSubmitting, maintenanceForm, pushLog],
  );

  const loadRevenueReport = React.useCallback(async () => {
    setIsRevenueReportLoading(true);
    setRevenueReportError(null);

    try {
      const result = await financeRequest<TransportRevenueReport>(
        '/finance/transport/revenue-report',
        {
          method: 'GET',
        },
      );

      setRevenueReport(result);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
        return;
      }

      setRevenueReportError(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل ملخص إيرادات النقل.',
      );
    } finally {
      setIsRevenueReportLoading(false);
    }
  }, [auth]);

  React.useEffect(() => {
    void loadRevenueReport();
  }, [loadRevenueReport]);

  return {
    generateForm,
    setGenerateForm,
    subscriptionForm,
    setSubscriptionForm,
    maintenanceForm,
    setMaintenanceForm,
    isGenerateSubmitting,
    isSubscriptionSubmitting,
    isMaintenanceSubmitting,
    revenueReport,
    isRevenueReportLoading,
    revenueReportError,
    refreshRevenueReport: loadRevenueReport,
    logs,
    handleGenerateInvoices,
    handleSubscriptionFee,
    handleMaintenanceExpense,
  };
}
