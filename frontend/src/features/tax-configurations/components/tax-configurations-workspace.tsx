"use client";

import * as React from "react";
import { Power, RefreshCw } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useToggleTaxConfigurationMutation } from "@/features/tax-configurations/hooks/use-tax-configurations-mutations";
import {
  useTaxConfigurationsQuery,
  type TaxType,
} from "@/features/tax-configurations/hooks/use-tax-configurations-query";

const PAGE_SIZE = 8;

const TAX_TYPE_LABELS: Record<TaxType, string> = {
  OUTPUT: "مخرجات",
  INPUT: "مدخلات",
  EXEMPT: "معفاة",
  ZERO_RATED: "صفرية",
};

export function TaxConfigurationsWorkspace() {
  const { hasPermission } = useRbac();
  const canUpdate = hasPermission("tax-configurations.update");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<"all" | "active" | "inactive">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const taxQuery = useTaxConfigurationsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const toggleMutation = useToggleTaxConfigurationMutation();

  const taxItems = React.useMemo(() => taxQuery.data?.data ?? [], [taxQuery.data?.data]);
  const pagination = taxQuery.data?.pagination;

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft(activeFilter);
  }, [isFilterOpen, activeFilter]);

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, activeFilter !== "all" ? 1 : 0].reduce(
      (acc, value) => acc + value,
      0,
    );
  }, [searchInput, activeFilter]);

  const handleToggle = (id: number, isActive: boolean) => {
    if (!canUpdate) return;
    toggleMutation.mutate({ taxConfigurationId: id, isActive });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
          <SearchField
            containerClassName="flex-1"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ابحث بالكود أو الاسم..."
          />
        </div>
        <FilterTriggerButton count={activeFiltersCount} onClick={() => setIsFilterOpen((prev) => !prev)} />
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر الضريبة"
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
            onChange={(event) => setFilterDraft(event.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط فقط</option>
            <option value="inactive">غير نشط فقط</option>
          </SelectField>
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>إعدادات الضرائب</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>تفعيل نسب الضرائب وربطها بالحسابات والفترة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل إعدادات الضرائب...
            </div>
          ) : null}

          {taxQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {taxQuery.error instanceof Error ? taxQuery.error.message : "فشل تحميل البيانات"}
            </div>
          ) : null}

          {!taxQuery.isPending && taxItems.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد إعدادات ضريبية.
            </div>
          ) : null}

          {taxItems.map((item) => (
            <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{item.taxNameAr}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.taxCode} • {TAX_TYPE_LABELS[item.taxType]} • سريان: {item.effectiveFrom}
                    {item.effectiveTo ? ` → ${item.effectiveTo}` : ""}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "نشطة" : "متوقفة"}
                  </Badge>
                  <p className="text-sm font-medium">{Number(item.rate).toLocaleString()}%</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={item.isActive ? "outline" : "default"}
                  className="gap-1.5"
                  onClick={() => handleToggle(item.id, !item.isActive)}
                  disabled={!canUpdate || toggleMutation.isPending}
                >
                  <Power className="h-3.5 w-3.5" />
                  {item.isActive ? "إيقاف" : "تفعيل"}
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
                disabled={!pagination || pagination.page <= 1 || taxQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                }
                disabled={!pagination || pagination.page >= pagination.totalPages || taxQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void taxQuery.refetch()}
                disabled={taxQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${taxQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
