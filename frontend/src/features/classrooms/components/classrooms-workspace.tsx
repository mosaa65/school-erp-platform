"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { useRouter } from "next/navigation";
import {
  Building,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
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
import { useBuildingOptionsQuery } from "@/features/sections/hooks/use-building-options-query";
import {
  useCreateClassroomMutation,
  useDeleteClassroomMutation,
  useUpdateClassroomMutation,
} from "@/features/classrooms/hooks/use-classrooms-mutations";
import { useClassroomsQuery } from "@/features/classrooms/hooks/use-classrooms-query";
import type { ClassroomListItem } from "@/lib/api/client";

type ClassroomFormState = {
  buildingLookupId: string;
  code: string;
  name: string;
  capacity: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: ClassroomFormState = {
  buildingLookupId: "",
  code: "",
  name: "",
  capacity: "",
  notes: "",
  isActive: true,
};


function toFormState(classroom: ClassroomListItem): ClassroomFormState {
  return {
    buildingLookupId:
      classroom.buildingLookupId === null ? "" : String(classroom.buildingLookupId),
    code: classroom.code,
    name: classroom.name,
    capacity: classroom.capacity === null ? "" : String(classroom.capacity),
    notes: classroom.notes ?? "",
    isActive: classroom.isActive,
  };
}

function formatBuildingName(classroom: ClassroomListItem): string {
  if (!classroom.building) {
    return "بدون مبنى";
  }

  return classroom.building.nameAr || classroom.building.code || `مبنى ${classroom.building.id}`;
}

export function ClassroomsWorkspace() {
  const router = useRouter();
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("classrooms.create");
  const canUpdate = hasPermission("classrooms.update");
  const canDelete = hasPermission("classrooms.delete");
  const canReadBuildings = hasPermission("lookup-buildings.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [buildingFilter, setBuildingFilter] = React.useState<string>("all");
  const [filterDraft, setFilterDraft] = React.useState<{
    active: "all" | "active" | "inactive";
    buildingLookupId: string;
  }>({ active: "all", buildingLookupId: "all" });
  const [editingClassroomId, setEditingClassroomId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<ClassroomFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const classroomsQuery = useClassroomsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    buildingLookupId:
      buildingFilter === "all" ? undefined : Number(buildingFilter),
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const buildingsQuery = useBuildingOptionsQuery("classrooms");
  const buildings = React.useMemo(() => buildingsQuery.data ?? [], [buildingsQuery.data]);

  const classrooms = React.useMemo(() => classroomsQuery.data?.data ?? [], [classroomsQuery.data?.data]);
  const pagination = classroomsQuery.data?.pagination;
  const isEditing = editingClassroomId !== null;

  const createMutation = useCreateClassroomMutation();
  const updateMutation = useUpdateClassroomMutation();
  const deleteMutation = useDeleteClassroomMutation();

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = classrooms.some((classroom) => classroom.id === editingClassroomId);
    if (!stillExists) {
      setEditingClassroomId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [classrooms, editingClassroomId, isEditing]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      active: activeFilter,
      buildingLookupId: buildingFilter,
    });
  }, [activeFilter, buildingFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingClassroomId(null);
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
    setEditingClassroomId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const name = formState.name.trim();

    if (!name) {
      setFormError("الاسم حقل مطلوب.");
      return false;
    }

    if (formState.capacity.trim()) {
      const capacity = Number(formState.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
        setFormError("السعة يجب أن تكون رقمًا صحيحًا بين 1 و 1000.");
        return false;
      }
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
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

    const commonPayload = {
      name: formState.name.trim(),
      capacity: formState.capacity.trim() ? Number(formState.capacity) : undefined,
      notes: formState.notes.trim() || undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingClassroomId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: classrooms.update.");
        return;
      }

      updateMutation.mutate(
        {
          classroomId: editingClassroomId,
          payload: {
            ...commonPayload,
            buildingLookupId: formState.buildingLookupId
              ? Number(formState.buildingLookupId)
              : null,
          },
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث الفصل بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: classrooms.create.");
      return;
    }

    createMutation.mutate(
      {
        ...commonPayload,
        ...(formState.buildingLookupId
          ? { buildingLookupId: Number(formState.buildingLookupId) }
          : {}),
      },
      {
        onSuccess: () => {
          resetForm();
          setPage(1);
          setActionSuccess("تم إنشاء الفصل بنجاح.");
        },
      },
    );
  };

  const handleStartEdit = (classroom: ClassroomListItem) => {
    if (!canUpdate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingClassroomId(classroom.id);
    setFormState(toFormState(classroom));
    setIsFormOpen(true);
  };

  const handleToggleActive = (classroom: ClassroomListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate(
      {
        classroomId: classroom.id,
        payload: {
          isActive: !classroom.isActive,
        },
      },
      {
        onSuccess: () => {
          setActionSuccess(
            classroom.isActive ? "تم تعطيل الفصل بنجاح." : "تم تفعيل الفصل بنجاح.",
          );
        },
      },
    );
  };

  const handleDelete = (classroom: ClassroomListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الفصل ${classroom.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(classroom.id, {
      onSuccess: () => {
        if (editingClassroomId === classroom.id) {
          resetForm();
        }
        setActionSuccess("تم حذف الفصل بنجاح.");
      },
    });
  };

  const openClassroomAssignments = (classroom: ClassroomListItem) => {
    const params = new URLSearchParams({
      classroomId: classroom.id,
    });

    router.push(`/app/section-classroom-assignments?${params.toString()}`);
  };

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft.active);
    setBuildingFilter(filterDraft.buildingLookupId);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setBuildingFilter("all");
    setFilterDraft({ active: "all", buildingLookupId: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(
    () =>
      [
        searchInput.trim() ? 1 : 0,
        activeFilter !== "all" ? 1 : 0,
        buildingFilter !== "all" ? 1 : 0,
      ].reduce((acc, value) => acc + value, 0),
    [activeFilter, buildingFilter, searchInput],
  );

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="space-y-4">
        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفلترة"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          {canReadBuildings ? (
            <div className="space-y-1">
              <Label>المبنى</Label>
              <SelectField
                value={filterDraft.buildingLookupId}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    buildingLookupId: event.target.value,
                  }))
                }
                icon={<Building className="h-4 w-4" />}
              >
                <option value="all">كل المباني</option>
                {buildings.map((building) => (
                  <option key={building.id} value={String(building.id)}>
                    {building.nameAr ??
                      building.name ??
                      building.code ??
                      `مبنى ${building.id}`}
                  </option>
                ))}
              </SelectField>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              فلتر المبنى متاح فقط عند وجود صلاحية{" "}
              <code>lookup-buildings.read</code>.
            </div>
          )}

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
              icon={<LoaderCircle className="h-4 w-4" />}
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث بالاسم أو المبنى..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>الفصول / الغرف</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة الفصول/الغرف ككيان مستقل مع دعم المبنى والسعة والملاحظات والحالة.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {actionSuccess ? (
              <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                {actionSuccess}
              </div>
            ) : null}

            {mutationError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {mutationError}
              </div>
            ) : null}

            {classroomsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل الفصول...
              </div>
            ) : null}

            {classroomsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {classroomsQuery.error instanceof Error
                  ? classroomsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {!classroomsQuery.isPending && classrooms.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد فصول مطابقة.
              </div>
            ) : null}

            {classrooms.map((classroom) => (
              <div
                key={classroom.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{classroom.name}</p>
                      {classroom.building ? (
                        <Badge variant="outline">
                          {formatBuildingName(classroom)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">بدون مبنى</Badge>
                      )}
                      <Badge variant="secondary">
                        الروابط النشطة: {classroom.activeAssignmentsCount}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <code>{classroom.code}</code>
                      {classroom.capacity !== null ? ` - السعة: ${classroom.capacity}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      المبنى: {formatBuildingName(classroom)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الملاحظات: {classroom.notes ?? "-"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={classroom.isActive ? "default" : "outline"}>
                      {classroom.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openClassroomAssignments(classroom)}
                  >
                    الروابط
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(classroom)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(classroom)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    {classroom.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(classroom)}
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
                  disabled={!pagination || pagination.page <= 1 || classroomsQuery.isFetching}
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
                    classroomsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void classroomsQuery.refetch()}
                  disabled={classroomsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${classroomsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء فصل"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل فصل" : "إنشاء فصل"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء فصل"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>classrooms.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
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
                <option value="">بدون مبنى</option>
                {buildings.map((building) => (
                  <option key={building.id} value={String(building.id)}>
                    {building.nameAr ??
                      building.name ??
                      building.code ??
                      `مبنى ${building.id}`}
                  </option>
                ))}
              </SelectField>
              {!canReadBuildings ? (
                <p className="text-[11px] text-muted-foreground">
                  ربط الفصل بالمبنى يحتاج صلاحية <code>lookup-buildings.read</code>.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label required>الاسم</Label>
                <Input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="الفصل A1"
                  icon={<Building className="h-4 w-4" />}
                  required
                />
              </div>
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
                    setFormState((prev) => ({
                      ...prev,
                      capacity: event.target.value,
                    }))
                  }
                  placeholder="30"
                  icon={<Plus className="h-4 w-4" />}
                />
              </div>
              <div className="space-y-1">
                <Label>الملاحظات</Label>
                <Input
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="قريب من المختبر"
                  icon={<PencilLine className="h-4 w-4" />}
                />
              </div>
            </div>

            {formState.buildingLookupId ? (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                تم ربط الفصل بمبنى محدد، وهذا سيساعد شاشة توزيع الشعب والاقتراحات
                الذكية.
              </div>
            ) : null}

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

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Building className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء فصل"}
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
