"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BookOpenText,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Type,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { Fab } from "@/components/ui/fab";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useUpdateSubjectMutation,
} from "@/features/subjects/hooks/use-subjects-mutations";
import { useSubjectsQuery } from "@/features/subjects/hooks/use-subjects-query";
import type { SubjectCategory, SubjectListItem } from "@/lib/api/client";

type SubjectFormState = {
  code: string;
  name: string;
  shortName: string;
  category: SubjectCategory;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const CATEGORY_OPTIONS: SubjectCategory[] = [
  "CORE",
  "ELECTIVE",
  "LANGUAGE",
  "SCIENCE",
  "MATHEMATICS",
  "HUMANITIES",
  "ARTS",
  "SPORTS",
  "TECHNOLOGY",
  "OTHER",
];

const DEFAULT_FORM_STATE: SubjectFormState = {
  code: "",
  name: "",
  shortName: "",
  category: "CORE",
  isActive: true,
};


function toFormState(subject: SubjectListItem): SubjectFormState {
  return {
    code: subject.code,
    name: subject.name,
    shortName: subject.shortName ?? "",
    category: subject.category,
    isActive: subject.isActive,
  };
}

function categoryBadgeVariant(
  category: SubjectCategory,
): "default" | "secondary" | "outline" {
  switch (category) {
    case "CORE":
    case "MATHEMATICS":
      return "default";
    case "SCIENCE":
    case "LANGUAGE":
      return "secondary";
    default:
      return "outline";
  }
}

function categoryLabel(category: SubjectCategory): string {
  switch (category) {
    case "CORE":
      return "أساسية";
    case "ELECTIVE":
      return "اختيارية";
    case "LANGUAGE":
      return "لغات";
    case "SCIENCE":
      return "علوم";
    case "MATHEMATICS":
      return "رياضيات";
    case "HUMANITIES":
      return "إنسانيات";
    case "ARTS":
      return "فنون";
    case "SPORTS":
      return "رياضة";
    case "TECHNOLOGY":
      return "تقنية";
    case "OTHER":
      return "أخرى";
    default:
      return category;
  }
}

export function SubjectsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("subjects.create");
  const canUpdate = hasPermission("subjects.update");
  const canDelete = hasPermission("subjects.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<SubjectCategory | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    category: SubjectCategory | "all";
    active: "all" | "active" | "inactive";
  }>({
    category: "all",
    active: "all",
  });

  const [editingSubjectId, setEditingSubjectId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<SubjectFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const subjectsQuery = useSubjectsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateSubjectMutation();
  const updateMutation = useUpdateSubjectMutation();
  const deleteMutation = useDeleteSubjectMutation();

  const subjects = React.useMemo(() => subjectsQuery.data?.data ?? [], [subjectsQuery.data?.data]);
  const pagination = subjectsQuery.data?.pagination;
  const isEditing = editingSubjectId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = subjects.some((subject) => subject.id === editingSubjectId);
    if (!stillExists) {
      setEditingSubjectId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingSubjectId, isEditing, subjects]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      category: categoryFilter,
      active: activeFilter,
    });
  }, [activeFilter, categoryFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingSubjectId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingSubjectId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const name = formState.name.trim();

    if (!name) {
      setFormError("الحقول الأساسية مطلوبة: الاسم.");
      return false;
    }

    if (name.length > 120) {
      setFormError("الاسم يجب ألا يتجاوز 120 حرفًا.");
      return false;
    }

    if (formState.shortName.trim().length > 50) {
      setFormError("الاسم المختصر يجب ألا يتجاوز 50 حرفًا.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formState.name.trim(),
      shortName: formState.shortName.trim() || undefined,
      category: formState.category,
      isActive: formState.isActive,
    };

    if (isEditing && editingSubjectId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: subjects.update.");
        return;
      }

      updateMutation.mutate(
        {
          subjectId: editingSubjectId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث المادة بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: subjects.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء المادة بنجاح.");
      },
    });
  };

  const handleStartEdit = (subject: SubjectListItem) => {
    if (!canUpdate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingSubjectId(subject.id);
    setFormState(toFormState(subject));
    setIsFormOpen(true);
  };

  const handleDelete = (subject: SubjectListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف المادة ${subject.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(subject.id, {
      onSuccess: () => {
        if (editingSubjectId === subject.id) {
          resetForm();
        }
        setActionSuccess("تم حذف المادة بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setCategoryFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setCategoryFilter(filterDraft.category);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, categoryFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0].reduce(
      (acc, value) => acc + value,
      0,
    );
  }, [activeFilter, categoryFilter, searchInput]);

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالاسم أو الاختصار..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        {actionSuccess ? (
          <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            {actionSuccess}
          </div>
        ) : null}

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر المواد"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="التصنيف">
              <SelectField
                icon={<BookOpenText />}
                value={filterDraft.category}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    category: event.target.value as SubjectCategory | "all",
                  }))
                }
              >
                <option value="all">كل التصنيفات</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel(category)}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="الحالة">
              <SelectField
                icon={<BookOpenText />}
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
              <CardTitle>قائمة المواد</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة المواد مع بحث موحد وفلاتر واضحة للتصنيف والحالة.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {subjectsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {subjectsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {subjectsQuery.error instanceof Error
                  ? subjectsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {!subjectsQuery.isPending && subjects.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد مواد مطابقة.
              </div>
            ) : null}

            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <code>{subject.code}</code>
                      {subject.shortName ? ` - ${subject.shortName}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={categoryBadgeVariant(subject.category)}>
                      {categoryLabel(subject.category)}
                    </Badge>
                    <Badge variant={subject.isActive ? "default" : "outline"}>
                      {subject.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(subject)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(subject)}
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
                  disabled={!pagination || pagination.page <= 1 || subjectsQuery.isFetching}
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
                    subjectsQuery.isFetching
                  }
                >
                  التالي
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void subjectsQuery.refetch()}
                  disabled={subjectsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${subjectsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء مادة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل مادة" : "إنشاء مادة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء مادة"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>subjects.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <FormField label="الاسم" required>
              <Input
                icon={<Type />}
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="الرياضيات"
                required
              />
            </FormField>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="الاسم المختصر">
                <Input
                  icon={<Type />}
                  value={formState.shortName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, shortName: event.target.value }))
                  }
                  placeholder="MATH"
                />
              </FormField>

              <FormField label="التصنيف" required>
                <SelectField
                  icon={<BookOpenText />}
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      category: event.target.value as SubjectCategory,
                    }))
                  }
                  required
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabel(category)}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <FormBooleanField
              label="نشط"
              checked={formState.isActive}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, isActive: checked }))
              }
            />

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
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpenText className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء مادة"}
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
