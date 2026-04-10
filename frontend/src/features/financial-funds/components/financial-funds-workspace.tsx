"use client";

import * as React from "react";
import { Landmark, RefreshCw, WalletCards } from "lucide-react";
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
import { useFinancialFundsQuery } from "@/features/financial-funds/hooks/use-financial-funds-query";

const PAGE_SIZE = 12;

type DraftFilters = {
  search: string;
  fundType: "all" | "MAIN" | "SUB";
  status: "all" | "active" | "inactive";
};

type AppliedFilters = {
  search?: string;
  fundType?: "MAIN" | "SUB";
  isActive?: boolean;
};

const DEFAULT_FILTERS: DraftFilters = {
  search: "",
  fundType: "all",
  status: "all",
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function FinancialFundsWorkspace() {
  const [page, setPage] = React.useState(1);
  const [draftFilters, setDraftFilters] = React.useState<DraftFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilters>({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const fundsQuery = useFinancialFundsQuery({
    page,
    limit: PAGE_SIZE,
    search: appliedFilters.search,
    fundType: appliedFilters.fundType,
    isActive: appliedFilters.isActive,
  });

  const funds = React.useMemo(() => fundsQuery.data?.data ?? [], [fundsQuery.data?.data]);
  const pagination = fundsQuery.data?.pagination;

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      appliedFilters.search ? 1 : 0,
      appliedFilters.fundType ? 1 : 0,
      appliedFilters.isActive !== undefined ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return count;
  }, [appliedFilters]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      search: toOptionalString(draftFilters.search),
      fundType: draftFilters.fundType === "all" ? undefined : draftFilters.fundType,
      isActive:
        draftFilters.status === "all"
          ? undefined
          : draftFilters.status === "active",
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
      title="صناديق التمويل"
      subtitle="إدارة الصناديق الرئيسية والفرعية وربطها بالأنشطة المالية الأساسية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={draftFilters.search}
          onSearchChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
          searchPlaceholder="بحث باسم الصندوق..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void fundsQuery.refetch()}
              disabled={fundsQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${fundsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة الصناديق"
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
              <label className="text-xs font-medium text-muted-foreground">نوع الصندوق</label>
              <SelectField
                value={draftFilters.fundType}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    fundType: event.target.value as DraftFilters["fundType"],
                  }))
                }
              >
                <option value="all">كل الأنواع</option>
                <option value="MAIN">صندوق رئيسي</option>
                <option value="SUB">صندوق فرعي</option>
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة</label>
              <SelectField
                value={draftFilters.status}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    status: event.target.value as DraftFilters["status"],
                  }))
                }
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <WalletCards className="h-5 w-5 text-primary" />
                الصناديق المسجلة
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              استعراض كافة صناديق التمويل المتاحة وتتبع أرصدتها الحالية.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {fundsQuery.isPending ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                جارٍ تحميل بيانات الصناديق...
              </div>
            ) : null}

            {fundsQuery.error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-medium text-center">
                {fundsQuery.error instanceof Error
                  ? fundsQuery.error.message
                  : "تعذر تحميل صناديق التمويل حالياً."}
              </div>
            ) : null}

            {!fundsQuery.isPending && funds.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لا توجد صناديق مطابقة لمعايير البحث الحالية.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {funds.map((fund) => (
                <div
                  key={fund.id}
                  className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold text-base group-hover:text-primary transition-colors">
                        {fund.nameAr ?? "صندوق بدون اسم"}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded inline-block">ID: {fund.id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 pt-0.5">
                      <Badge variant="outline" className="h-5 text-[10px] uppercase tracking-wider">
                        {fund.fundType === "MAIN" ? "رئيسي" : "فرعي"}
                      </Badge>
                      <div className={`size-2.5 rounded-full ${fund.isActive ? "bg-emerald-500" : "bg-muted shadow-inner"}`} title={fund.isActive ? "نشط" : "غير نشط"} />
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-end justify-between border-t border-border/60 pt-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase text-muted-foreground leading-none">الرصيد الحالي</span>
                      <div className="flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-bold text-emerald-700">{fund.currentBalance?.toLocaleString() ?? 0}</span>
                        <span className="text-[10px] font-normal text-muted-foreground opacity-70">ريال</span>
                      </div>
                    </div>
                    {fund.createdAt ? (
                      <span className="text-[10px] text-muted-foreground">منذ {new Date(fund.createdAt).toLocaleDateString("ar-SA")}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4">
              <p className="text-xs text-muted-foreground">
                صفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || fundsQuery.isFetching}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl"
                  onClick={() =>
                    setPage((prev) =>
                      pagination ? Math.min(prev + 1, pagination.totalPages) : prev,
                    )
                  }
                  disabled={!pagination || pagination.page >= pagination.totalPages || fundsQuery.isFetching}
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
