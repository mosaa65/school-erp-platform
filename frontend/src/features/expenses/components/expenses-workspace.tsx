"use client";

import * as React from "react";
import { BadgeCheck, Receipt, RefreshCw, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useExpensesQuery } from "@/features/expenses/hooks/use-expenses-query";
import { useApproveExpenseMutation } from "@/features/expenses/hooks/use-expenses-mutations";

const PAGE_SIZE = 12;

type DraftFilters = {
  search: string;
  fundId: string;
  categoryId: string;
  approval: "all" | "approved" | "pending";
  dateFrom: string;
  dateTo: string;
};

type AppliedFilters = {
  search?: string;
  fundId?: number;
  categoryId?: number;
  isApproved?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

const DEFAULT_FILTERS: DraftFilters = {
  search: "",
  fundId: "",
  categoryId: "",
  approval: "all",
  dateFrom: "",
  dateTo: "",
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function toOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function ExpensesWorkspace() {
  const { hasPermission } = useRbac();
  const canApprove = hasPermission("expenses.approve");

  const [page, setPage] = React.useState(1);
  const [draftFilters, setDraftFilters] = React.useState<DraftFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilters>({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const expensesQuery = useExpensesQuery({
    page,
    limit: PAGE_SIZE,
    search: appliedFilters.search,
    fundId: appliedFilters.fundId,
    categoryId: appliedFilters.categoryId,
    isApproved: appliedFilters.isApproved,
    dateFrom: appliedFilters.dateFrom,
    dateTo: appliedFilters.dateTo,
  });

  const approveMutation = useApproveExpenseMutation();

  const expenses = React.useMemo(
    () => expensesQuery.data?.data ?? [],
    [expensesQuery.data?.data],
  );
  const pagination = expensesQuery.data?.pagination;

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      appliedFilters.search ? 1 : 0,
      appliedFilters.fundId ? 1 : 0,
      appliedFilters.categoryId ? 1 : 0,
      appliedFilters.isApproved !== undefined ? 1 : 0,
      appliedFilters.dateFrom ? 1 : 0,
      appliedFilters.dateTo ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return count;
  }, [appliedFilters]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      search: toOptionalString(draftFilters.search),
      fundId: toOptionalNumber(draftFilters.fundId),
      categoryId: toOptionalNumber(draftFilters.categoryId),
      isApproved:
        draftFilters.approval === "all"
          ? undefined
          : draftFilters.approval === "approved",
      dateFrom: toOptionalString(draftFilters.dateFrom),
      dateTo: toOptionalString(draftFilters.dateTo),
    });
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters({});
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleApprove = (expenseId: number) => {
    if (!canApprove) {
      return;
    }

    const confirmed = window.confirm("تأكيد اعتماد المصروف؟");
    if (!confirmed) {
      return;
    }

    approveMutation.mutate(expenseId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTriggerButton
          count={activeFiltersCount}
          onClick={() => setIsFilterOpen((prev) => !prev)}
        />
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلترة المصروفات"
        actionButtons={
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="flex-1 gap-1.5"
            >
              مسح
            </Button>
            <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
              تطبيق
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="بحث بالوصف أو رقم الفاتورة"
            value={draftFilters.search}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          />
          <Input
            type="number"
            placeholder="معرف الصندوق"
            value={draftFilters.fundId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, fundId: event.target.value }))
            }
          />
          <Input
            type="number"
            placeholder="معرف الفئة"
            value={draftFilters.categoryId}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, categoryId: event.target.value }))
            }
          />
          <SelectField
            value={draftFilters.approval}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                approval: event.target.value as DraftFilters["approval"],
              }))
            }
          >
            <option value="all">كل الحالات</option>
            <option value="approved">معتمد</option>
            <option value="pending">بانتظار الاعتماد</option>
          </SelectField>
          <Input
            type="date"
            value={draftFilters.dateFrom}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
            }
          />
          <Input
            type="date"
            value={draftFilters.dateTo}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, dateTo: event.target.value }))
            }
          />
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              المصروفات
            </CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            سجل المصروفات التشغيلية مع إمكانية اعتماد المصروفات مباشرة.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {expensesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل المصروفات...
            </div>
          ) : null}

          {expensesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {expensesQuery.error instanceof Error
                ? expensesQuery.error.message
                : "تعذر تحميل المصروفات."}
            </div>
          ) : null}

          {!expensesQuery.isPending && expenses.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد مصروفات مطابقة.
            </div>
          ) : null}

          {expenses.map((expense) => {
            const isApproved = Boolean(expense.isApproved);

            return (
              <div
                key={expense.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {expense.fund?.nameAr ?? "صندوق غير معروف"} · {expense.category?.nameAr ?? "فئة غير محددة"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      التاريخ: {expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <Badge variant={isApproved ? "default" : "outline"}>
                    {isApproved ? "معتمد" : "بانتظار الاعتماد"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">{expense.amount ?? 0}</span>
                  {expense.invoiceNumber ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Receipt className="h-3.5 w-3.5" />
                      فاتورة: {expense.invoiceNumber}
                    </span>
                  ) : null}
                </div>

                {expense.description ? (
                  <p className="text-xs text-muted-foreground">{expense.description}</p>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {expense.approvedByUser?.email
                      ? `المعتمد بواسطة: ${expense.approvedByUser.email}`
                      : "لم يتم الاعتماد بعد"}
                  </div>
                  {canApprove && !isApproved ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleApprove(expense.id)}
                      disabled={approveMutation.isPending}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      اعتماد
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">
              صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination || pagination.page <= 1 || expensesQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) =>
                    pagination ? Math.min(prev + 1, pagination.totalPages) : prev,
                  )
                }
                disabled={!pagination || pagination.page >= pagination.totalPages || expensesQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void expensesQuery.refetch()}
                disabled={expensesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${expensesQuery.isFetching ? "animate-spin" : ""}`}
                />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
