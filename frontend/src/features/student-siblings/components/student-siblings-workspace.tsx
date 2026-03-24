"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
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
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateStudentSiblingMutation,
  useDeleteStudentSiblingMutation,
  useUpdateStudentSiblingMutation,
} from "@/features/student-siblings/hooks/use-student-siblings-mutations";
import { useStudentSiblingsQuery } from "@/features/student-siblings/hooks/use-student-siblings-query";
import type { StudentPickerOption } from "@/features/students/lib/student-picker";
import type {
  StudentSiblingListItem,
  StudentSiblingRelationship,
} from "@/lib/api/client";

const RELATIONSHIP_LABELS: Record<StudentSiblingRelationship, string> = {
  BROTHER: "أخ",
  SISTER: "أخت",
};

type StudentSiblingFormState = {
  studentId: string;
  siblingId: string;
  relationship: StudentSiblingRelationship;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: StudentSiblingFormState = {
  studentId: "",
  siblingId: "",
  relationship: "BROTHER",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(item: StudentSiblingListItem): StudentSiblingFormState {
  return {
    studentId: item.studentId,
    siblingId: item.siblingId,
    relationship: item.relationship,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

function buildStudentPickerOption(
  student: StudentSiblingListItem["student"],
  label: string,
): StudentPickerOption {
  return {
    id: student.id,
    title: student.fullName,
    subtitle: student.admissionNo ? `رقم الطالب ${student.admissionNo}` : "بدون رقم طالب",
    meta: null,
    groupLabel: label,
  };
}

function buildSiblingPickerOption(
  sibling: StudentSiblingListItem["sibling"],
): StudentPickerOption {
  return buildStudentPickerOption(sibling, "الأخ/الأخت المحدد");
}

export function StudentSiblingsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-siblings.create");
  const canUpdate = hasPermission("student-siblings.update");
  const canDelete = hasPermission("student-siblings.delete");
  const canReadStudents = hasPermission("students.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [siblingFilter, setSiblingFilter] = React.useState("all");
  const [relationshipFilter, setRelationshipFilter] = React.useState<
    StudentSiblingRelationship | "all"
  >("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    student: string;
    sibling: string;
    relationship: StudentSiblingRelationship | "all";
    active: "all" | "active" | "inactive";
  }>({
    student: "all",
    sibling: "all",
    relationship: "all",
    active: "all",
  });

  const [editingSiblingId, setEditingSiblingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<StudentSiblingFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [selectedFormStudent, setSelectedFormStudent] =
    React.useState<StudentPickerOption | null>(null);
  const [selectedFormSibling, setSelectedFormSibling] =
    React.useState<StudentPickerOption | null>(null);
  const [selectedStudentFilterOption, setSelectedStudentFilterOption] =
    React.useState<StudentPickerOption | null>(null);
  const [selectedSiblingFilterOption, setSelectedSiblingFilterOption] =
    React.useState<StudentPickerOption | null>(null);
  const [filterDraftStudentOption, setFilterDraftStudentOption] =
    React.useState<StudentPickerOption | null>(null);
  const [filterDraftSiblingOption, setFilterDraftSiblingOption] =
    React.useState<StudentPickerOption | null>(null);

  const siblingsQuery = useStudentSiblingsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    siblingId: siblingFilter === "all" ? undefined : siblingFilter,
    relationship: relationshipFilter === "all" ? undefined : relationshipFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateStudentSiblingMutation();
  const updateMutation = useUpdateStudentSiblingMutation();
  const deleteMutation = useDeleteStudentSiblingMutation();

  const siblings = React.useMemo(() => siblingsQuery.data?.data ?? [], [siblingsQuery.data?.data]);
  const pagination = siblingsQuery.data?.pagination;
  const isEditing = editingSiblingId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = siblings.some((item) => item.id === editingSiblingId);
    if (!stillExists) {
      setEditingSiblingId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setSelectedFormStudent(null);
      setSelectedFormSibling(null);
      setIsFormOpen(false);
    }
  }, [editingSiblingId, isEditing, siblings]);

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
      sibling: siblingFilter,
      relationship: relationshipFilter,
      active: activeFilter,
    });
    setFilterDraftStudentOption(selectedStudentFilterOption);
    setFilterDraftSiblingOption(selectedSiblingFilterOption);
  }, [
    activeFilter,
    isFilterOpen,
    relationshipFilter,
    siblingFilter,
    selectedSiblingFilterOption,
    selectedStudentFilterOption,
    studentFilter,
  ]);

  const resetForm = () => {
    setEditingSiblingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setSelectedFormStudent(null);
    setSelectedFormSibling(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingSiblingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setSelectedFormStudent(null);
    setSelectedFormSibling(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.studentId || !formState.siblingId) {
      setFormError("الطالب والأخ/الأخت حقول مطلوبة.");
      return false;
    }

    if (formState.studentId === formState.siblingId) {
      setFormError("لا يمكن اختيار نفس الطالب في الطرفين.");
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
      siblingId: formState.siblingId,
      relationship: formState.relationship,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingSiblingId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: student-siblings.update.");
        return;
      }

      updateMutation.mutate(
        {
          siblingId: editingSiblingId,
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
      setFormError("لا تملك الصلاحية المطلوبة: student-siblings.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: StudentSiblingListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingSiblingId(item.id);
    setFormState(toFormState(item));
    setSelectedFormStudent(buildStudentPickerOption(item.student, "الطالب المحدد"));
    setSelectedFormSibling(buildSiblingPickerOption(item.sibling));
    setIsFormOpen(true);
  };

  const handleDelete = (item: StudentSiblingListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف ربط ${item.student.fullName} مع ${item.sibling.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingSiblingId === item.id) {
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
    setStudentFilter("all");
    setSiblingFilter("all");
    setRelationshipFilter("all");
    setActiveFilter("all");
    setSelectedStudentFilterOption(null);
    setSelectedSiblingFilterOption(null);
    setFilterDraftStudentOption(null);
    setFilterDraftSiblingOption(null);
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setStudentFilter(filterDraft.student);
    setSiblingFilter(filterDraft.sibling);
    setRelationshipFilter(filterDraft.relationship);
    setActiveFilter(filterDraft.active);
    setSelectedStudentFilterOption(filterDraftStudentOption);
    setSelectedSiblingFilterOption(filterDraftSiblingOption);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      studentFilter !== "all" ? 1 : 0,
      siblingFilter !== "all" ? 1 : 0,
      relationshipFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [activeFilter, relationshipFilter, searchInput, siblingFilter, studentFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث بالطالب..."
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
          title="فلاتر الإخوة"
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
              scope="student-siblings"
              variant="filter"
              value={filterDraft.student}
              selectedOption={filterDraftStudentOption}
              onSelect={(option) => {
                setFilterDraft((prev) => ({ ...prev, student: option?.id ?? "all" }));
                setFilterDraftStudentOption(option);
              }}
              disabled={!canReadStudents}
            />

            <StudentPickerSheet
              scope="student-siblings"
              variant="filter"
              value={filterDraft.sibling}
              selectedOption={filterDraftSiblingOption}
              onSelect={(option) => {
                setFilterDraft((prev) => ({ ...prev, sibling: option?.id ?? "all" }));
                setFilterDraftSiblingOption(option);
              }}
              disabled={!canReadStudents}
            />

            <SelectField
              value={filterDraft.relationship}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  relationship: event.target.value as StudentSiblingRelationship | "all",
                }))
              }
            >
              <option value="all">كل العلاقات</option>
              {(Object.keys(RELATIONSHIP_LABELS) as StudentSiblingRelationship[]).map(
                (relationship) => (
                  <option key={relationship} value={relationship}>
                    {RELATIONSHIP_LABELS[relationship]}
                  </option>
                ),
              )}
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
              <CardTitle>الإخوة في المدرسة</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة الروابط الأسرية بين الطلاب.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
          {siblingsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {siblingsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {siblingsQuery.error instanceof Error ? siblingsQuery.error.message : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!siblingsQuery.isPending && siblings.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {siblings.map((item) => (
            <div
              key={item.id}
              data-testid="student-sibling-card"
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.student.fullName} ({item.student.admissionNo ?? "بدون رقم"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الأخ/الأخت: {item.sibling.fullName} ({item.sibling.admissionNo ?? "بدون رقم"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    نوع العلاقة: {RELATIONSHIP_LABELS[item.relationship]}
                  </p>
                  {item.notes ? (
                    <p className="text-xs text-muted-foreground">ملاحظات: {item.notes}</p>
                  ) : null}
                </div>

                <Badge variant={item.isActive ? "default" : "outline"}>
                  {item.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-testid="student-sibling-card-edit"
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
                  data-testid="student-sibling-card-delete"
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
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
              الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination || pagination.page <= 1 || siblingsQuery.isFetching}
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
                  siblingsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void siblingsQuery.refetch()}
                disabled={siblingsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${siblingsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء ربط إخوة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل ربط إخوة" : "إضافة ربط إخوة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إضافة الربط"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>student-siblings.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الطالب *</label>
              <StudentPickerSheet
              scope="student-siblings"
              variant="form"
                triggerTestId="student-sibling-form-student"
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
              <label className="text-xs font-medium text-muted-foreground">الأخ/الأخت *</label>
              <StudentPickerSheet
              scope="student-siblings"
              variant="form"
                triggerTestId="student-sibling-form-sibling"
                value={formState.siblingId}
                selectedOption={selectedFormSibling}
                onSelect={(option) => {
                  setSelectedFormSibling(option);
                  setFormState((prev) => ({ ...prev, siblingId: option?.id ?? "" }));
                }}
                disabled={!canReadStudents}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">نوع العلاقة *</label>
              <select
                data-testid="student-sibling-form-relationship"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.relationship}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    relationship: event.target.value as StudentSiblingRelationship,
                  }))
                }
              >
                {(Object.keys(RELATIONSHIP_LABELS) as StudentSiblingRelationship[]).map(
                  (relationship) => (
                    <option key={relationship} value={relationship}>
                      {RELATIONSHIP_LABELS[relationship]}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                data-testid="student-sibling-form-notes"
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
                data-testid="student-sibling-form-active"
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
                data-testid="student-sibling-form-submit"
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
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
