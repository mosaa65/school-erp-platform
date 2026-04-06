"use client";

import * as React from "react";
import { LoaderCircle, PencilLine, Plus, RefreshCw, Shapes, Trash2, Users } from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { generateAutoCode } from "@/lib/auto-code";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateEmployeeDepartmentMutation,
  useDeleteEmployeeDepartmentMutation,
  useUpdateEmployeeDepartmentMutation,
} from "@/features/employee-departments/hooks/use-employee-departments-mutations";
import { useEmployeeDepartmentsQuery } from "@/features/employee-departments/hooks/use-employee-departments-query";
import type { EmployeeDepartmentListItem } from "@/lib/api/client";

type EmployeeDepartmentFormState = {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: EmployeeDepartmentFormState = {
  code: "",
  name: "",
  description: "",
  isActive: true,
};

function createNewDepartmentFormState(): EmployeeDepartmentFormState {
  return {
    ...DEFAULT_FORM_STATE,
    code: generateAutoCode("DEPT", 40),
  };
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(
  department: EmployeeDepartmentListItem,
): EmployeeDepartmentFormState {
  return {
    code: department.code,
    name: department.name,
    description: department.description ?? "",
    isActive: department.isActive,
  };
}

export function EmployeeDepartmentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-departments.create");
  const canUpdate = hasPermission("employee-departments.update");
  const canDelete = hasPermission("employee-departments.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingDepartmentId, setEditingDepartmentId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<EmployeeDepartmentFormState>(
    DEFAULT_FORM_STATE,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const departmentsQuery = useEmployeeDepartmentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateEmployeeDepartmentMutation();
  const updateMutation = useUpdateEmployeeDepartmentMutation();
  const deleteMutation = useDeleteEmployeeDepartmentMutation();

  const departments = React.useMemo(
    () => departmentsQuery.data?.data ?? [],
    [departmentsQuery.data?.data],
  );
  const pagination = departmentsQuery.data?.pagination;
  const isEditing = editingDepartmentId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

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

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = departments.some((item) => item.id === editingDepartmentId);
    if (!stillExists) {
      setEditingDepartmentId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [departments, editingDepartmentId, isEditing]);

  const resetForm = () => {
    setEditingDepartmentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setEditingDepartmentId(null);
    setFormState(createNewDepartmentFormState());
    setFormError(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.name.trim()) {
      setFormError("اسم القسم مطلوب.");
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
      description: toOptionalString(formState.description),
      isActive: formState.isActive,
    };

    if (isEditing && editingDepartmentId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-departments.update.");
        return;
      }

      updateMutation.mutate(
        {
          departmentId: editingDepartmentId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-departments.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (department: EmployeeDepartmentListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingDepartmentId(department.id);
    setFormState(toFormState(department));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDelete = (department: EmployeeDepartmentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف قسم ${department.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(department.id, {
      onSuccess: () => {
        if (editingDepartmentId === department.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const activeFiltersCount = activeFilter === "all" ? 0 : 1;

  return (
    <>
      <div className="space-y-4">
        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة الأقسام"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={
            <FilterDrawerActions
              onClear={() => {
                setFilterDraft("all");
                setActiveFilter("all");
                setPage(1);
                setIsFilterOpen(false);
              }}
              onApply={() => {
                setActiveFilter(filterDraft);
                setPage(1);
                setIsFilterOpen(false);
              }}
            />
          }
        >
          <div className="space-y-1">
            <Label>الحالة</Label>
            <SelectField
              value={filterDraft}
              onChange={(event) =>
                setFilterDraft(event.target.value as "all" | "active" | "inactive")
              }
              icon={<Shapes className="h-4 w-4" />}
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط فقط</option>
              <option value="inactive">غير نشط فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث بالاسم أو الرمز..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        {mutationError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {mutationError}
          </div>
        ) : null}

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة أقسام الموظفين</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              ربط الموظفين بهيكل تنظيمي واضح وقابل للتوسع.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {departmentsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {departments.map((department) => (
              <div
                key={department.id}
                className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4 transition-all hover:bg-background/80"
                data-testid="department-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">{department.name}</p>
                      <Badge variant="outline">{department.code}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {department.description ?? "لا يوجد وصف مسجل."}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      الموظفون المرتبطون: {department._count.employees}
                    </div>
                  </div>

                  <Badge variant={department.isActive ? "default" : "outline"}>
                    {department.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(department)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(department)}
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
                  disabled={!pagination || pagination.page <= 1 || departmentsQuery.isFetching}
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
                    departmentsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void departmentsQuery.refetch()}
                  disabled={departmentsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${departmentsQuery.isFetching ? "animate-spin" : ""}`}
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
        label="إضافة"
        ariaLabel="إضافة قسم موظفين"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل قسم" : "إضافة قسم"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "تحديث القسم" : "إضافة القسم"}
        showFooter={false}
      >
        <form className="space-y-6" onSubmit={handleSubmitForm} data-testid="department-form">
          <div className="space-y-1">
            <Label required>اسم القسم</Label>
            <Input
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="العمليات والموارد البشرية"
              data-testid="department-form-name"
            />
          </div>

          <div className="space-y-1">
            <Label>الوصف</Label>
            <Input
              value={formState.description}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="وصف مختصر للقسم"
              data-testid="department-form-description"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
              }
              data-testid="department-form-active"
            />
            القسم نشط
          </label>

          {formError ? (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
              data-testid="department-form-error"
            >
              {formError}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
              disabled={isFormSubmitting}
              data-testid="department-form-submit"
            >
              {isFormSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEditing ? "حفظ التعديلات" : "إضافة القسم"}
            </button>
            <Button type="button" variant="outline" className="h-12 rounded-2xl" onClick={resetForm}>
              إلغاء
            </Button>
          </div>
        </form>
      </BottomSheetForm>
    </>
  );
}
