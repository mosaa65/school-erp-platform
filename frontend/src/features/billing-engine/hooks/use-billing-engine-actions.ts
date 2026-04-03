import * as React from "react";
import {
  ApiError,
  apiClient,
  type BillingEngineDefaultsResponse,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type BillingActionLog = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  status: "success" | "warning";
};

type BillingBulkForm = {
  academicYearId: string;
  gradeLevelId: string;
  branchId: string;
  installmentCount: string;
  invoiceDate: string;
  dueDate: string;
  applySiblingDiscount: boolean;
};

type SiblingDiscountForm = {
  guardianId: string;
  academicYearId: string;
};

type StatementForm = {
  enrollmentId: string;
  guardianId: string;
};

type WithdrawalForm = {
  enrollmentId: string;
  withdrawalDate: string;
  academicTermId: string;
  reason: string;
};

const STORAGE_KEYS = {
  bulk: "finance.billing.bulk-form",
  sibling: "finance.billing.sibling-form",
  statement: "finance.billing.statement-form",
  withdrawal: "finance.billing.withdrawal-form",
} as const;

function buildTimestamp() {
  return new Date().toLocaleString("ar-SA");
}

export function useBillingEngineActions() {
  const auth = useAuth();
  const [bulkForm, setBulkForm] = React.useState<BillingBulkForm>({
    academicYearId: "",
    gradeLevelId: "",
    branchId: "",
    installmentCount: "",
    invoiceDate: "",
    dueDate: "",
    applySiblingDiscount: false,
  });
  const [siblingForm, setSiblingForm] = React.useState<SiblingDiscountForm>({
    guardianId: "",
    academicYearId: "",
  });
  const [statementForm, setStatementForm] = React.useState<StatementForm>({
    enrollmentId: "",
    guardianId: "",
  });
  const [withdrawalForm, setWithdrawalForm] = React.useState<WithdrawalForm>({
    enrollmentId: "",
    withdrawalDate: "",
    academicTermId: "",
    reason: "",
  });
  const [defaults, setDefaults] = React.useState<BillingEngineDefaultsResponse | null>(null);
  const [logs, setLogs] = React.useState<BillingActionLog[]>([]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setBulkForm((prev) => loadStoredForm(STORAGE_KEYS.bulk, prev));
    setSiblingForm((prev) => loadStoredForm(STORAGE_KEYS.sibling, prev));
    setStatementForm((prev) => loadStoredForm(STORAGE_KEYS.statement, prev));
    setWithdrawalForm((prev) => loadStoredForm(STORAGE_KEYS.withdrawal, prev));
  }, []);

  React.useEffect(() => {
    persistForm(STORAGE_KEYS.bulk, bulkForm);
  }, [bulkForm]);

  React.useEffect(() => {
    persistForm(STORAGE_KEYS.sibling, siblingForm);
  }, [siblingForm]);

  React.useEffect(() => {
    persistForm(STORAGE_KEYS.statement, statementForm);
  }, [statementForm]);

  React.useEffect(() => {
    persistForm(STORAGE_KEYS.withdrawal, withdrawalForm);
  }, [withdrawalForm]);

  const applySuggestedBulkDefaults = React.useCallback(
    (suggested: BillingEngineDefaultsResponse) => {
      setBulkForm((prev) => ({
        ...prev,
        academicYearId: prev.academicYearId || suggested.academicYear?.id || "",
        installmentCount:
          prev.installmentCount || String(suggested.installmentCount),
        invoiceDate: prev.invoiceDate || suggested.invoiceDate,
        dueDate: prev.dueDate || suggested.dueDate,
        applySiblingDiscount:
          prev.applySiblingDiscount || suggested.applySiblingDiscount,
      }));
    },
    [],
  );

  React.useEffect(() => {
    let isCancelled = false;

    const loadDefaults = async () => {
      try {
        const result = await apiClient.getBillingDefaults();
        if (isCancelled) {
          return;
        }

        setDefaults(result);
        applySuggestedBulkDefaults(result);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
      }
    };

    void loadDefaults();

    return () => {
      isCancelled = true;
    };
  }, [applySuggestedBulkDefaults, auth]);

  const pushLog = React.useCallback((title: string, detail: string, status: "success" | "warning") => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        detail,
        timestamp: buildTimestamp(),
        status,
      },
      ...prev,
    ].slice(0, 6));
  }, []);

  const handleBulkGenerate = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!bulkForm.academicYearId) {
        pushLog("توليد الفواتير", "أدخل معرّف السنة الدراسية أولاً.", "warning");
        return;
      }

      try {
        const result = await apiClient.bulkGenerateBilling({
          academicYearId: bulkForm.academicYearId,
          gradeLevelId: bulkForm.gradeLevelId || undefined,
          branchId: bulkForm.branchId ? Number(bulkForm.branchId) : undefined,
          installmentCount: bulkForm.installmentCount
            ? Number(bulkForm.installmentCount)
            : undefined,
          invoiceDate: bulkForm.invoiceDate || undefined,
          dueDate: bulkForm.dueDate || undefined,
          applySiblingDiscount: bulkForm.applySiblingDiscount,
        });

        pushLog(
          "توليد الفواتير",
          `${result.message} — تم توليد ${result.generated} فاتورة وتجاوز ${result.skipped}.`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "توليد الفواتير",
          error instanceof Error ? error.message : "تعذر تنفيذ التوليد الجماعي.",
          "warning",
        );
      }
    },
    [auth, bulkForm, pushLog],
  );

  const handleApplySiblingDiscount = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!siblingForm.guardianId || !siblingForm.academicYearId) {
        pushLog("خصم الأشقاء", "أدخل معرّف ولي الأمر والسنة الدراسية.", "warning");
        return;
      }

      try {
        const result = await apiClient.applySiblingDiscount({
          guardianId: siblingForm.guardianId,
          academicYearId: siblingForm.academicYearId,
        });

        pushLog(
          "خصم الأشقاء",
          `${result.message} — تم تطبيق الخصم على ${result.applied} فاتورة.`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "خصم الأشقاء",
          error instanceof Error ? error.message : "تعذر تطبيق الخصم.",
          "warning",
        );
      }
    },
    [auth, pushLog, siblingForm],
  );

  const handleReadStatement = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!statementForm.enrollmentId) {
        pushLog("كشف حساب الطالب", "أدخل رقم القيد (Enrollment ID).", "warning");
        return;
      }

      try {
        const result = await apiClient.getStudentStatement(statementForm.enrollmentId);
        pushLog(
          "كشف حساب الطالب",
          `الرصيد الحالي: ${result.summary.balance.toLocaleString()} ر.س — الحالة: ${result.summary.status}.`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "كشف حساب الطالب",
          error instanceof Error ? error.message : "تعذر استخراج كشف الحساب.",
          "warning",
        );
      }
    },
    [auth, pushLog, statementForm],
  );

  const handleReadFamilyBalance = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!statementForm.guardianId) {
        pushLog("رصيد العائلة", "أدخل معرّف ولي الأمر.", "warning");
        return;
      }

      try {
        const result = await apiClient.getFamilyBalance(statementForm.guardianId);
        pushLog(
          "رصيد العائلة",
          `إجمالي الرصيد: ${result.summary.balance.toLocaleString()} ر.س لعدد ${result.summary.childrenCount} أبناء.`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "رصيد العائلة",
          error instanceof Error ? error.message : "تعذر استخراج رصيد العائلة.",
          "warning",
        );
      }
    },
    [auth, pushLog, statementForm],
  );

  const handleProcessWithdrawal = React.useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!withdrawalForm.enrollmentId || !withdrawalForm.withdrawalDate) {
        pushLog("معالجة الانسحاب", "أدخل رقم القيد وتاريخ الانسحاب.", "warning");
        return;
      }

      try {
        const result = await apiClient.processBillingWithdrawal({
          enrollmentId: withdrawalForm.enrollmentId,
          withdrawalDate: withdrawalForm.withdrawalDate,
          academicTermId: withdrawalForm.academicTermId || undefined,
          reason: withdrawalForm.reason || undefined,
        });

        const ratioPercent = Math.round(result.proration.ratio * 100);
        pushLog(
          "معالجة الانسحاب",
          `تم احتساب الانسحاب للطالب ${result.studentName} بنسبة ${ratioPercent}%، والمبلغ المستحق ${result.totals.earnedFee.toLocaleString()} ر.س (التسوية: ${result.totals.adjustment.toLocaleString()} ر.س).`,
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        pushLog(
          "معالجة الانسحاب",
          error instanceof Error ? error.message : "تعذر تنفيذ عملية الانسحاب.",
          "warning",
        );
      }
    },
    [auth, pushLog, withdrawalForm],
  );

  return {
    defaults,
    bulkForm,
    setBulkForm,
    siblingForm,
    setSiblingForm,
    statementForm,
    setStatementForm,
    withdrawalForm,
    setWithdrawalForm,
    logs,
    handleBulkGenerate,
    handleApplySiblingDiscount,
    handleReadStatement,
    handleReadFamilyBalance,
    handleProcessWithdrawal,
    applySuggestedBulkDefaults,
  };
}

function loadStoredForm<T extends Record<string, unknown>>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    return {
      ...fallback,
      ...parsed,
    };
  } catch {
    return fallback;
  }
}

function persistForm(key: string, value: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors in browsers with restricted storage
  }
}
