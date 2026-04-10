"use client";

import * as React from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useApproveBudgetMutation } from "@/features/budgets/hooks/use-budgets-mutations";
import {
  useBudgetsQuery,
  type BudgetListItem,
  type BudgetStatus,
} from "@/features/budgets/hooks/use-budgets-query";

const PAGE_SIZE = 8;

const STATUS_LABELS: Record<BudgetStatus, string> = {
  DRAFT: "مسودة",
  APPROVED: "معتمدة",
  ACTIVE: "نشطة",
  CLOSED: "مغلقة",
  REVISED: "مراجعة",
};

const STATUS_VARIANTS: Record<BudgetStatus, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  APPROVED: "default",
  ACTIVE: "secondary",
  CLOSED: "outline",
  REVISED: "secondary",
};

export function BudgetsWorkspace() {
  const { hasPermission } = useRbac();
  const canApprove = hasPermission("budgets.approve");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<BudgetStatus | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState<BudgetStatus | "all">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const budgetsQuery = useBudgetsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const approveMutation = useApproveBudgetMutation();

  const budgets = React.useMemo(() => budgetsQuery.data?.data ?? [], [budgetsQuery.data?.data]);
  const pagination = budgetsQuery.data?.pagination;

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

  const handleApprove = (budget: BudgetListItem) => {
    if (!canApprove || budget.status !== "DRAFT") return;
    approveMutation.mutate(budget.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
          <SearchField
            containerClassName="flex-1"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ابحث باسم الميزانية..."
          />
        </div>
        <FilterTriggerButton count={activeFiltersCount} onClick={() => setIsFilterOpen((prev) => !prev)} />
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر الميزانيات"
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
            onChange={(event) => setFilterDraft(event.target.value as BudgetStatus | "all")}
          >
            <option value="all">كل الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="APPROVED">معتمدة</option>
            <option value="ACTIVE">نشطة</option>
            <option value="REVISED">مراجعة</option>
            <option value="CLOSED">مغلقة</option>
          </SelectField>
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>الميزانيات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>اعتماد الميزانيات ومتابعة دورة اعتمادها.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {budgetsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل الميزانيات...
            </div>
          ) : null}

          {budgetsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {budgetsQuery.error instanceof Error ? budgetsQuery.error.message : "فشل تحميل الميزانيات"}
            </div>
          ) : null}

          {!budgetsQuery.isPending && budgets.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد ميزانيات مطابقة.
            </div>
          ) : null}

          {budgets.map((budget) => (
            <div key={budget.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{budget.nameAr}</p>
                  <p className="text-xs text-muted-foreground">
                    السنة: {budget.fiscalYear?.yearName ?? "—"} • الفرع:{" "}
                    {budget.branch?.nameAr ?? "كافة الفروع"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الفترة: {budget.startDate} → {budget.endDate}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <Badge variant={STATUS_VARIANTS[budget.status]}>{STATUS_LABELS[budget.status]}</Badge>
                  <p className="text-sm font-medium">
                    {Number(budget.totalAmount).toLocaleString()} ر.س
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleApprove(budget)}
                  disabled={!canApprove || budget.status !== "DRAFT" || approveMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  اعتماد الميزانية
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
                disabled={!pagination || pagination.page <= 1 || budgetsQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                }
                disabled={!pagination || pagination.page >= pagination.totalPages || budgetsQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void budgetsQuery.refetch()}
                disabled={budgetsQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${budgetsQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

