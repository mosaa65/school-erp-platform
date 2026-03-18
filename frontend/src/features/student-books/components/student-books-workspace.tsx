"use client";

import * as React from "react";
import {
  BookText,
  Filter,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
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
  useCreateStudentBookMutation,
  useDeleteStudentBookMutation,
  useUpdateStudentBookMutation,
} from "@/features/student-books/hooks/use-student-books-mutations";
import { useStudentBooksQuery } from "@/features/student-books/hooks/use-student-books-query";
import { useStudentOptionsQuery } from "@/features/student-books/hooks/use-student-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/student-books/hooks/use-student-enrollment-options-query";
import { useSubjectOptionsQuery } from "@/features/student-books/hooks/use-subject-options-query";
import type {
  StudentBookListItem,
  StudentBookStatus,
} from "@/lib/api/client";
import { translateStudentBookStatus } from "@/lib/i18n/ar";

type StudentBookFormState = {
  studentEnrollmentId: string;
  subjectId: string;
  bookPart: string;
  issuedDate: string;
  dueDate: string;
  returnedDate: string;
  status: StudentBookStatus;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const STATUS_OPTIONS: StudentBookStatus[] = ["ISSUED", "RETURNED", "LOST", "DAMAGED"];

const DEFAULT_FORM_STATE: StudentBookFormState = {
  studentEnrollmentId: "",
  subjectId: "",
  bookPart: "",
  issuedDate: "",
  dueDate: "",
  returnedDate: "",
  status: "ISSUED",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateInput(isoDate: string | null): string {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toDateIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ar-YE");
}

function toFormState(item: StudentBookListItem): StudentBookFormState {
  return {
    studentEnrollmentId: item.studentEnrollmentId,
    subjectId: item.subjectId,
    bookPart: item.bookPart,
    issuedDate: toDateInput(item.issuedDate),
    dueDate: toDateInput(item.dueDate),
    returnedDate: toDateInput(item.returnedDate),
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

export function StudentBooksWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-books.create");
  const canUpdate = hasPermission("student-books.update");
  const canDelete = hasPermission("student-books.delete");
  const canReadStudents = hasPermission("students.read");
  const canReadStudentEnrollments = hasPermission("student-enrollments.read");
  const canReadSubjects = hasPermission("subjects.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [enrollmentFilter, setEnrollmentFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StudentBookStatus | "all">("all");
  const [fromIssuedDateFilter, setFromIssuedDateFilter] = React.useState("");
  const [toIssuedDateFilter, setToIssuedDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    student: string;
    enrollment: string;
    subject: string;
    status: StudentBookStatus | "all";
    fromIssuedDate: string;
    toIssuedDate: string;
    active: "all" | "active" | "inactive";
  }>({
    student: "all",
    enrollment: "all",
    subject: "all",
    status: "all",
    fromIssuedDate: "",
    toIssuedDate: "",
    active: "all",
  });

  const [editingStudentBookId, setEditingStudentBookId] = React.useState<string | null>(
    null,
  );
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<StudentBookFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const studentBooksQuery = useStudentBooksQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentEnrollmentId: enrollmentFilter === "all" ? undefined : enrollmentFilter,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    fromIssuedDate: fromIssuedDateFilter ? toDateIso(fromIssuedDateFilter) : undefined,
    toIssuedDate: toIssuedDateFilter ? toDateIso(toIssuedDateFilter) : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const studentsQuery = useStudentOptionsQuery();
  const enrollmentsQuery = useStudentEnrollmentOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();

  const createMutation = useCreateStudentBookMutation();
  const updateMutation = useUpdateStudentBookMutation();
  const deleteMutation = useDeleteStudentBookMutation();

  const books = React.useMemo(() => studentBooksQuery.data?.data ?? [], [studentBooksQuery.data?.data]);
  const pagination = studentBooksQuery.data?.pagination;
  const isEditing = editingStudentBookId !== null;

  const enrollmentOptions = React.useMemo(() => {
    const selectedStudent = isFilterOpen ? filterDraft.student : studentFilter;

    return (enrollmentsQuery.data ?? []).filter((item) =>
      formState.studentEnrollmentId
        ? true
        : selectedStudent === "all" || item.student.id === selectedStudent,
    );
  }, [
    enrollmentsQuery.data,
    filterDraft.student,
    formState.studentEnrollmentId,
    isFilterOpen,
    studentFilter,
  ]);

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = books.some((item) => item.id === editingStudentBookId);
    if (!stillExists) {
      setEditingStudentBookId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [books, editingStudentBookId, isEditing]);

  React.useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

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
      student: studentFilter,
      enrollment: enrollmentFilter,
      subject: subjectFilter,
      status: statusFilter,
      fromIssuedDate: fromIssuedDateFilter,
      toIssuedDate: toIssuedDateFilter,
      active: activeFilter,
    });
  }, [
    activeFilter,
    enrollmentFilter,
    fromIssuedDateFilter,
    isFilterOpen,
    statusFilter,
    studentFilter,
    subjectFilter,
    toIssuedDateFilter,
  ]);

  const resetForm = () => {
    setEditingStudentBookId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingStudentBookId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.studentEnrollmentId || !formState.subjectId || !formState.issuedDate) {
      setFormError("القيد والمادة وتاريخ التسليم حقول مطلوبة.");
      return false;
    }

    if (formState.bookPart.trim().length > 50) {
      setFormError("جزء الكتاب يجب ألا يتجاوز 50 حرفًا.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    if (
      formState.dueDate &&
      formState.issuedDate &&
      formState.dueDate.localeCompare(formState.issuedDate) < 0
    ) {
      setFormError("تاريخ الاستحقاق يجب أن يكون في نفس يوم التسليم أو بعده.");
      return false;
    }

    if (
      formState.returnedDate &&
      formState.issuedDate &&
      formState.returnedDate.localeCompare(formState.issuedDate) < 0
    ) {
      setFormError("تاريخ الإرجاع يجب أن يكون في نفس يوم التسليم أو بعده.");
      return false;
    }

    if (formState.status === "RETURNED" && !formState.returnedDate) {
      setFormError("تاريخ الإرجاع مطلوب عندما تكون الحالة مُعاد.");
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
      studentEnrollmentId: formState.studentEnrollmentId,
      subjectId: formState.subjectId,
      bookPart: toOptionalString(formState.bookPart),
      issuedDate: toDateIso(formState.issuedDate),
      dueDate: formState.dueDate ? toDateIso(formState.dueDate) : undefined,
      returnedDate: formState.returnedDate ? toDateIso(formState.returnedDate) : undefined,
      status: formState.status,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingStudentBookId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: student-books.update.");
        return;
      }

      updateMutation.mutate(
        {
          studentBookId: editingStudentBookId,
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
      setFormError("لا تملك الصلاحية المطلوبة: student-books.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: StudentBookListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingStudentBookId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleToggleActive = (item: StudentBookListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate({
      studentBookId: item.id,
      payload: {
        isActive: !item.isActive,
      },
    });
  };

  const handleDelete = (item: StudentBookListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف كتاب ${item.subject.name} للطالب ${item.studentEnrollment.student.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingStudentBookId === item.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions = canReadStudentEnrollments && canReadSubjects;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStudentFilter("all");
    setEnrollmentFilter("all");
    setSubjectFilter("all");
    setStatusFilter("all");
    setFromIssuedDateFilter("");
    setToIssuedDateFilter("");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setStudentFilter(filterDraft.student);
    setEnrollmentFilter(filterDraft.enrollment);
    setSubjectFilter(filterDraft.subject);
    setStatusFilter(filterDraft.status);
    setFromIssuedDateFilter(filterDraft.fromIssuedDate);
    setToIssuedDateFilter(filterDraft.toIssuedDate);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      studentFilter !== "all" ? 1 : 0,
      enrollmentFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      fromIssuedDateFilter ? 1 : 0,
      toIssuedDateFilter ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [
    activeFilter,
    enrollmentFilter,
    fromIssuedDateFilter,
    searchInput,
    statusFilter,
    studentFilter,
    subjectFilter,
    toIssuedDateFilter,
  ]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث بالطالب/المادة/الجزء..."
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
          title="فلاتر الكتب"
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
            <SelectField
              value={filterDraft.student}
              onChange={(event) => {
                const value = event.target.value;
                setFilterDraft((prev) => ({
                  ...prev,
                  student: value,
                  enrollment: value === "all" ? prev.enrollment : "all",
                }));
              }}
              disabled={!canReadStudents}
            >
              <option value="all">كل الطلاب</option>
              {(studentsQuery.data ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.admissionNo ?? student.fullName}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.enrollment}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, enrollment: event.target.value }))
              }
              disabled={!canReadStudentEnrollments}
            >
              <option value="all">كل القيود</option>
              {enrollmentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.student.fullName} ({item.student.admissionNo ?? "غير متوفر"}) -{" "}
                  {item.academicYear.code} / {item.section.code}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.subject}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, subject: event.target.value }))
              }
              disabled={!canReadSubjects}
            >
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.status}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  status: event.target.value as StudentBookStatus | "all",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {translateStudentBookStatus(status)}
                </option>
              ))}
            </SelectField>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">من تاريخ التسليم</label>
              <Input
                type="date"
                value={filterDraft.fromIssuedDate}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    fromIssuedDate: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">إلى تاريخ التسليم</label>
              <Input
                type="date"
                value={filterDraft.toIssuedDate}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    toIssuedDate: event.target.value,
                  }))
                }
              />
            </div>

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
              <CardTitle>سجلات كتب الطلاب</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة تسليم الكتب للطلاب مع تتبع حالة الكتاب وتواريخ التسليم والإرجاع.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
          {studentBooksQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {studentBooksQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {studentBooksQuery.error instanceof Error
                ? studentBooksQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!studentBooksQuery.isPending && books.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {books.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.studentEnrollment.student.fullName} (
                    {item.studentEnrollment.student.admissionNo ?? "غير متوفر"}) - {item.subject.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    القيد: {item.studentEnrollment.academicYear.code} /{" "}
                    {item.studentEnrollment.section.code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    جزء الكتاب: {item.bookPart} | سُلّم: {formatDate(item.issuedDate)} | الاستحقاق:{" "}
                    {formatDate(item.dueDate)} | الإرجاع: {formatDate(item.returnedDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">ملاحظات: {item.notes ?? "-"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">
                    {translateStudentBookStatus(item.status)}
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
                disabled={!pagination || pagination.page <= 1 || studentBooksQuery.isFetching}
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
                  studentBooksQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void studentBooksQuery.refetch()}
                disabled={studentBooksQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${studentBooksQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء سجل كتاب"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل سجل كتاب طالب" : "إنشاء سجل كتاب طالب"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء سجل كتاب"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>student-books.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                القيد الطلابي *
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.studentEnrollmentId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    studentEnrollmentId: event.target.value,
                  }))
                }
                disabled={!canReadStudentEnrollments}
              >
                <option value="">اختر القيد</option>
                {(enrollmentsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.student.fullName} ({item.student.admissionNo ?? "غير متوفر"}) -{" "}
                    {item.academicYear.code} / {item.section.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">المادة *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.subjectId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, subjectId: event.target.value }))
                }
                disabled={!canReadSubjects}
              >
                <option value="">اختر المادة</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">جزء الكتاب</label>
              <Input
                value={formState.bookPart}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, bookPart: event.target.value }))
                }
                placeholder="مثال: الجزء الأول"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  تاريخ التسليم *
                </label>
                <Input
                  type="date"
                  value={formState.issuedDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, issuedDate: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  تاريخ الاستحقاق
                </label>
                <Input
                  type="date"
                  value={formState.dueDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  تاريخ الإرجاع
                </label>
                <Input
                  type="date"
                  value={formState.returnedDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, returnedDate: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الحالة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: event.target.value as StudentBookStatus,
                    }))
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {translateStudentBookStatus(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="مثال: تم الاستلام بحالة جيدة"
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
                يتطلب هذا الجزء صلاحيات القراءة: <code>student-enrollments.read</code> و{" "}
                <code>subjects.read</code>.
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
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BookText className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء سجل كتاب"}
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
  );
}






