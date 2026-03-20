"use client";

import * as React from "react";
import { Building, LoaderCircle, PencilLine, Plus, RefreshCw, Trash2 } from "lucide-react";
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
  useCreateClassroomMutation,
  useDeleteClassroomMutation,
  useUpdateClassroomMutation,
} from "@/features/classrooms/hooks/use-classrooms-mutations";
import { useClassroomsQuery } from "@/features/classrooms/hooks/use-classrooms-query";
import type { ClassroomListItem } from "@/lib/api/client";

type ClassroomFormState = {
  code: string;
  name: string;
  capacity: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: ClassroomFormState = {
  code: "",
  name: "",
  capacity: "",
  notes: "",
  isActive: true,
};

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

function toFormState(classroom: ClassroomListItem): ClassroomFormState {
  return {
    code: classroom.code,
    name: classroom.name,
    capacity: classroom.capacity === null ? "" : String(classroom.capacity),
    notes: classroom.notes ?? "",
    isActive: classroom.isActive,
  };
}

export function ClassroomsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("classrooms.create");
  const canUpdate = hasPermission("classrooms.update");
  const canDelete = hasPermission("classrooms.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<{
    active: "all" | "active" | "inactive";
  }>({ active: "all" });
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
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

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

  React.useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    setDebounceTimer(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      active: activeFilter,
    });
  }, [activeFilter, isFilterOpen]);

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
    const code = normalizeCode(formState.code);
    const name = formState.name.trim();

    if (!code || !name) {
      setFormError("الكود والاسم حقول مطلوبة.");
      return false;
    }

    if (!/^[a-z0-9_.:-]+$/.test(code)) {
      setFormError("صيغة الكود غير صحيحة.");
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

    const payload = {
      code: normalizeCode(formState.code),
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
          payload,
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

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء الفصل بنجاح.");
      },
    });
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

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setFilterDraft({ active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, activeFilter !== "all" ? 1 : 0].reduce(
      (acc, value) => acc + value,
      0,
    );
  }, [activeFilter, searchInput]);

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث بالكود أو الاسم أو الملاحظات..."
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
          title="فلاتر الفصول"
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
          <SelectField
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
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>الفصول / الغرف</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة الفصول/الغرف ككيان مستقل مع دعم السعة والملاحظات والحالة.
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
                    <p className="font-medium">{classroom.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <code>{classroom.code}</code>
                      {classroom.capacity !== null ? ` - السعة: ${classroom.capacity}` : ""}
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الكود *</label>
              <Input
                value={formState.code}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder="مثال: room-a1"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الاسم *</label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="الفصل A1"
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">السعة</label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={formState.capacity}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, capacity: event.target.value }))
                  }
                  placeholder="30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الملاحظات</label>
                <Input
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="قريب من المختبر"
                />
              </div>
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                }
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
