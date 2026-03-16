"use client";

import * as React from "react";
import {
  AlertTriangle,
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
import { useStudentOptionsQuery } from "@/features/student-books/hooks/use-student-options-query";
import {
  useCreateStudentProblemMutation,
  useDeleteStudentProblemMutation,
  useUpdateStudentProblemMutation,
} from "@/features/student-problems/hooks/use-student-problems-mutations";
import { useStudentProblemsQuery } from "@/features/student-problems/hooks/use-student-problems-query";
import type { StudentProblemListItem } from "@/lib/api/client";

type StudentProblemFormState = {
  studentId: string;
  problemDate: string;
  problemType: string;
  problemDescription: string;
  actionsTaken: string;
  hasMinutes: boolean;
  isResolved: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: StudentProblemFormState = {
  studentId: "",
  problemDate: "",
  problemType: "",
  problemDescription: "",
  actionsTaken: "",
  hasMinutes: false,
  isResolved: false,
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

function toFormState(item: StudentProblemListItem): StudentProblemFormState {
  return {
    studentId: item.studentId,
    problemDate: toDateInput(item.problemDate),
    problemType: item.problemType ?? "",
    problemDescription: item.problemDescription,
    actionsTaken: item.actionsTaken ?? "",
    hasMinutes: item.hasMinutes,
    isResolved: item.isResolved,
    isActive: item.isActive,
  };
}

export function StudentProblemsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-problems.create");
  const canUpdate = hasPermission("student-problems.update");
  const canDelete = hasPermission("student-problems.delete");
  const canReadStudents = hasPermission("students.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "resolved" | "open">(
    "all",
  );
  const [fromDateInput, setFromDateInput] = React.useState("");
  const [toDateInput, setToDateInput] = React.useState("");
  const [fromDateFilter, setFromDateFilter] = React.useState("");
  const [toDateFilter, setToDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingProblemId, setEditingProblemId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<StudentProblemFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const problemsQuery = useStudentProblemsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    isResolved:
      statusFilter === "all" ? undefined : statusFilter === "resolved",
    fromProblemDate: fromDateFilter ? toDateIso(fromDateFilter) : undefined,
    toProblemDate: toDateFilter ? toDateIso(toDateFilter) : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const studentsQuery = useStudentOptionsQuery();

  const createMutation = useCreateStudentProblemMutation();
  const updateMutation = useUpdateStudentProblemMutation();
  const deleteMutation = useDeleteStudentProblemMutation();

  const problems = React.useMemo(() => problemsQuery.data?.data ?? [], [problemsQuery.data?.data]);
  const pagination = problemsQuery.data?.pagination;
  const isEditing = editingProblemId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = problems.some((item) => item.id === editingProblemId);
    if (!stillExists) {
      setEditingProblemId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingProblemId, isEditing, problems]);

  const resetForm = () => {
    setEditingProblemId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setFromDateFilter(fromDateInput);
    setToDateFilter(toDateInput);
  };

  const validateForm = (): boolean => {
    if (!formState.studentId || !formState.problemDate || !formState.problemDescription.trim()) {
      setFormError("الطالب وتاريخ المشكلة ووصف المشكلة حقول مطلوبة.");
      return false;
    }

    if (formState.problemType.trim().length > 50) {
      setFormError("نوع المشكلة يجب ألا يتجاوز 50 حرفًا.");
      return false;
    }

    if (formState.problemDescription.trim().length > 1000) {
      setFormError("وصف المشكلة يجب ألا يتجاوز 1000 حرف.");
      return false;
    }

    if (formState.actionsTaken.trim().length > 1000) {
      setFormError("الإجراءات المتخذة يجب ألا تتجاوز 1000 حرف.");
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
      studentId: formState.studentId,
      problemDate: toDateIso(formState.problemDate),
      problemType: toOptionalString(formState.problemType),
      problemDescription: formState.problemDescription.trim(),
      actionsTaken: toOptionalString(formState.actionsTaken),
      hasMinutes: formState.hasMinutes,
      isResolved: formState.isResolved,
      isActive: formState.isActive,
    };

    if (isEditing && editingProblemId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: student-problems.update.");
        return;
      }

      updateMutation.mutate(
        {
          problemId: editingProblemId,
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
      setFormError("لا تملك الصلاحية المطلوبة: student-problems.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: StudentProblemListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingProblemId(item.id);
    setFormState(toFormState(item));
  };

  const handleDelete = (item: StudentProblemListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف مشكلة الطالب ${item.student.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingProblemId === item.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[450px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل مشكلة طالب" : "إضافة مشكلة طالب"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث سجل المشكلة والإجراءات المتخذة."
              : "توثيق مشكلة طالب ومتابعة معالجتها."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>student-problems.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الطالب *</label>
                <select
                  data-testid="student-problem-form-student"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.studentId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, studentId: event.target.value }))
                  }
                  disabled={!canReadStudents}
                >
                  <option value="">اختر الطالب</option>
                  {(studentsQuery.data ?? []).map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} ({student.admissionNo ?? "بدون رقم"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">تاريخ المشكلة *</label>
                  <Input
                    data-testid="student-problem-form-date"
                    type="date"
                    value={formState.problemDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, problemDate: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">نوع المشكلة</label>
                  <Input
                    data-testid="student-problem-form-type"
                    value={formState.problemType}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, problemType: event.target.value }))
                    }
                    placeholder="مثال: سلوكي"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">وصف المشكلة *</label>
                <textarea
                  data-testid="student-problem-form-description"
                  className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.problemDescription}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, problemDescription: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الإجراءات المتخذة</label>
                <textarea
                  data-testid="student-problem-form-actions"
                  className="min-h-[86px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.actionsTaken}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, actionsTaken: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>محضر</span>
                  <input
                    data-testid="student-problem-form-has-minutes"
                    type="checkbox"
                    checked={formState.hasMinutes}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, hasMinutes: event.target.checked }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>تم الحل</span>
                  <input
                    data-testid="student-problem-form-resolved"
                    type="checkbox"
                    checked={formState.isResolved}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, isResolved: event.target.checked }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>نشط</span>
                  <input
                    data-testid="student-problem-form-active"
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                    }
                  />
                </label>
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
                  data-testid="student-problem-form-submit"
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isFormSubmitting || (!canCreate && !isEditing)}
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إضافة المشكلة"}
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
            <CardTitle>مشكلات الطلاب</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>متابعة المشكلات الطلابية والإجراءات التصحيحية.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_170px_130px_150px_150px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالطالب/الوصف..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={studentFilter}
              onChange={(event) => {
                setPage(1);
                setStudentFilter(event.target.value);
              }}
            >
              <option value="all">كل الطلاب</option>
              {(studentsQuery.data ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName} ({student.admissionNo ?? "بدون رقم"})
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as "all" | "resolved" | "open");
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="resolved">محلولة</option>
              <option value="open">غير محلولة</option>
            </select>

            <Input
              type="date"
              value={fromDateInput}
              onChange={(event) => setFromDateInput(event.target.value)}
            />

            <Input
              type="date"
              value={toDateInput}
              onChange={(event) => setToDateInput(event.target.value)}
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
          {problemsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {problemsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {problemsQuery.error instanceof Error ? problemsQuery.error.message : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!problemsQuery.isPending && problems.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {problems.map((item) => (
            <div
              key={item.id}
              data-testid="student-problem-card"
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {item.student.fullName} ({item.student.admissionNo ?? "بدون رقم"})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    التاريخ: {formatDate(item.problemDate)} | النوع: {item.problemType ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">الوصف: {item.problemDescription}</p>
                  <p className="text-xs text-muted-foreground">الإجراء: {item.actionsTaken ?? "-"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.isResolved ? "default" : "outline"}>
                    {item.isResolved ? "محلولة" : "غير محلولة"}
                  </Badge>
                  <Badge variant={item.hasMinutes ? "secondary" : "outline"}>
                    {item.hasMinutes ? "محضر" : "بدون محضر"}
                  </Badge>
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-testid="student-problem-card-edit"
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
                  data-testid="student-problem-card-delete"
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
                disabled={!pagination || pagination.page <= 1 || problemsQuery.isFetching}
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
                  problemsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void problemsQuery.refetch()}
                disabled={problemsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${problemsQuery.isFetching ? "animate-spin" : ""}`}
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
