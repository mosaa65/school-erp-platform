"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Coins,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Star,
  Trash2,
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
  useCreateCurrencyMutation,
  useDeleteCurrencyMutation,
  useUpdateCurrencyMutation,
} from "@/features/currencies/hooks/use-currencies-mutations";
import { useCurrenciesQuery } from "@/features/currencies/hooks/use-currencies-query";
import type { CreateCurrencyPayload, CurrencyListItem } from "@/lib/api/client";

type FormState = {
  nameAr: string;
  symbol: string;
  decimalPlaces: number;
  isBase: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  nameAr: "",
  symbol: "",
  decimalPlaces: 2,
  isBase: false,
  isActive: true,
};

function toFormState(item: CurrencyListItem): FormState {
  return {
    nameAr: item.nameAr,
    symbol: item.symbol ?? "",
    decimalPlaces: item.decimalPlaces ?? 2,
    isBase: item.isBase ?? false,
    isActive: item.isActive,
  };
}

export function CurrenciesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("currencies.create");
  const canUpdate = hasPermission("currencies.update");
  const canDelete = hasPermission("currencies.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [baseFilter, setBaseFilter] = React.useState<"all" | "base" | "secondary">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState({
    active: "all" as "all" | "active" | "inactive",
    base: "all" as "all" | "base" | "secondary",
  });

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const currenciesQuery = useCurrenciesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    isBase: baseFilter === "all" ? undefined : baseFilter === "base",
  });

  const createMutation = useCreateCurrencyMutation();
  const updateMutation = useUpdateCurrencyMutation();
  const deleteMutation = useDeleteCurrencyMutation();

  const records = React.useMemo(() => currenciesQuery.data?.data ?? [], [currenciesQuery.data?.data]);
  const pagination = currenciesQuery.data?.pagination;
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

  const handleStartEdit = (item: CurrencyListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const nameAr = form.nameAr.trim();
    const symbol = form.symbol?.trim() ?? "";

    if (!nameAr || !symbol) {
      setFormError("الرجاء تعبئة الحقول المطلوبة: الاسم والرمز.");
      return false;
    }

    if (nameAr.length > 50) {
      setFormError("يجب ألا يتجاوز اسم العملة 50 حرفًا.");
      return false;
    }

    if (symbol.length > 5) {
      setFormError("يجب ألا يتجاوز رمز العملة 5 أحرف.");
      return false;
    }

    if (form.decimalPlaces < 0 || form.decimalPlaces > 6) {
      setFormError("عدد الخانات العشرية يجب أن يكون بين 0 و 6.");
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

    const payload: CreateCurrencyPayload = {
      nameAr: form.nameAr.trim(),
      symbol: form.symbol?.trim() || "",
      decimalPlaces: Number.isFinite(form.decimalPlaces) ? form.decimalPlaces : 2,
      isBase: form.isBase,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية التحديث: currencies.update.");
        return;
      }

      updateMutation.mutate(
        { currencyId: editingId, payload },
        {
          onSuccess: () => {
            resetFormState();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية الإضافة: currencies.create.");
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
            searchPlaceholder="بحث بالاسم..."
            filterCount={activeFiltersCount}
            onFilterClick={() => setIsFilterOpen((prev) => !prev)}
            showFilterButton={true}
          />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر العملات"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="flex-1 gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                مسح
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
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
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </SelectField>

            <SelectField
              value={filterDraft.base}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  base: event.target.value as "all" | "base" | "secondary",
                }))
              }
            >
              <option value="all">كل العملات</option>
              <option value="base">عملة الأساس</option>
              <option value="secondary">عملات ثانوية</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة العملات</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة العملات وربطها بعملة أساس والخانات العشرية.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currenciesQuery.isPending ? (
              <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
            ) : null}

            {currenciesQuery.error ? (
              <FinanceAlert tone="error">
                {currenciesQuery.error instanceof Error
                  ? currenciesQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </FinanceAlert>
            ) : null}

            {!currenciesQuery.isPending && records.length === 0 ? (
              <FinanceEmptyState>لا توجد عملات مطابقة.</FinanceEmptyState>
            ) : null}

            {records.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {item.nameAr}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الرمز: {item.symbol || "-"} · الدقة: {item.decimalPlaces}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.isBase ? (
                      <Badge variant="secondary" className="gap-1.5">
                        <Star className="h-3.5 w-3.5" />
                        عملة الأساس
                      </Badge>
                    ) : null}
                    <Badge variant={item.isActive ? "default" : "outline"} className="gap-1.5">
                      {item.isActive ? (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldX className="h-3.5 w-3.5" />
                      )}
                      {item.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
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
                      if (!confirmFinanceAction(`تأكيد حذف العملة ${item.nameAr}?`)) {
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
                  disabled={!pagination || pagination.page <= 1 || currenciesQuery.isFetching}
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
                    currenciesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void currenciesQuery.refetch()}
                  disabled={currenciesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${currenciesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إضافة عملة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل عملة" : "إضافة عملة"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التغييرات" : "إضافة عملة"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك صلاحية الإضافة: <code>currencies.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم *</label>
                <Input
                  value={form.nameAr}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nameAr: event.target.value }))
                  }
                  placeholder="ريال سعودي"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الرمز</label>
                <Input
                  value={form.symbol}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, symbol: event.target.value }))
                  }
                  placeholder="ر.س"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الخانات العشرية</label>
                <Input
                  type="number"
                  min={0}
                  max={6}
                  value={form.decimalPlaces}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      decimalPlaces: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  عملة الأساس
                </span>
                <input
                  type="checkbox"
                  checked={form.isBase}
                  onChange={(event) => setForm((prev) => ({ ...prev, isBase: event.target.checked }))}
                />
              </label>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  نشط
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
              </label>
            </div>

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
                  <Coins className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التغييرات" : "إضافة عملة"}
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

