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
import { StudentPickerSheet } from "@/components/ui/student-picker-sheet";
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
import { useTalentOptionsQuery } from "@/features/employee-talents/hooks/use-talent-options-query";
import {
  useCreateStudentTalentMutation,
  useDeleteStudentTalentMutation,
  useUpdateStudentTalentMutation,
} from "@/features/student-talents/hooks/use-student-talents-mutations";
import { useStudentTalentsQuery } from "@/features/student-talents/hooks/use-student-talents-query";
import type { StudentPickerOption } from "@/features/students/lib/student-picker";
import type { StudentTalentListItem } from "@/lib/api/client";

type StudentTalentFormState = {
  studentId: string;
  talentId: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: StudentTalentFormState = {
  studentId: "",
  talentId: "",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(mapping: StudentTalentListItem): StudentTalentFormState {
  return {
    studentId: mapping.studentId,
    talentId: mapping.talentId,
    notes: mapping.notes ?? "",
    isActive: mapping.isActive,
  };
}

function buildStudentPickerOptionFromMapping(
  mapping: Pick<StudentTalentListItem, "student">,
): StudentPickerOption {
  return {
    id: mapping.student.id,
    title: mapping.student.fullName,
    subtitle: mapping.student.admissionNo
      ? `رقم الطالب ${mapping.student.admissionNo}`
      : "بدون رقم طالب",
    meta: null,
    groupLabel: "الطلاب",
  };
}

export function StudentTalentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-talents.create");
  const canUpdate = hasPermission("student-talents.update");
  const canDelete = hasPermission("student-talents.delete");
  const canReadStudents = hasPermission("students.read");
  const canReadTalents = hasPermission("talents.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [talentFilter, setTalentFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    student: string;
    talent: string;
    active: "all" | "active" | "inactive";
  }>({
    student: "all",
    talent: "all",
    active: "all",
  });

  const [editingMappingId, setEditingMappingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<StudentTalentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [selectedFormStudent, setSelectedFormStudent] =
    React.useState<StudentPickerOption | null>(null);
  const [selectedStudentFilterOption, setSelectedStudentFilterOption] =
    React.useState<StudentPickerOption | null>(null);
  const [filterDraftStudentOption, setFilterDraftStudentOption] =
    React.useState<StudentPickerOption | null>(null);

  const mappingsQuery = useStudentTalentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    talentId: talentFilter === "all" ? undefined : talentFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const talentsQuery = useTalentOptionsQuery();

  const createMutation = useCreateStudentTalentMutation();
  const updateMutation = useUpdateStudentTalentMutation();
  const deleteMutation = useDeleteStudentTalentMutation();

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

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = mappings.some((item) => item.id === editingMappingId);
    if (!stillExists) {
      setEditingMappingId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setSelectedFormStudent(null);
      setIsFormOpen(false);
    }
  }, [editingMappingId, isEditing, mappings]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      student: studentFilter,
      talent: talentFilter,
      active: activeFilter,
    });
    setFilterDraftStudentOption(selectedStudentFilterOption);
  }, [activeFilter, isFilterOpen, selectedStudentFilterOption, studentFilter, talentFilter]);

  const resetForm = () => {
    setEditingMappingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setSelectedFormStudent(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingMappingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setSelectedFormStudent(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.studentId) {
      setFormError("الطالب مطلوب.");
      return false;
    }

    if (!formState.talentId) {
      setFormError("الموهبة مطلوبة.");
      return false;
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

    if (!validateForm()) {
      return;
    }

    const payload = {
      studentId: formState.studentId,
      talentId: formState.talentId,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingMappingId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: student-talents.update.");
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
      setFormError("لا تملك الصلاحية المطلوبة: student-talents.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (mapping: StudentTalentListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingMappingId(mapping.id);
    setFormState(toFormState(mapping));
    setSelectedFormStudent(buildStudentPickerOptionFromMapping(mapping));
    setIsFormOpen(true);
  };

  const handleDelete = (mapping: StudentTalentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف ربط ${mapping.student.fullName} مع موهبة ${mapping.talent.name}؟`,
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
  const hasDependenciesReadPermissions = canReadStudents && canReadTalents;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStudentFilter("all");
    setTalentFilter("all");
    setActiveFilter("all");
    setSelectedStudentFilterOption(null);
    setFilterDraftStudentOption(null);
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setStudentFilter(filterDraft.student);
    setTalentFilter(filterDraft.talent);
    setActiveFilter(filterDraft.active);
    setSelectedStudentFilterOption(filterDraftStudentOption);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      studentFilter !== "all" ? 1 : 0,
      talentFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [activeFilter, searchInput, studentFilter, talentFilter]);

  return (
    <>
      <div className="space-y-4">
                  <ManagementToolbar
            searchValue={searchInput}
            onSearchChange={(event) => setSearchInput(event.target.value)}
            searchPlaceholder="بحث بالطالب أو الموهبة..."
            filterCount={activeFiltersCount}
            onFilterClick={() => setIsFilterOpen((prev) => !prev)}
            showFilterButton={true}
          />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر المواهب"
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
            <StudentPickerSheet
              scope="student-talents"
              variant="filter"
              value={filterDraft.student}
              selectedOption={filterDraftStudentOption}
              onSelect={(option) => {
                setFilterDraft((prev) => ({ ...prev, student: option?.id ?? "all" }));
                setFilterDraftStudentOption(option);
              }}
              disabled={!canReadStudents}
            />

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
              <CardTitle>مواهب الطلاب</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة ربط الطلاب بالمواهب المرجعية.</CardDescription>
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
              data-testid="student-talent-card"
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {mapping.student.fullName} ({mapping.student.admissionNo ?? "بدون رقم"})
                  </p>
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
                  data-testid="student-talent-card-edit"
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
                  data-testid="student-talent-card-delete"
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
        ariaLabel="إنشاء ربط موهبة طالب"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل ربط موهبة طالب" : "إضافة موهبة طالب"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إضافة الربط"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>student-talents.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">الطالب *</label>
              <StudentPickerSheet
                triggerTestId="student-talent-form-student"
                scope="student-talents"
                variant="form"
                value={formState.studentId}
                selectedOption={selectedFormStudent}
                onSelect={(option) => {
                  setSelectedFormStudent(option);
                  setFormState((prev) => ({ ...prev, studentId: option?.id ?? "" }));
                }}
                disabled={!canReadStudents}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">الموهبة *</label>
              <SelectField
                data-testid="student-talent-form-talent"
                
                value={formState.talentId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, talentId: event.target.value }))
                }
                disabled={!canReadTalents}
              >
                <option value="">اختر الموهبة</option>
                {(talentsQuery.data ?? []).map((talent) => (
                  <option key={talent.id} value={talent.id}>
                    {talent.name} ({talent.code})
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">ملاحظات</label>
              <Input
                data-testid="student-talent-form-notes"
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="يشارك في نشاط الإلقاء"
              />
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
                data-testid="student-talent-form-active"
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

            {!hasDependenciesReadPermissions ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                يتطلب هذا الجزء صلاحيات القراءة: <code>students.read</code> و <code>talents.read</code>.
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                data-testid="student-talent-form-submit"
                type="submit"
                className="flex-1 gap-2"
                disabled={
                  isFormSubmitting ||
                  (!canCreate && !isEditing) ||
                  !hasDependenciesReadPermissions
                }
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إضافة الربط"}
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

