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
import { useToggleCostCenterMutation } from "@/features/cost-centers/hooks/use-cost-centers-mutations";
import { useCostCentersQuery } from "@/features/cost-centers/hooks/use-cost-centers-query";

const PAGE_SIZE = 8;

export function CostCentersWorkspace() {
  const { hasPermission } = useRbac();
  const canUpdate = hasPermission("cost-centers.update");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<"all" | "active" | "inactive">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const costCentersQuery = useCostCentersQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const toggleMutation = useToggleCostCenterMutation();

  const costCenters = React.useMemo(
    () => costCentersQuery.data?.data ?? [],
    [costCentersQuery.data?.data],
  );
  const pagination = costCentersQuery.data?.pagination;

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
    toggleMutation.mutate({ costCenterId: id, isActive });
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
        title="فلاتر مراكز التكلفة"
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
            <CardTitle>مراكز التكلفة</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>متابعة المراكز التشغيلية وربطها بالفروع والمديرين.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {costCentersQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل المراكز...
            </div>
          ) : null}

          {costCentersQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {costCentersQuery.error instanceof Error
                ? costCentersQuery.error.message
                : "فشل تحميل المراكز"}
            </div>
          ) : null}

          {!costCentersQuery.isPending && costCenters.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد مراكز تكلفة.
            </div>
          ) : null}

          {costCenters.map((center) => (
            <div key={center.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{center.nameAr}</p>
                  {center.nameEn ? (
                    <p className="text-xs text-muted-foreground">{center.nameEn}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">الكود: {center.code}</p>
                  <p className="text-xs text-muted-foreground">
                    الفرع: {center.branch?.nameAr ?? "كافة الفروع"} • المدير:{" "}
                    {center.managerEmployee?.fullNameAr ?? "غير محدد"}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <Badge variant={center.isActive ? "default" : "outline"}>
                    {center.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                  {center.parent ? (
                    <p className="text-xs text-muted-foreground">
                      يتبع: {center.parent.code} - {center.parent.nameAr}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">مستوى رئيسي</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={center.isActive ? "outline" : "default"}
                  className="gap-1.5"
                  onClick={() => handleToggle(center.id, !center.isActive)}
                  disabled={!canUpdate || toggleMutation.isPending}
                >
                  <Power className="h-3.5 w-3.5" />
                  {center.isActive ? "إيقاف" : "تفعيل"}
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
                disabled={!pagination || pagination.page <= 1 || costCentersQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                }
                disabled={!pagination || pagination.page >= pagination.totalPages || costCentersQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void costCentersQuery.refetch()}
                disabled={costCentersQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${costCentersQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
