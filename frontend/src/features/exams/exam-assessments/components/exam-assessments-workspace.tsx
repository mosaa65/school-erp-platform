"use client";

import * as React from "react";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";

import { PageShell } from "@/components/ui/page-shell";

import {
  Lock,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/ui/fab";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateExamAssessmentMutation,
  useDeleteExamAssessmentMutation,
  useUpdateExamAssessmentMutation,
} from "@/features/exams/exam-assessments/hooks/use-exam-assessments-mutations";
import { useExamAssessmentsQuery } from "@/features/exams/exam-assessments/hooks/use-exam-assessments-query";
import { useExamPeriodOptionsQuery } from "@/features/exams/exam-assessments/hooks/use-exam-period-options-query";
import { useSectionOptionsQuery } from "@/features/exams/exam-assessments/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/exams/exam-assessments/hooks/use-subject-options-query";
import { translateAssessmentType } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
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

type ExamAssessmentFilterDraft = {
  examPeriodId: string;
  sectionId: string;
  subjectId: string;
  fromExamDate: string;
  toExamDate: string;
  activeFilter: "all" | "active" | "inactive";
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: ExamAssessmentFormState = {
  examPeriodId: "",
  sectionId: "",
  subjectId: "",
  title: "",
  examDate: "",
  maxScore: "",
  notes: "",
  isActive: true,
};

const DEFAULT_FILTER_DRAFT: ExamAssessmentFilterDraft = {
  examPeriodId: "all",
  sectionId: "all",
  subjectId: "all",
  fromExamDate: "",
  toExamDate: "",
  activeFilter: "all",
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

  return date.toLocaleString("ar-SA", {
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
  return translateAssessmentType(value);
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
  const [fromExamDateFilter, setFromExamDateFilter] = React.useState("");
  const [toExamDateFilter, setToExamDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState<ExamAssessmentFilterDraft>(
    DEFAULT_FILTER_DRAFT,
  );
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const [editingExamAssessmentId, setEditingExamAssessmentId] = React.useState<string | null>(
    null,
  );
  const [formState, setFormState] = React.useState<ExamAssessmentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

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
      setIsFormOpen(false);
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

  function resetForm() {
    setEditingExamAssessmentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  }

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 350, [searchInput]);

  const openCreateForm = () => {
    resetForm();
    setActionSuccess(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item: ExamAssessmentListItem) => {
    if (!canUpdate) {
      return;
    }

    if (item.examPeriod.isLocked) {
      setFormError("الفترة الاختبارية لهذا الاختبار مقفلة.");
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingExamAssessmentId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const applyFilters = () => {
    setPage(1);
    setExamPeriodFilter(filterDraft.examPeriodId);
    setSectionFilter(filterDraft.sectionId);
    setSubjectFilter(filterDraft.subjectId);
    setFromExamDateFilter(filterDraft.fromExamDate);
    setToExamDateFilter(filterDraft.toExamDate);
    setActiveFilter(filterDraft.activeFilter);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterDraft(DEFAULT_FILTER_DRAFT);
    setPage(1);
    setExamPeriodFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setFromExamDateFilter("");
    setToExamDateFilter("");
    setActiveFilter("all");
    setIsFilterOpen(false);
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
      setFormError("عنوان الاختبار يجب ألا يتجاوز 120 حرفًا.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    if (!formState.maxScore.trim()) {
      setFormError("الدرجة العظمى مطلوبة.");
      return false;
    }

    const maxScore = Number(formState.maxScore);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      setFormError("الدرجة العظمى يجب أن تكون رقمًا أكبر من صفر.");
      return false;
    }

    const examDate = new Date(formState.examDate);
    if (Number.isNaN(examDate.getTime())) {
      setFormError("تاريخ الاختبار غير صالح.");
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
        setFormError("تاريخ الاختبار لا يمكن أن يكون قبل بداية الفترة الاختبارية.");
        return false;
      }
    }

    if (selectedExamPeriodForForm.endDate) {
      const end = new Date(selectedExamPeriodForForm.endDate);
      if (!Number.isNaN(end.getTime()) && examDate > end) {
        setFormError("تاريخ الاختبار لا يمكن أن يكون بعد نهاية الفترة الاختبارية.");
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitForm();
  };

  const submitForm = () => {
    setActionSuccess(null);
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
        setFormError("لا تملك الصلاحية المطلوبة: exam-assessments.update.");
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
            setActionSuccess("تم تحديث الاختبار بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: exam-assessments.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء الاختبار بنجاح.");
      },
    });
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
    }, {
      onSuccess: () => {
        setActionSuccess(item.isActive ? "تم تعطيل الاختبار بنجاح." : "تم تفعيل الاختبار بنجاح.");
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
        setActionSuccess("تم حذف الاختبار بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions = canReadExamPeriods && canReadSections && canReadSubjects;
  const activeFiltersCount = React.useMemo(
    () =>
      [
        examPeriodFilter !== "all" ? 1 : 0,
        sectionFilter !== "all" ? 1 : 0,
        subjectFilter !== "all" ? 1 : 0,
        fromExamDateFilter ? 1 : 0,
        toExamDateFilter ? 1 : 0,
        activeFilter !== "all" ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
    [
      activeFilter,
      examPeriodFilter,
      fromExamDateFilter,
      sectionFilter,
      subjectFilter,
      toExamDateFilter,
    ],
  );

  return (
    <PageShell title="الاختبارات">

      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث بعنوان الاختبار أو المادة أو الشعبة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => {
            setFilterDraft({
              examPeriodId: examPeriodFilter,
              sectionId: sectionFilter,
              subjectId: subjectFilter,
              fromExamDate: fromExamDateFilter,
              toExamDate: toExamDateFilter,
              activeFilter,
            });
            setIsFilterOpen(true);
          }}
        />

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلترة الاختبارات"
        actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.examPeriodId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, examPeriodId: event.target.value }))
              }
            >
              <option value="all">كل الفترات</option>
              {(examPeriodsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} / {formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code)})
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.sectionId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, sectionId: event.target.value }))
              }
            >
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatSectionWithGradeLabel(item)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.subjectId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, subjectId: event.target.value }))
              }
            >
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.activeFilter}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  activeFilter: event.target.value as "all" | "active" | "inactive",
                }))
              }
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </SelectField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="date"
              value={filterDraft.fromExamDate}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, fromExamDate: event.target.value }))
              }
            />
            <Input
              type="date"
              value={filterDraft.toExamDate}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, toExamDate: event.target.value }))
              }
            />
          </div>
        </div>
      </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>التقييمات الاختبارية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة التقييمات الاختبارية وربطها بالفترة والشعبة والمادة وتاريخ الاختبار.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {formError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
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

          {examAssessmentsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {examAssessmentsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {examAssessmentsQuery.error instanceof Error
                ? examAssessmentsQuery.error.message
                : "تعذّر تحميل البيانات."}
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
                    {formatSectionWithGradeLabel(item.section)} - {formatNameCodeLabel(item.subject.name, item.subject.code)} | التاريخ: {formatDateTime(item.examDate)} |
                    العظمى: {item.maxScore}
                  </p>
                  {item.notes ? (
                    <p className="text-xs text-muted-foreground">ملاحظات: {item.notes}</p>
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
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openEditForm(item)}
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
      {canCreate ? (
        <Fab
          icon={<Plus className="h-4 w-4" />}
          label="إضافة"
          ariaLabel="إضافة تقييم اختباري"
          onClick={openCreateForm}
          disabled={!canCreate}
        />
      ) : null}

      <CrudFormSheet
        open={isFormOpen}
        title={isEditing ? "تعديل اختبار" : "إنشاء اختبار"}
        onClose={resetForm}
        onSubmit={submitForm}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء اختبار"}
        isSubmitting={isFormSubmitting}
      >
        <form className="space-y-4" onSubmit={handleSubmitForm}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">فترة الاختبار *</label>
            <SelectField
              value={formState.examPeriodId}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, examPeriodId: event.target.value }))
              }
              disabled={!canReadExamPeriods}
            >
              <option value="">اختر فترة الاختبار *</option>
              {(examPeriodsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} /{" "}
                  {formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code)})
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الشعبة *</label>
              <SelectField
                value={formState.sectionId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, sectionId: event.target.value }))
                }
                disabled={!canReadSections}
              >
                <option value="">اختر الشعبة *</option>
                {(sectionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatSectionWithGradeLabel(item)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">المادة *</label>
              <SelectField
                value={formState.subjectId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, subjectId: event.target.value }))
                }
                disabled={!canReadSubjects}
              >
                <option value="">اختر المادة *</option>
                {(subjectsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">عنوان الاختبار *</label>
            <Input
              value={formState.title}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="اختبار الرياضيات الشهري 1"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">تاريخ الاختبار *</label>
              <Input
                type="datetime-local"
                value={formState.examDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, examDate: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الدرجة العظمى *</label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={formState.maxScore}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, maxScore: event.target.value }))
                }
                placeholder="الدرجة العظمى"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
            <Input
              value={formState.notes}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, notes: event.target.value }))
              }
              placeholder="ملاحظات"
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
          {actionSuccess ? (
            <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
              {actionSuccess}
            </div>
          ) : null}
          {!hasDependenciesReadPermissions ? (
            <div className="rounded-md border border-dashed border-border/70 p-2 text-xs text-muted-foreground">
              يتطلب هذا الجزء صلاحيات القراءة: <code>exam-periods.read</code>,{" "}
              <code>sections.read</code>, <code>subjects.read</code>.
            </div>
          ) : null}
        </form>
      </CrudFormSheet>
    
    </PageShell>
  );
}






