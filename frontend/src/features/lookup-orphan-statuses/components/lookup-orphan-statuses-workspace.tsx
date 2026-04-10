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
import { SelectField } from "@/components/ui/select-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateLookupOrphanStatusMutation,
  useDeleteLookupOrphanStatusMutation,
  useUpdateLookupOrphanStatusMutation,
} from "@/features/lookup-orphan-statuses/hooks/use-lookup-orphan-statuses-mutations";
import { useLookupOrphanStatusesQuery } from "@/features/lookup-orphan-statuses/hooks/use-lookup-orphan-statuses-query";
import type { LookupOrphanStatusListItem } from "@/lib/api/client";

type LookupOrphanStatusFormState = {
  code: string;
  nameAr: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: LookupOrphanStatusFormState = {
  code: "",
  nameAr: "",
  isActive: true,
};

function toFormState(item: LookupOrphanStatusListItem): LookupOrphanStatusFormState {
  return {
    code: item.code,
    nameAr: item.nameAr,
    isActive: item.isActive,
  };
}

export function LookupOrphanStatusesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("lookup-orphan-statuses.create");
  const canUpdate = hasPermission("lookup-orphan-statuses.update");
  const canDelete = hasPermission("lookup-orphan-statuses.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "active" | "inactive" | "deleted"
  >("all");
  const [filterDraft, setFilterDraft] = React.useState<
    "all" | "active" | "inactive" | "deleted"
  >("all");
  const [editingLookupOrphanStatusId, setEditingLookupOrphanStatusId] = React.useState<
    number | null
  >(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<LookupOrphanStatusFormState>(
    DEFAULT_FORM_STATE,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const lookupOrphanStatusesQuery = useLookupOrphanStatusesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive:
      activeFilter === "all" || activeFilter === "deleted"
        ? undefined
        : activeFilter === "active",
    deletedOnly: activeFilter === "deleted" ? true : undefined,
  });

  const createMutation = useCreateLookupOrphanStatusMutation();
  const updateMutation = useUpdateLookupOrphanStatusMutation();
  const deleteMutation = useDeleteLookupOrphanStatusMutation();

  const lookupOrphanStatuses = React.useMemo(
    () => lookupOrphanStatusesQuery.data?.data ?? [],
    [lookupOrphanStatusesQuery.data?.data],
  );
  const pagination = lookupOrphanStatusesQuery.data?.pagination;
  const isEditing = editingLookupOrphanStatusId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = lookupOrphanStatuses.some(
      (item) => item.id === editingLookupOrphanStatusId,
    );
    if (!stillExists) {
      setEditingLookupOrphanStatusId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingLookupOrphanStatusId, isEditing, lookupOrphanStatuses]);

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

    setFilterDraft(activeFilter);
  }, [activeFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingLookupOrphanStatusId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;

    setFormError(null);
    setEditingLookupOrphanStatusId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const code = formState.code.trim();
    const nameAr = formState.nameAr.trim();

    if (!code) {
      setFormError("كود الحالة مطلوب.");
      return false;
    }

    if (code.length > 50) {
      setFormError("كود الحالة يجب ألا يتجاوز 50 حرفًا.");
      return false;
    }

    if (!nameAr) {
      setFormError("الاسم العربي مطلوب.");
      return false;
    }

    if (nameAr.length > 100) {
      setFormError("الاسم العربي يجب ألا يتجاوز 100 حرف.");
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
      code: formState.code.trim(),
      nameAr: formState.nameAr.trim(),
      isActive: formState.isActive,
    };

    if (isEditing && editingLookupOrphanStatusId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: lookup-orphan-statuses.update.");
        return;
      }

      updateMutation.mutate(
        {
          lookupOrphanStatusId: editingLookupOrphanStatusId,
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
      setFormError("لا تملك الصلاحية المطلوبة: lookup-orphan-statuses.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: LookupOrphanStatusListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingLookupOrphanStatusId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleDelete = (item: LookupOrphanStatusListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف حالة اليتم ${item.nameAr}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingLookupOrphanStatusId === item.id) {
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
    <PageShell title="حالات اليتم">
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
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
              <CardTitle>حالات اليتم</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة حالات اليتم مع البحث والفلترة.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {lookupOrphanStatusesQuery.isPending ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground text-center">
                جارٍ تحميل حالات اليتم...
              </div>
            ) : null}

            {lookupOrphanStatusesQuery.error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {lookupOrphanStatusesQuery.error instanceof Error
                  ? lookupOrphanStatusesQuery.error.message
                  : "فشل تحميل حالات اليتم"}
              </div>
            ) : null}

            {!lookupOrphanStatusesQuery.isPending && lookupOrphanStatuses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground text-center">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {lookupOrphanStatuses.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{item.nameAr}</p>
                    <p className="text-xs text-muted-foreground">الكود: {item.code}</p>
                  </div>
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
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
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                    !pagination || pagination.page <= 1 || lookupOrphanStatusesQuery.isFetching
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
                    lookupOrphanStatusesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void lookupOrphanStatusesQuery.refetch()}
                  disabled={lookupOrphanStatusesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${lookupOrphanStatusesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء حالة يتم"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        title={isEditing ? "تعديل حالة يتم" : "إنشاء حالة يتم"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إسناد حالة يتم"}
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmitForm}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">كود الحالة *</label>
              <Input
                value={formState.code}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder="مثال: ORPH-01"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الاسم بالعربية *</label>
              <Input
                value={formState.nameAr}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, nameAr: event.target.value }))
                }
                placeholder="مثال: يتم الأب"
              />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm">
            <span>نشط</span>
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </label>

          {formError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {formError}
            </div>
          ) : null}

          {mutationError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {mutationError}
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isFormSubmitting || (!canCreate && !isEditing)}
            >
              {isFormSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-4 w-4" />
              )}
              {isEditing ? "حفظ التعديلات" : "إسناد حالة يتم"}
            </Button>
            {isEditing ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                إلغاء
              </Button>
            ) : null}
          </div>
        </form>
      </CrudFormSheet>
    </PageShell>
  );
}
