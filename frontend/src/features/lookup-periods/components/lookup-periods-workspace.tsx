"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Clock3,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateLookupPeriodMutation,
  useDeleteLookupPeriodMutation,
  useUpdateLookupPeriodMutation,
} from "@/features/lookup-periods/hooks/use-lookup-periods-mutations";
import { useLookupPeriodsQuery } from "@/features/lookup-periods/hooks/use-lookup-periods-query";
import type { LookupPeriodListItem } from "@/lib/api/client";

type LookupPeriodFormState = {
  code: string;
  nameAr: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: LookupPeriodFormState = {
  code: "",
  nameAr: "",
  isActive: true,
};

function toFormState(item: LookupPeriodListItem): LookupPeriodFormState {
  return {
    code: item.code,
    nameAr: item.nameAr,
    isActive: item.isActive,
  };
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function LookupPeriodsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("lookup-periods.create");
  const canUpdate = hasPermission("lookup-periods.update");
  const canDelete = hasPermission("lookup-periods.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "active" | "inactive" | "deleted"
  >(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<
    "all" | "active" | "inactive" | "deleted"
  >(
    "all",
  );
  const [editingLookupPeriodId, setEditingLookupPeriodId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<LookupPeriodFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const lookupPeriodsQuery = useLookupPeriodsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive:
      activeFilter === "all" || activeFilter === "deleted"
        ? undefined
        : activeFilter === "active",
    deletedOnly: activeFilter === "deleted" ? true : undefined,
  });

  const createMutation = useCreateLookupPeriodMutation();
  const updateMutation = useUpdateLookupPeriodMutation();
  const deleteMutation = useDeleteLookupPeriodMutation();

  const lookupPeriods = React.useMemo(
    () => lookupPeriodsQuery.data?.data ?? [],
    [lookupPeriodsQuery.data?.data],
  );
  const pagination = lookupPeriodsQuery.data?.pagination;
  const isEditing = editingLookupPeriodId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = lookupPeriods.some((item) => item.id === editingLookupPeriodId);
    if (!stillExists) {
      setEditingLookupPeriodId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingLookupPeriodId, isEditing, lookupPeriods]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(activeFilter);
  }, [activeFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingLookupPeriodId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingLookupPeriodId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const nameAr = formState.nameAr.trim();

    if (!nameAr) {
      setFormError("الاسم بالعربية مطلوب.");
      return false;
    }

    if (nameAr.length > 100) {
      setFormError("الاسم بالعربية يجب ألا يتجاوز 100 حرف.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      nameAr: formState.nameAr.trim(),
      isActive: formState.isActive,
    };

    if (isEditing && editingLookupPeriodId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: lookup-periods.update.");
        return;
      }

      updateMutation.mutate(
        {
          lookupPeriodId: editingLookupPeriodId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: lookup-periods.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: LookupPeriodListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingLookupPeriodId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleDelete = (item: LookupPeriodListItem) => {
    if (!canDelete) {
      return;
    }

    if (item._count.timetableTemplateSlots > 0) {
      setFormError("لا يمكن حذف فترة مرتبطة بقوالب الجدول.");
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الفترة ${item.nameAr}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingLookupPeriodId === item.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [searchInput.trim() ? 1 : 0, activeFilter !== "all" ? 1 : 0].reduce(
      (a, b) => a + b,
      0,
    );
    return count;
  }, [activeFilter, searchInput]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث..."
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
          title="فلاتر البحث"
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
              value={filterDraft}
              onChange={(event) =>
                setFilterDraft(
                  event.target.value as "all" | "active" | "inactive" | "deleted",
                )
              }
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط فقط</option>
              <option value="inactive">غير نشط فقط</option>
              <option value="deleted">محذوف فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>الفترات</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة فترات الجدول الدراسي مع البحث والفلترة.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {lookupPeriodsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل الفترات...
              </div>
            ) : null}

            {lookupPeriodsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {lookupPeriodsQuery.error instanceof Error
                  ? lookupPeriodsQuery.error.message
                  : "فشل تحميل الفترات"}
              </div>
            ) : null}

            {!lookupPeriodsQuery.isPending && lookupPeriods.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {lookupPeriods.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                data-testid="period-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{item.nameAr}</p>
                    <p className="text-xs text-muted-foreground">
                      <code>{item.code}</code>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      عدد الربط في قوالب الجدول: {item._count.timetableTemplateSlots}
                    </p>
                  </div>
                  <Badge variant={item.isActive ? "default" : "outline"}>
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
                    onClick={() => handleDelete(item)}
                    disabled={
                      !canDelete ||
                      deleteMutation.isPending ||
                      item._count.timetableTemplateSlots > 0
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
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
                  disabled={!pagination || pagination.page <= 1 || lookupPeriodsQuery.isFetching}
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
                    lookupPeriodsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void lookupPeriodsQuery.refetch()}
                  disabled={lookupPeriodsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${lookupPeriodsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء فترة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل فترة" : "إنشاء فترة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء فترة"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>lookup-periods.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="period-form">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                الاسم بالعربية *
              </label>
              <Input
                value={formState.nameAr}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, nameAr: event.target.value }))
                }
                placeholder="صباحية"
                required
                data-testid="period-form-name-ar"
              />
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                data-testid="period-form-active"
              />
            </label>

            {formError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {formError}
              </div>
            ) : null}

            {mutationError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {mutationError}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
                data-testid="period-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء فترة"}
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
