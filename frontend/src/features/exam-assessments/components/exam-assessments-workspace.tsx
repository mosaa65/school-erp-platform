"use client";

import * as React from "react";
import {
  CalendarCheck2,
  LoaderCircle,
  Lock,
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
  useCreateExamAssessmentMutation,
  useDeleteExamAssessmentMutation,
  useUpdateExamAssessmentMutation,
} from "@/features/exam-assessments/hooks/use-exam-assessments-mutations";
import { useExamAssessmentsQuery } from "@/features/exam-assessments/hooks/use-exam-assessments-query";
import { useExamPeriodOptionsQuery } from "@/features/exam-assessments/hooks/use-exam-period-options-query";
import { useSectionOptionsQuery } from "@/features/exam-assessments/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/exam-assessments/hooks/use-subject-options-query";
import type { AssessmentType, ExamAssessmentListItem } from "@/lib/api/client";

type ExamAssessmentFormState = {
  examPeriodId: string;
  sectionId: string;
  subjectId: string;
  title: string;
  examDate: string;
  maxScore: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const ASSESSMENT_TYPE_OPTIONS: Array<{ value: AssessmentType; label: string }> = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "MIDTERM", label: "Midterm" },
  { value: "FINAL", label: "Final" },
  { value: "QUIZ", label: "Quiz" },
  { value: "ORAL", label: "Oral" },
  { value: "PRACTICAL", label: "Practical" },
  { value: "PROJECT", label: "Project" },
];

const DEFAULT_FORM_STATE: ExamAssessmentFormState = {
  examPeriodId: "",
  sectionId: "",
  subjectId: "",
  title: "",
  examDate: "",
  maxScore: "20",
  notes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateTimeLocalInput(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function toDateTimeIso(dateTimeLocalInput: string): string {
  return new Date(dateTimeLocalInput).toISOString();
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toFormState(item: ExamAssessmentListItem): ExamAssessmentFormState {
  return {
    examPeriodId: item.examPeriodId,
    sectionId: item.sectionId,
    subjectId: item.subjectId,
    title: item.title,
    examDate: toDateTimeLocalInput(item.examDate),
    maxScore: String(item.maxScore),
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

function getAssessmentTypeLabel(value: AssessmentType): string {
  return (
    ASSESSMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function ExamAssessmentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("exam-assessments.create");
  const canUpdate = hasPermission("exam-assessments.update");
  const canDelete = hasPermission("exam-assessments.delete");
  const canReadExamPeriods = hasPermission("exam-periods.read");
  const canReadSections = hasPermission("sections.read");
  const canReadSubjects = hasPermission("subjects.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [examPeriodFilter, setExamPeriodFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [fromExamDateInput, setFromExamDateInput] = React.useState("");
  const [toExamDateInput, setToExamDateInput] = React.useState("");
  const [fromExamDateFilter, setFromExamDateFilter] = React.useState("");
  const [toExamDateFilter, setToExamDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingExamAssessmentId, setEditingExamAssessmentId] = React.useState<string | null>(
    null,
  );
  const [formState, setFormState] = React.useState<ExamAssessmentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const examPeriodsQuery = useExamPeriodOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const examAssessmentsQuery = useExamAssessmentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    examPeriodId: examPeriodFilter === "all" ? undefined : examPeriodFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    fromExamDate: fromExamDateFilter
      ? toDateTimeIso(`${fromExamDateFilter}T00:00`)
      : undefined,
    toExamDate: toExamDateFilter ? toDateTimeIso(`${toExamDateFilter}T23:59`) : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateExamAssessmentMutation();
  const updateMutation = useUpdateExamAssessmentMutation();
  const deleteMutation = useDeleteExamAssessmentMutation();

  const records = React.useMemo(
    () => examAssessmentsQuery.data?.data ?? [],
    [examAssessmentsQuery.data?.data],
  );
  const pagination = examAssessmentsQuery.data?.pagination;
  const isEditing = editingExamAssessmentId !== null;

  const selectedExamPeriodForForm = React.useMemo(
    () => (examPeriodsQuery.data ?? []).find((item) => item.id === formState.examPeriodId),
    [examPeriodsQuery.data, formState.examPeriodId],
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

    const stillExists = records.some((item) => item.id === editingExamAssessmentId);
    if (!stillExists) {
      setEditingExamAssessmentId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingExamAssessmentId, isEditing, records]);

  React.useEffect(() => {
    if (!formState.examPeriodId) {
      return;
    }

    const exists = (examPeriodsQuery.data ?? []).some((item) => item.id === formState.examPeriodId);
    if (!exists) {
      setFormState((prev) => ({ ...prev, examPeriodId: "" }));
    }
  }, [examPeriodsQuery.data, formState.examPeriodId]);

  const resetForm = () => {
    setEditingExamAssessmentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setFromExamDateFilter(fromExamDateInput);
    setToExamDateFilter(toExamDateInput);
  };

  const validateForm = (): boolean => {
    if (
      !formState.examPeriodId ||
      !formState.sectionId ||
      !formState.subjectId ||
      !formState.title.trim() ||
      !formState.examDate
    ) {
      setFormError("الحقول الأساسية مطلوبة.");
      return false;
    }

    if (formState.title.trim().length > 120) {
      setFormError("title يجب ألا يتجاوز 120 حرف.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("notes يجب ألا يتجاوز 255 حرف.");
      return false;
    }

    const maxScore = Number(formState.maxScore);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      setFormError("maxScore يجب أن يكون رقمًا أكبر من 0.");
      return false;
    }

    const examDate = new Date(formState.examDate);
    if (Number.isNaN(examDate.getTime())) {
      setFormError("examDate غير صالح.");
      return false;
    }

    if (!selectedExamPeriodForForm) {
      setFormError("الفترة الاختبارية غير صالحة.");
      return false;
    }

    if (selectedExamPeriodForForm.isLocked) {
      setFormError("لا يمكن التعديل لأن الفترة الاختبارية مقفلة.");
      return false;
    }

    if (selectedExamPeriodForForm.startDate) {
      const start = new Date(selectedExamPeriodForForm.startDate);
      if (!Number.isNaN(start.getTime()) && examDate < start) {
        setFormError("examDate لا يمكن أن يكون قبل بداية الفترة الاختبارية.");
        return false;
      }
    }

    if (selectedExamPeriodForForm.endDate) {
      const end = new Date(selectedExamPeriodForForm.endDate);
      if (!Number.isNaN(end.getTime()) && examDate > end) {
        setFormError("examDate لا يمكن أن يكون بعد نهاية الفترة الاختبارية.");
        return false;
      }
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
      examPeriodId: formState.examPeriodId,
      sectionId: formState.sectionId,
      subjectId: formState.subjectId,
      title: formState.title.trim(),
      examDate: toDateTimeIso(formState.examDate),
      maxScore: Number(formState.maxScore),
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingExamAssessmentId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية exam-assessments.update.");
        return;
      }

      updateMutation.mutate(
        {
          examAssessmentId: editingExamAssessmentId,
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
      setFormError("لا تملك صلاحية exam-assessments.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: ExamAssessmentListItem) => {
    if (!canUpdate) {
      return;
    }

    if (item.examPeriod.isLocked) {
      setFormError("الفترة الاختبارية لهذا الاختبار مقفلة.");
      return;
    }

    setFormError(null);
    setEditingExamAssessmentId(item.id);
    setFormState(toFormState(item));
  };

  const handleToggleActive = (item: ExamAssessmentListItem) => {
    if (!canUpdate || item.examPeriod.isLocked) {
      return;
    }

    updateMutation.mutate({
      examAssessmentId: item.id,
      payload: {
        isActive: !item.isActive,
      },
    });
  };

  const handleDelete = (item: ExamAssessmentListItem) => {
    if (!canDelete || item.examPeriod.isLocked) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الاختبار ${item.title}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingExamAssessmentId === item.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions = canReadExamPeriods && canReadSections && canReadSubjects;

  return (
    <div className="grid gap-4 xl:grid-cols-[470px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل اختبار" : "إنشاء اختبار"}
          </CardTitle>
          <CardDescription>إدارة الاختبارات وربطها بالفترة والشعبة والمادة.</CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>exam-assessments.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.examPeriodId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, examPeriodId: event.target.value }))
                }
                disabled={!canReadExamPeriods}
              >
                <option value="">اختر فترة الاختبار *</option>
                {(examPeriodsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.academicYear.code}/{item.academicTerm.code})
                  </option>
                ))}
              </select>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.sectionId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, sectionId: event.target.value }))
                  }
                  disabled={!canReadSections}
                >
                  <option value="">اختر الشعبة *</option>
                  {(sectionsQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>

                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.subjectId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, subjectId: event.target.value }))
                  }
                  disabled={!canReadSubjects}
                >
                  <option value="">اختر المادة *</option>
                  {(subjectsQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Monthly Math Exam 1"
                required
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="datetime-local"
                  value={formState.examDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, examDate: event.target.value }))
                  }
                  required
                />
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={formState.maxScore}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, maxScore: event.target.value }))
                  }
                  placeholder="Max score"
                />
              </div>

              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="ملاحظات"
              />

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
                  يلزم صلاحيات القراءة: <code>exam-periods.read</code>, <code>sections.read</code>,{" "}
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
                    <CalendarCheck2 className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء Exam Assessment"}
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
            <CardTitle>Exam Assessments</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>فلترة الاختبارات حسب الفترة والشعبة والمادة وتاريخ الاختبار.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_170px_150px_150px_130px_130px_120px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={examPeriodFilter}
              onChange={(event) => {
                setPage(1);
                setExamPeriodFilter(event.target.value);
              }}
            >
              <option value="all">كل الفترات</option>
              {(examPeriodsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={sectionFilter}
              onChange={(event) => {
                setPage(1);
                setSectionFilter(event.target.value);
              }}
            >
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code}
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
            >
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={fromExamDateInput}
              onChange={(event) => setFromExamDateInput(event.target.value)}
            />
            <Input
              type="date"
              value={toExamDateInput}
              onChange={(event) => setToExamDateInput(event.target.value)}
            />

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>

            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {examAssessmentsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {examAssessmentsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {examAssessmentsQuery.error instanceof Error
                ? examAssessmentsQuery.error.message
                : "فشل التحميل"}
            </div>
          ) : null}

          {!examAssessmentsQuery.isPending && records.length === 0 ? (
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
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.examPeriod.name} ({getAssessmentTypeLabel(item.examPeriod.assessmentType)})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.section.code} - {item.subject.code} | Date: {formatDateTime(item.examDate)} |
                    Max: {item.maxScore}
                  </p>
                  {item.notes ? (
                    <p className="text-xs text-muted-foreground">Notes: {item.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {item.examPeriod.isLocked ? (
                    <Badge variant="outline" className="gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      الفترة مقفلة
                    </Badge>
                  ) : null}
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(item)}
                  disabled={!canUpdate || item.examPeriod.isLocked || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(item)}
                  disabled={!canUpdate || item.examPeriod.isLocked || updateMutation.isPending}
                >
                  {item.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(item)}
                  disabled={!canDelete || item.examPeriod.isLocked || deleteMutation.isPending}
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
                disabled={!pagination || pagination.page <= 1 || examAssessmentsQuery.isFetching}
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
                  examAssessmentsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void examAssessmentsQuery.refetch()}
                disabled={examAssessmentsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${examAssessmentsQuery.isFetching ? "animate-spin" : ""}`}
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





