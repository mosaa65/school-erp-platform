"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Building2,
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
  useCreateLookupOwnershipTypeMutation,
  useDeleteLookupOwnershipTypeMutation,
  useUpdateLookupOwnershipTypeMutation,
} from "@/features/lookup-ownership-types/hooks/use-lookup-ownership-types-mutations";
import { useLookupOwnershipTypesQuery } from "@/features/lookup-ownership-types/hooks/use-lookup-ownership-types-query";
import type { LookupOwnershipTypeListItem } from "@/lib/api/client";

type LookupOwnershipTypeFormState = {
  code: string;
  nameAr: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: LookupOwnershipTypeFormState = {
  code: "",
  nameAr: "",
  isActive: true,
};

function toFormState(item: LookupOwnershipTypeListItem): LookupOwnershipTypeFormState {
  return {
    code: item.code,
    nameAr: item.nameAr,
    isActive: item.isActive,
  };
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function LookupOwnershipTypesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("lookup-ownership-types.create");
  const canUpdate = hasPermission("lookup-ownership-types.update");
  const canDelete = hasPermission("lookup-ownership-types.delete");

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
  const [editingLookupOwnershipTypeId, setEditingLookupOwnershipTypeId] = React.useState<
    number | null
  >(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<LookupOwnershipTypeFormState>(
    DEFAULT_FORM_STATE,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const lookupOwnershipTypesQuery = useLookupOwnershipTypesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive:
      activeFilter === "all" || activeFilter === "deleted"
        ? undefined
        : activeFilter === "active",
    deletedOnly: activeFilter === "deleted" ? true : undefined,
  });

  const createMutation = useCreateLookupOwnershipTypeMutation();
  const updateMutation = useUpdateLookupOwnershipTypeMutation();
  const deleteMutation = useDeleteLookupOwnershipTypeMutation();

  const lookupOwnershipTypes = React.useMemo(
    () => lookupOwnershipTypesQuery.data?.data ?? [],
    [lookupOwnershipTypesQuery.data?.data],
  );
  const pagination = lookupOwnershipTypesQuery.data?.pagination;
  const isEditing = editingLookupOwnershipTypeId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = lookupOwnershipTypes.some(
      (item) => item.id === editingLookupOwnershipTypeId,
    );
    if (!stillExists) {
      setEditingLookupOwnershipTypeId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingLookupOwnershipTypeId, isEditing, lookupOwnershipTypes]);

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
    setEditingLookupOwnershipTypeId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;

    setFormError(null);
    setEditingLookupOwnershipTypeId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const code = normalizeCode(formState.code);
    const nameAr = formState.nameAr.trim();

    if (!code || !nameAr) {
      setFormError("الحقول المطلوبة: الكود والاسم بالعربية.");
      return false;
    }

    if (!/^[A-Z0-9_]+$/.test(code) || code.length > 50) {
      setFormError("الكود يجب أن يحتوي أحرفًا كبيرة/أرقامًا/underscore فقط وبحد أقصى 50.");
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
      code: normalizeCode(formState.code),
      nameAr: formState.nameAr.trim(),
      isActive: formState.isActive,
    };

    if (isEditing && editingLookupOwnershipTypeId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: lookup-ownership-types.update.");
        return;
      }

      updateMutation.mutate(
        {
          lookupOwnershipTypeId: editingLookupOwnershipTypeId,
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
      setFormError("لا تملك الصلاحية المطلوبة: lookup-ownership-types.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: LookupOwnershipTypeListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingLookupOwnershipTypeId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleDelete = (item: LookupOwnershipTypeListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف نوع الملكية ${item.nameAr}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingLookupOwnershipTypeId === item.id) {
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
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] max-w-lg">
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
              <CardTitle>أنواع الملكية</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة أنواع الملكية مع البحث والفلترة.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {lookupOwnershipTypesQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل أنواع الملكية...
              </div>
            ) : null}

            {lookupOwnershipTypesQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {lookupOwnershipTypesQuery.error instanceof Error
                  ? lookupOwnershipTypesQuery.error.message
                  : "فشل تحميل أنواع الملكية"}
              </div>
            ) : null}

            {!lookupOwnershipTypesQuery.isPending && lookupOwnershipTypes.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {lookupOwnershipTypes.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                data-testid="ownership-card"
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
                  disabled={
                    !pagination || pagination.page <= 1 || lookupOwnershipTypesQuery.isFetching
                  }
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
                    lookupOwnershipTypesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void lookupOwnershipTypesQuery.refetch()}
                  disabled={lookupOwnershipTypesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${lookupOwnershipTypesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء نوع ملكية"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل نوع ملكية" : "إنشاء نوع ملكية"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء نوع ملكية"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>lookup-ownership-types.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="ownership-form">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الكود *</label>
              <Input
                value={formState.code}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder="PRIVATE"
                required
                data-testid="ownership-form-code"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الاسم بالعربية *</label>
              <Input
                value={formState.nameAr}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, nameAr: event.target.value }))
                }
                placeholder="ملكية خاصة"
                required
                data-testid="ownership-form-name-ar"
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
                data-testid="ownership-form-active"
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
                data-testid="ownership-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء نوع ملكية"}
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
