"use client";

import * as React from "react";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";

import { ManagementToolbar } from "@/components/ui/management-toolbar";

import { PageShell } from "@/components/ui/page-shell";

import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarCheck2,
  LoaderCircle,
  Lock,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudentEnrollmentPickerSheet } from "@/components/ui/student-enrollment-picker-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateStudentExamScoreMutation,
  useDeleteStudentExamScoreMutation,
  useUpdateStudentExamScoreMutation,
} from "@/features/exams/student-exam-scores/hooks/use-student-exam-scores-mutations";
import { useExamAssessmentOptionsQuery } from "@/features/exams/student-exam-scores/hooks/use-exam-assessment-options-query";
import { useExamPeriodOptionsQuery } from "@/features/exams/student-exam-scores/hooks/use-exam-period-options-query";
import { useStudentExamScoresQuery } from "@/features/exams/student-exam-scores/hooks/use-student-exam-scores-query";
import {
  toStudentEnrollmentPickerOption,
  type StudentEnrollmentPickerOption,
} from "@/features/students/lib/student-enrollment-picker";
import {
  translateAssessmentType,
  translateExamAbsenceType,
} from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import type {
  ExamAbsenceType,
  StudentEnrollmentListItem,
  StudentExamScoreListItem,
} from "@/lib/api/client";

type FormState = {
  examPeriodId: string;
  examAssessmentId: string;
  studentEnrollmentId: string;
  isPresent: boolean;
  score: string;
  absenceType: ExamAbsenceType;
  excuseDetails: string;
  teacherNotes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM: FormState = {
  examPeriodId: "",
  examAssessmentId: "",
  studentEnrollmentId: "",
  isPresent: true,
  score: "0",
  absenceType: "UNEXCUSED",
  excuseDetails: "",
  teacherNotes: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(item: StudentExamScoreListItem): FormState {
  return {
    examPeriodId: item.examAssessment.examPeriod.id,
    examAssessmentId: item.examAssessmentId,
    studentEnrollmentId: item.studentEnrollmentId,
    isPresent: item.isPresent,
    score: String(item.score),
    absenceType: item.absenceType ?? "UNEXCUSED",
    excuseDetails: item.excuseDetails ?? "",
    teacherNotes: item.teacherNotes ?? "",
    isActive: item.isActive,
  };
}

function getAbsenceTypeLabel(value: ExamAbsenceType): string {
  return translateExamAbsenceType(value);
}

function formatEnrollmentPlacementLabel(
  item: {
    academicYear: StudentEnrollmentListItem["academicYear"];
    gradeLevel?: {
      id: string;
      code: string;
      name: string;
      sequence: number;
    } | null;
    section?: {
      id: string;
      code: string;
      name: string;
      gradeLevel?: {
        id: string;
        code: string;
        name: string;
        sequence: number;
      } | null;
    } | null;
  },
): string {
  const academicYearLabel = formatNameCodeLabel(item.academicYear.name, item.academicYear.code);

  if (item.section) {
    return `${academicYearLabel} / ${formatSectionWithGradeLabel(item.section)}`;
  }

  const gradeLevelLabel = item.gradeLevel
    ? formatNameCodeLabel(item.gradeLevel.name, item.gradeLevel.code)
    : null;

  return gradeLevelLabel
    ? `${academicYearLabel} / ${gradeLevelLabel} / غير موزع`
    : `${academicYearLabel} / غير موزع`;
}

export function StudentExamScoresWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-exam-scores.create");
  const canUpdate = hasPermission("student-exam-scores.update");
  const canDelete = hasPermission("student-exam-scores.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [examPeriodFilter, setExamPeriodFilter] = React.useState("all");
  const [assessmentFilter, setAssessmentFilter] = React.useState("all");
  const [presenceFilter, setPresenceFilter] = React.useState<"all" | "present" | "absent">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<{
    examPeriod: string;
    assessment: string;
    presence: "all" | "present" | "absent";
    active: "all" | "active" | "inactive";
  }>({
    examPeriod: "all",
    assessment: "all",
    presence: "all",
    active: "all",
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [selectedEnrollmentOption, setSelectedEnrollmentOption] =
    React.useState<StudentEnrollmentPickerOption | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const examPeriodsQuery = useExamPeriodOptionsQuery();
  const assessmentsForFormQuery = useExamAssessmentOptionsQuery(form.examPeriodId || undefined);
  const filterExamPeriodId = isFilterOpen ? filterDraft.examPeriod : examPeriodFilter;
  const assessmentsForFilterQuery = useExamAssessmentOptionsQuery(
    filterExamPeriodId === "all" ? undefined : filterExamPeriodId,
  );

  const scoresQuery = useStudentExamScoresQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    examPeriodId: examPeriodFilter === "all" ? undefined : examPeriodFilter,
    examAssessmentId: assessmentFilter === "all" ? undefined : assessmentFilter,
    isPresent: presenceFilter === "all" ? undefined : presenceFilter === "present",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateStudentExamScoreMutation();
  const updateMutation = useUpdateStudentExamScoreMutation();
  const deleteMutation = useDeleteStudentExamScoreMutation();

  const records = React.useMemo(() => scoresQuery.data?.data ?? [], [scoresQuery.data?.data]);
  const pagination = scoresQuery.data?.pagination;
  const selectedAssessment = (assessmentsForFormQuery.data ?? []).find(
    (item) => item.id === form.examAssessmentId,
  );

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!editingId) {
      return;
    }

    const stillExists = records.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setSelectedEnrollmentOption(null);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingId, records]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      examPeriod: examPeriodFilter,
      assessment: assessmentFilter,
      presence: presenceFilter,
      active: activeFilter,
    });
  }, [activeFilter, assessmentFilter, examPeriodFilter, isFilterOpen, presenceFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setSelectedEnrollmentOption(null);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: StudentExamScoreListItem) => {
    if (!canUpdate || item.examAssessment.examPeriod.isLocked) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setSelectedEnrollmentOption(toStudentEnrollmentPickerOption(item.studentEnrollment));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!form.examAssessmentId || !form.studentEnrollmentId) {
      setFormError("يجب اختيار التقييم والطالب أولًا.");
      return false;
    }
    if (form.teacherNotes.trim().length > 255 || form.excuseDetails.trim().length > 255) {
      setFormError("ملاحظات المدرس أو تفاصيل العذر لا يمكن أن تتجاوز 255 حرفًا.");
      return false;
    }
    if (!selectedAssessment) {
      setFormError("الرجاء اختيار تقييم صحيح.");
      return false;
    }
    if (selectedAssessment.examPeriod.isLocked) {
      setFormError("فترة الاختبار مقفلة.");
      return false;
    }

    const score = Number(form.score || "0");
    if (!Number.isFinite(score) || score < 0) {
      setFormError("الدرجة يجب أن تكون رقمًا صحيحًا أو عشريًا أكبر من أو يساوي 0.");
      return false;
    }
    if (form.isPresent && score > selectedAssessment.maxScore) {
      setFormError(`الدرجة لا يمكن أن تتجاوز الحد الأعلى ${selectedAssessment.maxScore}.`);
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionSuccess(null);
    if (!validateForm()) {
      return;
    }

    const payload = {
      examAssessmentId: form.examAssessmentId,
      studentEnrollmentId: form.studentEnrollmentId,
      isPresent: form.isPresent,
      score: form.isPresent ? Number(form.score || "0") : 0,
      absenceType: form.isPresent ? undefined : form.absenceType,
      excuseDetails: form.isPresent ? undefined : toOptionalString(form.excuseDetails),
      teacherNotes: toOptionalString(form.teacherNotes),
      isActive: form.isActive,
    };

    if (editingId) {
      if (!canUpdate) {
        setFormError("ليس لديك صلاحية تعديل درجات الاختبارات: student-exam-scores.update.");
        return;
      }
      updateMutation.mutate(
        { studentExamScoreId: editingId, payload },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث درجة الاختبار بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("ليس لديك صلاحية إضافة درجات الاختبارات: student-exam-scores.create.");
      return;
    }
    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تمت إضافة درجة الاختبار بنجاح.");
      },
    });
  };

  const handleToggleActive = (item: StudentExamScoreListItem) => {
    if (!canUpdate || item.examAssessment.examPeriod.isLocked) {
      return;
    }

    updateMutation.mutate(
      {
        studentExamScoreId: item.id,
        payload: { isActive: !item.isActive },
      },
        {
          onSuccess: () => {
            setActionSuccess(
              item.isActive ? "تم تعطيل درجة الاختبار بنجاح." : "تم تفعيل درجة الاختبار بنجاح.",
            );
          },
        },
    );
  };

  const handleDelete = (item: StudentExamScoreListItem) => {
    if (!canDelete || item.examAssessment.examPeriod.isLocked) {
      return;
    }

    if (!window.confirm("هل تريد حذف هذا السجل؟")) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        setActionSuccess("تم حذف درجة الاختبار بنجاح.");
      },
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setExamPeriodFilter("all");
    setAssessmentFilter("all");
    setPresenceFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setExamPeriodFilter(filterDraft.examPeriod);
    setAssessmentFilter(filterDraft.assessment);
    setPresenceFilter(filterDraft.presence);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      examPeriodFilter !== "all" ? 1 : 0,
      assessmentFilter !== "all" ? 1 : 0,
      presenceFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [activeFilter, assessmentFilter, examPeriodFilter, presenceFilter, searchInput]);

  return (
    <PageShell title="مرشحات درجات الاختبارات">

      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
          showFilterButton={true}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="مرشحات درجات الاختبارات"
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
              value={filterDraft.examPeriod}
              onChange={(event) => {
                const nextValue = event.target.value;
                setFilterDraft((prev) => ({
                  ...prev,
                  examPeriod: nextValue,
                  assessment: "all",
                }));
              }}
            >
              <option value="all">كل الفترات</option>
              {(examPeriodsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({translateAssessmentType(item.assessmentType)})
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.assessment}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, assessment: event.target.value }))
              }
            >
              <option value="all">كل التقييمات</option>
              {(assessmentsForFilterQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.presence}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  presence: event.target.value as "all" | "present" | "absent",
                }))
              }
            >
              <option value="all">الحضور: الكل</option>
              <option value="present">موجود</option>
              <option value="absent">غائب</option>
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
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>درجات الاختبارات</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>عرض درجات الاختبارات مع إمكانية التصفية والبحث.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionSuccess ? (
              <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                {actionSuccess}
              </div>
            ) : null}
            {scoresQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جاري تحميل درجات الاختبارات...
              </div>
            ) : null}
            {scoresQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {scoresQuery.error instanceof Error
                  ? scoresQuery.error.message
                  : "تعذر تحميل درجات الاختبارات."}
              </div>
            ) : null}
            {!scoresQuery.isPending && records.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد درجات مطابقة.
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
                      {item.studentEnrollment.student.fullName} - {item.examAssessment.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الدرجة: {item.score}/{item.examAssessment.maxScore}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      رقم الطالب: {item.studentEnrollment.student.admissionNo ?? "غير متوفر"} -{" "}
                      {formatEnrollmentPlacementLabel(item.studentEnrollment)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={item.isPresent ? "default" : "secondary"}>
                      {item.isPresent
                        ? "موجود"
                        : `غائب (${getAbsenceTypeLabel(item.absenceType ?? "UNEXCUSED")})`}
                    </Badge>
                    {item.examAssessment.examPeriod.isLocked ? (
                      <Badge variant="outline" className="gap-1.5">
                        <Lock className="h-3.5 w-3.5" />مقفل
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
                    onClick={() => handleStartEdit(item)}
                    disabled={!canUpdate || item.examAssessment.examPeriod.isLocked || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(item)}
                    disabled={!canUpdate || item.examAssessment.examPeriod.isLocked || updateMutation.isPending}
                  >
                    {item.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(item)}
                    disabled={!canDelete || item.examAssessment.examPeriod.isLocked || deleteMutation.isPending}
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
                  disabled={!pagination || pagination.page <= 1 || scoresQuery.isFetching}
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
                  disabled={!pagination || pagination.page >= pagination.totalPages || scoresQuery.isFetching}
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void scoresQuery.refetch()}
                  disabled={scoresQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${scoresQuery.isFetching ? "animate-spin" : ""}`}
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
        label="إضافة"
        ariaLabel="إضافة درجة اختبار"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        title={editingId ? "تعديل درجة اختبار" : "إضافة درجة اختبار"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={editingId ? "حفظ التغييرات" : "إضافة الدرجة"}
      >
        <form className="space-y-3" onSubmit={handleSubmit}>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.examPeriodId}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  examPeriodId: event.target.value,
                  examAssessmentId: "",
                  studentEnrollmentId: "",
                }));
                setSelectedEnrollmentOption(null);
              }}
            >
            <option value="">اختر الفترة *</option>
            {(examPeriodsQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({translateAssessmentType(item.assessmentType)})
              </option>
            ))}
          </select>

            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.examAssessmentId}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  examAssessmentId: event.target.value,
                  studentEnrollmentId: "",
                }));
                setSelectedEnrollmentOption(null);
              }}
            >
            <option value="">اختر التقييم *</option>
            {(assessmentsForFormQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({formatSectionWithGradeLabel(item.section)} / {formatNameCodeLabel(item.subject.name, item.subject.code)})
              </option>
            ))}
          </select>

          <StudentEnrollmentPickerSheet
            value={form.studentEnrollmentId}
            selectedOption={selectedEnrollmentOption}
            onSelect={(option) => {
              setSelectedEnrollmentOption(option);
              setForm((prev) => ({ ...prev, studentEnrollmentId: option?.id ?? "" }));
            }}
            scope="exams-student-exam-scores"
            variant="form"
            academicYearId={selectedAssessment?.examPeriod.academicYearId}
            sectionId={selectedAssessment?.sectionId ?? undefined}
            placeholder="اختر الطالب *"
            title="اختيار الطالب"
            searchPlaceholder="ابحث بالاسم أو رقم الطالب"
            allowEmptySelection={false}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>موجود</span>
              <input
                type="checkbox"
                checked={form.isPresent}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isPresent: event.target.checked,
                    score: event.target.checked ? prev.score : "0",
                  }))
                }
              />
            </label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.score}
              onChange={(event) => setForm((prev) => ({ ...prev, score: event.target.value }))}
              placeholder="الدرجة"
              disabled={!form.isPresent}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.absenceType}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  absenceType: event.target.value as ExamAbsenceType,
                }))
              }
              disabled={form.isPresent}
            >
              <option value="UNEXCUSED">{translateExamAbsenceType("UNEXCUSED")}</option>
              <option value="EXCUSED">{translateExamAbsenceType("EXCUSED")}</option>
            </select>
            <Input
              value={form.excuseDetails}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, excuseDetails: event.target.value }))
              }
              placeholder="تفاصيل العذر"
              disabled={form.isPresent}
            />
          </div>

          <Input
            value={form.teacherNotes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, teacherNotes: event.target.value }))
            }
            placeholder="ملاحظات المدرس"
          />

          <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>نشط</span>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
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
            <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarCheck2 className="h-4 w-4" />
              )}
              {editingId ? "حفظ التغييرات" : "إضافة الدرجة"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                إلغاء
              </Button>
            ) : null}
          </div>
        </form>
      </CrudFormSheet>
    
    </PageShell>
  );
}

