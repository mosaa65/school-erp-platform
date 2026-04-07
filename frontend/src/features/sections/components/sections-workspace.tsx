"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building,
  DoorOpen,
  GraduationCap,
  Layers2,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Shuffle,
  Trash2,
  Type,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateSectionMutation,
  useDeleteSectionMutation,
  useUpdateSectionMutation,
} from "@/features/sections/hooks/use-sections-mutations";
import { useBuildingOptionsQuery } from "@/features/sections/hooks/use-building-options-query";
import { useSectionsQuery } from "@/features/sections/hooks/use-sections-query";
import { useGradeLevelOptionsQuery } from "@/features/sections/hooks/use-grade-level-options-query";
import type { SectionListItem } from "@/lib/api/client";

type SectionFormState = {
  gradeLevelId: string;
  buildingLookupId: string;
  code: string;
  name: string;
  capacity: string;
  roomLabel: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: SectionFormState = {
  gradeLevelId: "",
  buildingLookupId: "",
  code: "",
  name: "",
  capacity: "",
  roomLabel: "",
  isActive: true,
};


function toFormState(section: SectionListItem): SectionFormState {
  return {
    gradeLevelId: section.gradeLevelId,
    buildingLookupId: section.buildingLookupId === null ? "" : String(section.buildingLookupId),
    code: section.code,
    name: section.name,
    capacity: section.capacity === null ? "" : String(section.capacity),
    roomLabel: section.roomLabel ?? "",
    isActive: section.isActive,
  };
}

function translateStage(stage: string): string {
  const labels: Record<string, string> = {
    KINDERGARTEN: "رياض الأطفال",
    PRIMARY: "ابتدائي",
    MIDDLE: "إعدادي/متوسط",
    SECONDARY: "ثانوي",
  };

  return labels[stage] ?? stage;
}

export function SectionsWorkspace() {
  const router = useRouter();
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("sections.create");
  const canUpdate = hasPermission("sections.update");
  const canDelete = hasPermission("sections.delete");
  const canReadGradeLevels = hasPermission("grade-levels.read");
  const canReadBuildings = hasPermission("lookup-buildings.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [gradeLevelFilter, setGradeLevelFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    gradeLevel: string;
    active: "all" | "active" | "inactive";
  }>({
    gradeLevel: "all",
    active: "all",
  });

  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<SectionFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const sectionsQuery = useSectionsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    gradeLevelId: gradeLevelFilter === "all" ? undefined : gradeLevelFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const gradeLevelOptionsQuery = useGradeLevelOptionsQuery();
  const buildingOptionsQuery = useBuildingOptionsQuery();

  const createMutation = useCreateSectionMutation();
  const updateMutation = useUpdateSectionMutation();
  const deleteMutation = useDeleteSectionMutation();

  const sections = React.useMemo(() => sectionsQuery.data?.data ?? [], [sectionsQuery.data?.data]);
  const pagination = sectionsQuery.data?.pagination;
  const gradeLevelOptions = React.useMemo(
    () => gradeLevelOptionsQuery.data ?? [],
    [gradeLevelOptionsQuery.data],
  );
  const buildingOptions = React.useMemo(
    () => buildingOptionsQuery.data ?? [],
    [buildingOptionsQuery.data],
  );
  const isEditing = editingSectionId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = sections.some((section) => section.id === editingSectionId);
    if (!stillExists) {
      setEditingSectionId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingSectionId, isEditing, sections]);

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      gradeLevel: gradeLevelFilter,
      active: activeFilter,
    });
  }, [activeFilter, gradeLevelFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingSectionId(null);
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
    setEditingSectionId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const name = formState.name.trim();

    if (!formState.gradeLevelId || !name) {
      setFormError("الحقول الأساسية مطلوبة: المرحلة الدراسية والاسم.");
      return false;
    }

    if (formState.capacity.trim()) {
      const capacity = Number(formState.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
        setFormError("السعة يجب أن تكون رقمًا صحيحًا بين 1 و 1000.");
        return false;
      }
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
      gradeLevelId: formState.gradeLevelId,
      buildingLookupId: formState.buildingLookupId ? Number(formState.buildingLookupId) : undefined,
      name: formState.name.trim(),
      capacity: formState.capacity.trim() ? Number(formState.capacity) : undefined,
      roomLabel: formState.roomLabel.trim() || undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingSectionId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: sections.update.");
        return;
      }

      updateMutation.mutate(
        {
          sectionId: editingSectionId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث الشعبة بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: sections.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء الشعبة بنجاح.");
      },
    });
  };

  const handleStartEdit = (section: SectionListItem) => {
    if (!canUpdate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingSectionId(section.id);
    setFormState(toFormState(section));
    setIsFormOpen(true);
  };

  const handleDelete = (section: SectionListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الشعبة ${section.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(section.id, {
      onSuccess: () => {
        if (editingSectionId === section.id) {
          resetForm();
        }
        setActionSuccess("تم حذف الشعبة بنجاح.");
      },
    });
  };

  const openSectionClassroomAssignments = (section: SectionListItem) => {
    const params = new URLSearchParams({
      sectionId: section.id,
      gradeLevelId: section.gradeLevelId,
      mode: "create",
    });

    router.push(`/app/section-classroom-assignments?${params.toString()}`);
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setGradeLevelFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setGradeLevelFilter(filterDraft.gradeLevel);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, gradeLevelFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0].reduce(
      (acc, value) => acc + value,
      0,
    );
  }, [activeFilter, gradeLevelFilter, searchInput]);

  return (
    <>
      <div className="space-y-4">
        {actionSuccess ? (
          <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            {actionSuccess}
          </div>
        ) : null}

        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث باسم الشعبة أو الصف..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفلترة"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>الصف الدراسي</Label>
              <SelectField
                value={filterDraft.gradeLevel}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    gradeLevel: event.target.value,
                  }))
                }
                disabled={!canReadGradeLevels}
                icon={<GraduationCap className="h-4 w-4" />}
              >
                <option value="all">كل الصفوف</option>
                {gradeLevelOptions.map((gradeLevel) => (
                  <option key={gradeLevel.id} value={gradeLevel.id}>
                    {gradeLevel.code}
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
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة الشعب</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة الشعب وربطها بالصفوف مع بحث موحد وفلاتر واضحة للحالة والصف.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {sectionsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {sectionsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {sectionsQuery.error instanceof Error
                  ? sectionsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {!sectionsQuery.isPending && sections.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد شعب مطابقة.
              </div>
            ) : null}

            {sections.map((section) => (
              <div
                key={section.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{section.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <code>{section.code}</code>
                      {section.capacity !== null ? ` - السعة: ${section.capacity}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الصف: {section.gradeLevel.name} ({section.gradeLevel.code})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الموقع:
                      {" "}
                      {section.building
                        ? `المبنى ${section.building.nameAr}${section.roomLabel ? ` | الغرفة ${section.roomLabel}` : ""}`
                        : section.roomLabel
                          ? `الغرفة ${section.roomLabel}`
                          : "غير محدد بعد"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{translateStage(section.gradeLevel.stage)}</Badge>
                    <Badge variant={section.isActive ? "default" : "outline"}>
                      {section.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openSectionClassroomAssignments(section)}
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    ربط الغرف
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(section)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(section)}
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
                  disabled={!pagination || pagination.page <= 1 || sectionsQuery.isFetching}
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
                    sectionsQuery.isFetching
                  }
                >
                  التالي
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void sectionsQuery.refetch()}
                  disabled={sectionsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${sectionsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء شعبة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل شعبة" : "إنشاء شعبة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء شعبة"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>sections.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1">
              <Label required>الصف/المرحلة</Label>
              <SelectField
                value={formState.gradeLevelId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    gradeLevelId: event.target.value,
                  }))
                }
                disabled={!canReadGradeLevels}
                icon={<GraduationCap className="h-4 w-4" />}
                required
              >
                <option value="">اختر المستوى الدراسي</option>
                {gradeLevelOptions.map((gradeLevel) => (
                  <option key={gradeLevel.id} value={gradeLevel.id}>
                    {gradeLevel.name} ({gradeLevel.code})
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>السعة</Label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={formState.capacity}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, capacity: event.target.value }))
                  }
                  placeholder="30"
                  icon={<Users className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>المبنى</Label>
                <SelectField
                  value={formState.buildingLookupId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      buildingLookupId: event.target.value,
                    }))
                  }
                  disabled={!canReadBuildings}
                  icon={<Building className="h-4 w-4" />}
                >
                  <option value="">بدون ربط بمبنى الآن</option>
                  {buildingOptions.map((building) => (
                    <option key={building.id} value={String(building.id)}>
                      {building.nameAr ?? building.name ?? building.code ?? `مبنى ${building.id}`}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-1">
                <Label>الغرفة/الفصل</Label>
                <Input
                  value={formState.roomLabel}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, roomLabel: event.target.value }))
                  }
                  placeholder="مثال: A-101"
                  icon={<DoorOpen className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label required>الاسم</Label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="الشعبة أ"
                icon={<Type className="h-4 w-4" />}
                required
              />
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

            {!canReadGradeLevels ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                يتطلب هذا الجزء الصلاحية: <code>grade-levels.read</code> لاختيار الصف.
              </div>
            ) : null}

            {!canReadBuildings ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                ربط الشعبة بمبنى اختياري في هذه المرحلة، ويتطلب الصلاحية:
                {" "}
                <code>lookup-buildings.read</code>.
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={
                  isFormSubmitting || (!canCreate && !isEditing) || !canReadGradeLevels
                }
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Layers2 className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء شعبة"}
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
