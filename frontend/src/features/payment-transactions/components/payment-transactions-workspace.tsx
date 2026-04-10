"use client";

import * as React from "react";
import { CheckCircle2, RefreshCw, RotateCcw } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCompleteAndReconcilePaymentTransactionMutation,
  useUpdatePaymentTransactionStatusMutation,
} from "@/features/payment-transactions/hooks/use-payment-transactions-mutations";
import {
  usePaymentTransactionsQuery,
  type PaymentTransactionListItem,
  type PaymentTransactionStatus,
} from "@/features/payment-transactions/hooks/use-payment-transactions-query";

const PAGE_SIZE = 8;

const STATUS_LABELS: Record<PaymentTransactionStatus, string> = {
  PENDING: "قيد المراجعة",
  COMPLETED: "مكتملة",
  FAILED: "فاشلة",
  REFUNDED: "مُعادة",
  CANCELLED: "ملغاة",
};

const STATUS_VARIANTS: Record<PaymentTransactionStatus, "default" | "secondary" | "outline"> = {
  PENDING: "secondary",
  COMPLETED: "default",
  FAILED: "outline",
  REFUNDED: "outline",
  CANCELLED: "outline",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  MOBILE_WALLET: "محفظة رقمية",
  CHEQUE: "شيك",
};

export function PaymentTransactionsWorkspace() {
  const { hasPermission } = useRbac();
  const canUpdate = hasPermission("payment-transactions.update");
  const canReconcile = hasPermission("payment-transactions.reconcile");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<PaymentTransactionStatus | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState<PaymentTransactionStatus | "all">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const transactionsQuery = usePaymentTransactionsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const updateStatusMutation = useUpdatePaymentTransactionStatusMutation();
  const completeAndReconcileMutation =
    useCompleteAndReconcilePaymentTransactionMutation();
  const [operationSummary, setOperationSummary] = React.useState<string | null>(null);

  const transactions = React.useMemo(
    () => transactionsQuery.data?.data ?? [],
    [transactionsQuery.data?.data],
  );
  const pagination = transactionsQuery.data?.pagination;
  const readyTransactions = React.useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.status === "PENDING" ||
          (transaction.status === "COMPLETED" && !transaction.journalEntryId),
      ),
    [transactions],
  );

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft(statusFilter);
  }, [isFilterOpen, statusFilter]);

  const applyFilters = () => {
    setPage(1);
    setStatusFilter(filterDraft);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, statusFilter !== "all" ? 1 : 0].reduce(
      (acc, value) => acc + value,
      0,
    );
  }, [searchInput, statusFilter]);

  const handleRetry = (transaction: PaymentTransactionListItem) => {
    if (!canUpdate || transaction.status !== "FAILED") return;
    updateStatusMutation.mutate({ transactionId: transaction.id, status: "PENDING" });
  };

  const handleCompleteAndReconcile = (transaction: PaymentTransactionListItem) => {
    if (!canReconcile) {
      return;
    }

    void completeAndReconcileMutation.mutateAsync(transaction.id, {
      onSuccess: (result) => {
        setOperationSummary(
          `تمت معالجة العملية ${result.transactionNumber} وربطها محاسبيًا بنجاح.`,
        );
      },
    });
  };

  const handleProcessVisible = async () => {
    if (!canReconcile || readyTransactions.length === 0) {
      return;
    }

    let successCount = 0;

    for (const transaction of readyTransactions) {
      try {
        await completeAndReconcileMutation.mutateAsync(transaction.id);
        successCount += 1;
      } catch {
        // keep going so the operator can clear as much queue as possible
      }
    }

    setOperationSummary(
      successCount > 0
        ? `تمت معالجة ${successCount} عملية من المعروض الحالي.`
        : "لم يتم تنفيذ أي عملية من المعروض الحالي.",
    );
  };

  return (
    <PageShell title="عمليات الدفع">
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث برقم العملية أو اسم الدافع..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
        />

      {operationSummary ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
          {operationSummary}
        </div>
      ) : null}

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر العمليات"
        actionButtons={
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">
              مسح
            </Button>
            <Button type="button" onClick={applyFilters} className="flex-1">
              تطبيق
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            value={filterDraft}
            onChange={(event) => setFilterDraft(event.target.value as PaymentTransactionStatus | "all")}
          >
            <option value="all">كل الحالات</option>
            <option value="PENDING">قيد المراجعة</option>
            <option value="COMPLETED">مكتملة</option>
            <option value="FAILED">فاشلة</option>
            <option value="REFUNDED">مُعادة</option>
            <option value="CANCELLED">ملغاة</option>
          </SelectField>
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>عمليات الدفع</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
              <Badge variant="outline">جاهزة للترحيل: {readyTransactions.length}</Badge>
            </div>
          </div>
          <CardDescription>متابعة التحصيل الإلكتروني واليدوي وربط حالة التسوية.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => void handleProcessVisible()}
              disabled={
                !canReconcile ||
                readyTransactions.length === 0 ||
                completeAndReconcileMutation.isPending
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              معالجة المعروض
            </Button>
          </div>

          {transactionsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل العمليات...
            </div>
          ) : null}

          {transactionsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {transactionsQuery.error instanceof Error
                ? transactionsQuery.error.message
                : "فشل تحميل العمليات"}
            </div>
          ) : null}

          {!transactionsQuery.isPending && transactions.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد عمليات مطابقة.
            </div>
          ) : null}

          {transactions.map((transaction) => (
            <div key={transaction.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{transaction.transactionNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.payerName ?? "غير محدد"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[transaction.paymentMethod] ?? transaction.paymentMethod} •{" "}
                    {transaction.gateway?.nameAr ??
                      (transaction.gatewayId ? `بوابة #${transaction.gatewayId}` : "بوابة دفع")} •{" "}
                    {transaction.paidAt ?? transaction.createdAt}
                  </p>
                  {transaction.invoice?.invoiceNumber ? (
                    <p className="text-xs text-muted-foreground">
                      فاتورة: {transaction.invoice.invoiceNumber}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 text-right">
                  <Badge variant={STATUS_VARIANTS[transaction.status]}>
                    {STATUS_LABELS[transaction.status]}
                  </Badge>
                  {transaction.journalEntryId ? (
                    <p className="text-xs text-emerald-700">مرحل إلى الأستاذ</p>
                  ) : null}
                  <p className="text-sm font-medium">
                    {Number(transaction.amount).toLocaleString()} ر.س
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleCompleteAndReconcile(transaction)}
                  disabled={
                    !canReconcile ||
                    !(
                      transaction.status === "PENDING" ||
                      (transaction.status === "COMPLETED" &&
                        !transaction.journalEntryId)
                    ) ||
                    completeAndReconcileMutation.isPending
                  }
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {transaction.status === "PENDING"
                    ? "إتمام وترحيل"
                    : "ترحيل إلى الأستاذ"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleRetry(transaction)}
                  disabled={!canUpdate || transaction.status !== "FAILED" || updateStatusMutation.isPending}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">
              صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination || pagination.page <= 1 || transactionsQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                }
                disabled={!pagination || pagination.page >= pagination.totalPages || transactionsQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void transactionsQuery.refetch()}
                disabled={transactionsQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${transactionsQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </PageShell>
  );
}
