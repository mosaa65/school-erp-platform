"use client";

import * as React from "react";
import { Power, RefreshCw, Landmark, User, Hierarchy, Building2 } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SelectField } from "@/components/ui/select-field";
import { PageShell } from "@/components/ui/page-shell";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
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
    <PageShell
      title="مراكز التكلفة"
      subtitle="إدارة الهيكل التنظيمي للمراكز المالية وربطها بالفروع والموظفين."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم المركز..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void costCentersQuery.refetch()}
              disabled={costCentersQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${costCentersQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة التشغيلية</label>
              <SelectField
                value={filterDraft}
                onChange={(event) => setFilterDraft(event.target.value as any)}
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">غير نشط فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Landmark className="h-5 w-5 text-primary" />
                المراكز التشغيلية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              متابعة الهيكل المالي للمراكز التنظيمية وتفعيلها أو تعطيلها حسب الحاجة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {costCentersQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                جارٍ تحميل بيانات مراكز التكلفة...
              </div>
            )}

            {costCentersQuery.error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-medium text-center">
                {costCentersQuery.error instanceof Error ? costCentersQuery.error.message : "فشل تحميل المراكز"}
              </div>
            )}

            {!costCentersQuery.isPending && costCenters.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لا توجد مراكز تكلفة مسجلة حالياً.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {costCenters.map((center) => (
                <div key={center.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{center.nameAr}</p>
                      {center.nameEn && <p className="text-[10px] text-muted-foreground uppercase font-medium">{center.nameEn}</p>}
                      <p className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md inline-block mt-1">ID: {center.id}</p>
                    </div>
                    <Badge variant={center.isActive ? "default" : "secondary"} className={`h-5 text-[9px] uppercase tracking-tighter ${center.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                      {center.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{center.branch?.nameAr ?? "كافة الفروع"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{center.managerEmployee?.fullNameAr ?? "بدون مدير"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-lg">
                      <Hierarchy className="h-3 w-3" />
                      <span>{center.parent ? `تابع لـ: ${center.parent.nameAr}` : "مستوى رئيسي"}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={center.isActive ? "ghost" : "default"}
                      className={`h-8 rounded-xl gap-1.5 px-3 text-[11px] font-bold ${center.isActive ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      onClick={() => handleToggle(center.id, !center.isActive)}
                      disabled={!canUpdate || toggleMutation.isPending}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {center.isActive ? "إيقاف التشغيل" : "تفعيل المركز"}
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
                  disabled={!pagination || pagination.page <= 1 || costCentersQuery.isFetching}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() =>
                    setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                  }
                  disabled={!pagination || pagination.page >= pagination.totalPages || costCentersQuery.isFetching}
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
