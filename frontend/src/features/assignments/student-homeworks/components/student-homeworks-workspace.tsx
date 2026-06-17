"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
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
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { StudentEnrollmentPickerSheet } from "@/components/ui/student-enrollment-picker-sheet";
import { TextareaField } from "@/components/ui/textarea-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateStudentHomeworkMutation,
  useDeleteStudentHomeworkMutation,
  useUpdateStudentHomeworkMutation,
} from "@/features/assignments/student-homeworks/hooks/use-student-homeworks-mutations";
import { useHomeworkOptionsQuery } from "@/features/assignments/student-homeworks/hooks/use-homework-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/assignments/student-homeworks/hooks/use-student-enrollment-options-query";
import { useStudentHomeworksQuery } from "@/features/assignments/student-homeworks/hooks/use-student-homeworks-query";
import { toStudentEnrollmentPickerOption } from "@/features/students/lib/student-enrollment-picker";
import type { StudentHomeworkListItem } from "@/lib/api/client";
import {
  formatNameCodeLabel,
  formatSectionWithGradeLabel,
} from "@/lib/option-labels";

type StudentHomeworkFormState = {
  homeworkId: string;
  studentEnrollmentId: string;
  isCompleted: boolean;
  submittedAt: string;
  manualScore: string;
  teacherNotes: string;
  isActive: boolean;
};

type FilterState = {
  homework: string;
  enrollment: string;
  student: string;
  completed: "all" | "completed" | "pending";
  active: "all" | "active" | "inactive";
  fromSubmittedAt: string;
  toSubmittedAt: string;
};

type QuickHomeworkDraft = {
  score: string;
  note: string;
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

const DEFAULT_FILTER_STATE: FilterState = {
  homework: "all",
  enrollment: "all",
  student: "all",
  completed: "all",
  active: "all",
  fromSubmittedAt: "",
  toSubmittedAt: "",
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

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateTimeIso(dateTimeLocalInput: string): string {
  return new Date(dateTimeLocalInput).toISOString();
}

function nowAsDateTimeLocalInput(): string {
  return toDateTimeLocalInput(new Date().toISOString());
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

function getStudentFilterOptions(records: StudentHomeworkListItem[]) {
  const options = new Map<string, string>();

  for (const item of records) {
    options.set(
      item.studentEnrollment.student.id,
      item.studentEnrollment.student.fullName,
    );
  }

  return Array.from(options.entries()).sort((left, right) =>
    left[1].localeCompare(right[1], "ar", { sensitivity: "base" }),
  );
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
  const [enrollmentFilter, setEnrollmentFilter] = React.useState("all");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [completedFilter, setCompletedFilter] =
    React.useState<FilterState["completed"]>("all");
  const [activeFilter, setActiveFilter] =
    React.useState<FilterState["active"]>("all");
  const [fromSubmittedAtFilter, setFromSubmittedAtFilter] =
    React.useState("");
  const [toSubmittedAtFilter, setToSubmittedAtFilter] = React.useState("");
  const [filterDraft, setFilterDraft] =
    React.useState<FilterState>(DEFAULT_FILTER_STATE);

  const [editingStudentHomeworkId, setEditingStudentHomeworkId] =
    React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] =
    React.useState<StudentHomeworkFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [quickHomeworkId, setQuickHomeworkId] = React.useState("");
  const [quickDrafts, setQuickDrafts] = React.useState<
    Record<string, QuickHomeworkDraft>
  >({});

  const studentHomeworksQuery = useStudentHomeworksQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    homeworkId: homeworkFilter === "all" ? undefined : homeworkFilter,
    studentEnrollmentId:
      enrollmentFilter === "all" ? undefined : enrollmentFilter,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    isCompleted:
      completedFilter === "all" ? undefined : completedFilter === "completed",
    fromSubmittedAt: fromSubmittedAtFilter
      ? toDateTimeIso(`${fromSubmittedAtFilter}T00:00`)
      : undefined,
    toSubmittedAt: toSubmittedAtFilter
      ? toDateTimeIso(`${toSubmittedAtFilter}T23:59`)
      : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const quickBoardQuery = useStudentHomeworksQuery({
    page: 1,
    limit: 200,
    homeworkId: quickHomeworkId || undefined,
    isActive: true,
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
  const quickBoardRecords = React.useMemo(
    () => quickBoardQuery.data?.data ?? [],
    [quickBoardQuery.data?.data],
  );
  const isEditing = editingStudentHomeworkId !== null;
  const studentFilterOptions = React.useMemo(
    () => getStudentFilterOptions(records),
    [records],
  );

  const selectedHomeworkForForm = React.useMemo(
    () =>
      (homeworksQuery.data ?? []).find((item) => item.id === formState.homeworkId),
    [formState.homeworkId, homeworksQuery.data],
  );

  const selectedHomeworkForQuickBoard = React.useMemo(
    () => (homeworksQuery.data ?? []).find((item) => item.id === quickHomeworkId),
    [homeworksQuery.data, quickHomeworkId],
  );

  const selectedEnrollmentForForm = React.useMemo(
    () =>
      (enrollmentsQuery.data ?? []).find(
        (item) => item.id === formState.studentEnrollmentId,
      ) ?? null,
    [enrollmentsQuery.data, formState.studentEnrollmentId],
  );

  const selectedEnrollmentOptionForForm = React.useMemo(
    () =>
      selectedEnrollmentForForm
        ? toStudentEnrollmentPickerOption(selectedEnrollmentForForm)
        : null,
    [selectedEnrollmentForForm],
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

    const stillExists = records.some(
      (item) => item.id === editingStudentHomeworkId,
    );
    if (!stillExists) {
      setEditingStudentHomeworkId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingStudentHomeworkId, isEditing, records]);

  React.useEffect(() => {
    if (quickHomeworkId || (homeworksQuery.data ?? []).length === 0) {
      return;
    }

    setQuickHomeworkId(homeworksQuery.data?.[0]?.id ?? "");
  }, [homeworksQuery.data, quickHomeworkId]);

  React.useEffect(() => {
    setQuickDrafts((previous) => {
      const next = { ...previous };

      for (const item of quickBoardRecords) {
        if (next[item.id]) {
          continue;
        }

        next[item.id] = {
          score:
            item.manualScore === null
              ? item.isCompleted
                ? String(item.homework.maxScore)
                : ""
              : String(item.manualScore),
          note: item.teacherNotes ?? "",
        };
      }

      return next;
    });
  }, [quickBoardRecords]);

  useDebounceEffect(
    () => {
      setPage(1);
      setSearch(searchInput.trim());
    },
    400,
    [searchInput],
  );

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      homework: homeworkFilter,
      enrollment: enrollmentFilter,
      student: studentFilter,
      completed: completedFilter,
      active: activeFilter,
      fromSubmittedAt: fromSubmittedAtFilter,
      toSubmittedAt: toSubmittedAtFilter,
    });
  }, [
    activeFilter,
    completedFilter,
    enrollmentFilter,
    fromSubmittedAtFilter,
    homeworkFilter,
    isFilterOpen,
    studentFilter,
    toSubmittedAtFilter,
  ]);

  const resetFormState = () => {
    setEditingStudentHomeworkId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
    setActionSuccess(null);
  };

  const validateForm = (): boolean => {
    if (!formState.homeworkId || !formState.studentEnrollmentId) {
      setFormError("الواجب وقيد الطالب حقول مطلوبة.");
      return false;
    }

    if (formState.teacherNotes.trim().length > 255) {
      setFormError("ملاحظات المعلم يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    const score = formState.manualScore.trim()
      ? Number(formState.manualScore)
      : null;
    if (score !== null && (!Number.isFinite(score) || score < 0)) {
      setFormError("الدرجة اليدوية يجب أن تكون رقمًا صالحًا أكبر من أو يساوي 0.");
      return false;
    }

    if (score !== null && selectedHomeworkForForm && score > selectedHomeworkForForm.maxScore) {
      setFormError(`الدرجة اليدوية يجب ألا تتجاوز ${selectedHomeworkForForm.maxScore}.`);
      return false;
    }

    if (formState.submittedAt && Number.isNaN(new Date(formState.submittedAt).getTime())) {
      setFormError("وقت التسليم غير صالح.");
      return false;
    }

    const selectedEnrollment = (enrollmentsQuery.data ?? []).find(
      (item) => item.id === formState.studentEnrollmentId,
    );
    if (selectedHomeworkForForm && selectedEnrollment) {
      if (selectedEnrollment.academicYearId !== selectedHomeworkForForm.academicYearId) {
        setFormError("قيد الطالب لا يطابق سنة الواجب.");
        return false;
      }

      if (!selectedEnrollment.sectionId) {
        setFormError("قيد الطالب غير موزع على شعبة بعد.");
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

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionSuccess(null);
    if (!validateForm()) {
      return;
    }

    const score = formState.manualScore.trim()
      ? Number(formState.manualScore)
      : undefined;

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
            resetFormState();
            setIsFormOpen(false);
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
        resetFormState();
        setIsFormOpen(false);
        setPage(1);
        setActionSuccess("تم إنشاء واجب الطالب بنجاح.");
      },
    });
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingStudentHomeworkId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
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

  const handleQuickCompletion = (
    item: StudentHomeworkListItem,
    isCompleted: boolean,
  ) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate(
      {
        studentHomeworkId: item.id,
        payload: {
          isCompleted,
          submittedAt: isCompleted
            ? item.submittedAt ?? new Date().toISOString()
            : undefined,
        },
      },
      {
        onSuccess: () => {
          setActionSuccess(
            isCompleted ? "تم تعليم الواجب كمكتمل." : "تم إلغاء اكتمال الواجب.",
          );
        },
      },
    );
  };

  const updateQuickDraft = (
    studentHomeworkId: string,
    patch: Partial<QuickHomeworkDraft>,
  ) => {
    setQuickDrafts((previous) => ({
      ...previous,
      [studentHomeworkId]: {
        score: previous[studentHomeworkId]?.score ?? "",
        note: previous[studentHomeworkId]?.note ?? "",
        ...patch,
      },
    }));
  };

  const handleQuickBoardDecision = (
    item: StudentHomeworkListItem,
    isCompleted: boolean,
  ) => {
    if (!canUpdate) {
      return;
    }

    const draft = quickDrafts[item.id] ?? { score: "", note: "" };
    const resolvedScore = isCompleted
      ? draft.score.trim()
        ? Number(draft.score)
        : item.homework.maxScore
      : 0;

    if (!Number.isFinite(resolvedScore) || resolvedScore < 0) {
      setActionSuccess(null);
      setFormError("درجة الإدخال السريع يجب أن تكون رقمًا صالحًا.");
      return;
    }

    if (resolvedScore > item.homework.maxScore) {
      setActionSuccess(null);
      setFormError(`درجة الطالب يجب ألا تتجاوز ${item.homework.maxScore}.`);
      return;
    }

    updateMutation.mutate(
      {
        studentHomeworkId: item.id,
        payload: {
          isCompleted,
          submittedAt: isCompleted
            ? item.submittedAt ?? new Date().toISOString()
            : undefined,
          manualScore: resolvedScore,
          teacherNotes: toOptionalString(draft.note),
        },
      },
      {
        onSuccess: () => {
          setFormError(null);
          setActionSuccess(
            isCompleted
              ? `تم تسجيل ${item.studentEnrollment.student.fullName}: نفذ.`
              : `تم تسجيل ${item.studentEnrollment.student.fullName}: لم ينفذ.`,
          );
        },
      },
    );
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

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setHomeworkFilter("all");
    setEnrollmentFilter("all");
    setStudentFilter("all");
    setCompletedFilter("all");
    setActiveFilter("all");
    setFromSubmittedAtFilter("");
    setToSubmittedAtFilter("");
    setFilterDraft(DEFAULT_FILTER_STATE);
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setHomeworkFilter(filterDraft.homework);
    setEnrollmentFilter(filterDraft.enrollment);
    setStudentFilter(filterDraft.student);
    setCompletedFilter(filterDraft.completed);
    setActiveFilter(filterDraft.active);
    setFromSubmittedAtFilter(filterDraft.fromSubmittedAt);
    setToSubmittedAtFilter(filterDraft.toSubmittedAt);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(
    () =>
      [
        searchInput.trim() ? 1 : 0,
        homeworkFilter !== "all" ? 1 : 0,
        enrollmentFilter !== "all" ? 1 : 0,
        studentFilter !== "all" ? 1 : 0,
        completedFilter !== "all" ? 1 : 0,
        activeFilter !== "all" ? 1 : 0,
        fromSubmittedAtFilter ? 1 : 0,
        toSubmittedAtFilter ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
    [
      activeFilter,
      completedFilter,
      enrollmentFilter,
      fromSubmittedAtFilter,
      homeworkFilter,
      searchInput,
      studentFilter,
      toSubmittedAtFilter,
    ],
  );

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions =
    canReadHomeworks && canReadEnrollments && canReadStudents;

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث باسم الطالب أو الواجب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
        />

        <Card className="rounded-[28px] border-[color:var(--app-accent-strong)]/35 bg-gradient-to-br from-[color:var(--app-accent-soft)]/40 via-card/95 to-background/90 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>لوحة إدخال الواجب السريع</CardTitle>
                <CardDescription>
                  اختر الواجب، ثم سجّل لكل طالب بزرين فقط مع الدرجة والملاحظة.
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {quickBoardRecords.length} طالب
              </Badge>
            </div>

            <SelectField
              value={quickHomeworkId}
              onChange={(event) => setQuickHomeworkId(event.target.value)}
              disabled={!canReadHomeworks || homeworksQuery.isPending}
            >
              <option value="">اختر واجبًا للإدخال السريع</option>
              {(homeworksQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} - {formatSectionWithGradeLabel(item.section)} -{" "}
                  {formatNameCodeLabel(item.subject.name, item.subject.code)}
                </option>
              ))}
            </SelectField>

            {selectedHomeworkForQuickBoard ? (
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full border border-sky-300/60 bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300">
                  {formatSectionWithGradeLabel(selectedHomeworkForQuickBoard.section)}
                </span>
                <span className="rounded-full border border-violet-300/60 bg-violet-500/10 px-2.5 py-1 text-violet-700 dark:text-violet-300">
                  {formatNameCodeLabel(
                    selectedHomeworkForQuickBoard.subject.name,
                    selectedHomeworkForQuickBoard.subject.code,
                  )}
                </span>
                <span className="rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                  الدرجة من {selectedHomeworkForQuickBoard.maxScore}
                </span>
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-3">
            {quickBoardQuery.isPending && quickHomeworkId ? (
              <div className="flex items-center justify-center gap-2 rounded-[24px] border border-dashed border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                جارٍ تجهيز بطاقات الطلاب...
              </div>
            ) : null}

            {!quickHomeworkId ? (
              <div className="rounded-[24px] border border-dashed border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
                اختر واجبًا من الأعلى لعرض الطلاب المرتبطين به.
              </div>
            ) : null}

            {quickHomeworkId &&
            !quickBoardQuery.isPending &&
            quickBoardRecords.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
                لا توجد سجلات طلاب لهذا الواجب بعد. افتح شاشة الواجبات واضغط
                تعبئة الطلاب.
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {quickBoardRecords.map((item) => {
                const draft = quickDrafts[item.id] ?? { score: "", note: "" };

                return (
                  <div
                    key={item.id}
                    className="rounded-[24px] border border-border/60 bg-background/85 p-3 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold">
                          {item.studentEnrollment.student.fullName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.studentEnrollment.student.admissionNo
                            ? `رقم الطالب ${item.studentEnrollment.student.admissionNo}`
                            : formatSectionWithGradeLabel(item.studentEnrollment.section)}
                        </p>
                      </div>
                      <Badge variant={item.isCompleted ? "default" : "secondary"}>
                        {item.isCompleted ? "نفذ" : "لم ينفذ"}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={item.homework.maxScore}
                        step={0.01}
                        value={draft.score}
                        onChange={(event) =>
                          updateQuickDraft(item.id, { score: event.target.value })
                        }
                        placeholder={`/${item.homework.maxScore}`}
                        aria-label="درجة الطالب"
                      />
                      <Input
                        value={draft.note}
                        onChange={(event) =>
                          updateQuickDraft(item.id, { note: event.target.value })
                        }
                        placeholder="ملاحظة مختصرة"
                        aria-label="ملاحظة الطالب"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        className="gap-1.5"
                        onClick={() => handleQuickBoardDecision(item, true)}
                        disabled={!canUpdate || updateMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        نفذ
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => handleQuickBoardDecision(item, false)}
                        disabled={!canUpdate || updateMutation.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                        لم ينفذ
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر واجبات الطلاب"
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
          <div className="grid gap-3">
            <SelectField
              value={filterDraft.homework}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, homework: event.target.value }))
              }
              disabled={!canReadHomeworks}
            >
              <option value="all">كل الواجبات</option>
              {(homeworksQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} - {formatSectionWithGradeLabel(item.section)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.enrollment}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  enrollment: event.target.value,
                  student: "all",
                }))
              }
              disabled={!canReadEnrollments}
            >
              <option value="all">كل قيود الطلاب</option>
              {(enrollmentsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.student.fullName} - {formatNameCodeLabel(item.academicYear.name, item.academicYear.code)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.student}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  student: event.target.value,
                  enrollment: "all",
                }))
              }
              disabled={!canReadStudents}
            >
              <option value="all">كل الطلاب الظاهرين</option>
              {studentFilterOptions.map(([studentId, studentName]) => (
                <option key={studentId} value={studentId}>
                  {studentName}
                </option>
              ))}
            </SelectField>

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                value={filterDraft.completed}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    completed: event.target.value as FilterState["completed"],
                  }))
                }
              >
                <option value="all">كل الحالات</option>
                <option value="completed">مكتمل</option>
                <option value="pending">قيد الإنجاز</option>
              </SelectField>

              <SelectField
                value={filterDraft.active}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    active: event.target.value as FilterState["active"],
                  }))
                }
              >
                <option value="all">كل السجلات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </SelectField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                value={filterDraft.fromSubmittedAt}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    fromSubmittedAt: event.target.value,
                  }))
                }
                aria-label="من تاريخ التسليم"
              />
              <Input
                type="date"
                value={filterDraft.toSubmittedAt}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    toSubmittedAt: event.target.value,
                  }))
                }
                aria-label="إلى تاريخ التسليم"
              />
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>واجبات الطلاب</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              مراجعة حالة إنجاز الواجب لكل طالب مع تحديث سريع للتسليم والدرجة.
            </CardDescription>
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

            {records.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="break-words font-medium">
                      {item.studentEnrollment.student.fullName} - {item.homework.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatSectionWithGradeLabel(item.studentEnrollment.section)} -{" "}
                      {formatNameCodeLabel(
                        item.homework.subject.name,
                        item.homework.subject.code,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الواجب: {formatDate(item.homework.homeworkDate)} | الاستحقاق:{" "}
                      {formatDate(item.homework.dueDate)} | العظمى:{" "}
                      {item.homework.maxScore}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      التسليم: {formatDateTime(item.submittedAt)} | الدرجة:{" "}
                      {item.manualScore === null ? "-" : item.manualScore}
                    </p>
                    {item.teacherNotes ? (
                      <p className="break-words text-xs text-muted-foreground">
                        ملاحظات: {item.teacherNotes}
                      </p>
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
                    onClick={() => handleQuickCompletion(item, !item.isCompleted)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    {item.isCompleted ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {item.isCompleted ? "إلغاء الاكتمال" : "تم الإنجاز"}
                  </Button>
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
                  disabled={
                    !pagination ||
                    pagination.page <= 1 ||
                    studentHomeworksQuery.isFetching
                  }
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) =>
                      pagination
                        ? Math.min(prev + 1, pagination.totalPages)
                        : prev,
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
                    className={`h-4 w-4 ${
                      studentHomeworksQuery.isFetching ? "animate-spin" : ""
                    }`}
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
        ariaLabel="إنشاء واجب طالب"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل واجب طالب" : "إنشاء واجب طالب"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء واجب طالب"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>student-homeworks.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <CardDescription>
              ربط الطالب بالواجب وتحديث حالة الإنجاز والدرجة اليدوية عند الحاجة.
            </CardDescription>

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
              required
            >
              <option value="">اختر الواجب *</option>
              {(homeworksQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({formatSectionWithGradeLabel(item.section)} /{" "}
                  {formatNameCodeLabel(item.subject.name, item.subject.code)})
                </option>
              ))}
            </SelectField>

            <StudentEnrollmentPickerSheet
              value={formState.studentEnrollmentId}
              selectedOption={selectedEnrollmentOptionForForm}
              onSelect={(option) =>
                setFormState((prev) => ({
                  ...prev,
                  studentEnrollmentId: option?.id ?? "",
                }))
              }
              scope="assignments.student-homeworks"
              variant="form"
              academicYearId={selectedHomeworkForForm?.academicYearId}
              sectionId={selectedHomeworkForForm?.sectionId ?? undefined}
              placeholder="اختر قيد الطالب *"
              title="اختيار قيد الطالب"
              searchPlaceholder="ابحث باسم الطالب أو رقم القيد"
              emptySelectionLabel="إلغاء اختيار القيد"
              allowEmptySelection={false}
              disabled={!canReadEnrollments || !selectedHomeworkForForm}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <FormBooleanField
                label="مكتمل"
                checked={formState.isCompleted}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({
                    ...prev,
                    isCompleted: checked,
                    submittedAt:
                      checked && !prev.submittedAt
                        ? nowAsDateTimeLocalInput()
                        : prev.submittedAt,
                  }))
                }
              />
              <FormBooleanField
                label="نشط"
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="datetime-local"
                value={formState.submittedAt}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    submittedAt: event.target.value,
                  }))
                }
                disabled={!formState.isCompleted}
                aria-label="وقت التسليم"
              />
              <Input
                type="number"
                min={0}
                max={selectedHomeworkForForm?.maxScore}
                step={0.01}
                value={formState.manualScore}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    manualScore: event.target.value,
                  }))
                }
                disabled={!formState.isCompleted}
                placeholder={
                  selectedHomeworkForForm
                    ? `الدرجة من ${selectedHomeworkForForm.maxScore}`
                    : "الدرجة اليدوية"
                }
              />
            </div>

            <TextareaField
              value={formState.teacherNotes}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  teacherNotes: event.target.value,
                }))
              }
              placeholder="ملاحظات المعلم"
              rows={3}
            />

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
                يتطلب هذا الجزء صلاحيات القراءة: <code>homeworks.read</code>,{" "}
                <code>student-enrollments.read</code>, <code>students.read</code>.
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
                  <ClipboardCheck className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء واجب طالب"}
              </Button>
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  onClick={resetForm}
                >
                  <RotateCcw className="h-4 w-4" />
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
