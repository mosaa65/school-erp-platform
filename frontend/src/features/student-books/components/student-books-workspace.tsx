"use client";

import * as React from "react";
import {
  BookText,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return date.toLocaleDateString("en-GB");
}

function studentBookStatusLabel(status: StudentBookStatus): string {
  switch (status) {
    case "ISSUED":
      return "مسلّم";
    case "RETURNED":
      return "مُعاد";
    case "LOST":
      return "مفقود";
    case "DAMAGED":
      return "تالف";
    default:
      return status;
  }
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
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [enrollmentFilter, setEnrollmentFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StudentBookStatus | "all">("all");
  const [fromIssuedDateInput, setFromIssuedDateInput] = React.useState("");
  const [toIssuedDateInput, setToIssuedDateInput] = React.useState("");
  const [fromIssuedDateFilter, setFromIssuedDateFilter] = React.useState("");
  const [toIssuedDateFilter, setToIssuedDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingStudentBookId, setEditingStudentBookId] = React.useState<string | null>(
    null,
  );
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

  const enrollmentOptions = React.useMemo(
    () =>
      (enrollmentsQuery.data ?? []).filter((item) =>
        formState.studentEnrollmentId
          ? true
          : studentFilter === "all" || item.student.id === studentFilter,
      ),
    [enrollmentsQuery.data, formState.studentEnrollmentId, studentFilter],
  );

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
    }
  }, [books, editingStudentBookId, isEditing]);

  const resetForm = () => {
    setEditingStudentBookId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setFromIssuedDateFilter(fromIssuedDateInput);
    setToIssuedDateFilter(toIssuedDateInput);
  };

  const validateForm = (): boolean => {
    if (!formState.studentEnrollmentId || !formState.subjectId || !formState.issuedDate) {
      setFormError("القيد والمادة وتاريخ التسليم حقول مطلوبة.");
      return false;
    }

    if (formState.bookPart.trim().length > 50) {
      setFormError("bookPart يجب ألا يتجاوز 50 حرف.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("notes يجب ألا يتجاوز 255 حرف.");
      return false;
    }

    if (
      formState.dueDate &&
      formState.issuedDate &&
      formState.dueDate.localeCompare(formState.issuedDate) < 0
    ) {
      setFormError("dueDate يجب أن يكون في أو بعد issuedDate.");
      return false;
    }

    if (
      formState.returnedDate &&
      formState.issuedDate &&
      formState.returnedDate.localeCompare(formState.issuedDate) < 0
    ) {
      setFormError("returnedDate يجب أن يكون في أو بعد issuedDate.");
      return false;
    }

    if (formState.status === "RETURNED" && !formState.returnedDate) {
      setFormError("returnedDate مطلوب عندما الحالة RETURNED.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
        setFormError("لا تملك صلاحية student-books.update.");
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
      setFormError("لا تملك صلاحية student-books.create.");
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

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookText className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل سجل كتاب طالب" : "إنشاء سجل كتاب طالب"}
          </CardTitle>
          <CardDescription>
            {isEditing ? "تحديث سجل الكتاب للطالب." : "إضافة سجل كتاب جديد للطالب."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>student-books.create</code>.
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
                  placeholder="PART_1"
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
                        {studentBookStatusLabel(status)}
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
                  يلزم صلاحيات القراءة: <code>student-enrollments.read</code> و{" "}
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
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>سجلات كتب الطلاب</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة تسليم الكتب للطلاب مع تتبع حالة الكتاب وتواريخ التسليم والإرجاع.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_150px_190px_170px_150px_150px_150px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالطالب/المادة/الجزء..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={studentFilter}
              onChange={(event) => {
                setPage(1);
                setStudentFilter(event.target.value);
                if (event.target.value !== "all") {
                  setEnrollmentFilter("all");
                }
              }}
              disabled={!canReadStudents}
            >
              <option value="all">كل الطلاب</option>
              {(studentsQuery.data ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.admissionNo ?? student.fullName}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={enrollmentFilter}
              onChange={(event) => {
                setPage(1);
                setEnrollmentFilter(event.target.value);
              }}
              disabled={!canReadStudentEnrollments}
            >
              <option value="all">كل القيود</option>
              {enrollmentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.student.fullName} ({item.student.admissionNo ?? "غير متوفر"}) -{" "}
                  {item.academicYear.code} / {item.section.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={subjectFilter}
              onChange={(event) => {
                setPage(1);
                setSubjectFilter(event.target.value);
              }}
              disabled={!canReadSubjects}
            >
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as StudentBookStatus | "all");
              }}
            >
              <option value="all">كل الحالات</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {studentBookStatusLabel(status)}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={fromIssuedDateInput}
              onChange={(event) => setFromIssuedDateInput(event.target.value)}
            />

            <Input
              type="date"
              value={toIssuedDateInput}
              onChange={(event) => setToIssuedDateInput(event.target.value)}
            />

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </select>

            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {studentBooksQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {studentBooksQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {studentBooksQuery.error instanceof Error
                ? studentBooksQuery.error.message
                : "فشل التحميل"}
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
                  <Badge variant="secondary">{studentBookStatusLabel(item.status)}</Badge>
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
  );
}






