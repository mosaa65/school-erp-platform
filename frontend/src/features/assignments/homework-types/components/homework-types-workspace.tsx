"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Activity,
  BookOpenText,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Fab } from "@/components/ui/fab";
import { generateAutoCode } from "@/lib/auto-code";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateHomeworkTypeMutation,
  useDeleteHomeworkTypeMutation,
  useUpdateHomeworkTypeMutation,
} from "@/features/assignments/homework-types/hooks/use-homework-types-mutations";
import { useHomeworkTypesQuery } from "@/features/assignments/homework-types/hooks/use-homework-types-query";
import type { HomeworkTypeListItem } from "@/lib/api/client";

type HomeworkTypeFormState = {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: HomeworkTypeFormState = {
  code: "",
  name: "",
  description: "",
  isSystem: false,
  isActive: true,
};

function createNewHomeworkTypeFormState(): HomeworkTypeFormState {
  return {
    ...DEFAULT_FORM_STATE,
    code: generateAutoCode("HOMEWORK", 40),
  };
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(item: HomeworkTypeListItem): HomeworkTypeFormState {
  return {
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    isSystem: item.isSystem,
    isActive: item.isActive,
  };
}


export function HomeworkTypesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("homework-types.create");
  const canUpdate = hasPermission("homework-types.update");
  const canDelete = hasPermission("homework-types.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [systemFilter, setSystemFilter] = React.useState<"all" | "system" | "custom">(
    "all",
  );
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    system: "all" | "system" | "custom";
    active: "all" | "active" | "inactive";
  }>({
    system: "all",
    active: "all",
  });

  const [editingHomeworkTypeId, setEditingHomeworkTypeId] = React.useState<string | null>(
    null,
  );
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<HomeworkTypeFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const homeworkTypesQuery = useHomeworkTypesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isSystem:
      systemFilter === "all" ? undefined : systemFilter === "system",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateHomeworkTypeMutation();
  const updateMutation = useUpdateHomeworkTypeMutation();
  const deleteMutation = useDeleteHomeworkTypeMutation();

  const homeworkTypes = React.useMemo(
    () => homeworkTypesQuery.data?.data ?? [],
    [homeworkTypesQuery.data?.data],
  );
  const pagination = homeworkTypesQuery.data?.pagination;
  const isEditing = editingHomeworkTypeId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = homeworkTypes.some((item) => item.id === editingHomeworkTypeId);
    if (!stillExists) {
      setEditingHomeworkTypeId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingHomeworkTypeId, homeworkTypes, isEditing]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      system: systemFilter,
      active: activeFilter,
    });
  }, [activeFilter, isFilterOpen, systemFilter]);

  const resetFormState = () => {
    setEditingHomeworkTypeId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
    setActionSuccess(null);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingHomeworkTypeId(null);
    setFormState(createNewHomeworkTypeFormState());
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: HomeworkTypeListItem) => {
    if (!canUpdate) {
      return;
    }

    if (item.isSystem) {
      setFormError("هذا نوع واجب نظامي. التعديل عليه محجوب من الواجهة.");
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingHomeworkTypeId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const name = formState.name.trim();

    if (!name) {
      setFormError("الاسم مطلوب.");
      return false;
    }

    if (name.length > 120) {
      setFormError("الاسم يجب ألا يتجاوز 120 حرفًا.");
      return false;
    }

    if (formState.description.trim().length > 255) {
      setFormError("الوصف يجب ألا يتجاوز 255 حرفًا.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formState.name.trim(),
      description: toOptionalString(formState.description),
      isSystem: formState.isSystem,
      isActive: formState.isActive,
    };

    if (isEditing && editingHomeworkTypeId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: homework-types.update.");
        return;
      }

      updateMutation.mutate(
        {
          homeworkTypeId: editingHomeworkTypeId,
          payload,
        },
        {
          onSuccess: () => {
            resetFormState();
            setActionSuccess("تم تحديث نوع الواجب بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: homework-types.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetFormState();
        setPage(1);
        setActionSuccess("تم إنشاء نوع الواجب بنجاح.");
      },
    });
  };

  const handleDelete = (item: HomeworkTypeListItem) => {
    if (!canDelete) {
      return;
    }

    if (item.isSystem) {
      setFormError("لا يمكن حذف نوع واجب نظامي من الواجهة.");
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف نوع الواجب ${item.code}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingHomeworkTypeId === item.id) {
          resetForm();
        }
        setActionSuccess("تم حذف نوع الواجب بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setSystemFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setSystemFilter(filterDraft.system);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      systemFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [activeFilter, searchInput, systemFilter]);

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالاسم..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر أنواع الواجبات"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="نوع السجل">
              <SelectField
                icon={<ShieldAlert />}
                value={filterDraft.system}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    system: event.target.value as "all" | "system" | "custom",
                  }))
                }
              >
                <option value="all">كل الأنواع</option>
                <option value="system">النظامية فقط</option>
                <option value="custom">المخصصة فقط</option>
              </SelectField>
            </FormField>

            <FormField label="الحالة">
              <SelectField
                icon={<Activity />}
                value={filterDraft.active}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    active: event.target.value as "all" | "active" | "inactive",
                  }))
                }
              >
                <option value="all">كل الحالات</option>
                <option value="active">النشطة فقط</option>
                <option value="inactive">غير النشطة فقط</option>
              </SelectField>
            </FormField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>أنواع الواجبات</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة أنواع الواجبات مع حماية الأنواع النظامية.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
          {homeworkTypesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {homeworkTypesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {homeworkTypesQuery.error instanceof Error
                ? homeworkTypesQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!homeworkTypesQuery.isPending && homeworkTypes.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {homeworkTypes.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.name} (<code>{item.code}</code>)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.description ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    عدد الواجبات المرتبطة: {item._count.homeworks}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {item.isSystem ? (
                    <Badge variant="outline" className="gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      نظامي
                    </Badge>
                  ) : (
                    <Badge variant="secondary">مخصص</Badge>
                  )}
                  <Badge variant={item.isActive ? "default" : "outline"}>
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
                  disabled={!canUpdate || item.isSystem || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(item)}
                  disabled={!canDelete || item.isSystem || deleteMutation.isPending}
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
                disabled={!pagination || pagination.page <= 1 || homeworkTypesQuery.isFetching}
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
                  homeworkTypesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void homeworkTypesQuery.refetch()}
                disabled={homeworkTypesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${homeworkTypesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء نوع واجب"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل نوع واجب" : "إنشاء نوع واجب"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء نوع واجب"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>homework-types.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <FormField label="الاسم" required>
              <Input
                icon={<BookOpenText />}
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="واجب منزلي"
                required
              />
            </FormField>

            <FormField label="الوصف">
              <TextareaField
                icon={<BookOpenText />}
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="واجب منزلي قياسي"
                rows={3}
              />
            </FormField>

            <div className="grid gap-2 md:grid-cols-2">
              <FormBooleanField
                label="نوع نظامي"
                checked={formState.isSystem}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isSystem: checked }))
                }
              />
              <FormBooleanField
                label="نشط"
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

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
            {actionSuccess ? (
              <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                {actionSuccess}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpenText className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء نوع واجب"}
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






