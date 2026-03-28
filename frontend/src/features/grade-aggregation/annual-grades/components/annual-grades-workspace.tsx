"use client";

import * as React from "react";
import {
  LoaderCircle,
  Lock,
  LockOpen,
  Medal,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAnnualStatusOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-annual-status-options-query";
import {
  useCreateAnnualGradeMutation,
  useDeleteAnnualGradeMutation,
  useLockAnnualGradeMutation,
  useUnlockAnnualGradeMutation,
  useUpdateAnnualGradeMutation,
} from "@/features/grade-aggregation/annual-grades/hooks/use-annual-grades-mutations";
import { useAnnualGradesQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-annual-grades-query";
import { useAcademicYearOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-academic-year-options-query";
import { useAcademicTermOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-academic-term-options-query";
import { useSectionOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-section-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-student-enrollment-options-query";
import { useSubjectOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-subject-options-query";
import { StudentEnrollmentPickerSheet } from "@/components/ui/student-enrollment-picker-sheet";
import { type StudentEnrollmentPickerOption } from "@/features/students/lib/student-enrollment-picker";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import type { AnnualGradeListItem, GradingWorkflowStatus } from "@/lib/api/client";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { formatStudentEnrollmentPlacementLabel } from "@/lib/student-enrollment-display";

type FormState = {
  academicYearId: string;
  sectionId: string;
  subjectId: string;
  studentEnrollmentId: string;
  semester1Total: string;
  semester2Total: string;
  useTermTotals: boolean;
  termTotals: Record<string, string>;
  annualPercentage: string;
  finalStatusId: string;
  status: GradingWorkflowStatus;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  academicYearId: "",
  sectionId: "",
  subjectId: "",
  studentEnrollmentId: "",
  semester1Total: "",
  semester2Total: "",
  useTermTotals: false,
  termTotals: {},
  annualPercentage: "",
  finalStatusId: "",
  status: "DRAFT",
  notes: "",
  isActive: true,
};

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function formatAnnualGradeTerms(item: AnnualGradeListItem): string {
  if (item.termTotals.length > 0) {
    const sorted = [...item.termTotals].sort(
      (a, b) => a.academicTerm.sequence - b.academicTerm.sequence,
    );
    return sorted
      .map(
        (term) =>
          `${term.academicTerm.name} (${term.academicTerm.code}): ${term.termTotal}`,
      )
      .join(" | ");
  }

  return `ف1: ${item.semester1Total} | ف2: ${item.semester2Total}`;
}

function toFormState(item: AnnualGradeListItem): FormState {
  const termTotals: Record<string, string> = {};
  if (item.termTotals.length > 0) {
    for (const term of item.termTotals) {
      termTotals[term.academicTermId] = String(term.termTotal);
    }
  }
  return {
    academicYearId: item.academicYearId,
    sectionId: item.studentEnrollment.sectionId,
    subjectId: item.subjectId,
    studentEnrollmentId: item.studentEnrollmentId,
    semester1Total: String(item.semester1Total),
    semester2Total: String(item.semester2Total),
    useTermTotals: item.termTotals.length > 0,
    termTotals,
    annualPercentage: item.annualPercentage === null ? "" : String(item.annualPercentage),
    finalStatusId: item.finalStatusId,
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

function buildStudentEnrollmentPickerOption(
  item: AnnualGradeListItem,
): StudentEnrollmentPickerOption {
  return {
    id: item.studentEnrollmentId,
    studentId: item.studentEnrollment.student.id,
    title: item.studentEnrollment.student.fullName,
    subtitle: item.studentEnrollment.student.admissionNo
      ? `رقم الطالب ${item.studentEnrollment.student.admissionNo}`
      : "بدون رقم طالب",
    meta: formatStudentEnrollmentPlacementLabel({
      academicYear: item.academicYear,
      gradeLevel: item.studentEnrollment.gradeLevel,
      section: item.studentEnrollment.section,
    }),
    groupLabel: item.studentEnrollment.section
      ? formatSectionWithGradeLabel(item.studentEnrollment.section)
      : formatNameCodeLabel(item.academicYear.name, item.academicYear.code),
  };
}

export function AnnualGradesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("annual-grades.create");
  const canUpdate = hasPermission("annual-grades.update");
  const canLock = hasPermission("annual-grades.lock");
  const canUnlock = hasPermission("annual-grades.unlock");
  const canDelete = hasPermission("annual-grades.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [finalStatusFilter, setFinalStatusFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED"
  >("all");
  const [lockFilter, setLockFilter] = React.useState<"all" | "locked" | "unlocked">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState<{
    year: string;
    section: string;
    subject: string;
    finalStatus: string;
    status: "all" | "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
    lock: "all" | "locked" | "unlocked";
    active: "all" | "active" | "inactive";
  }>({
    year: "all",
    section: "all",
    subject: "all",
    finalStatus: "all",
    status: "all",
    lock: "all",
    active: "all",
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<AnnualGradeListItem | null>(null);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [selectedFormEnrollmentOption, setSelectedFormEnrollmentOption] =
    React.useState<StudentEnrollmentPickerOption | null>(null);

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const academicTermsQuery = useAcademicTermOptionsQuery(
    form.academicYearId || undefined,
  );
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const annualStatusesQuery = useAnnualStatusOptionsQuery();
  const enrollmentsQuery = useStudentEnrollmentOptionsQuery({
    academicYearId: form.academicYearId || undefined,
    sectionId: form.sectionId || undefined,
  });

  const annualGradesQuery = useAnnualGradesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    finalStatusId: finalStatusFilter === "all" ? undefined : finalStatusFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    isLocked: lockFilter === "all" ? undefined : lockFilter === "locked",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateAnnualGradeMutation();
  const updateMutation = useUpdateAnnualGradeMutation();
  const lockMutation = useLockAnnualGradeMutation();
  const unlockMutation = useUnlockAnnualGradeMutation();
  const deleteMutation = useDeleteAnnualGradeMutation();

  const records = React.useMemo(() => annualGradesQuery.data?.data ?? [], [annualGradesQuery.data?.data]);
  const pagination = annualGradesQuery.data?.pagination;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (lockMutation.error as Error | null)?.message ??
    (unlockMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  const academicTermOptions = academicTermsQuery.data ?? [];

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      year: yearFilter,
      section: sectionFilter,
      subject: subjectFilter,
      finalStatus: finalStatusFilter,
      status: statusFilter,
      lock: lockFilter,
      active: activeFilter,
    });
  }, [
    activeFilter,
    finalStatusFilter,
    isFilterOpen,
    lockFilter,
    sectionFilter,
    statusFilter,
    subjectFilter,
    yearFilter,
  ]);

  const resetForm = () => {
    setEditingId(null);
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setSelectedFormEnrollmentOption(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    setActionSuccess(null);
    setFormError(null);
    setEditingId(null);
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setSelectedFormEnrollmentOption(null);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: AnnualGradeListItem) => {
    if (!canUpdate || item.isLocked) {
      return;
    }

    setActionSuccess(null);
    setEditingId(item.id);
    setEditingItem(item);
    setForm(toFormState(item));
    setSelectedFormEnrollmentOption(buildStudentEnrollmentPickerOption(item));
    setFormError(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (
      !form.academicYearId ||
      !form.sectionId ||
      !form.subjectId ||
      !form.studentEnrollmentId ||
      !form.finalStatusId
    ) {
      setFormError("الحقول الأساسية مطلوبة.");
      return false;
    }
    if (form.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    const semester1Total = parseOptionalNumber(form.semester1Total);
    const semester2Total = parseOptionalNumber(form.semester2Total);
    const annualPercentage = parseOptionalNumber(form.annualPercentage);
    if (form.useTermTotals) {
      const termIds =
        academicTermOptions.length > 0
          ? academicTermOptions.map((term) => term.id)
          : Object.keys(form.termTotals);
      if (termIds.length === 0) {
        setFormError("لا توجد فصول دراسية مرتبطة بهذه السنة.");
        return false;
      }
      for (const termId of termIds) {
        const value = parseOptionalNumber(form.termTotals[termId] ?? "");
        if (value === undefined) {
          setFormError("يجب إدخال مجموع لكل فصل دراسي.");
          return false;
        }
        if (value < 0) {
          setFormError("مجموع الفصل يجب أن يكون أكبر من أو يساوي 0.");
          return false;
        }
      }
    } else {
      if (semester1Total !== undefined && semester1Total < 0) {
        setFormError("مجموع الفصل الأول يجب أن يكون أكبر من أو يساوي 0.");
        return false;
      }
      if (semester2Total !== undefined && semester2Total < 0) {
        setFormError("مجموع الفصل الثاني يجب أن يكون أكبر من أو يساوي 0.");
        return false;
      }
    }
    if (annualPercentage !== undefined && annualPercentage < 0) {
      setFormError("النسبة السنوية يجب أن تكون أكبر من أو تساوي 0.");
      return false;
    }

    const selectedEnrollment = (enrollmentsQuery.data ?? []).find(
      (item) => item.id === form.studentEnrollmentId,
    );
    if (!selectedEnrollment) {
      setFormError("قيد الطالب غير صالح.");
      return false;
    }
    if (
      selectedEnrollment.sectionId !== form.sectionId ||
      selectedEnrollment.academicYearId !== form.academicYearId
    ) {
      setFormError("قيد الطالب لا يطابق السنة/الشعبة المختارة.");
      return false;
    }
    if (editingItem?.isLocked) {
      setFormError("لا يمكن التعديل لأن السجل مقفل.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const buildTermTotalsPayload = () => {
    if (!form.useTermTotals) {
      return undefined;
    }

    const termIds =
      academicTermOptions.length > 0
        ? academicTermOptions.map((term) => term.id)
        : Object.keys(form.termTotals);

    if (termIds.length === 0) {
      return [];
    }

    return termIds
      .map((termId) => {
        const value = parseOptionalNumber(form.termTotals[termId] ?? "");
        return value === undefined
          ? null
          : {
              academicTermId: termId,
              termTotal: value,
            };
      })
      .filter((item): item is { academicTermId: string; termTotal: number } =>
        Boolean(item),
      );
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setFinalStatusFilter("all");
    setStatusFilter("all");
    setLockFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setSectionFilter(filterDraft.section);
    setSubjectFilter(filterDraft.subject);
    setFinalStatusFilter(filterDraft.finalStatus);
    setStatusFilter(filterDraft.status);
    setLockFilter(filterDraft.lock);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      finalStatusFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      lockFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0);
  }, [
    activeFilter,
    finalStatusFilter,
    lockFilter,
    searchInput,
    sectionFilter,
    statusFilter,
    subjectFilter,
    yearFilter,
  ]);

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <SearchField
            containerClassName="min-w-0"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ابحث باسم الطالب أو المادة..."
          />
          <div className="flex items-center justify-end gap-2">
            <FilterTriggerButton
              count={activeFiltersCount}
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="h-11 w-11 justify-center px-0 sm:w-auto sm:px-4 sm:justify-start [&>span:nth-child(2)]:hidden sm:[&>span:nth-child(2)]:inline [&>span:nth-child(3)]:hidden sm:[&>span:nth-child(3)]:inline"
            />
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة الدرجات السنوية"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1 gap-1.5">
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
              value={filterDraft.year}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, year: event.target.value }))
              }
            >
              <option value="all">كل السنوات</option>
              {(academicYearsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={filterDraft.section}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, section: event.target.value }))
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
              value={filterDraft.subject}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, subject: event.target.value }))
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
              value={filterDraft.finalStatus}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, finalStatus: event.target.value }))
              }
            >
              <option value="all">كل حالات النتيجة</option>
              {(annualStatusesQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={filterDraft.status}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  status: event.target.value as
                    | "all"
                    | "DRAFT"
                    | "IN_REVIEW"
                    | "APPROVED"
                    | "ARCHIVED",
                }))
              }
            >
              <option value="all">الحالة: الكل</option>
              <option value="DRAFT">مسودة</option>
              <option value="IN_REVIEW">قيد المراجعة</option>
              <option value="APPROVED">معتمد</option>
              <option value="ARCHIVED">مؤرشف</option>
            </SelectField>
            <SelectField
              value={filterDraft.lock}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  lock: event.target.value as "all" | "locked" | "unlocked",
                }))
              }
            >
              <option value="all">القفل: الكل</option>
              <option value="locked">مقفل</option>
              <option value="unlocked">غير مقفل</option>
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

      <BottomSheetForm
        open={isFormOpen}
        title={editingId ? "تعديل درجة سنوية" : "إنشاء درجة سنوية"}
        description="إدارة الدرجات السنوية لكل مادة لكل طالب."
        eyebrow="درجة سنوية"
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={editingId ? "حفظ التعديلات" : "إنشاء درجة سنوية"}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[80]"
        panelClassName="md:max-w-[760px]"
        contentClassName="space-y-3"
      >
        <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setActionSuccess(null);
              if (!validateForm()) {
                return;
              }
              const semester1Total = parseOptionalNumber(form.semester1Total);
              const semester2Total = parseOptionalNumber(form.semester2Total);
              const annualPercentage = parseOptionalNumber(form.annualPercentage);
              const termTotals = buildTermTotalsPayload();

              if (editingId) {
                if (!canUpdate) {
                  setFormError("لا تملك الصلاحية المطلوبة: annual-grades.update.");
                  return;
                }
                updateMutation.mutate(
                  {
                    annualGradeId: editingId,
                    payload: {
                      semester1Total,
                      semester2Total,
                      termTotals,
                      annualPercentage,
                      finalStatusId: form.finalStatusId,
                      status: form.status,
                      notes: toOptionalString(form.notes),
                      isActive: form.isActive,
                    },
                  },
                  {
                    onSuccess: () => {
                      resetForm();
                      setActionSuccess("تم تحديث الدرجة السنوية بنجاح.");
                    },
                  },
                );
                return;
              }

              if (!canCreate) {
                setFormError("لا تملك الصلاحية المطلوبة: annual-grades.create.");
                return;
              }
              createMutation.mutate(
                {
                  studentEnrollmentId: form.studentEnrollmentId,
                  subjectId: form.subjectId,
                  academicYearId: form.academicYearId,
                  semester1Total,
                  semester2Total,
                  termTotals,
                  annualPercentage,
                  finalStatusId: form.finalStatusId,
                  status: form.status,
                  notes: toOptionalString(form.notes),
                  isActive: form.isActive,
                },
                {
                  onSuccess: () => {
                    resetForm();
                    setActionSuccess("تم إنشاء الدرجة السنوية بنجاح.");
                  },
                },
              );
            }}
          >
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.academicYearId}
                disabled={editingId !== null}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    academicYearId: event.target.value,
                    studentEnrollmentId: "",
                    termTotals: {},
                    useTermTotals: false,
                  }));
                  setSelectedFormEnrollmentOption(null);
                }}
              >
                <option value="">السنة الدراسية *</option>
                {(academicYearsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.sectionId}
                disabled={editingId !== null}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    sectionId: event.target.value,
                    studentEnrollmentId: "",
                  }));
                  setSelectedFormEnrollmentOption(null);
                }}
              >
                <option value="">الشعبة *</option>
                {(sectionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatSectionWithGradeLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.subjectId}
                disabled={editingId !== null}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    subjectId: event.target.value,
                  }))
                }
              >
                <option value="">المادة *</option>
                {(subjectsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
              <StudentEnrollmentPickerSheet
                scope="annual-grades"
                variant="form"
                value={form.studentEnrollmentId}
                selectedOption={selectedFormEnrollmentOption}
                academicYearId={form.academicYearId || undefined}
                sectionId={form.sectionId || undefined}
                disabled={editingId !== null}
                onSelect={(option) => {
                  setSelectedFormEnrollmentOption(option);
                  setForm((prev) => ({
                    ...prev,
                    studentEnrollmentId: option?.id ?? "",
                  }));
                }}
              />
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>إدخال مجموعات الفصول بدلًا من فصل 1/2</span>
              <input
                type="checkbox"
                checked={form.useTermTotals}
                onChange={(event) => {
                  const nextUse = event.target.checked;
                  setForm((prev) => {
                    if (!nextUse) {
                      return {
                        ...prev,
                        useTermTotals: false,
                        termTotals: {},
                      };
                    }

                    const nextTermTotals = academicTermOptions.reduce<Record<string, string>>(
                      (acc, term) => {
                        acc[term.id] = prev.termTotals[term.id] ?? "";
                        return acc;
                      },
                      {},
                    );

                    return {
                      ...prev,
                      useTermTotals: true,
                      termTotals: nextTermTotals,
                    };
                  });
                }}
              />
            </label>

            {form.useTermTotals ? (
              <div className="grid gap-2 md:grid-cols-2">
                {academicTermsQuery.isPending ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground md:col-span-2">
                    جارٍ تحميل الفصول الدراسية...
                  </div>
                ) : null}
                {!academicTermsQuery.isPending && academicTermOptions.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground md:col-span-2">
                    لا توجد فصول مرتبطة بالسنة المختارة.
                  </div>
                ) : null}
                {academicTermOptions.map((term) => (
                  <Input
                    key={term.id}
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.termTotals[term.id] ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        termTotals: {
                          ...prev.termTotals,
                          [term.id]: event.target.value,
                        },
                      }))
                    }
                    placeholder={`${term.name} (${term.code})`}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.semester1Total}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, semester1Total: event.target.value }))
                  }
                  placeholder="مجموع الفصل الأول"
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.semester2Total}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, semester2Total: event.target.value }))
                  }
                  placeholder="مجموع الفصل الثاني"
                />
              </div>
            )}

            <div className="grid gap-2 md:grid-cols-2">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.annualPercentage}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, annualPercentage: event.target.value }))
                }
                placeholder="النسبة السنوية (اختياري)"
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.finalStatusId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    finalStatusId: event.target.value,
                  }))
                }
              >
                <option value="">الحالة النهائية *</option>
                {(annualStatusesQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </select>
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as GradingWorkflowStatus,
                }))
              }
            >
              <option value="DRAFT">مسودة</option>
              <option value="IN_REVIEW">قيد المراجعة</option>
              <option value="APPROVED">معتمد</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>

            <Input
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              placeholder="ملاحظات"
            />

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
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

          <div className="flex gap-2">
            <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Medal className="h-4 w-4" />
              )}
              {editingId ? "حفظ التعديلات" : "إنشاء درجة سنوية"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                إلغاء
              </Button>
            ) : null}
          </div>
        </form>
      </BottomSheetForm>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>الدرجات السنوية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">النتائج تظهر هنا، والبحث والفلترة من الشريط العلوي.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {annualGradesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}
          {annualGradesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {annualGradesQuery.error instanceof Error
                ? annualGradesQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}
          {!annualGradesQuery.isPending && records.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج.
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
                    {item.studentEnrollment.student.fullName} - {formatNameCodeLabel(item.subject.name, item.subject.code)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatStudentEnrollmentPlacementLabel({
                      academicYear: item.academicYear,
                      gradeLevel: item.studentEnrollment.gradeLevel,
                      section: item.studentEnrollment.section,
                    })} |{" "}
                    الحالة النهائية: {formatNameCodeLabel(item.finalStatus.name, item.finalStatus.code)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatAnnualGradeTerms(item)} | الإجمالي: {item.annualTotal} | %:{" "}
                    {item.annualPercentage ?? 0}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.status === "APPROVED" ? "default" : "secondary"}>
                    {translateGradingWorkflowStatus(item.status)}
                  </Badge>
                  <Badge variant={item.isLocked ? "default" : "secondary"}>
                    {item.isLocked ? "مقفل" : "غير مقفل"}
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
                  disabled={!canUpdate || item.isLocked || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (item.isLocked) {
                      if (canUnlock) {
                        unlockMutation.mutate(item.id, {
                          onSuccess: () => setActionSuccess("تم إلغاء قفل الدرجة السنوية بنجاح."),
                        });
                      }
                      return;
                    }
                    if (canLock) {
                      lockMutation.mutate(item.id, {
                        onSuccess: () => setActionSuccess("تم قفل الدرجة السنوية بنجاح."),
                      });
                    }
                  }}
                  disabled={
                    (item.isLocked && !canUnlock) ||
                    (!item.isLocked && !canLock) ||
                    lockMutation.isPending ||
                    unlockMutation.isPending
                  }
                >
                  {item.isLocked ? (
                    <LockOpen className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  {item.isLocked ? "إلغاء القفل" : "قفل"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateMutation.mutate({
                      annualGradeId: item.id,
                      payload: { isActive: !item.isActive },
                    }, {
                      onSuccess: () =>
                        setActionSuccess(
                          item.isActive
                            ? "تم تعطيل الدرجة السنوية بنجاح."
                            : "تم تفعيل الدرجة السنوية بنجاح.",
                        ),
                    })
                  }
                  disabled={!canUpdate || item.isLocked || updateMutation.isPending}
                >
                  {item.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (!window.confirm("تأكيد الحذف؟")) {
                      return;
                    }
                    deleteMutation.mutate(item.id, {
                      onSuccess: () => setActionSuccess("تم حذف الدرجة السنوية بنجاح."),
                    });
                  }}
                  disabled={!canDelete || item.isLocked || deleteMutation.isPending}
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
                disabled={!pagination || pagination.page <= 1 || annualGradesQuery.isFetching}
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
                  annualGradesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void annualGradesQuery.refetch()}
                disabled={annualGradesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${annualGradesQuery.isFetching ? "animate-spin" : ""}`}
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
          onClick={handleStartCreate}
          label="إضافة درجة سنوية"
          ariaLabel="إضافة درجة سنوية"
          icon={<Plus className="h-4 w-4 sm:h-5 sm:w-5" />}
        />
      ) : null}
    </>
  );
}








