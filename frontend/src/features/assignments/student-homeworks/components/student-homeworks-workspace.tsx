"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ClipboardCheck,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Trash2,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentEnrollmentPickerSheet } from "@/components/ui/student-enrollment-picker-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { Fab } from "@/components/ui/fab";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";

import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateStudentHomeworkMutation,
  useDeleteStudentHomeworkMutation,
  useUpdateStudentHomeworkMutation,
} from "@/features/assignments/student-homeworks/hooks/use-student-homeworks-mutations";
import { useStudentHomeworksQuery } from "@/features/assignments/student-homeworks/hooks/use-student-homeworks-query";
import { useHomeworkOptionsQuery } from "@/features/assignments/student-homeworks/hooks/use-homework-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/assignments/student-homeworks/hooks/use-student-enrollment-options-query";
import type { StudentHomeworkListItem } from "@/lib/api/client";
import {
  formatNameCodeLabel,
  formatSectionWithGradeLabel,
} from "@/lib/option-labels";
import { toStudentEnrollmentPickerOption } from "@/features/students/lib/student-enrollment-picker";

type StudentHomeworkFormState = {
  homeworkId: string;
  studentEnrollmentId: string;
  isCompleted: boolean;
  submittedAt: string;
  manualScore: string;
  teacherNotes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: StudentHomeworkFormState = {
  homeworkId: "",
  studentEnrollmentId: "",
  isCompleted: false,
  submittedAt: "",
  manualScore: "",
  teacherNotes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateTimeLocalInput(isoDateTime: string | null): string {
  if (!isoDateTime) {
    return "";
  }

  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateTimeIso(dateTimeLocalInput: string): string {
  return new Date(dateTimeLocalInput).toISOString();
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ar-SA");
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toFormState(item: StudentHomeworkListItem): StudentHomeworkFormState {
  return {
    homeworkId: item.homeworkId,
    studentEnrollmentId: item.studentEnrollmentId,
    isCompleted: item.isCompleted,
    submittedAt: toDateTimeLocalInput(item.submittedAt),
    manualScore: item.manualScore === null ? "" : String(item.manualScore),
    teacherNotes: item.teacherNotes ?? "",
    isActive: item.isActive,
  };
}

export function StudentHomeworksWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-homeworks.create");
  const canUpdate = hasPermission("student-homeworks.update");
  const canDelete = hasPermission("student-homeworks.delete");
  const canReadHomeworks = hasPermission("homeworks.read");
  const canReadEnrollments = hasPermission("student-enrollments.read");
  const canReadStudents = hasPermission("students.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");  
  const [homeworkFilter, setHomeworkFilter] = React.useState("all");
  const [completedFilter, setCompletedFilter] = React.useState<"all" | "completed" | "pending">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");

  const [filterDraft, setFilterDraft] = React.useState<{
    homework: string;
    completed: "all" | "completed" | "pending";
    active: "all" | "active" | "inactive";
  }>({
    homework: "all",
    completed: "all",
    active: "all",
  });

  const [editingStudentHomeworkId, setEditingStudentHomeworkId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<StudentHomeworkFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const studentHomeworksQuery = useStudentHomeworksQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    homeworkId: homeworkFilter === "all" ? undefined : homeworkFilter,
    isCompleted: completedFilter === "all" ? undefined : completedFilter === "completed",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const homeworksQuery = useHomeworkOptionsQuery();
  const enrollmentsQuery = useStudentEnrollmentOptionsQuery();

  const createMutation = useCreateStudentHomeworkMutation();
  const updateMutation = useUpdateStudentHomeworkMutation();
  const deleteMutation = useDeleteStudentHomeworkMutation();

  const records = React.useMemo(
    () => studentHomeworksQuery.data?.data ?? [],
    [studentHomeworksQuery.data?.data],
  );
  const pagination = studentHomeworksQuery.data?.pagination;
  const isEditing = editingStudentHomeworkId !== null;

  const selectedHomeworkForForm = React.useMemo(
    () => (homeworksQuery.data ?? []).find((item) => item.id === formState.homeworkId),
    [formState.homeworkId, homeworksQuery.data],
  );

  const selectedEnrollmentForForm = React.useMemo(
    () =>
      (enrollmentsQuery.data ?? []).find((item) => item.id === formState.studentEnrollmentId) ??
      null,
    [enrollmentsQuery.data, formState.studentEnrollmentId],
  );
  const selectedEnrollmentOptionForForm = React.useMemo(
    () =>
      selectedEnrollmentForForm ? toStudentEnrollmentPickerOption(selectedEnrollmentForForm) : null,
    [selectedEnrollmentForForm],
  );


  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = records.some((item) => item.id === editingStudentHomeworkId);
    if (!stillExists) {
      setEditingStudentHomeworkId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingStudentHomeworkId, isEditing, records]);

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      homework: homeworkFilter,
      completed: completedFilter,
      active: activeFilter,
    });
  }, [
    activeFilter,
    completedFilter,
    homeworkFilter,
    isFilterOpen,
  ]);

  const resetFormState = () => {
    setEditingStudentHomeworkId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleStartCreate = () => {
    resetFormState();
    setActionSuccess(null);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
    setActionSuccess(null);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setHomeworkFilter("all");
    setCompletedFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setHomeworkFilter(filterDraft.homework);
    setCompletedFilter(filterDraft.completed);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (searchInput.trim()) count++;
    if (homeworkFilter !== "all") count++;
    if (completedFilter !== "all") count++;
    if (activeFilter !== "all") count++;
    return count;
  }, [activeFilter, completedFilter, homeworkFilter, searchInput]);


  const validateForm = (): boolean => {
    if (!formState.homeworkId || !formState.studentEnrollmentId) {
      setFormError("الواجب والقيد حقول مطلوبة.");
      return false;
    }

    if (formState.teacherNotes.trim().length > 255) {
      setFormError("ملاحظات المعلم يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    const score = formState.manualScore.trim() ? Number(formState.manualScore) : null;
    if (score !== null && (!Number.isFinite(score) || score < 0)) {
      setFormError("الدرجة اليدوية يجب أن تكون رقمًا صالحًا أكبر من أو يساوي 0.");
      return false;
    }

    if (score !== null && selectedHomeworkForForm && score > selectedHomeworkForForm.maxScore) {
      setFormError(`الدرجة اليدوية يجب ألا تتجاوز ${selectedHomeworkForForm.maxScore}.`);
      return false;
    }

    const selectedEnrollment = (enrollmentsQuery.data ?? []).find(
      (item) => item.id === formState.studentEnrollmentId,
    );
    if (selectedHomeworkForForm && selectedEnrollment) {
      if (selectedEnrollment.academicYearId !== selectedHomeworkForForm.academicYearId) {
        setFormError("قيد الطالب لا يطابق شعبة/سنة الواجب.");
        return false;
      }

      if (!selectedEnrollment.sectionId) {
        setFormError("قيد الطالب غير موزع على شعبة بعد، ولا يمكن ربطه بهذا الواجب.");
        return false;
      }

      if (selectedEnrollment.sectionId !== selectedHomeworkForForm.sectionId) {
        setFormError("قيد الطالب لا يطابق شعبة الواجب.");
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

    const score = formState.manualScore.trim() ? Number(formState.manualScore) : undefined;

    const payload = {
      homeworkId: formState.homeworkId,
      studentEnrollmentId: formState.studentEnrollmentId,
      isCompleted: formState.isCompleted,
      submittedAt:
        formState.isCompleted && formState.submittedAt
          ? toDateTimeIso(formState.submittedAt)
          : undefined,
      manualScore: formState.isCompleted ? score : undefined,
      teacherNotes: toOptionalString(formState.teacherNotes),
      isActive: formState.isActive,
    };

    if (isEditing && editingStudentHomeworkId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: student-homeworks.update.");
        return;
      }

      updateMutation.mutate(
        {
          studentHomeworkId: editingStudentHomeworkId,
          payload,
        },
        {
          onSuccess: () => {
             resetForm();
             setActionSuccess("تم تحديث واجب الطالب بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: student-homeworks.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
         resetForm();
         setPage(1);
         setActionSuccess("تم إنشاء واجب الطالب بنجاح.");
      },
    });
  };

  const handleStartEdit = (item: StudentHomeworkListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingStudentHomeworkId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleToggleActive = (item: StudentHomeworkListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate(
      {
        studentHomeworkId: item.id,
        payload: {
          isActive: !item.isActive,
        },
      },
      {
        onSuccess: () => {
          setActionSuccess(
            item.isActive
              ? "تم تعطيل واجب الطالب بنجاح."
              : "تم تفعيل واجب الطالب بنجاح.",
          );
        },
      },
    );
  };

  const handleDelete = (item: StudentHomeworkListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف متابعة واجب الطالب ${item.studentEnrollment.student.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingStudentHomeworkId === item.id) {
          resetForm();
        }
        setActionSuccess("تم حذف واجب الطالب بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions =
    canReadHomeworks && canReadEnrollments && canReadStudents;

  return (
    <PageShell 
      title="متابعة واجبات الطلاب" 
      subtitle="تسجيل الواجبات المنجزة، التقييم، والملاحظات."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث عن طالب المعني بالواجب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
          showFilterButton={true}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر متابعة الواجبات"
          actionButtons={
            <FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>الواجب الدراسي</Label>
              <SelectField
                value={filterDraft.homework}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, homework: event.target.value }))
                }
              >
                <option value="all">كل الواجبات</option>
                {(homeworksQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-1">
              <Label>مكتمل</Label>
              <SelectField
                value={filterDraft.completed}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    completed: event.target.value as "all" | "completed" | "pending",
                  }))
                }
              >
                <option value="all">الكل</option>
                <option value="completed">مكتمل</option>
                <option value="pending">غير مكتمل</option>
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
              <CardTitle>واجبات الطلاب</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {studentHomeworksQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}
            {studentHomeworksQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {studentHomeworksQuery.error instanceof Error
                  ? studentHomeworksQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}
            {!studentHomeworksQuery.isPending && records.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {records.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {item.studentEnrollment.student.fullName} - {item.homework.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الواجب: {formatDate(item.homework.homeworkDate)} | الاستحقاق:{" "}
                      {formatDate(item.homework.dueDate)} | العظمى: {item.homework.maxScore}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      التسليم: {formatDateTime(item.submittedAt)} | الدرجة:{" "}
                      {item.manualScore === null ? "-" : item.manualScore}
                    </p>
                    {item.teacherNotes ? (
                      <p className="text-xs text-muted-foreground">ملاحظات: {item.teacherNotes}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={item.isCompleted ? "default" : "secondary"}>
                      {item.isCompleted ? "مكتمل" : "قيد الإنجاز"}
                    </Badge>
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
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(item)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    {item.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button
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
                  disabled={!pagination || pagination.page <= 1 || studentHomeworksQuery.isFetching}
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
                    studentHomeworksQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void studentHomeworksQuery.refetch()}
                  disabled={studentHomeworksQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${studentHomeworksQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء متابعة واجب"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        title={isEditing ? "تعديل واجب طالب" : "إنشاء متابعة طالب لواجب"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "تأكيد"}
      >
        {!hasDependenciesReadPermissions ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            يتطلب الصلاحيات: homeworks.read, student-enrollments.read, students.read
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmitForm}>
            <div className="space-y-1">
              <Label required>الواجب الدراسي</Label>
              <SelectField
                value={formState.homeworkId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    homeworkId: event.target.value,
                    studentEnrollmentId: "",
                  }))
                }
                disabled={!canReadHomeworks}
              >
                <option value="">اختر الواجب *</option>
                {(homeworksQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({formatSectionWithGradeLabel(item.section)} / {formatNameCodeLabel(item.subject.name, item.subject.code)})
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label required>قيد الطالب</Label>
              <StudentEnrollmentPickerSheet
                value={formState.studentEnrollmentId}
                selectedOption={selectedEnrollmentOptionForForm}
                onSelect={(option) =>
                  setFormState((prev) => ({ ...prev, studentEnrollmentId: option?.id ?? "" }))
                }
                scope="assignments.student-homeworks"
                variant="form"
                academicYearId={selectedHomeworkForForm?.academicYearId}
                sectionId={selectedHomeworkForForm?.sectionId ?? undefined}
                placeholder="اختر القيد *"
                title="اختيار قيد الطالب"
                searchPlaceholder="ابحث باسم الطالب أو رقم القيد"
                emptySelectionLabel="إلغاء اختيار القيد"
                allowEmptySelection={false}
                disabled={!canReadEnrollments || !selectedHomeworkForForm}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>مكتمل</span>
                <input
                  type="checkbox"
                  checked={formState.isCompleted}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isCompleted: event.target.checked }))
                  }
                />
              </label>
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>وقت التسليم</Label>
                <Input
                  type="datetime-local"
                  value={formState.submittedAt}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, submittedAt: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>الدرجة اليدوية</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formState.manualScore}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, manualScore: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>ملاحظات المعلم</Label>
              <Input
                value={formState.teacherNotes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, teacherNotes: event.target.value }))
                }
              />
            </div>

            {formError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {formError}
              </div>
            ) : null}
            {actionSuccess ? (
              <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                {actionSuccess}
              </div>
            ) : null}
          </form>
        )}
      </CrudFormSheet>
    </PageShell>
  );
}
