"use client";

import * as React from "react";
import { Lock, RefreshCw, Unlock } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useAutoMatchBankReconciliationTransactionsMutation,
  useUpdateBankReconciliationStatusMutation,
} from "@/features/bank-reconciliations/hooks/use-bank-reconciliations-mutations";
import {
  useBankReconciliationsQuery,
  type BankReconciliationListItem,
  type BankReconciliationStatus,
} from "@/features/bank-reconciliations/hooks/use-bank-reconciliations-query";

const PAGE_SIZE = 8;

const STATUS_LABELS: Record<BankReconciliationStatus, string> = {
  OPEN: "مفتوحة",
  IN_PROGRESS: "قيد المطابقة",
  RECONCILED: "مغلقة",
};

export function BankReconciliationsWorkspace() {
  const { hasPermission } = useRbac();
  const canUpdate = hasPermission("bank-reconciliations.update");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<BankReconciliationStatus | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState<BankReconciliationStatus | "all">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const reconciliationsQuery = useBankReconciliationsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const updateStatusMutation = useUpdateBankReconciliationStatusMutation();
  const autoMatchMutation = useAutoMatchBankReconciliationTransactionsMutation();
  const [operationSummary, setOperationSummary] = React.useState<string | null>(null);

  const reconciliations = React.useMemo(
    () => reconciliationsQuery.data?.data ?? [],
    [reconciliationsQuery.data?.data],
  );
  const pagination = reconciliationsQuery.data?.pagination;

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

  const handleClose = (item: BankReconciliationListItem) => {
    if (!canUpdate || item.status === "RECONCILED") return;
    updateStatusMutation.mutate({ reconciliationId: item.id, status: "RECONCILED" });
  };

  const handleReopen = (item: BankReconciliationListItem) => {
    if (!canUpdate || item.status !== "RECONCILED") return;
    updateStatusMutation.mutate({ reconciliationId: item.id, status: "OPEN" });
  };

  const handleAutoMatch = (item: BankReconciliationListItem) => {
    if (!canUpdate || item.status === "RECONCILED") {
      return;
    }

    void autoMatchMutation.mutateAsync(item.id, {
      onSuccess: (result) => {
        setOperationSummary(
          result.matchedCount > 0
            ? `تمت مطابقة ${result.matchedCount} عملية بقيمة ${Number(
                result.totalMatchedAmount,
              ).toLocaleString()} ر.س.`
            : "لا توجد عمليات مؤهلة للمطابقة التلقائية في هذا الكشف.",
        );
      },
    });
  };

  return (
    <div className="space-y-4">
      <ManagementToolbar
        searchValue={searchInput}
        onSearchChange={(event) => setSearchInput(event.target.value)}
        searchPlaceholder="ابحث باسم الحساب البنكي..."
        filterCount={activeFiltersCount}
        onFilterClick={() => setIsFilterOpen((prev) => !prev)}
      />

      {operationSummary ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
          {operationSummary}
        </div>
      ) : null}

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر المطابقة"
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
            onChange={(event) => setFilterDraft(event.target.value as BankReconciliationStatus | "all")}
          >
            <option value="all">كل الحالات</option>
            <option value="OPEN">مفتوحة</option>
            <option value="IN_PROGRESS">قيد المطابقة</option>
            <option value="RECONCILED">مغلقة</option>
          </SelectField>
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>مطابقة البنوك</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>إغلاق المطابقات البنكية بعد مراجعة الفروقات.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reconciliationsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل المطابقات...
            </div>
          ) : null}

          {reconciliationsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {reconciliationsQuery.error instanceof Error
                ? reconciliationsQuery.error.message
                : "فشل تحميل المطابقات"}
            </div>
          ) : null}

          {!reconciliationsQuery.isPending && reconciliations.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد مطابقات.
            </div>
          ) : null}

          {reconciliations.map((item) => (
            <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.bankAccount?.nameAr ?? "حساب بنكي"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    تاريخ الكشف: {item.statementDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    رصيد البنك: {Number(item.bankBalance).toLocaleString()} • رصيد الدفاتر:{" "}
                    {Number(item.bookBalance).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <Badge variant={item.status === "OPEN" ? "secondary" : "outline"}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                  <p className="text-sm font-medium">
                    الفرق: {Number(item.difference).toLocaleString()} ر.س
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleAutoMatch(item)}
                  disabled={!canUpdate || item.status === "RECONCILED" || autoMatchMutation.isPending}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${autoMatchMutation.isPending ? "animate-spin" : ""}`} />
                  مطابقة تلقائية
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleClose(item)}
                  disabled={!canUpdate || item.status === "RECONCILED" || updateStatusMutation.isPending}
                >
                  <Lock className="h-3.5 w-3.5" />
                  إغلاق المطابقة
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleReopen(item)}
                  disabled={!canUpdate || item.status !== "RECONCILED" || updateStatusMutation.isPending}
                >
                  <Unlock className="h-3.5 w-3.5" />
                  إعادة فتح
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
                disabled={!pagination || pagination.page <= 1 || reconciliationsQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                }
                disabled={!pagination || pagination.page >= pagination.totalPages || reconciliationsQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void reconciliationsQuery.refetch()}
                disabled={reconciliationsQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${reconciliationsQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
