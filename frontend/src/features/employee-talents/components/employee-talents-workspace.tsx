"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
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
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useEmployeeOptionsQuery } from "@/features/employee-talents/hooks/use-employee-options-query";
import {
  useCreateEmployeeTalentMutation,
  useDeleteEmployeeTalentMutation,
  useUpdateEmployeeTalentMutation,
} from "@/features/employee-talents/hooks/use-employee-talents-mutations";
import { useEmployeeTalentsQuery } from "@/features/employee-talents/hooks/use-employee-talents-query";
import { useTalentOptionsQuery } from "@/features/employee-talents/hooks/use-talent-options-query";
import type { EmployeeTalentListItem } from "@/lib/api/client";

type EmployeeTalentFormState = {
  employeeId: string;
  talentId: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: EmployeeTalentFormState = {
  employeeId: "",
  talentId: "",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(mapping: EmployeeTalentListItem): EmployeeTalentFormState {
  return {
    employeeId: mapping.employeeId,
    talentId: mapping.talentId,
    notes: mapping.notes ?? "",
    isActive: mapping.isActive,
  };
}

export function EmployeeTalentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-talents.create");
  const canUpdate = hasPermission("employee-talents.update");
  const canDelete = hasPermission("employee-talents.delete");
  const canReadEmployees = hasPermission("employees.read");
  const canReadTalents = hasPermission("talents.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [talentFilter, setTalentFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    employee: string;
    talent: string;
    active: "all" | "active" | "inactive";
  }>({
    employee: "all",
    talent: "all",
    active: "all",
  });

  const [editingMappingId, setEditingMappingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<EmployeeTalentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const mappingsQuery = useEmployeeTalentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    talentId: talentFilter === "all" ? undefined : talentFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const employeesQuery = useEmployeeOptionsQuery();
  const talentsQuery = useTalentOptionsQuery();

  const createMutation = useCreateEmployeeTalentMutation();
  const updateMutation = useUpdateEmployeeTalentMutation();
  const deleteMutation = useDeleteEmployeeTalentMutation();

  const mappings = React.useMemo(
    () => mappingsQuery.data?.data ?? [],
    [mappingsQuery.data?.data],
  );
  const pagination = mappingsQuery.data?.pagination;
  const isEditing = editingMappingId !== null;

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

    setFilterDraft({
      employee: employeeFilter,
      talent: talentFilter,
      active: activeFilter,
    });
  }, [activeFilter, employeeFilter, isFilterOpen, talentFilter]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = mappings.some((item) => item.id === editingMappingId);
    if (!stillExists) {
      setEditingMappingId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingMappingId, isEditing, mappings]);

  const resetForm = () => {
    setEditingMappingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingMappingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    if (!formState.talentId) {
      setFormError("الموهبة مطلوبة.");
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
      employeeId: formState.employeeId,
      talentId: formState.talentId,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingMappingId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-talents.update.");
        return;
      }

      updateMutation.mutate(
        {
          mappingId: editingMappingId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-talents.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (mapping: EmployeeTalentListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingMappingId(mapping.id);
    setFormState(toFormState(mapping));
    setIsFormOpen(true);
  };

  const handleDelete = (mapping: EmployeeTalentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف ربط ${mapping.employee.fullName} مع موهبة ${mapping.talent.name}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(mapping.id, {
      onSuccess: () => {
        if (editingMappingId === mapping.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions = canReadEmployees && canReadTalents;
  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      employeeFilter !== "all" ? 1 : 0,
      talentFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [activeFilter, employeeFilter, searchInput, talentFilter]);

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setTalentFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setTalentFilter(filterDraft.talent);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالموظف أو الموهبة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر المواهب"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.employee}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, employee: event.target.value }))
              }
            >
              <option value="all">كل الموظفين</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} ({employee.jobNumber ?? "بدون رقم"})
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.talent}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, talent: event.target.value }))
              }
            >
              <option value="all">كل المواهب</option>
              {(talentsQuery.data ?? []).map((talent) => (
                <option key={talent.id} value={talent.id}>
                  {talent.name} ({talent.code})
                </option>
              ))}
            </SelectField>

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
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>مواهب الموظفين</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة ربط الموظفين بالمواهب المرجعية.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
          {mappingsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {mappingsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {mappingsQuery.error instanceof Error
                ? mappingsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!mappingsQuery.isPending && mappings.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {mappings.map((mapping) => (
            <div
              key={mapping.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-testid="talent-mapping-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{mapping.employee.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    الموهبة: {mapping.talent.name} ({mapping.talent.code})
                  </p>
                  {mapping.notes ? (
                    <p className="text-xs text-muted-foreground">ملاحظات: {mapping.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={mapping.talent.isActive ? "secondary" : "outline"}>
                    {mapping.talent.isActive ? "الموهبة نشطة" : "الموهبة غير نشطة"}
                  </Badge>
                  <Badge variant={mapping.isActive ? "default" : "outline"}>
                    {mapping.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(mapping)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(mapping)}
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
                disabled={!pagination || pagination.page <= 1 || mappingsQuery.isFetching}
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
                  mappingsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void mappingsQuery.refetch()}
                disabled={mappingsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${mappingsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء ربط موهبة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل ربط موهبة" : "إنشاء ربط موهبة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء ربط"}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[720px]"
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>employee-talents.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="talent-form">
            <p className="text-sm text-muted-foreground">
              {isEditing ? "تحديث ربط الموظف بالموهبة." : "إضافة موهبة جديدة لموظف ضمن الموارد البشرية."}
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الموظف *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.employeeId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, employeeId: event.target.value }))
                }
                disabled={!canReadEmployees}
                data-testid="talent-form-employee"
              >
                <option value="">اختر الموظف</option>
                {(employeesQuery.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.jobNumber ?? "بدون رقم"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الموهبة *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.talentId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, talentId: event.target.value }))
                }
                disabled={!canReadTalents}
                data-testid="talent-form-talent"
              >
                <option value="">اختر الموهبة</option>
                {(talentsQuery.data ?? []).map((talent) => (
                  <option key={talent.id} value={talent.id}>
                    {talent.name} ({talent.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="يقود ورش تحسين الخط"
                data-testid="talent-form-notes"
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
                data-testid="talent-form-active"
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

            {!hasDependenciesReadPermissions ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                يتطلب هذا الجزء صلاحيات القراءة: <code>employees.read</code> و <code>talents.read</code>.
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={
                  isFormSubmitting ||
                  (!canCreate && !isEditing) ||
                  !hasDependenciesReadPermissions
                }
                data-testid="talent-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء ربط"}
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






