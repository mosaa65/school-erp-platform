"use client";

import * as React from "react";
import { BadgeCheck, Receipt, RefreshCw, Wallet, Calendar, Tag, UserCheck, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SelectField } from "@/components/ui/select-field";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
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
    <PageShell
      title="المصروفات التشغيلية"
      subtitle="تتبع واعتماد المصروفات المالية وربطها بالصناديق والفئات."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={draftFilters.search}
          onSearchChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
          searchPlaceholder="بحث بالوصف أو رقم الفاتورة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void expensesQuery.refetch()}
              disabled={expensesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${expensesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر المصروفات"
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">معرف الصندوق</label>
              <Input
                type="number"
                placeholder="fundId"
                value={draftFilters.fundId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, fundId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">معرف الفئة</label>
              <Input
                type="number"
                placeholder="categoryId"
                value={draftFilters.categoryId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, categoryId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">حالة الاعتماد</label>
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
            </div>
            <div className="h-[1px] sm:col-span-2 bg-border/40 my-1" />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
              <Input
                type="date"
                value={draftFilters.dateFrom}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
              <Input
                type="date"
                value={draftFilters.dateTo}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, dateTo: event.target.value }))
                }
              />
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Wallet className="h-5 w-5 text-primary" />
                سجل المصروفات
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              استعراض المصروفات التشغيلية الموثقة في النظام والموافقة عليها.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {expensesQuery.isPending ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                جارٍ تحميل سجل المصروفات...
              </div>
            ) : null}

            {expensesQuery.error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-medium text-center">
                {expensesQuery.error instanceof Error
                  ? expensesQuery.error.message
                  : "حدث خطأ أثناء تحميل سجل المصروفات."}
              </div>
            ) : null}

            {!expensesQuery.isPending && expenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لم يتم العثور على أي مصروفات مطابقة للبحث.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {expenses.map((expense) => {
                const isApproved = Boolean(expense.isApproved);

                return (
                  <div
                    key={expense.id}
                    className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg overflow-hidden"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1.5">
                        <p className="font-bold text-base leading-tight">
                          {expense.fund?.nameAr ?? "مركز مالي غير معروف"}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Tag className="h-3.5 w-3.5" />
                          <span>{expense.category?.nameAr ?? "فئة عامة"}</span>
                        </div>
                      </div>
                      <Badge variant={isApproved ? "default" : "secondary"} className={`h-6 rounded-full text-[10px] px-2.5 font-bold tracking-tight ${isApproved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                        {isApproved ? "معتمد" : "قيد المراجعة"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase leading-none block">المبلغ الإجمالي</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-lg text-primary">{expense.amount?.toLocaleString() ?? 0}</span>
                          <span className="text-[10px] text-muted-foreground">ريال</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase leading-none block">التاريخ</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-xs">{expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString("ar-SA") : "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-xs">
                        <Hash className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground leading-tight">{expense.description || "لا يوجد وصف متوفر لهذا المصروف."}</span>
                      </div>
                      
                      {expense.invoiceNumber ? (
                        <div className="flex items-center gap-2 text-[11px] font-medium bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1 text-primary w-fit">
                          <Receipt className="h-3.5 w-3.5" />
                          <span>رقم الفاتورة: {expense.invoiceNumber}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4 mt-auto">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[120px]">
                          {expense.approvedByUser?.email
                            ? `بواسطة: ${expense.approvedByUser.email.split("@")[0]}`
                            : "غير معتمد"}
                        </span>
                      </div>
                      
                      {canApprove && !isApproved ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-xl gap-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                          onClick={() => handleApprove(expense.id)}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BadgeCheck className="h-3.5 w-3.5" />
                          )}
                          اعتماد الآن
                        </Button>
                      ) : null}
                    </div>

                    {!isApproved && (
                      <div className="absolute top-0 right-0 h-1 rounded-tl-full w-full bg-amber-400 opacity-70" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-6">
              <p className="text-xs text-muted-foreground">
                صفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || expensesQuery.isFetching}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() =>
                    setPage((prev) =>
                      pagination ? Math.min(prev + 1, pagination.totalPages) : prev,
                    )
                  }
                  disabled={!pagination || pagination.page >= pagination.totalPages || expensesQuery.isFetching}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
