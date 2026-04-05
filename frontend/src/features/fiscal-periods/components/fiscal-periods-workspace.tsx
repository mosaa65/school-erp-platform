"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarDays,
  LoaderCircle,
  Lock,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
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
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAlert,
  FinanceEmptyState,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import {
  useCreateFiscalPeriodMutation,
  useDeleteFiscalPeriodMutation,
  useUpdateFiscalPeriodMutation,
} from "@/features/fiscal-periods/hooks/use-fiscal-periods-mutations";
import { useFiscalPeriodsQuery } from "@/features/fiscal-periods/hooks/use-fiscal-periods-query";
import { useFiscalYearsQuery } from "@/features/fiscal-years/hooks/use-fiscal-years-query";
import type { CreateFiscalPeriodPayload, FiscalPeriodListItem } from "@/lib/api/client";

const PAGE_SIZE = 12;

type FormState = CreateFiscalPeriodPayload;

type FiscalPeriodStatusValue = "OPEN" | "CLOSING" | "CLOSED" | "REOPENED";
type FiscalPeriodTypeValue = "MONTHLY" | "QUARTERLY" | "CUSTOM";

const DEFAULT_FORM: FormState = {
  fiscalYearId: 0,
  periodNumber: 1,
  nameAr: "",
  periodType: "MONTHLY",
  startDate: "",
  endDate: "",
  status: "OPEN",
  closeNotes: "",
  reopenReason: "",
  reopenDeadline: "",
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

function toUtcEndIso(dateInput: string): string {
  return `${dateInput}T23:59:59.999Z`;
}

function toFormState(item: FiscalPeriodListItem): FormState {
  return {
    fiscalYearId: item.fiscalYearId,
    periodNumber: item.periodNumber,
    nameAr: item.nameAr,
    periodType: item.periodType,
    startDate: formatDateInput(item.startDate),
    endDate: formatDateInput(item.endDate),
    status: item.status,
    closeNotes: item.closeNotes ?? "",
    reopenReason: item.reopenReason ?? "",
    reopenDeadline: item.reopenDeadline ?? "",
    isActive: item.isActive,
  };
}

function statusLabel(status: string) {
  switch (status) {
    case "OPEN":
      return "مفتوحة";
    case "CLOSING":
      return "قيد الإغلاق";
    case "CLOSED":
      return "مغلقة";
    case "REOPENED":
      return "أعيد فتحها";
    default:
      return status;
  }
}

export function FiscalPeriodsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("fiscal-periods.create");
  const canUpdate = hasPermission("fiscal-periods.update");
  const canDelete = hasPermission("fiscal-periods.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FiscalPeriodStatusValue | "all">(
    "all",
  );
  const [yearFilter, setYearFilter] = React.useState<number | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    status: "all" as FiscalPeriodStatusValue | "all",
    fiscalYearId: "all" as number | "all",
  });

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const fiscalYearsQuery = useFiscalYearsQuery({ page: 1, limit: 200 });
  const fiscalYears = fiscalYearsQuery.data?.data ?? [];

  const fiscalPeriodsQuery = useFiscalPeriodsQuery({
    page,
    limit: PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
    fiscalYearId: yearFilter === "all" ? undefined : yearFilter,
  });

  const createMutation = useCreateFiscalPeriodMutation();
  const updateMutation = useUpdateFiscalPeriodMutation();
  const deleteMutation = useDeleteFiscalPeriodMutation();

  const records = React.useMemo(
    () => fiscalPeriodsQuery.data?.data ?? [],
    [fiscalPeriodsQuery.data?.data],
  );
  const filteredRecords = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return records;
    }

    return records.filter((item) => {
      const name = item.nameAr?.toLowerCase() ?? "";
      const period = String(item.periodNumber);
      const yearName = item.fiscalYear?.nameAr?.toLowerCase() ?? "";
      return (
        name.includes(query) ||
        period.includes(query) ||
        yearName.includes(query)
      );
    });
  }, [records, search]);
  const pagination = fiscalPeriodsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  const fiscalYearLookup = React.useMemo(() => {
    return new Map(fiscalYears.map((year) => [year.id, year]));
  }, [fiscalYears]);

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
      status: statusFilter,
      fiscalYearId: yearFilter,
    });
  }, [isFilterOpen, statusFilter, yearFilter]);

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

  const handleStartEdit = (item: FiscalPeriodListItem) => {
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

    if (
      !form.fiscalYearId ||
      !form.periodNumber ||
      !nameAr ||
      !form.startDate ||
      !form.endDate
    ) {
      setFormError("الرجاء تعبئة الحقول المطلوبة.");
      return false;
    }

    if (form.periodNumber < 1) {
      setFormError("رقم الفترة يجب أن يكون 1 أو أكثر.");
      return false;
    }

    const start = new Date(toUtcStartIso(form.startDate));
    const end = new Date(toUtcEndIso(form.endDate));

    if (start >= end) {
      setFormError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
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

    const payload: CreateFiscalPeriodPayload = {
      fiscalYearId: form.fiscalYearId,
      periodNumber: form.periodNumber,
      nameAr: form.nameAr.trim(),
      periodType: form.periodType,
      startDate: toUtcStartIso(form.startDate),
      endDate: toUtcEndIso(form.endDate),
      status: form.status,
      closeNotes: form.closeNotes?.trim() || undefined,
      reopenReason: form.reopenReason?.trim() || undefined,
      reopenDeadline: form.reopenDeadline
        ? toUtcStartIso(form.reopenDeadline)
        : undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: fiscal-periods.update.");
        return;
      }

      updateMutation.mutate(
        { fiscalPeriodId: editingId, payload },
        {
          onSuccess: () => {
            resetFormState();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: fiscal-periods.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetFormState();
        setPage(1);
      },
    });
  };

  const handleDelete = (item: FiscalPeriodListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = confirmFinanceAction(`تأكيد حذف الفترة المالية ${item.nameAr}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingId === item.id) {
          resetForm();
        }
      },
    });
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setYearFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setStatusFilter(filterDraft.status);
    setYearFilter(filterDraft.fiscalYearId);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [searchInput, statusFilter, yearFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0 sm:min-w-[240px] max-w-lg">
          <SearchField
            containerClassName="flex-1"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="بحث بالاسم أو رقم الفترة..."
          />
          </div>
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
          title="فلاتر الفترات المالية"
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
              value={filterDraft.status}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  status: event.target.value as FiscalPeriodStatusValue | "all",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="OPEN">مفتوحة</option>
              <option value="CLOSING">قيد الإغلاق</option>
              <option value="CLOSED">مغلقة</option>
              <option value="REOPENED">أعيد فتحها</option>
            </SelectField>

            <SelectField
              value={filterDraft.fiscalYearId}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  fiscalYearId:
                    event.target.value === "all"
                      ? "all"
                      : Number(event.target.value),
                }))
              }
            >
              <option value="all">كل السنوات المالية</option>
              {fiscalYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.nameAr}
                </option>
              ))}
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة الفترات المالية</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة الفترات المالية وربطها بالسنة المالية والحالة.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {fiscalPeriodsQuery.isPending ? (
              <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
            ) : null}

            {fiscalPeriodsQuery.error ? (
              <FinanceAlert tone="error">
                {fiscalPeriodsQuery.error instanceof Error
                  ? fiscalPeriodsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </FinanceAlert>
            ) : null}

            {!fiscalPeriodsQuery.isPending && filteredRecords.length === 0 ? (
              <FinanceEmptyState>لا توجد فترات مطابقة.</FinanceEmptyState>
            ) : null}

            {filteredRecords.map((item) => {
              const year = fiscalYearLookup.get(item.fiscalYearId);
              return (
                <div
                  key={item.id}
                  className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{item.nameAr}</p>
                      <p className="text-xs text-muted-foreground">
                        الفترة #{item.periodNumber} · النوع: {item.periodType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {year?.nameAr ?? "سنة غير معروفة"} · {new Date(
                          item.startDate,
                        ).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={item.status === "OPEN" ? "default" : "outline"}>
                        {statusLabel(item.status)}
                      </Badge>
                      <Badge variant={item.isActive ? "secondary" : "outline"} className="gap-1.5">
                        {item.isActive ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {item.isActive ? "نشطة" : "غير نشطة"}
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
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || fiscalPeriodsQuery.isFetching}
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
                    fiscalPeriodsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void fiscalPeriodsQuery.refetch()}
                  disabled={fiscalPeriodsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${fiscalPeriodsQuery.isFetching ? "animate-spin" : ""}`}
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
        label="إنشاء"
        ariaLabel="إنشاء فترة مالية"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل فترة مالية" : "إنشاء فترة مالية"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء فترة مالية"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>fiscal-periods.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">رقم الفترة *</label>
                <Input
                  type="number"
                  min={1}
                  value={form.periodNumber}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      periodNumber: Number(event.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم *</label>
                <Input
                  value={form.nameAr}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nameAr: event.target.value }))
                  }
                  placeholder="الفترة الأولى"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">السنة المالية *</label>
                <SelectField
                  value={form.fiscalYearId || ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      fiscalYearId: Number(event.target.value),
                    }))
                  }
                >
                  <option value="">اختر السنة المالية</option>
                  {fiscalYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.nameAr}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">نوع الفترة</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.periodType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      periodType: event.target.value as FiscalPeriodTypeValue,
                    }))
                  }
                >
                  <option value="MONTHLY">شهرية</option>
                  <option value="QUARTERLY">ربع سنوية</option>
                  <option value="CUSTOM">مخصصة</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  تاريخ البداية *
                </label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">تاريخ النهاية *</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الحالة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      status: event.target.value as FiscalPeriodStatusValue,
                    }))
                  }
                >
                  <option value="OPEN">مفتوحة</option>
                  <option value="CLOSING">قيد الإغلاق</option>
                  <option value="CLOSED">مغلقة</option>
                  <option value="REOPENED">أعيد فتحها</option>
                </select>
              </div>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Unlock className="h-4 w-4" />
                  نشطة
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">ملاحظات الإغلاق</label>
                <Input
                  value={form.closeNotes ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, closeNotes: event.target.value }))
                  }
                  placeholder="ملاحظات الإغلاق"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  سبب إعادة الفتح
                </label>
                <Input
                  value={form.reopenReason ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, reopenReason: event.target.value }))
                  }
                  placeholder="سبب إعادة الفتح"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                مهلة إعادة الفتح
              </label>
              <Input
                type="date"
                value={form.reopenDeadline ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, reopenDeadline: event.target.value }))
                }
              />
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
                  <CalendarDays className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء فترة مالية"}
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
