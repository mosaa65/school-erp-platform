"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ArrowLeftRight,
  CalendarDays,
  Hash,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Trash2,
  Type,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAlert,
  FinanceEmptyState,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import {
  useCreateCurrencyExchangeRateMutation,
  useDeleteCurrencyExchangeRateMutation,
  useUpdateCurrencyExchangeRateMutation,
} from "@/features/currency-exchange-rates/hooks/use-currency-exchange-rates-mutations";
import { useCurrencyExchangeRatesQuery } from "@/features/currency-exchange-rates/hooks/use-currency-exchange-rates-query";
import { useCurrenciesQuery } from "@/features/currencies/hooks/use-currencies-query";
import type {
  CreateCurrencyExchangeRatePayload,
  CurrencyExchangeRateListItem,
} from "@/lib/api/client";

const PAGE_SIZE = 12;

type FormState = {
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  effectiveDate: string;
  source: string;
  isActive: boolean;
};

const DEFAULT_FORM: FormState = {
  fromCurrencyId: 0,
  toCurrencyId: 0,
  rate: 1,
  effectiveDate: "",
  source: "",
  isActive: true,
};

function formatDateInput(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toUtcStartIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function toFormState(item: CurrencyExchangeRateListItem): FormState {
  return {
    fromCurrencyId: item.fromCurrencyId,
    toCurrencyId: item.toCurrencyId,
    rate: item.rate,
    effectiveDate: formatDateInput(item.effectiveDate),
    source: item.source ?? "",
    isActive: item.isActive,
  };
}

export function CurrencyExchangeRatesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("currency-exchange-rates.create");
  const canUpdate = hasPermission("currency-exchange-rates.update");
  const canDelete = hasPermission("currency-exchange-rates.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [baseFilter, setBaseFilter] = React.useState<number | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    active: "all" as "all" | "active" | "inactive",
    base: "all" as number | "all",
  });

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const currenciesQuery = useCurrenciesQuery({ limit: 200, page: 1 });
  const currencyOptions = currenciesQuery.data?.data ?? [];

  const exchangeRatesQuery = useCurrencyExchangeRatesQuery({
    page,
    limit: PAGE_SIZE,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    fromCurrencyId: baseFilter === "all" ? undefined : baseFilter,
  });

  const createMutation = useCreateCurrencyExchangeRateMutation();
  const updateMutation = useUpdateCurrencyExchangeRateMutation();
  const deleteMutation = useDeleteCurrencyExchangeRateMutation();

  const records = React.useMemo(
    () => exchangeRatesQuery.data?.data ?? [],
    [exchangeRatesQuery.data?.data],
  );
  const filteredRecords = React.useMemo(() => {
    if (!search.trim()) {
      return records;
    }

    const query = search.trim().toLowerCase();
    return records.filter((item) => {
      const fromCode = item.fromCurrency?.code?.toLowerCase() ?? "";
      const toCode = item.toCurrency?.code?.toLowerCase() ?? "";
      const pair = `${fromCode}/${toCode}`;
      return (
        fromCode.includes(query) ||
        toCode.includes(query) ||
        pair.includes(query)
      );
    });
  }, [records, search]);
  const pagination = exchangeRatesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = records.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingId, isEditing, records]);

  useDebounceEffect(
    () => {
      setPage(1);
      setSearch(searchInput.trim());
    },
    400,
    [searchInput],
  );

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      active: activeFilter,
      base: baseFilter,
    });
  }, [activeFilter, baseFilter, isFilterOpen]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: CurrencyExchangeRateListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const base = form.fromCurrencyId;
    const quote = form.toCurrencyId;

    if (!base || !quote || !form.effectiveDate) {
      setFormError("الرجاء تعبئة الحقول المطلوبة: العملة الأساسية، العملة المقابلة، التاريخ.");
      return false;
    }

    if (base === quote) {
      setFormError("لا يمكن أن تكون العملة الأساسية مطابقة للعملة المقابلة.");
      return false;
    }

    if (form.rate <= 0) {
      setFormError("سعر الصرف يجب أن يكون أكبر من صفر.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload: CreateCurrencyExchangeRatePayload = {
      fromCurrencyId: form.fromCurrencyId,
      toCurrencyId: form.toCurrencyId,
      rate: form.rate,
      effectiveDate: toUtcStartIso(form.effectiveDate),
      source: form.source?.trim() || undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية التحديث: currency-exchange-rates.update.");
        return;
      }

      updateMutation.mutate(
        { rateId: editingId, payload },
        {
          onSuccess: () => {
            resetFormState();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية الإضافة: currency-exchange-rates.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetFormState();
        setPage(1);
      },
    });
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setBaseFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft.active);
    setBaseFilter(filterDraft.base);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
      baseFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, baseFilter, searchInput]);

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالزوج (SAR/USD)..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر أسعار الصرف"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="الحالة">
              <SelectField
                icon={<ShieldCheck />}
                value={filterDraft.active}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    active: event.target.value as "all" | "active" | "inactive",
                  }))
                }
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </SelectField>
            </FormField>

            <FormField label="العملة الأساسية">
              <SelectField
                icon={<ArrowLeftRight />}
                value={filterDraft.base}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    base: event.target.value === "all" ? "all" : Number(event.target.value),
                  }))
                }
              >
                <option value="all">كل العملات الأساسية</option>
                {currencyOptions.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code}
                  </option>
                ))}
              </SelectField>
            </FormField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>أسعار صرف العملات</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة أسعار الصرف حسب العملة الأساسية والتاريخ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {exchangeRatesQuery.isPending ? (
              <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
            ) : null}

            {exchangeRatesQuery.error ? (
              <FinanceAlert tone="error">
                {exchangeRatesQuery.error instanceof Error
                  ? exchangeRatesQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </FinanceAlert>
            ) : null}

            {!exchangeRatesQuery.isPending && filteredRecords.length === 0 ? (
              <FinanceEmptyState>لا توجد أسعار مطابقة.</FinanceEmptyState>
            ) : null}

            {filteredRecords.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {item.fromCurrency?.code ?? item.fromCurrencyId} /{" "}
                      {item.toCurrency?.code ?? item.toCurrencyId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      السعر: {item.rate.toLocaleString()} · التاريخ: {new Date(
                        item.effectiveDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={item.isActive ? "default" : "outline"} className="gap-1.5">
                    {item.isActive ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldX className="h-3.5 w-3.5" />
                    )}
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(item)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      if (!canDelete) {
                        return;
                      }
                      if (!confirmFinanceAction("تأكيد حذف سعر الصرف؟")) {
                        return;
                      }
                      deleteMutation.mutate(item.id, {
                        onSuccess: () => {
                          if (editingId === item.id) {
                            resetForm();
                          }
                        },
                      });
                    }}
                    disabled={!canDelete || deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || exchangeRatesQuery.isFetching}
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
                  disabled={
                    !pagination ||
                    pagination.page >= pagination.totalPages ||
                    exchangeRatesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void exchangeRatesQuery.refetch()}
                  disabled={exchangeRatesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${exchangeRatesQuery.isFetching ? "animate-spin" : ""}`}
                  />
                  تحديث
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إضافة"
        ariaLabel="إضافة سعر صرف"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل سعر صرف" : "إضافة سعر صرف"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التغييرات" : "إضافة سعر صرف"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك صلاحية الإضافة: <code>currency-exchange-rates.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="العملة الأساسية" required>
                <SelectField
                  icon={<ArrowLeftRight />}
                  value={form.fromCurrencyId || ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, fromCurrencyId: Number(event.target.value) }))
                  }
                  required
                >
                  <option value="">اختر العملة</option>
                  {currencyOptions.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} - {currency.nameAr}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField label="العملة المقابلة" required>
                <SelectField
                  icon={<ArrowLeftRight />}
                  value={form.toCurrencyId || ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, toCurrencyId: Number(event.target.value) }))
                  }
                  required
                >
                  <option value="">اختر العملة</option>
                  {currencyOptions.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} - {currency.nameAr}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="سعر الصرف" required>
                <Input
                  icon={<Hash />}
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.rate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, rate: Number(event.target.value) }))
                  }
                />
              </FormField>
              <FormField label="تاريخ السريان" required>
                <Input
                  icon={<CalendarDays />}
                  type="date"
                  value={form.effectiveDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, effectiveDate: event.target.value }))
                  }
                />
              </FormField>
            </div>

            <FormField label="المصدر">
              <Input
                icon={<Type />}
                value={form.source ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, source: event.target.value }))
                }
                placeholder="Manual"
              />
            </FormField>

            <FormBooleanField
              label="نشط"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, isActive: checked }))
              }
            />

            {formError ? (
              <FinanceAlert tone="error" className="p-2 text-xs">
                {formError}
              </FinanceAlert>
            ) : null}

            {mutationError ? (
              <FinanceAlert tone="error" className="p-2 text-xs">
                {mutationError}
              </FinanceAlert>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التغييرات" : "إضافة سعر صرف"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </BottomSheetForm>
    </>
  );
}
