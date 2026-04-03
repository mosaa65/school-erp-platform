"use client";

import * as React from "react";
import { Landmark, RefreshCw, WalletCards } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <FilterTriggerButton
            count={activeFiltersCount}
            onClick={() => setIsFilterOpen((prev) => !prev)}
          />
        </div>
      </div>

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
          <Input
            placeholder="بحث بالاسم أو الكود"
            value={draftFilters.search}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          />
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
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-primary" />
              صناديق التمويل
            </CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة الصناديق الرئيسية والفرعية وربطها بالأنشطة المالية الأساسية.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {fundsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل بيانات الصناديق...
            </div>
          ) : null}

          {fundsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {fundsQuery.error instanceof Error
                ? fundsQuery.error.message
                : "تعذر تحميل صناديق التمويل."}
            </div>
          ) : null}

          {!fundsQuery.isPending && funds.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد صناديق مطابقة للبحث.
            </div>
          ) : null}

          {funds.map((fund) => (
            <div
              key={fund.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {fund.nameAr ?? "صندوق بدون اسم"}
                  </p>
                  <p className="text-xs text-muted-foreground">الكود: {fund.code ?? "-"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {fund.fundType === "MAIN" ? "رئيسي" : "فرعي"}
                  </Badge>
                  <Badge variant={fund.isActive ? "default" : "secondary"}>
                    {fund.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Landmark className="h-3.5 w-3.5" />
                  الرصيد الحالي: {fund.currentBalance ?? 0}
                </span>
                {fund.createdAt ? (
                  <span>تاريخ الإنشاء: {new Date(fund.createdAt).toLocaleDateString()}</span>
                ) : null}
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
                disabled={!pagination || pagination.page <= 1 || fundsQuery.isFetching}
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
                disabled={!pagination || pagination.page >= pagination.totalPages || fundsQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void fundsQuery.refetch()}
                disabled={fundsQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${fundsQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
