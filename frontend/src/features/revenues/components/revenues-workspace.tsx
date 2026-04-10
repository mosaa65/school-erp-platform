"use client";

import * as React from "react";
import { Banknote, RefreshCw, Receipt, Calendar, ArrowRightLeft, User, Coins } from "lucide-react";
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
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
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
    <PageShell 
      title="سجل الإيرادات"
      subtitle="تتبع وتحليل المداخيل المالية حسب الصناديق والفئات التشغيلية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={draftFilters.search}
          onSearchChange={(event) =>
            setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
          }
          onSearchEnter={applyFilters}
          searchPlaceholder="بحث بالوصف أو رقم السند..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void revenuesQuery.refetch()}
              disabled={revenuesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${revenuesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الإيرادات"
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
                placeholder="Id"
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
                placeholder="Id"
                value={draftFilters.categoryId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, categoryId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">مصدر الإيراد</label>
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
                <Banknote className="h-5 w-5 text-primary" />
                الإيرادات المحصلة
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              سرد تاريخي للتدفقات النقدية الداخلة مصنفة حسب الغرض والجهة الموردة.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {revenuesQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                جارٍ تحميل بيانات الإيرادات...
              </div>
            )}

            {revenuesQuery.error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-medium text-center">
                {revenuesQuery.error instanceof Error ? revenuesQuery.error.message : "تعذر تحميل بيانات الإيرادات."}
              </div>
            )}

            {!revenuesQuery.isPending && revenues.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لم يتم العثور على إيرادات تطابق معايير البحث الحالية.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {revenues.map((revenue) => (
                <div key={revenue.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1.5">
                      <p className="font-bold text-base leading-tight">
                        {revenue.fund?.nameAr ?? "مركز مالي غير معروف"}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span>{revenue.category?.nameAr ?? "فئة غير محددة"}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="h-6 rounded-full text-[10px] font-bold bg-primary/5 text-primary border-primary/20">
                      {translateSourceType(revenue.sourceType)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase leading-none block font-bold">المبلغ</span>
                      <div className="flex items-baseline gap-1">
                        <Coins className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                        <span className="font-bold text-lg text-emerald-700">{revenue.amount?.toLocaleString() ?? 0}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">ريال</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase leading-none block font-bold">التاريخ</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-xs">
                          {revenue.revenueDate ? new Date(revenue.revenueDate).toLocaleDateString("ar-SA") : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {revenue.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {revenue.description}
                      </p>
                    )}
                    
                    {revenue.receiptNumber && (
                      <div className="flex items-center gap-2 text-[11px] font-medium bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1 text-primary w-fit">
                        <Receipt className="h-3.5 w-3.5" />
                        <span>سند تحصيل رقم: {revenue.receiptNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4 mt-auto">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[150px]">
                        جهة الإصدار: {translateSourceType(revenue.sourceType)}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-bold px-3">
                      عرض التفاصيل
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-6 mt-2">
              <p className="text-xs text-muted-foreground">
                صفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || revenuesQuery.isFetching}
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
                  disabled={!pagination || pagination.page >= pagination.totalPages || revenuesQuery.isFetching}
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
