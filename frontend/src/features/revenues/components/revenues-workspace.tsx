"use client";

import * as React from "react";
import { Banknote, RefreshCw, Receipt } from "lucide-react";
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
import { useRevenuesQuery } from "@/features/revenues/hooks/use-revenues-query";

const PAGE_SIZE = 12;

type DraftFilters = {
  search: string;
  fundId: string;
  categoryId: string;
  sourceType: "all" | "STUDENT" | "EMPLOYEE" | "DONOR" | "OTHER";
  dateFrom: string;
  dateTo: string;
};

type AppliedFilters = {
  search?: string;
  fundId?: number;
  categoryId?: number;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
};

const DEFAULT_FILTERS: DraftFilters = {
  search: "",
  fundId: "",
  categoryId: "",
  sourceType: "all",
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

function translateSourceType(value?: string | null): string {
  switch (value) {
    case "STUDENT":
      return "طالب";
    case "EMPLOYEE":
      return "موظف";
    case "DONOR":
      return "متبرع";
    case "OTHER":
      return "أخرى";
    default:
      return value ?? "-";
  }
}

export function RevenuesWorkspace() {
  const [page, setPage] = React.useState(1);
  const [draftFilters, setDraftFilters] = React.useState<DraftFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilters>({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const revenuesQuery = useRevenuesQuery({
    page,
    limit: PAGE_SIZE,
    search: appliedFilters.search,
    fundId: appliedFilters.fundId,
    categoryId: appliedFilters.categoryId,
    sourceType: appliedFilters.sourceType,
    dateFrom: appliedFilters.dateFrom,
    dateTo: appliedFilters.dateTo,
  });

  const revenues = React.useMemo(
    () => revenuesQuery.data?.data ?? [],
    [revenuesQuery.data?.data],
  );
  const pagination = revenuesQuery.data?.pagination;

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      appliedFilters.search ? 1 : 0,
      appliedFilters.fundId ? 1 : 0,
      appliedFilters.categoryId ? 1 : 0,
      appliedFilters.sourceType ? 1 : 0,
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
      sourceType: draftFilters.sourceType === "all" ? undefined : draftFilters.sourceType,
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
        title="فلترة الإيرادات"
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
            placeholder="بحث بالوصف أو رقم السند"
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
            value={draftFilters.sourceType}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                sourceType: event.target.value as DraftFilters["sourceType"],
              }))
            }
          >
            <option value="all">كل المصادر</option>
            <option value="STUDENT">طالب</option>
            <option value="EMPLOYEE">موظف</option>
            <option value="DONOR">متبرع</option>
            <option value="OTHER">أخرى</option>
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
              <Banknote className="h-5 w-5 text-primary" />
              الإيرادات
            </CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            متابعة الإيرادات حسب الصندوق والفئة ونوع المصدر.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {revenuesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل الإيرادات...
            </div>
          ) : null}

          {revenuesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {revenuesQuery.error instanceof Error
                ? revenuesQuery.error.message
                : "تعذر تحميل بيانات الإيرادات."}
            </div>
          ) : null}

          {!revenuesQuery.isPending && revenues.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد إيرادات مطابقة.
            </div>
          ) : null}

          {revenues.map((revenue) => (
            <div
              key={revenue.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {revenue.fund?.nameAr ?? "صندوق غير معروف"} · {revenue.category?.nameAr ?? "فئة غير محددة"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    التاريخ: {revenue.revenueDate ? new Date(revenue.revenueDate).toLocaleDateString() : "-"}
                  </p>
                </div>
                <Badge variant="outline">{translateSourceType(revenue.sourceType)}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold">{revenue.amount ?? 0}</span>
                {revenue.receiptNumber ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5" />
                    سند: {revenue.receiptNumber}
                  </span>
                ) : null}
              </div>

              {revenue.description ? (
                <p className="text-xs text-muted-foreground">{revenue.description}</p>
              ) : null}
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
                disabled={!pagination || pagination.page <= 1 || revenuesQuery.isFetching}
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
                disabled={!pagination || pagination.page >= pagination.totalPages || revenuesQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void revenuesQuery.refetch()}
                disabled={revenuesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${revenuesQuery.isFetching ? "animate-spin" : ""}`}
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
