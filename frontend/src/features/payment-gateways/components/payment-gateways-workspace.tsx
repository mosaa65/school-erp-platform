"use client";

import * as React from "react";
import { Power, RefreshCw, Shuffle } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useSwitchPaymentGatewayTypeMutation,
  useTogglePaymentGatewayMutation,
} from "@/features/payment-gateways/hooks/use-payment-gateways-mutations";
import {
  usePaymentGatewaysQuery,
  type PaymentGatewayType,
} from "@/features/payment-gateways/hooks/use-payment-gateways-query";

const PAGE_SIZE = 8;

const GATEWAY_TYPE_LABELS: Record<PaymentGatewayType, string> = {
  ONLINE: "متصل",
  OFFLINE: "غير متصل",
};

export function PaymentGatewaysWorkspace() {
  const { hasPermission } = useRbac();
  const canUpdate = hasPermission("payment-gateways.update");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = React.useState<PaymentGatewayType | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    active: "all" as "all" | "active" | "inactive",
    type: "all" as PaymentGatewayType | "all",
  });
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const gatewaysQuery = usePaymentGatewaysQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    gatewayType: typeFilter === "all" ? undefined : typeFilter,
  });

  const toggleMutation = useTogglePaymentGatewayMutation();
  const typeMutation = useSwitchPaymentGatewayTypeMutation();

  const gateways = React.useMemo(
    () => gatewaysQuery.data?.data ?? [],
    [gatewaysQuery.data?.data],
  );
  const pagination = gatewaysQuery.data?.pagination;

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ active: activeFilter, type: typeFilter });
  }, [activeFilter, typeFilter, isFilterOpen]);

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft.active);
    setTypeFilter(filterDraft.type);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setTypeFilter("all");
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
      typeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [searchInput, activeFilter, typeFilter]);

  const handleToggle = (gatewayId: number, nextActive: boolean) => {
    if (!canUpdate) return;
    toggleMutation.mutate({ gatewayId, isActive: nextActive });
  };

  const handleSwitchType = (gatewayId: number, type: PaymentGatewayType) => {
    if (!canUpdate) return;
    typeMutation.mutate({ gatewayId, gatewayType: type });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
          <SearchField
            containerClassName="flex-1"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ابحث باسم البوابة..."
          />
        </div>
        <FilterTriggerButton
          count={activeFiltersCount}
          onClick={() => setIsFilterOpen((prev) => !prev)}
        />
      </div>

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر البوابات"
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
            value={filterDraft.active}
            onChange={(event) =>
              setFilterDraft((prev) => ({
                ...prev,
                active: event.target.value as "all" | "active" | "inactive",
              }))
            }
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط فقط</option>
            <option value="inactive">غير نشط فقط</option>
          </SelectField>
          <SelectField
            value={filterDraft.type}
            onChange={(event) =>
              setFilterDraft((prev) => ({
                ...prev,
                type: event.target.value as PaymentGatewayType | "all",
              }))
            }
          >
            <option value="all">كل الأنواع</option>
            <option value="ONLINE">متصل</option>
            <option value="OFFLINE">غير متصل</option>
          </SelectField>
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>بوابات الدفع</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>تفعيل البوابات والتحكم بنوع التشغيل.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {gatewaysQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل بوابات الدفع...
            </div>
          ) : null}

          {gatewaysQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {gatewaysQuery.error instanceof Error
                ? gatewaysQuery.error.message
                : "فشل تحميل البوابات"}
            </div>
          ) : null}

          {!gatewaysQuery.isPending && gateways.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد بوابات مطابقة.
            </div>
          ) : null}

          {gateways.map((gateway) => (
            <div
              key={gateway.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{gateway.nameAr}</p>
                  {gateway.nameEn ? (
                    <p className="text-xs text-muted-foreground">{gateway.nameEn}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    النوع: {GATEWAY_TYPE_LABELS[gateway.gatewayType]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    حساب التسوية:{" "}
                    {gateway.settlementAccount
                      ? gateway.settlementAccount.nameAr
                      : "غير محدد"}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <Badge variant={gateway.isActive ? "default" : "outline"}>
                    {gateway.isActive ? "نشطة" : "متوقفة"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {gateway.apiEndpoint ? `Endpoint: ${gateway.apiEndpoint}` : "لا يوجد Endpoint"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={gateway.isActive ? "outline" : "default"}
                  className="gap-1.5"
                  onClick={() => handleToggle(gateway.id, !gateway.isActive)}
                  disabled={!canUpdate || toggleMutation.isPending}
                >
                  <Power className="h-3.5 w-3.5" />
                  {gateway.isActive ? "إيقاف" : "تفعيل"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    handleSwitchType(
                      gateway.id,
                      gateway.gatewayType === "ONLINE" ? "OFFLINE" : "ONLINE",
                    )
                  }
                  disabled={!canUpdate || typeMutation.isPending}
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  تحويل إلى {gateway.gatewayType === "ONLINE" ? "غير متصل" : "متصل"}
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
                disabled={!pagination || pagination.page <= 1 || gatewaysQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                }
                disabled={!pagination || pagination.page >= pagination.totalPages || gatewaysQuery.isFetching}
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void gatewaysQuery.refetch()}
                disabled={gatewaysQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${gatewaysQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
