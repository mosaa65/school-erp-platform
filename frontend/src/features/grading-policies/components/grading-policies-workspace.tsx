"use client";

import * as React from "react";
import {
  LoaderCircle,
  Medal,
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
  useCreateGradingPolicyMutation,
  useDeleteGradingPolicyMutation,
  useUpdateGradingPolicyMutation,
} from "@/features/grading-policies/hooks/use-grading-policies-mutations";
import { useGradingPoliciesQuery } from "@/features/grading-policies/hooks/use-grading-policies-query";
import { useAcademicYearOptionsQuery } from "@/features/grading-policies/hooks/use-academic-year-options-query";
import { useGradeLevelOptionsQuery } from "@/features/grading-policies/hooks/use-grade-level-options-query";
import { useSubjectOptionsQuery } from "@/features/grading-policies/hooks/use-subject-options-query";
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
  maxExamScore: string;
  maxHomeworkScore: string;
  maxAttendanceScore: string;
  maxActivityScore: string;
  maxContributionScore: string;
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
  maxExamScore: "",
  maxHomeworkScore: "",
  maxAttendanceScore: "",
  maxActivityScore: "",
  maxContributionScore: "",
  passingScore: "",
  isDefault: false,
  status: "DRAFT",
  notes: "",
  isActive: true,
};

function toFormState(item: GradingPolicyListItem): GradingPolicyFormState {
  return {
    academicYearId: item.academicYearId,
    gradeLevelId: item.gradeLevelId,
    subjectId: item.subjectId,
    assessmentType: item.assessmentType,
    maxExamScore: String(item.maxExamScore ?? ""),
    maxHomeworkScore: String(item.maxHomeworkScore ?? ""),
    maxAttendanceScore: String(item.maxAttendanceScore ?? ""),
    maxActivityScore: String(item.maxActivityScore ?? ""),
    maxContributionScore: String(item.maxContributionScore ?? ""),
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
  const [assessmentFilter, setAssessmentFilter] = React.useState<AssessmentType | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<GradingWorkflowStatus | "all">("all");
  const [defaultFilter, setDefaultFilter] = React.useState<"all" | "default" | "custom">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");

  const [editingPolicyId, setEditingPolicyId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<GradingPolicyFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const policiesQuery = useGradingPoliciesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    gradeLevelId: gradeFilter === "all" ? undefined : gradeFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    assessmentType: assessmentFilter === "all" ? undefined : assessmentFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    isDefault:
      defaultFilter === "all" ? undefined : defaultFilter === "default" ? true : false,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const yearOptionsQuery = useAcademicYearOptionsQuery();
  const gradeOptionsQuery = useGradeLevelOptionsQuery();
  const subjectOptionsQuery = useSubjectOptionsQuery();

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

  const resetForm = () => {
    setEditingPolicyId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.academicYearId || !formState.gradeLevelId || !formState.subjectId) {
      setFormError("الحقول الأساسية مطلوبة: السنة والصف والمادة.");
      return false;
    }

    const values = [
      ["maxExamScore", formState.maxExamScore],
      ["maxHomeworkScore", formState.maxHomeworkScore],
      ["maxAttendanceScore", formState.maxAttendanceScore],
      ["maxActivityScore", formState.maxActivityScore],
      ["maxContributionScore", formState.maxContributionScore],
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

    const passingScore = parseOptionalNumber(formState.passingScore);
    if (passingScore !== undefined && passingScore > 100) {
      setFormError("درجة النجاح يجب أن تكون بين 0 و100.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
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
      academicYearId: formState.academicYearId,
      gradeLevelId: formState.gradeLevelId,
      subjectId: formState.subjectId,
      assessmentType: formState.assessmentType,
      maxExamScore: parseOptionalNumber(formState.maxExamScore),
      maxHomeworkScore: parseOptionalNumber(formState.maxHomeworkScore),
      maxAttendanceScore: parseOptionalNumber(formState.maxAttendanceScore),
      maxActivityScore: parseOptionalNumber(formState.maxActivityScore),
      maxContributionScore: parseOptionalNumber(formState.maxContributionScore),
      passingScore: parseOptionalNumber(formState.passingScore),
      isDefault: formState.isDefault,
      status: formState.status,
      notes: formState.notes.trim() || undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingPolicyId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية grading-policies.update.");
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
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية grading-policies.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (policy: GradingPolicyListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingPolicyId(policy.id);
    setFormState(toFormState(policy));
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
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[460px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل سياسة درجات" : "إنشاء سياسة درجات"}
          </CardTitle>
          <CardDescription>
            ضبط قواعد التقييم والحدود القصوى والنجاح حسب السنة/الصف/المادة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>grading-policies.create</code>.
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={handleSubmitForm}
              data-testid="grading-policy-form"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                </select>

                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                </select>

                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formState.maxExamScore}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, maxExamScore: event.target.value }))
                  }
                  placeholder="الدرجة القصوى للاختبار"
                  data-testid="grading-policy-form-max-exam"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formState.maxHomeworkScore}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, maxHomeworkScore: event.target.value }))
                  }
                  placeholder="الدرجة القصوى للواجب"
                  data-testid="grading-policy-form-max-homework"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formState.maxAttendanceScore}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, maxAttendanceScore: event.target.value }))
                  }
                  placeholder="الدرجة القصوى للحضور"
                  data-testid="grading-policy-form-max-attendance"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formState.maxActivityScore}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, maxActivityScore: event.target.value }))
                  }
                  placeholder="الدرجة القصوى للنشاط"
                  data-testid="grading-policy-form-max-activity"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formState.maxContributionScore}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      maxContributionScore: event.target.value,
                    }))
                  }
                  placeholder="الدرجة القصوى للمشاركة"
                  data-testid="grading-policy-form-max-contribution"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={formState.passingScore}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, passingScore: event.target.value }))
                  }
                  placeholder="درجة النجاح (0-100)"
                  data-testid="grading-policy-form-passing"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                </select>

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
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>افتراضي</span>
                  <input
                    type="checkbox"
                    checked={formState.isDefault}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, isDefault: event.target.checked }))
                    }
                    data-testid="grading-policy-form-default"
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
                    data-testid="grading-policy-form-active"
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
                  type="submit"
                  className="flex-1 gap-2"
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
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>قائمة سياسات الدرجات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>فلترة متعددة لسياسات التقييم والنشر.</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_120px_120px_120px_130px_120px_110px_110px_auto]"
            data-testid="grading-policy-filters-form"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث..."
                className="pr-8"
                data-testid="grading-policy-filter-search"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={yearFilter}
              onChange={(event) => {
                setPage(1);
                setYearFilter(event.target.value);
              }}
              data-testid="grading-policy-filter-year"
            >
              <option value="all">السنة</option>
              {yearOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={gradeFilter}
              onChange={(event) => {
                setPage(1);
                setGradeFilter(event.target.value);
              }}
              data-testid="grading-policy-filter-grade"
            >
              <option value="all">الصف</option>
              {gradeOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
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
              data-testid="grading-policy-filter-subject"
            >
              <option value="all">المادة</option>
              {subjectOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatNameCodeLabel(item.name, item.code)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={assessmentFilter}
              onChange={(event) => {
                setPage(1);
                setAssessmentFilter(event.target.value as AssessmentType | "all");
              }}
              data-testid="grading-policy-filter-assessment"
            >
              <option value="all">نوع التقييم</option>
              {ASSESSMENT_OPTIONS.map((assessmentType) => (
                <option key={assessmentType} value={assessmentType}>
                  {assessmentTypeLabel(assessmentType)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as GradingWorkflowStatus | "all");
              }}
              data-testid="grading-policy-filter-status"
            >
              <option value="all">الحالة</option>
              {WORKFLOW_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {translateGradingWorkflowStatus(status)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={defaultFilter}
              onChange={(event) => {
                setPage(1);
                setDefaultFilter(event.target.value as "all" | "default" | "custom");
              }}
              data-testid="grading-policy-filter-default"
            >
              <option value="all">كل الأنواع</option>
              <option value="default">افتراضي</option>
              <option value="custom">مخصص</option>
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
              data-testid="grading-policy-filter-active"
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>

            <Button
              type="submit"
              variant="outline"
              className="gap-2"
              data-testid="grading-policy-filters-submit"
            >
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {policiesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {policiesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {policiesQuery.error instanceof Error
                ? policiesQuery.error.message
                : "فشل التحميل"}
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
                    النجاح: {policy.passingScore} | الاختبار: {policy.maxExamScore} | الواجب:{" "}
                    {policy.maxHomeworkScore} | الحضور: {policy.maxAttendanceScore}
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
  );
}





