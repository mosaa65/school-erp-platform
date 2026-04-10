"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarDays,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
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
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAlert,
  FinanceEmptyState,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import {
  useCreateFiscalYearMutation,
  useDeleteFiscalYearMutation,
  useUpdateFiscalYearMutation,
} from "@/features/fiscal-years/hooks/use-fiscal-years-mutations";
import { useFiscalYearsQuery } from "@/features/fiscal-years/hooks/use-fiscal-years-query";
import type { CreateFiscalYearPayload, FiscalYearListItem } from "@/lib/api/client";

type FormState = CreateFiscalYearPayload;

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  nameAr: "",
  startDate: "",
  endDate: "",
  academicYearId: "",
  isClosed: false,
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

function toFormState(item: FiscalYearListItem): FormState {
  return {
    nameAr: item.nameAr,
    startDate: formatDateInput(item.startDate),
    endDate: formatDateInput(item.endDate),
    academicYearId: item.academicYearId ?? "",
    isClosed: item.isClosed,
    isActive: item.isActive,
  };
}

export function FiscalYearsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("fiscal-years.create");
  const canUpdate = hasPermission("fiscal-years.update");
  const canDelete = hasPermission("fiscal-years.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [closedFilter, setClosedFilter] = React.useState<"all" | "closed" | "open">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    closed: "all" as "all" | "closed" | "open",
    active: "all" as "all" | "active" | "inactive",
  });

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const fiscalYearsQuery = useFiscalYearsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isClosed: closedFilter === "all" ? undefined : closedFilter === "closed",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateFiscalYearMutation();
  const updateMutation = useUpdateFiscalYearMutation();
  const deleteMutation = useDeleteFiscalYearMutation();

  const records = React.useMemo(
    () => fiscalYearsQuery.data?.data ?? [],
    [fiscalYearsQuery.data?.data],
  );
  const pagination = fiscalYearsQuery.data?.pagination;
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
      closed: closedFilter,
      active: activeFilter,
    });
  }, [activeFilter, closedFilter, isFilterOpen]);

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

  const handleStartEdit = (item: FiscalYearListItem) => {
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

    if (!nameAr || !form.startDate || !form.endDate) {
      setFormError("الرجاء تعبئة الحقول المطلوبة: الاسم والتواريخ.");
      return false;
    }

    if (nameAr.length > 50) {
      setFormError("يجب ألا يتجاوز اسم السنة المالية 50 حرفًا.");
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

    const payload: CreateFiscalYearPayload = {
      nameAr: form.nameAr.trim(),
      startDate: toUtcStartIso(form.startDate),
      endDate: toUtcEndIso(form.endDate),
      academicYearId: form.academicYearId?.trim() || undefined,
      isClosed: form.isClosed ?? false,
      isActive: form.isActive ?? true,
    };

    if (isEditing && editingId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: fiscal-years.update.");
        return;
      }

      updateMutation.mutate(
        { fiscalYearId: editingId, payload },
        {
          onSuccess: () => {
            resetFormState();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: fiscal-years.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetFormState();
        setPage(1);
      },
    });
  };

  const handleDelete = (item: FiscalYearListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = confirmFinanceAction(`تأكيد حذف السنة المالية ${item.nameAr}؟`);
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
    setClosedFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setClosedFilter(filterDraft.closed);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      closedFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, closedFilter, searchInput]);

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
          title="فلاتر السنوات المالية"
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
              value={filterDraft.closed}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  closed: event.target.value as "all" | "closed" | "open",
                }))
              }
            >
              <option value="all">كل حالات الإغلاق</option>
              <option value="open">مفتوحة</option>
              <option value="closed">مغلقة</option>
            </SelectField>

            <SelectField
              value={filterDraft.active}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  active: event.target.value as "all" | "active" | "inactive",
                }))
              }
            >
              <option value="all">كل حالات التفعيل</option>
              <option value="active">نشطة</option>
              <option value="inactive">غير نشطة</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة السنوات المالية</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة السنوات المالية مع فلترة بالبحث والحالة وكونها الحالية.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {fiscalYearsQuery.isPending ? (
              <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
            ) : null}

            {fiscalYearsQuery.error ? (
              <FinanceAlert tone="error">
                {fiscalYearsQuery.error instanceof Error
                  ? fiscalYearsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </FinanceAlert>
            ) : null}

            {!fiscalYearsQuery.isPending && records.length === 0 ? (
              <FinanceEmptyState>لا توجد سنوات مطابقة.</FinanceEmptyState>
            ) : null}

            {records.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{item.nameAr}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.startDate).toLocaleDateString()} -{" "}
                    {new Date(item.endDate).toLocaleDateString()}
                  </p>
                  {item.academicYear ? (
                    <p className="text-xs text-muted-foreground">
                      العام الأكاديمي: {item.academicYear.name}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.isClosed ? "outline" : "secondary"}>
                    {item.isClosed ? "مغلقة" : "مفتوحة"}
                  </Badge>
                  <Badge variant={item.isActive ? "default" : "outline"}>
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
                  disabled={!pagination || pagination.page <= 1 || fiscalYearsQuery.isFetching}
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
                    fiscalYearsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void fiscalYearsQuery.refetch()}
                  disabled={fiscalYearsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${fiscalYearsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء سنة مالية"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل سنة مالية" : "إنشاء سنة مالية"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء سنة مالية"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>fiscal-years.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الاسم *</label>
              <Input
                value={form.nameAr}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, nameAr: event.target.value }))
                }
                placeholder="السنة المالية 2026"
                required
              />
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                معرف السنة الأكاديمية (اختياري)
              </label>
              <Input
                value={form.academicYearId ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
                placeholder="cmabc123year"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>مغلقة</span>
                <input
                  type="checkbox"
                  checked={form.isClosed ?? false}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isClosed: event.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>نشطة</span>
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
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
                  <CalendarDays className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء سنة مالية"}
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
