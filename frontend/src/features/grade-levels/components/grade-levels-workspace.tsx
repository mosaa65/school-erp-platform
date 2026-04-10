"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Layers3,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Hash,
  BookOpen,
  Activity,
  ListOrdered,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateGradeLevelMutation,
  useDeleteGradeLevelMutation,
  useUpdateGradeLevelMutation,
} from "@/features/grade-levels/hooks/use-grade-levels-mutations";
import { useGradeLevelsQuery } from "@/features/grade-levels/hooks/use-grade-levels-query";
import type { GradeLevelListItem, GradeStage } from "@/lib/api/client";

type GradeLevelFormState = {
  code: string;
  name: string;
  stage: GradeStage;
  sequence: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: GradeLevelFormState = {
  code: "",
  name: "",
  stage: "PRIMARY",
  sequence: "1",
  isActive: true,
};

const STAGE_OPTIONS: GradeStage[] = [
  "PRE_SCHOOL",
  "PRIMARY",
  "MIDDLE",
  "HIGH",
  "OTHER",
];

const STAGE_LABELS: Record<GradeStage, string> = {
  PRE_SCHOOL: "ما قبل المدرسة",
  PRIMARY: "ابتدائي",
  MIDDLE: "إعدادي",
  HIGH: "ثانوي",
  OTHER: "أخرى",
};


function toFormState(gradeLevel: GradeLevelListItem): GradeLevelFormState {
  return {
    code: gradeLevel.code,
    name: gradeLevel.name,
    stage: gradeLevel.stage,
    sequence: String(gradeLevel.sequence),
    isActive: gradeLevel.isActive,
  };
}

function stageBadgeVariant(
  stage: GradeStage,
): "default" | "secondary" | "outline" {
  switch (stage) {
    case "PRIMARY":
      return "default";
    case "PRE_SCHOOL":
    case "MIDDLE":
      return "secondary";
    default:
      return "outline";
  }
}

export function GradeLevelsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grade-levels.create");
  const canUpdate = hasPermission("grade-levels.update");
  const canDelete = hasPermission("grade-levels.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<GradeStage | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    stage: GradeStage | "all";
    active: "all" | "active" | "inactive";
  }>({
    stage: "all",
    active: "all",
  });

  const [editingGradeLevelId, setEditingGradeLevelId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<GradeLevelFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const gradeLevelsQuery = useGradeLevelsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    stage: stageFilter === "all" ? undefined : stageFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateGradeLevelMutation();
  const updateMutation = useUpdateGradeLevelMutation();
  const deleteMutation = useDeleteGradeLevelMutation();

  const gradeLevels = React.useMemo(
    () => gradeLevelsQuery.data?.data ?? [],
    [gradeLevelsQuery.data?.data],
  );
  const pagination = gradeLevelsQuery.data?.pagination;
  const isEditing = editingGradeLevelId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = gradeLevels.some(
      (gradeLevel) => gradeLevel.id === editingGradeLevelId,
    );

    if (!stillExists) {
      setEditingGradeLevelId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingGradeLevelId, gradeLevels, isEditing]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      stage: stageFilter,
      active: activeFilter,
    });
  }, [activeFilter, isFilterOpen, stageFilter]);

  const resetForm = () => {
    setEditingGradeLevelId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingGradeLevelId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const name = formState.name.trim();
    const sequence = Number(formState.sequence);

    if (!name) {
      setFormError("الحقول الأساسية مطلوبة: الاسم.");
      return false;
    }

    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 1000) {
      setFormError("الترتيب يجب أن يكون رقمًا صحيحًا بين 1 و 1000.");
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
      name: formState.name.trim(),
      stage: formState.stage,
      sequence: Number(formState.sequence),
      isActive: formState.isActive,
    };

    if (isEditing && editingGradeLevelId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: grade-levels.update.");
        return;
      }

      updateMutation.mutate(
        {
          gradeLevelId: editingGradeLevelId,
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
      setFormError("لا تملك الصلاحية المطلوبة: grade-levels.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (gradeLevel: GradeLevelListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingGradeLevelId(gradeLevel.id);
    setFormState(toFormState(gradeLevel));
    setIsFormOpen(true);
  };

  const handleDelete = (gradeLevel: GradeLevelListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الصف/المرحلة ${gradeLevel.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(gradeLevel.id, {
      onSuccess: () => {
        if (editingGradeLevelId === gradeLevel.id) {
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
    setStageFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setStageFilter(filterDraft.stage);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      stageFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, searchInput, stageFilter]);

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
          title="فلاتر المراحل والصفوف"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>المرحلة التدريسية</Label>
              <SelectField
                value={filterDraft.stage}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    stage: event.target.value as GradeStage | "all",
                  }))
                }
                icon={<Layers3 className="h-4 w-4" />}
              >
                <option value="all">كل المراحل</option>
                {STAGE_OPTIONS.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>الحالة</Label>
              <SelectField
                value={filterDraft.active}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    active: event.target.value as "all" | "active" | "inactive",
                  }))
                }
                icon={<Activity className="h-4 w-4" />}
              >
                <option value="all">كل الحالات</option>
                <option value="active">النشطة فقط</option>
                <option value="inactive">غير النشطة فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة المراحل/الصفوف</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة المراحل/الصفوف مع الفلترة بالبحث والمرحلة والحالة.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {gradeLevelsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {gradeLevelsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {gradeLevelsQuery.error instanceof Error
                  ? gradeLevelsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {!gradeLevelsQuery.isPending && gradeLevels.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد مراحل/صفوف مطابقة.
              </div>
            ) : null}

            {gradeLevels.map((gradeLevel) => (
              <div
                key={gradeLevel.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{gradeLevel.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <code>{gradeLevel.code}</code>
                      </span>
                      <span className="flex items-center gap-1">
                        <ListOrdered className="h-3 w-3" />
                        الترتيب: {gradeLevel.sequence}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      الشعب: {gradeLevel.sections.length}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={stageBadgeVariant(gradeLevel.stage)}>
                      {STAGE_LABELS[gradeLevel.stage]}
                    </Badge>
                    <Badge variant={gradeLevel.isActive ? "default" : "outline"}>
                      {gradeLevel.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                {gradeLevel.sections.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {gradeLevel.sections.slice(0, 4).map((section) => (
                      <Badge key={section.id} variant="outline" className="text-[10px] h-5">
                        {section.code}
                      </Badge>
                    ))}
                    {gradeLevel.sections.length > 4 ? (
                      <Badge variant="outline" className="text-[10px] h-5">+{gradeLevel.sections.length - 4}</Badge>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(gradeLevel)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(gradeLevel)}
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
                  disabled={!pagination || pagination.page <= 1 || gradeLevelsQuery.isFetching}
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
                    gradeLevelsQuery.isFetching
                  }
                >
                  التالي
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void gradeLevelsQuery.refetch()}
                  disabled={gradeLevelsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${gradeLevelsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء مرحلة أو صف"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل مرحلة/صف" : "إنشاء مرحلة/صف"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء مرحلة/صف"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>grade-levels.create</code>.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmitForm}>
            <div className="space-y-1">
              <Label required>الاسم</Label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="الصف الأول"
                icon={<BookOpen className="h-4 w-4" />}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label required>المرحلة</Label>
                <SelectField
                  value={formState.stage}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      stage: event.target.value as GradeStage,
                    }))
                  }
                  icon={<Layers3 className="h-4 w-4" />}
                >
                  {STAGE_OPTIONS.map((stage) => (
                    <option key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-1">
                <Label required>الترتيب</Label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={formState.sequence}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, sequence: event.target.value }))
                  }
                  icon={<ListOrdered className="h-4 w-4" />}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>الحالة</Label>
              <SelectField
                value={formState.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    isActive: event.target.value === "active",
                  }))
                }
                icon={<Activity className="h-4 w-4" />}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </SelectField>
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

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Layers3 className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء مرحلة/صف"}
              </button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm} className="rounded-2xl">
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

