"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Layers,
  LoaderCircle,
  Medal,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Fab } from "@/components/ui/fab";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateGradingPolicyMutation,
  useDeleteGradingPolicyMutation,
  useUpdateGradingPolicyMutation,
} from "@/features/evaluation-policies/grading-policies/hooks/use-grading-policies-mutations";
import { useGradingPoliciesQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-grading-policies-query";
import { useAcademicYearOptionsQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-academic-year-options-query";
import { useGradeLevelOptionsQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-grade-level-options-query";
import { useSubjectOptionsQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-subject-options-query";
import { useAcademicTermOptionsQuery } from "@/features/academic-months/hooks/use-academic-term-options-query";
import {
  translateAssessmentType,
  translateGradingWorkflowStatus,
} from "@/lib/i18n/ar";
import { formatNameCodeLabel } from "@/lib/option-labels";
import type {
  AssessmentType,
  GradingPolicyListItem,
  GradingWorkflowStatus,
} from "@/lib/api/client";

type GradingPolicyFormState = {
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  totalMaxScore: string;
  academicTermId: string;
  passingScore: string;
  isDefault: boolean;
  status: GradingWorkflowStatus;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const ASSESSMENT_OPTIONS: AssessmentType[] = [
  "MONTHLY",
  "MIDTERM",
  "FINAL",
  "QUIZ",
  "ORAL",
  "PRACTICAL",
  "PROJECT",
];

const WORKFLOW_OPTIONS: GradingWorkflowStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "ARCHIVED",
];

const DEFAULT_FORM_STATE: GradingPolicyFormState = {
  academicYearId: "",
  gradeLevelId: "",
  subjectId: "",
  assessmentType: "MONTHLY",
  totalMaxScore: "",
  academicTermId: "",
  passingScore: "",
  isDefault: false,
  status: "DRAFT",
  notes: "",
  isActive: true,
};

type FilterDraftState = {
  year: string;
  grade: string;
  subject: string;
  term: string;
  assessment: AssessmentType | "all";
  status: GradingWorkflowStatus | "all";
  defaultType: "all" | "default" | "custom";
  active: "all" | "active" | "inactive";
};

const DEFAULT_FILTER_STATE: FilterDraftState = {
  year: "all",
  grade: "all",
  subject: "all",
  term: "all",
  assessment: "all",
  status: "all",
  defaultType: "all",
  active: "all",
};

function toFormState(item: GradingPolicyListItem): GradingPolicyFormState {
  return {
    academicYearId: item.academicYearId,
    gradeLevelId: item.gradeLevelId,
    subjectId: item.subjectId,
    assessmentType: item.assessmentType,
    totalMaxScore: String(item.totalMaxScore ?? ""),
    academicTermId: item.academicTermId ?? "",
    passingScore: String(item.passingScore ?? ""),
    isDefault: item.isDefault,
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

function statusBadgeVariant(
  status: GradingWorkflowStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "IN_REVIEW":
      return "secondary";
    default:
      return "outline";
  }
}

function assessmentTypeLabel(value: AssessmentType): string {
  return translateAssessmentType(value);
}

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
  return normalized ? normalized : undefined;
}

export function GradingPoliciesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grading-policies.create");
  const canUpdate = hasPermission("grading-policies.update");
  const canDelete = hasPermission("grading-policies.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [gradeFilter, setGradeFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [termFilter, setTermFilter] = React.useState("all");
  const [assessmentFilter, setAssessmentFilter] = React.useState<AssessmentType | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<GradingWorkflowStatus | "all">("all");
  const [defaultFilter, setDefaultFilter] = React.useState<"all" | "default" | "custom">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] =
    React.useState<FilterDraftState>(DEFAULT_FILTER_STATE);

  const [editingPolicyId, setEditingPolicyId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<GradingPolicyFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const policiesQuery = useGradingPoliciesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    gradeLevelId: gradeFilter === "all" ? undefined : gradeFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    assessmentType: assessmentFilter === "all" ? undefined : assessmentFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    isDefault:
      defaultFilter === "all" ? undefined : defaultFilter === "default" ? true : false,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const yearOptionsQuery = useAcademicYearOptionsQuery();
  const gradeOptionsQuery = useGradeLevelOptionsQuery();
  const subjectOptionsQuery = useSubjectOptionsQuery();
  const termOptionsQuery = useAcademicTermOptionsQuery(formState.academicYearId || undefined);
  const draftYearForTerms = isFilterOpen ? filterDraft.year : yearFilter;
  const filterTermOptionsQuery = useAcademicTermOptionsQuery(
    draftYearForTerms === "all" ? undefined : draftYearForTerms,
  );

  const createMutation = useCreateGradingPolicyMutation();
  const updateMutation = useUpdateGradingPolicyMutation();
  const deleteMutation = useDeleteGradingPolicyMutation();

  const policies = React.useMemo(() => policiesQuery.data?.data ?? [], [policiesQuery.data?.data]);
  const pagination = policiesQuery.data?.pagination;
  const yearOptions = React.useMemo(() => yearOptionsQuery.data ?? [], [yearOptionsQuery.data]);
  const gradeOptions = React.useMemo(() => gradeOptionsQuery.data ?? [], [gradeOptionsQuery.data]);
  const subjectOptions = React.useMemo(
    () => subjectOptionsQuery.data ?? [],
    [subjectOptionsQuery.data],
  );
  const isEditing = editingPolicyId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = policies.some((policy) => policy.id === editingPolicyId);
    if (!stillExists) {
      setEditingPolicyId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingPolicyId, isEditing, policies]);

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
      grade: gradeFilter,
      subject: subjectFilter,
      term: termFilter,
      assessment: assessmentFilter,
      status: statusFilter,
      defaultType: defaultFilter,
      active: activeFilter,
    });
  }, [
    isFilterOpen,
    yearFilter,
    gradeFilter,
    subjectFilter,
    termFilter,
    assessmentFilter,
    statusFilter,
    defaultFilter,
    activeFilter,
  ]);

  const resetForm = () => {
    setEditingPolicyId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const validateForm = (): boolean => {
    if (!formState.academicYearId || !formState.gradeLevelId || !formState.subjectId) {
      setFormError("الحقول الأساسية مطلوبة: السنة والصف والمادة.");
      return false;
    }

    const values = [
      ["totalMaxScore", formState.totalMaxScore],
      ["passingScore", formState.passingScore],
    ] as const;

    for (const [field, value] of values) {
      const parsed = parseOptionalNumber(value);
      if (value.trim() && parsed === undefined) {
        setFormError(`${field} يجب أن يكون رقمًا صالحًا.`);
        return false;
      }
      if (parsed !== undefined && parsed < 0) {
        setFormError(`${field} يجب ألا يكون سالبًا.`);
        return false;
      }
    }

    const totalMaxScore = parseOptionalNumber(formState.totalMaxScore);
    if (totalMaxScore !== undefined && totalMaxScore <= 0) {
      setFormError("الدرجة القصوى يجب أن تكون أكبر من صفر.");
      return false;
    }

    const passingScore = parseOptionalNumber(formState.passingScore);
    if (passingScore !== undefined && passingScore < 0) {
      setFormError("درجة النجاح يجب ألا تكون سالبة.");
      return false;
    }
    if (
      passingScore !== undefined &&
      totalMaxScore !== undefined &&
      passingScore > totalMaxScore
    ) {
      setFormError("درجة النجاح يجب ألا تتجاوز الدرجة القصوى الإجمالية.");
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
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      academicYearId: formState.academicYearId,
      gradeLevelId: formState.gradeLevelId,
      subjectId: formState.subjectId,
      assessmentType: formState.assessmentType,
      totalMaxScore: parseOptionalNumber(formState.totalMaxScore),
      academicTermId: toOptionalString(formState.academicTermId),
      passingScore: parseOptionalNumber(formState.passingScore),
      isDefault: formState.isDefault,
      status: formState.status,
      notes: formState.notes.trim() || undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingPolicyId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: grading-policies.update.");
        return;
      }

      updateMutation.mutate(
        {
          gradingPolicyId: editingPolicyId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث سياسة التقييم بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: grading-policies.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء سياسة التقييم بنجاح.");
      },
    });
  };

  const handleStartCreate = () => {
    if (!canCreate) return;

    setFormError(null);
    setActionSuccess(null);
    setEditingPolicyId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (policy: GradingPolicyListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingPolicyId(policy.id);
    setFormState(toFormState(policy));
    setIsFormOpen(true);
  };

  const handleDelete = (policy: GradingPolicyListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف سياسة ${policy.subject.name} (${assessmentTypeLabel(policy.assessmentType)})؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(policy.id, {
      onSuccess: () => {
        if (editingPolicyId === policy.id) {
          resetForm();
        }
        setActionSuccess("تم حذف سياسة التقييم بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setGradeFilter("all");
    setSubjectFilter("all");
    setTermFilter("all");
    setAssessmentFilter("all");
    setStatusFilter("all");
    setDefaultFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setGradeFilter(filterDraft.grade);
    setSubjectFilter(filterDraft.subject);
    setTermFilter(filterDraft.term);
    setAssessmentFilter(filterDraft.assessment);
    setStatusFilter(filterDraft.status);
    setDefaultFilter(filterDraft.defaultType);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      gradeFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      termFilter !== "all" ? 1 : 0,
      assessmentFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      defaultFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return count;
  }, [
    searchInput,
    yearFilter,
    gradeFilter,
    subjectFilter,
    termFilter,
    assessmentFilter,
    statusFilter,
    defaultFilter,
    activeFilter,
  ]);

  return (
    <>
      <PageShell
        title="سياسات التقييم"
        subtitle="إدارة قواعد التقييم والحدود القصوى والتثبيت حسب السنة/الصف/المادة."

        actions={
          <IconButton
            icon={
              <RefreshCw
                className={`h-5 w-5 ${policiesQuery.isFetching ? "animate-spin" : ""}`}
              />
            }
            onClick={() => void policiesQuery.refetch()}
            ariaLabel="تحديث"
            disabled={policiesQuery.isFetching}
          />
        }
      >
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <SearchField
                containerClassName="min-w-0"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث..."
                data-testid="grading-policy-filter-search"
              />
            </div>

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
            title="فلاتر البحث"
            className="md:w-[460px]"
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
                icon={<CalendarDays />}
                value={filterDraft.year}
                onChange={(event) => {
                  const nextYear = event.target.value;
                  setFilterDraft((prev) =>
                    prev.year === nextYear ? prev : { ...prev, year: nextYear, term: "all" },
                  );
                }}
                data-testid="grading-policy-filter-year"
              >
                <option value="all">السنة</option>
                {yearOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                icon={<User />}
                value={filterDraft.grade}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, grade: event.target.value }))
                }
                data-testid="grading-policy-filter-grade"
              >
                <option value="all">الصف</option>
                {gradeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                icon={<BookOpen />}
                value={filterDraft.subject}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, subject: event.target.value }))
                }
                data-testid="grading-policy-filter-subject"
              >
                <option value="all">المادة</option>
                {subjectOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                icon={<Layers />}
                value={filterDraft.term}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, term: event.target.value }))
                }
                data-testid="grading-policy-filter-term"
              >
                <option value="all">الفصل</option>
                {(filterTermOptionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                icon={<CheckCircle2 />}
                value={filterDraft.assessment}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    assessment: event.target.value as AssessmentType | "all",
                  }))
                }
                data-testid="grading-policy-filter-assessment"
              >
                <option value="all">نوع التقييم</option>
                {ASSESSMENT_OPTIONS.map((assessmentType) => (
                  <option key={assessmentType} value={assessmentType}>
                    {assessmentTypeLabel(assessmentType)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                value={filterDraft.status}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    status: event.target.value as GradingWorkflowStatus | "all",
                  }))
                }
                data-testid="grading-policy-filter-status"
              >
                <option value="all">الحالة</option>
                {WORKFLOW_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {translateGradingWorkflowStatus(status)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                value={filterDraft.defaultType}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    defaultType: event.target.value as "all" | "default" | "custom",
                  }))
                }
                data-testid="grading-policy-filter-default"
              >
                <option value="all">كل الأنواع</option>
                <option value="default">افتراضي</option>
                <option value="custom">مخصص</option>
              </SelectField>

              <SelectField
                value={filterDraft.active}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    active: event.target.value as "all" | "active" | "inactive",
                  }))
                }
                data-testid="grading-policy-filter-active"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </SelectField>
            </div>
          </FilterDrawer>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>قائمة سياسات الدرجات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>فلترة متعددة لسياسات التقييم والنشر.</CardDescription>

        </CardHeader>

        <CardContent className="space-y-3">
          {policiesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {policiesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {policiesQuery.error instanceof Error
                ? policiesQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!policiesQuery.isPending && policies.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد سياسات مطابقة.
            </div>
          ) : null}

          {policies.map((policy) => (
            <div
              key={policy.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-testid="grading-policy-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {policy.subject.name} - {assessmentTypeLabel(policy.assessmentType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNameCodeLabel(policy.academicYear.name, policy.academicYear.code)} / {formatNameCodeLabel(policy.gradeLevel.name, policy.gradeLevel.code)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الإجمالي: {policy.totalMaxScore} | النجاح: {policy.passingScore} | المكونات:{" "}
                    {policy.components.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    عدد المكونات: {policy.components.length}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={statusBadgeVariant(policy.status)}>
                    {translateGradingWorkflowStatus(policy.status)}
                  </Badge>
                  <Badge variant={policy.isDefault ? "secondary" : "outline"}>
                    {policy.isDefault ? "افتراضي" : "مخصص"}
                  </Badge>
                  <Badge variant={policy.isActive ? "default" : "outline"}>
                    {policy.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(policy)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(policy)}
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
                disabled={!pagination || pagination.page <= 1 || policiesQuery.isFetching}
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
                  policiesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void policiesQuery.refetch()}
                disabled={policiesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${policiesQuery.isFetching ? "animate-spin" : ""}`}
                />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
      </PageShell>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إنشاء"
        ariaLabel="إنشاء سياسة تقييم جديدة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل سياسة درجات" : "إنشاء سياسة درجات"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء سياسة"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>grading-policies.create</code>.
          </div>
        ) : (
          <div className="space-y-3" data-testid="grading-policy-form">
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                icon={<CalendarDays />}
                value={formState.academicYearId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
                data-testid="grading-policy-form-year"
              >
                <option value="">السنة الدراسية *</option>
                {yearOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                icon={<User />}
                value={formState.gradeLevelId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, gradeLevelId: event.target.value }))
                }
                data-testid="grading-policy-form-grade"
              >
                <option value="">الصف *</option>
                {gradeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                icon={<BookOpen />}
                value={formState.subjectId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, subjectId: event.target.value }))
                }
                data-testid="grading-policy-form-subject"
              >
                <option value="">المادة *</option>
                {subjectOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                icon={<CheckCircle2 />}
                value={formState.assessmentType}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    assessmentType: event.target.value as AssessmentType,
                  }))
                }
                data-testid="grading-policy-form-assessment"
              >
                {ASSESSMENT_OPTIONS.map((assessmentType) => (
                  <option key={assessmentType} value={assessmentType}>
                    {assessmentTypeLabel(assessmentType)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={formState.totalMaxScore}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, totalMaxScore: event.target.value }))
                }
                placeholder="الدرجة القصوى الإجمالية"
                data-testid="grading-policy-form-total-max"
              />
              <Input
                type="number"
                step="0.01"
                min={0}
                value={formState.passingScore}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, passingScore: event.target.value }))
                }
                placeholder="درجة النجاح"
                data-testid="grading-policy-form-passing"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                value={formState.academicTermId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, academicTermId: event.target.value }))
                }
                data-testid="grading-policy-form-term"
              >
                <option value="">الفصل الأكاديمي (اختياري)</option>
                {(termOptionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatNameCodeLabel(item.name, item.code)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    status: event.target.value as GradingWorkflowStatus,
                  }))
                }
                data-testid="grading-policy-form-status"
              >
                {WORKFLOW_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {translateGradingWorkflowStatus(status)}
                  </option>
                ))}
              </SelectField>

              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="ملاحظات (اختياري)"
                data-testid="grading-policy-form-notes"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormBooleanField
                label="افتراضي"
                checked={formState.isDefault}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isDefault: checked }))
                }
                data-testid="grading-policy-form-default"
              />
              <FormBooleanField
                label="نشط"
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isActive: checked }))
                }
                data-testid="grading-policy-form-active"
              />
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
            {actionSuccess ? (
              <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                {actionSuccess}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 gap-2"
                onClick={() => handleSubmitForm()}
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
                data-testid="grading-policy-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Medal className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء سياسة"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </BottomSheetForm>
    </>
  );
}





