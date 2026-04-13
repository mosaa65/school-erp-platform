"use client";

import * as React from "react";
import {
  Activity,
  GraduationCap,
  Hash,
  Layers,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  WalletCards,
} from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAlert,
  FinanceEmptyState,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import {
  useCreateFeeStructureMutation,
  useDeleteFeeStructureMutation,
  useUpdateFeeStructureMutation,
} from "@/features/fee-structures/hooks/use-fee-structures-mutations";
import { useFeeStructuresQuery } from "@/features/fee-structures/hooks/use-fee-structures-query";
import type { CreateFeeStructurePayload, FeeStructureListItem, FeeType } from "@/lib/api/client";

const PAGE_SIZE = 24;

const FEE_TYPE_LABELS: Record<FeeType, string> = {
  TUITION: "رسوم دراسية",
  TRANSPORT: "نقل",
  UNIFORM: "زي مدرسي",
  REGISTRATION: "تسجيل",
  ACTIVITY: "نشاط",
  PENALTY: "غرامة",
  OTHER: "أخرى",
};

function statusBadgeVariant(isActive: boolean): "default" | "outline" {
  return isActive ? "default" : "outline";
}

function statusLabel(isActive: boolean): string {
  return isActive ? "نشط" : "غير نشط";
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
}

type FormState = {
  academicYearId: string;
  gradeLevelId: string;
  feeType: FeeType;
  nameAr: string;
  amount: string;
  currencyId: string;
  vatRate: string;
  isActive: boolean;
};

const DEFAULT_FORM: FormState = {
  academicYearId: "",
  gradeLevelId: "",
  feeType: "TUITION",
  nameAr: "",
  amount: "",
  currencyId: "",
  vatRate: "",
  isActive: true,
};

function toFormState(item: FeeStructureListItem): FormState {
  return {
    academicYearId: item.academicYearId,
    gradeLevelId: item.gradeLevelId ?? "",
    feeType: item.feeType,
    nameAr: item.nameAr,
    amount: item.amount ? String(item.amount) : "",
    currencyId: item.currencyId ? String(item.currencyId) : "",
    vatRate: item.vatRate ? String(item.vatRate) : "",
    isActive: item.isActive,
  };
}

export function FeeStructuresWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("fee-structures.create");
  const canUpdate = hasPermission("fee-structures.update");
  const canDelete = hasPermission("fee-structures.delete");

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({
    academicYearId: "",
    gradeLevelId: "",
    feeType: "all" as "all" | FeeType,
    currencyId: "",
    isActive: "all" as "all" | "active" | "inactive",
  });
  const [filterDraft, setFilterDraft] = React.useState(filters);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const createMutation = useCreateFeeStructureMutation();
  const updateMutation = useUpdateFeeStructureMutation();
  const deleteMutation = useDeleteFeeStructureMutation();

  const feeStructuresQuery = useFeeStructuresQuery({
    page: 1,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: filters.academicYearId || undefined,
    gradeLevelId: filters.gradeLevelId || undefined,
    feeType: filters.feeType === "all" ? undefined : filters.feeType,
    currencyId: filters.currencyId ? Number(filters.currencyId) : undefined,
    isActive:
      filters.isActive === "all" ? undefined : filters.isActive === "active",
  });

  const structures = React.useMemo(
    () => feeStructuresQuery.data?.data ?? [],
    [feeStructuresQuery.data?.data],
  );
  const pagination = feeStructuresQuery.data?.pagination;

  useDebounceEffect(
    () => {
      setSearch(searchInput.trim());
    },
    350,
    [searchInput],
  );

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(filters);
  }, [filters, isFilterOpen]);

  const summary = React.useMemo(() => {
    const activeCount = structures.filter((item) => item.isActive).length;
    const inactiveCount = structures.filter((item) => !item.isActive).length;
    const totalAmount = structures.reduce(
      (total, item) => total + toNumber(item.amount),
      0,
    );

    return {
      totalCount: pagination?.total ?? structures.length,
      activeCount,
      inactiveCount,
      totalAmount,
    };
  }, [pagination?.total, structures]);

  const lastSyncedLabel = feeStructuresQuery.isFetching ? "جارٍ التحديث" : "محدث الآن";
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

    const stillExists = structures.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingId, isEditing, structures]);

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

  const handleStartEdit = (item: FeeStructureListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const academicYearId = form.academicYearId.trim();
    const nameAr = form.nameAr.trim();
    const amount = Number(form.amount);

    if (!academicYearId || !nameAr || Number.isNaN(amount)) {
      setFormError("يرجى تعبئة الحقول المطلوبة: السنة الأكاديمية، الاسم، والقيمة.");
      return false;
    }

    if (amount < 0) {
      setFormError("القيمة يجب أن تكون 0 أو أكثر.");
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

    const payload: CreateFeeStructurePayload = {
      academicYearId: form.academicYearId.trim(),
      gradeLevelId: form.gradeLevelId.trim() || undefined,
      feeType: form.feeType,
      nameAr: form.nameAr.trim(),
      amount: Number(form.amount),
      currencyId: form.currencyId.trim() ? Number(form.currencyId) : undefined,
      vatRate: form.vatRate.trim() ? Number(form.vatRate) : undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية التحديث: fee-structures.update.");
        return;
      }

      updateMutation.mutate(
        { feeStructureId: editingId, payload },
        {
          onSuccess: () => {
            resetFormState();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية الإضافة: fee-structures.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetFormState();
      },
    });
  };

  const applyFilters = () => {
    setFilters(filterDraft);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      academicYearId: "",
      gradeLevelId: "",
      feeType: "all",
      currencyId: "",
      isActive: "all",
    });
    setFilterDraft({
      academicYearId: "",
      gradeLevelId: "",
      feeType: "all",
      currencyId: "",
      isActive: "all",
    });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      filters.academicYearId ? 1 : 0,
      filters.gradeLevelId ? 1 : 0,
      filters.feeType !== "all" ? 1 : 0,
      filters.currencyId ? 1 : 0,
      filters.isActive !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [filters, searchInput]);

  return (
    <PageShell
      title="هياكل الرسوم"
      subtitle="لوحة تنظيم الرسوم حسب المرحلة والخدمات المساندة وجدولة الاستحقاق."
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void feeStructuresQuery.refetch()}
          disabled={feeStructuresQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
      }
    >
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-emerald-600" />
              ملخص الهياكل
            </CardTitle>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700">
              {lastSyncedLabel}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>إجمالي الهياكل: {summary.totalCount}</span>
            <span>النشطة: {summary.activeCount}</span>
            <span>غير النشطة: {summary.inactiveCount}</span>
            <span>إجمالي القيم: {summary.totalAmount.toLocaleString("ar-SA")} </span>
          </div>
        </CardHeader>
      </Card>

      <ManagementToolbar
        searchValue={searchInput}
        onSearchChange={(event) => setSearchInput(event.target.value)}
        searchPlaceholder="بحث بالاسم..."
        filterCount={activeFiltersCount}
        onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        searchWrapperClassName="max-w-md"
        actions={
          <Badge variant="secondary" className="h-10">
            النتائج: {pagination?.total ?? structures.length}
          </Badge>
        }
      />

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر هياكل الرسوم"
        actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="معرّف السنة الأكاديمية">
            <Input
              icon={<GraduationCap />}
              value={filterDraft.academicYearId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, academicYearId: event.target.value }))
              }
              placeholder="معرّف السنة الأكاديمية"
            />
          </FormField>
          <FormField label="معرّف المرحلة">
            <Input
              icon={<GraduationCap />}
              value={filterDraft.gradeLevelId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, gradeLevelId: event.target.value }))
              }
              placeholder="معرّف المرحلة"
            />
          </FormField>
          <FormField label="نوع الرسوم">
            <SelectField
              icon={<WalletCards />}
              value={filterDraft.feeType}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  feeType: event.target.value as "all" | FeeType,
                }))
              }
            >
              <option value="all">كل الأنواع</option>
              {Object.entries(FEE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="معرّف العملة">
            <Input
              icon={<Hash />}
              type="number"
              min="1"
              value={filterDraft.currencyId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, currencyId: event.target.value }))
              }
              placeholder="معرّف العملة"
            />
          </FormField>
          <FormField label="الحالة">
            <SelectField
              icon={<Activity />}
              value={filterDraft.isActive}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  isActive: event.target.value as "all" | "active" | "inactive",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </SelectField>
          </FormField>
        </div>
      </FilterDrawer>

      {feeStructuresQuery.isPending ? (
        <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
      ) : null}

      {feeStructuresQuery.error ? (
        <FinanceAlert tone="error">
          {feeStructuresQuery.error instanceof Error
            ? feeStructuresQuery.error.message
            : "تعذّر تحميل البيانات."}
        </FinanceAlert>
      ) : null}

      {!feeStructuresQuery.isPending && structures.length === 0 ? (
        <FinanceEmptyState>لا توجد هياكل رسوم مطابقة.</FinanceEmptyState>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {structures.map((item: FeeStructureListItem) => {
          const amount = toNumber(item.amount);
          const vatRate = toNumber(item.vatRate);
          const currencyLabel = item.currency?.code ?? "SAR";

          return (
          <Card key={item.id} className="border-border/70 bg-card/80">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{item.nameAr}</CardTitle>
                <Badge variant={statusBadgeVariant(item.isActive)}>
                  {statusLabel(item.isActive)}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>المرحلة: {item.gradeLevel?.name ?? "جميع المراحل"}</p>
                <p>نوع الرسوم: {FEE_TYPE_LABELS[item.feeType] ?? item.feeType}</p>
                <p>السنة الأكاديمية: {item.academicYear?.name ?? "غير محددة"}</p>
                <p>ضريبة القيمة: {vatRate.toLocaleString("ar-SA")}%</p>
              </div>
              <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm">
                <span className="text-muted-foreground">القيمة الأساسية</span>
                <span className="font-semibold text-emerald-700">
                  {amount.toLocaleString("ar-SA")} {currencyLabel}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="justify-start gap-2">
                <Layers className="h-4 w-4" />
                إدارة الشرائح الفرعية
              </Button>
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
                    if (!confirmFinanceAction(`تأكيد حذف هيكل الرسوم ${item.nameAr}?`)) {
                      return;
                    }
                    deleteMutation.mutate(item.id);
                  }}
                  disabled={!canDelete || deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </CardHeader>
          </Card>
          );
        })}
      </div>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إضافة"
        ariaLabel="إضافة هيكل رسوم"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل هيكل رسوم" : "إضافة هيكل رسوم"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التغييرات" : "إضافة هيكل"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك صلاحية الإضافة: <code>fee-structures.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <FormField label="السنة الأكاديمية" required>
              <Input
                icon={<GraduationCap />}
                value={form.academicYearId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
                placeholder="معرّف السنة الأكاديمية"
                required
              />
            </FormField>

            <FormField label="المرحلة">
              <Input
                icon={<GraduationCap />}
                value={form.gradeLevelId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, gradeLevelId: event.target.value }))
                }
                placeholder="معرّف المرحلة (اختياري)"
              />
            </FormField>

            <FormField label="نوع الرسوم" required>
              <SelectField
                icon={<WalletCards />}
                value={form.feeType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, feeType: event.target.value as FeeType }))
                }
                required
              >
                {Object.entries(FEE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="الاسم" required>
              <Input
                icon={<Type />}
                value={form.nameAr}
                onChange={(event) => setForm((prev) => ({ ...prev, nameAr: event.target.value }))}
                placeholder="اسم الهيكل"
                required
              />
            </FormField>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="القيمة" required>
                <Input
                  icon={<Hash />}
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  placeholder="0"
                  required
                />
              </FormField>
              <FormField label="العملة">
                <Input
                  icon={<Hash />}
                  type="number"
                  min="1"
                  value={form.currencyId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, currencyId: event.target.value }))
                  }
                  placeholder="معرّف العملة (اختياري)"
                />
              </FormField>
            </div>

            <FormField label="نسبة الضريبة (اختياري)">
              <Input
                icon={<Hash />}
                type="number"
                min="0"
                value={form.vatRate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vatRate: event.target.value }))
                }
                placeholder="0"
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
                  <WalletCards className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التغييرات" : "إضافة هيكل"}
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
    </PageShell>
  );
}
