"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BadgeCheck,
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
import { ManagementToolbar } from "@/components/ui/management-toolbar";
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
  useCreateLookupIdTypeMutation,
  useDeleteLookupIdTypeMutation,
  useUpdateLookupIdTypeMutation,
} from "@/features/lookup-id-types/hooks/use-lookup-id-types-mutations";
import { useLookupIdTypesQuery } from "@/features/lookup-id-types/hooks/use-lookup-id-types-query";
import type { LookupIdTypeListItem } from "@/lib/api/client";

type LookupIdTypeFormState = {
  code: string;
  nameAr: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: LookupIdTypeFormState = {
  code: "",
  nameAr: "",
  isActive: true,
};

function toFormState(item: LookupIdTypeListItem): LookupIdTypeFormState {
  return {
    code: item.code,
    nameAr: item.nameAr,
    isActive: item.isActive,
  };
}


export function LookupIdTypesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("lookup-id-types.create");
  const canUpdate = hasPermission("lookup-id-types.update");
  const canDelete = hasPermission("lookup-id-types.delete");

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
  const [editingLookupIdTypeId, setEditingLookupIdTypeId] = React.useState<number | null>(
    null,
  );
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<LookupIdTypeFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const lookupIdTypesQuery = useLookupIdTypesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive:
      activeFilter === "all" || activeFilter === "deleted"
        ? undefined
        : activeFilter === "active",
    deletedOnly: activeFilter === "deleted" ? true : undefined,
  });

  const createMutation = useCreateLookupIdTypeMutation();
  const updateMutation = useUpdateLookupIdTypeMutation();
  const deleteMutation = useDeleteLookupIdTypeMutation();

  const lookupIdTypes = React.useMemo(
    () => lookupIdTypesQuery.data?.data ?? [],
    [lookupIdTypesQuery.data?.data],
  );
  const pagination = lookupIdTypesQuery.data?.pagination;
  const isEditing = editingLookupIdTypeId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = lookupIdTypes.some((item) => item.id === editingLookupIdTypeId);
    if (!stillExists) {
      setEditingLookupIdTypeId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingLookupIdTypeId, isEditing, lookupIdTypes]);

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
    setEditingLookupIdTypeId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;

    setFormError(null);
    setEditingLookupIdTypeId(null);
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

    if (isEditing && editingLookupIdTypeId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: lookup-id-types.update.");
        return;
      }

      updateMutation.mutate(
        {
          lookupIdTypeId: editingLookupIdTypeId,
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
      setFormError("لا تملك الصلاحية المطلوبة: lookup-id-types.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: LookupIdTypeListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingLookupIdTypeId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleDelete = (item: LookupIdTypeListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف نوع الهوية ${item.nameAr}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingLookupIdTypeId === item.id) {
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
                  <ManagementToolbar
            searchValue={searchInput}
            onSearchChange={(event) => setSearchInput(event.target.value)}
            searchPlaceholder="بحث..."
            filterCount={activeFiltersCount}
            onFilterClick={() => setIsFilterOpen((prev) => !prev)}
            showFilterButton={true}
          />

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
              <CardTitle>أنواع الهوية</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة أنواع الهوية مع البحث والفلترة.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {lookupIdTypesQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل أنواع الهوية...
              </div>
            ) : null}

            {lookupIdTypesQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {lookupIdTypesQuery.error instanceof Error
                  ? lookupIdTypesQuery.error.message
                  : "فشل تحميل أنواع الهوية"}
              </div>
            ) : null}

            {!lookupIdTypesQuery.isPending && lookupIdTypes.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {lookupIdTypes.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                data-testid="id-type-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{item.nameAr}</p>
                    <p className="text-xs text-muted-foreground">{item.code}</p>
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
                صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || lookupIdTypesQuery.isFetching}
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
                    !pagination || pagination.page >= pagination.totalPages || lookupIdTypesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void lookupIdTypesQuery.refetch()}
                  disabled={lookupIdTypesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${lookupIdTypesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء نوع هوية"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل نوع هوية" : "إنشاء نوع هوية"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء نوع هوية"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>lookup-id-types.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="id-type-form">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الاسم بالعربية *</label>
              <Input
                value={formState.nameAr}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, nameAr: event.target.value }))
                }
                placeholder="جواز سفر"
                required
                data-testid="id-type-form-name-ar"
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
                data-testid="id-type-form-active"
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
                data-testid="id-type-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء نوع هوية"}
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
