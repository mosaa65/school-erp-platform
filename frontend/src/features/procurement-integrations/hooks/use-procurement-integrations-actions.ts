import * as React from "react";
import { ApiError, type PaymentMethod } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

export type ProcurementIntegrationLog = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  status: "success" | "warning";
};

type PurchaseForm = {
  totalAmount: string;
  vatAmount: string;
  branchId: string;
  description: string;
};

type PaymentForm = {
  amount: string;
  branchId: string;
  paymentMethod: PaymentMethod | "";
  description: string;
};

type DepreciationForm = {
  amount: string;
  branchId: string;
  description: string;
};

type PurchaseJournalResponse = {
  journalEntryId: string;
  entryNumber: string;
  totalAmount: number;
  vatAmount: number;
};

type PaymentJournalResponse = {
  journalEntryId: string;
  entryNumber: string;
  amount: number;
};

type DepreciationJournalResponse = {
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

export function useProcurementIntegrationsActions() {
  const auth = useAuth();
  const [purchaseForm, setPurchaseForm] = React.useState<PurchaseForm>({
    totalAmount: "",
    vatAmount: "",
    branchId: "",
    description: "",
  });
  const [paymentForm, setPaymentForm] = React.useState<PaymentForm>({
    amount: "",
    branchId: "",
    paymentMethod: "",
    description: "",
  });
  const [depreciationForm, setDepreciationForm] = React.useState<DepreciationForm>({
    amount: "",
    branchId: "",
    description: "",
  });
  const [isPurchaseSubmitting, setIsPurchaseSubmitting] = React.useState(false);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = React.useState(false);
  const [isDepreciationSubmitting, setIsDepreciationSubmitting] = React.useState(false);
  const [logs, setLogs] = React.useState<ProcurementIntegrationLog[]>([]);

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

  const handlePurchaseJournal = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isPurchaseSubmitting) return;

      if (!purchaseForm.totalAmount) {
        pushLog("قيد مشتريات", "يرجى إدخال إجمالي المبلغ.", "warning");
        return;
      }

      const totalAmount = Number(purchaseForm.totalAmount);
      if (Number.isNaN(totalAmount)) {
        pushLog("قيد مشتريات", "تأكد من إدخال مبلغ صحيح.", "warning");
        return;
      }

      try {
        setIsPurchaseSubmitting(true);
        const result = await financeRequest<PurchaseJournalResponse>(
          "/finance/procurement/purchase-journal",
          {
            method: "POST",
            json: {
              totalAmount,
              vatAmount: toOptionalNumber(purchaseForm.vatAmount),
              branchId: toOptionalNumber(purchaseForm.branchId),
              description: purchaseForm.description.trim() || undefined,
            },
          },
        );

        pushLog(
          "قيد مشتريات",
          `تم إنشاء القيد رقم ${result.entryNumber} بمبلغ ${result.totalAmount.toLocaleString()} ر.س وضريبة ${result.vatAmount.toLocaleString()} ر.س.`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "قيد مشتريات",
          error instanceof Error ? error.message : "تعذر إنشاء قيد المشتريات.",
          "warning",
        );
      } finally {
        setIsPurchaseSubmitting(false);
      }
    },
    [auth, isPurchaseSubmitting, purchaseForm, pushLog],
  );

  const handlePaymentJournal = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isPaymentSubmitting) return;

      if (!paymentForm.amount) {
        pushLog("قيد سداد مورد", "يرجى إدخال مبلغ السداد.", "warning");
        return;
      }

      const amount = Number(paymentForm.amount);
      if (Number.isNaN(amount)) {
        pushLog("قيد سداد مورد", "تأكد من إدخال مبلغ صحيح.", "warning");
        return;
      }

      try {
        setIsPaymentSubmitting(true);
        const result = await financeRequest<PaymentJournalResponse>(
          "/finance/procurement/payment-journal",
          {
            method: "POST",
            json: {
              amount,
              branchId: toOptionalNumber(paymentForm.branchId),
              paymentMethod: paymentForm.paymentMethod || undefined,
              description: paymentForm.description.trim() || undefined,
            },
          },
        );

        pushLog(
          "قيد سداد مورد",
          `تم إنشاء القيد رقم ${result.entryNumber} بمبلغ ${result.amount.toLocaleString()} ر.س.`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "قيد سداد مورد",
          error instanceof Error ? error.message : "تعذر إنشاء قيد السداد.",
          "warning",
        );
      } finally {
        setIsPaymentSubmitting(false);
      }
    },
    [auth, isPaymentSubmitting, paymentForm, pushLog],
  );

  const handleDepreciationJournal = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isDepreciationSubmitting) return;

      if (!depreciationForm.amount) {
        pushLog("قيد إهلاك", "يرجى إدخال مبلغ الإهلاك.", "warning");
        return;
      }

      const amount = Number(depreciationForm.amount);
      if (Number.isNaN(amount)) {
        pushLog("قيد إهلاك", "تأكد من إدخال مبلغ صحيح.", "warning");
        return;
      }

      try {
        setIsDepreciationSubmitting(true);
        const result = await financeRequest<DepreciationJournalResponse>(
          "/finance/procurement/depreciation-journal",
          {
            method: "POST",
            json: {
              amount,
              branchId: toOptionalNumber(depreciationForm.branchId),
              description: depreciationForm.description.trim() || undefined,
            },
          },
        );

        pushLog(
          "قيد إهلاك",
          `تم إنشاء القيد رقم ${result.entryNumber} بمبلغ ${result.amount.toLocaleString()} ر.س.`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "قيد إهلاك",
          error instanceof Error ? error.message : "تعذر إنشاء قيد الإهلاك.",
          "warning",
        );
      } finally {
        setIsDepreciationSubmitting(false);
      }
    },
    [auth, depreciationForm, isDepreciationSubmitting, pushLog],
  );

  return {
    purchaseForm,
    setPurchaseForm,
    paymentForm,
    setPaymentForm,
    depreciationForm,
    setDepreciationForm,
    isPurchaseSubmitting,
    isPaymentSubmitting,
    isDepreciationSubmitting,
    logs,
    handlePurchaseJournal,
    handlePaymentJournal,
    handleDepreciationJournal,
  };
}
