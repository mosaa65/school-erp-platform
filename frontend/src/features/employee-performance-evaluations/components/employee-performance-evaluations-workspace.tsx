"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Filter,
  LoaderCircle,
  Medal,
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
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAcademicYearOptionsQuery } from "@/features/employee-performance-evaluations/hooks/use-academic-year-options-query";
import { useEmployeeOptionsQuery } from "@/features/employee-performance-evaluations/hooks/use-employee-options-query";
import {
  useCreateEmployeePerformanceEvaluationMutation,
  useDeleteEmployeePerformanceEvaluationMutation,
  useUpdateEmployeePerformanceEvaluationMutation,
} from "@/features/employee-performance-evaluations/hooks/use-employee-performance-evaluations-mutations";
import { useEmployeePerformanceEvaluationsQuery } from "@/features/employee-performance-evaluations/hooks/use-employee-performance-evaluations-query";
import type {
  EmployeePerformanceEvaluationListItem,
  PerformanceRatingLevel,
} from "@/lib/api/client";
import { translatePerformanceRatingLevel } from "@/lib/i18n/ar";

type EvaluationFormState = {
  employeeId: string;
  academicYearId: string;
  evaluationDate: string;
  score: string;
  ratingLevel: PerformanceRatingLevel | "";
  evaluatorEmployeeId: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const RATING_OPTIONS: PerformanceRatingLevel[] = [
  "EXCELLENT",
  "VERY_GOOD",
  "GOOD",
  "ACCEPTABLE",
  "POOR",
];

const DEFAULT_FORM_STATE: EvaluationFormState = {
  employeeId: "",
  academicYearId: "",
  evaluationDate: "",
  score: "0",
  ratingLevel: "",
  evaluatorEmployeeId: "",
  strengths: "",
  weaknesses: "",
  recommendations: "",
  isActive: true,
};

function deriveRatingFromScore(score: number): PerformanceRatingLevel {
  if (score >= 90) {
    return "EXCELLENT";
  }

  if (score >= 80) {
    return "VERY_GOOD";
  }

  if (score >= 70) {
    return "GOOD";
  }

  if (score >= 50) {
    return "ACCEPTABLE";
  }

  return "POOR";
}

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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ar-SA");
}

function toFormState(evaluation: EmployeePerformanceEvaluationListItem): EvaluationFormState {
  return {
    employeeId: evaluation.employeeId,
    academicYearId: evaluation.academicYearId,
    evaluationDate: toDateInput(evaluation.evaluationDate),
    score: String(evaluation.score),
    ratingLevel: evaluation.ratingLevel,
    evaluatorEmployeeId: evaluation.evaluatorEmployeeId ?? "",
    strengths: evaluation.strengths ?? "",
    weaknesses: evaluation.weaknesses ?? "",
    recommendations: evaluation.recommendations ?? "",
    isActive: evaluation.isActive,
  };
}

export function EmployeePerformanceEvaluationsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-performance-evaluations.create");
  const canUpdate = hasPermission("employee-performance-evaluations.update");
  const canDelete = hasPermission("employee-performance-evaluations.delete");
  const canReadEmployees = hasPermission("employees.read");
  const canReadAcademicYears = hasPermission("academic-years.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [academicYearFilter, setAcademicYearFilter] = React.useState("all");
  const [ratingFilter, setRatingFilter] = React.useState<PerformanceRatingLevel | "all">(
    "all",
  );
  const [evaluatorFilter, setEvaluatorFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    employee: string;
    academicYear: string;
    rating: PerformanceRatingLevel | "all";
    evaluator: string;
    active: "all" | "active" | "inactive";
  }>({
    employee: "all",
    academicYear: "all",
    rating: "all",
    evaluator: "all",
    active: "all",
  });

  const [editingEvaluationId, setEditingEvaluationId] = React.useState<string | null>(
    null,
  );
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<EvaluationFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const evaluationsQuery = useEmployeePerformanceEvaluationsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    academicYearId: academicYearFilter === "all" ? undefined : academicYearFilter,
    ratingLevel: ratingFilter === "all" ? undefined : ratingFilter,
    evaluatorEmployeeId: evaluatorFilter === "all" ? undefined : evaluatorFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const employeesQuery = useEmployeeOptionsQuery();
  const academicYearsQuery = useAcademicYearOptionsQuery();

  const createMutation = useCreateEmployeePerformanceEvaluationMutation();
  const updateMutation = useUpdateEmployeePerformanceEvaluationMutation();
  const deleteMutation = useDeleteEmployeePerformanceEvaluationMutation();

  const evaluations = React.useMemo(
    () => evaluationsQuery.data?.data ?? [],
    [evaluationsQuery.data?.data],
  );
  const pagination = evaluationsQuery.data?.pagination;
  const isEditing = editingEvaluationId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;
  const scoreNumber = Number(formState.score);
  const isScoreValid =
    Number.isInteger(scoreNumber) && scoreNumber >= 0 && scoreNumber <= 100;
  const computedRating = isScoreValid ? deriveRatingFromScore(scoreNumber) : null;
  const hasRatingMismatch =
    Boolean(formState.ratingLevel) &&
    Boolean(computedRating) &&
    formState.ratingLevel !== computedRating;

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = evaluations.some((item) => item.id === editingEvaluationId);
    if (!stillExists) {
      setEditingEvaluationId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingEvaluationId, evaluations, isEditing]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      employee: employeeFilter,
      academicYear: academicYearFilter,
      rating: ratingFilter,
      evaluator: evaluatorFilter,
      active: activeFilter,
    });
  }, [
    academicYearFilter,
    activeFilter,
    employeeFilter,
    evaluatorFilter,
    isFilterOpen,
    ratingFilter,
  ]);

  const resetForm = () => {
    setEditingEvaluationId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingEvaluationId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId || !formState.academicYearId || !formState.evaluationDate) {
      setFormError("الموظف والسنة الأكاديمية وتاريخ التقييم حقول مطلوبة.");
      return false;
    }

    if (!isScoreValid) {
      setFormError("الدرجة يجب أن تكون رقمًا صحيحًا بين 0 و100.");
      return false;
    }

    if (hasRatingMismatch) {
      setFormError("مستوى التقييم لا يطابق الدرجة الحالية.");
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
      employeeId: formState.employeeId,
      academicYearId: formState.academicYearId,
      evaluationDate: toDateIso(formState.evaluationDate),
      score: scoreNumber,
      ratingLevel: formState.ratingLevel || computedRating || undefined,
      evaluatorEmployeeId: toOptionalString(formState.evaluatorEmployeeId),
      strengths: toOptionalString(formState.strengths),
      weaknesses: toOptionalString(formState.weaknesses),
      recommendations: toOptionalString(formState.recommendations),
      isActive: formState.isActive,
    };

    if (isEditing && editingEvaluationId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-performance-evaluations.update.");
        return;
      }

      updateMutation.mutate(
        {
          evaluationId: editingEvaluationId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-performance-evaluations.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (evaluation: EmployeePerformanceEvaluationListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingEvaluationId(evaluation.id);
    setFormState(toFormState(evaluation));
    setIsFormOpen(true);
  };

  const handleDelete = (evaluation: EmployeePerformanceEvaluationListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف تقييم ${evaluation.employee.fullName} بتاريخ ${formatDate(
        evaluation.evaluationDate,
      )}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(evaluation.id, {
      onSuccess: () => {
        if (editingEvaluationId === evaluation.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions = canReadEmployees && canReadAcademicYears;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setAcademicYearFilter("all");
    setRatingFilter("all");
    setEvaluatorFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setAcademicYearFilter(filterDraft.academicYear);
    setRatingFilter(filterDraft.rating);
    setEvaluatorFilter(filterDraft.evaluator);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      employeeFilter !== "all" ? 1 : 0,
      academicYearFilter !== "all" ? 1 : 0,
      ratingFilter !== "all" ? 1 : 0,
      evaluatorFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [
    academicYearFilter,
    activeFilter,
    employeeFilter,
    evaluatorFilter,
    ratingFilter,
    searchInput,
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
              placeholder="??? ??????? ?? ???? ???????..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsFilterOpen((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              ?????
              {activeFiltersCount > 0 ? (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFiltersCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="????? ?????????"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="flex-1 gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                ???
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
                ?????
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.employee}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, employee: event.target.value }))
              }
            >
              <option value="all">?? ????????</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.jobNumber ?? employee.fullName}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.academicYear}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, academicYear: event.target.value }))
              }
            >
              <option value="all">?? ???????</option>
              {(academicYearsQuery.data ?? []).map((year) => (
                <option key={year.id} value={year.id}>
                  {year.code}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.rating}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  rating: event.target.value as PerformanceRatingLevel | "all",
                }))
              }
            >
              <option value="all">?? ?????????</option>
              {RATING_OPTIONS.map((rating) => (
                <option key={rating} value={rating}>
                  {translatePerformanceRatingLevel(rating)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.evaluator}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, evaluator: event.target.value }))
              }
            >
              <option value="all">?? ?????????</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.jobNumber ?? employee.fullName}
                </option>
              ))}
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
              <option value="all">?? ???????</option>
              <option value="active">?????? ???</option>
              <option value="inactive">??? ?????? ???</option>
            </SelectField>
          </div>
        </FilterDrawer>

<Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>تقييمات الأداء</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة تقييمات أداء الموظفين حسب السنة والتقدير والمقيّم.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {evaluationsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {evaluationsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {evaluationsQuery.error instanceof Error
                ? evaluationsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!evaluationsQuery.isPending && evaluations.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {evaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              data-testid="evaluation-card"
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{evaluation.employee.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    السنة: {evaluation.academicYear.name} ({evaluation.academicYear.code}) | التاريخ:{" "}
                    {formatDate(evaluation.evaluationDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المقيّم: {evaluation.evaluator?.fullName ?? "غير محدد"}
                  </p>
                  {evaluation.recommendations ? (
                    <p className="text-xs text-muted-foreground">
                      التوصيات: {evaluation.recommendations}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">الدرجة: {evaluation.score}</Badge>
                  <Badge variant="outline">
                    {translatePerformanceRatingLevel(evaluation.ratingLevel)}
                  </Badge>
                  <Badge variant={evaluation.isActive ? "default" : "outline"}>
                    {evaluation.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(evaluation)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(evaluation)}
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
                disabled={!pagination || pagination.page <= 1 || evaluationsQuery.isFetching}
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
                  evaluationsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void evaluationsQuery.refetch()}
                disabled={evaluationsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${evaluationsQuery.isFetching ? "animate-spin" : ""}`}
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
        label="?????"
        ariaLabel="????? ????? ????"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "????? ????? ????" : "????? ????? ????"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "??? ?????????" : "????? ?????"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            ?? ???? ???????? ????????: <code>employee-performance-evaluations.create</code>.
          </div>
        ) : (
<form className="space-y-3" onSubmit={handleSubmitForm}>
              <p className="text-sm text-muted-foreground">
                {isEditing
                  ? "????? ????? ??????."
                  : "????? ????? ???? ???? ??????."}
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الموظف *</label>
                <select
                  data-testid="evaluation-form-employee"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.employeeId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, employeeId: event.target.value }))
                  }
                  disabled={!canReadEmployees}
                >
                  <option value="">اختر الموظف</option>
                  {(employeesQuery.data ?? []).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.jobNumber ?? "بدون رقم"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  السنة الأكاديمية *
                </label>
                <select
                  data-testid="evaluation-form-academic-year"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.academicYearId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      academicYearId: event.target.value,
                    }))
                  }
                  disabled={!canReadAcademicYears}
                >
                  <option value="">اختر السنة الدراسية</option>
                  {(academicYearsQuery.data ?? []).map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} ({year.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ التقييم *
                  </label>
                  <Input
                    data-testid="evaluation-form-date"
                    type="date"
                    value={formState.evaluationDate}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        evaluationDate: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">الدرجة *</label>
                  <Input
                    data-testid="evaluation-form-score"
                    type="number"
                    min={0}
                    max={100}
                    value={formState.score}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, score: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="rounded-md border border-dashed p-2 text-xs">
                <p className="font-medium text-muted-foreground">
                  التقدير التلقائي:{" "}
                  {computedRating ? translatePerformanceRatingLevel(computedRating) : "-"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  100-90: ممتاز | 89-80: جيد جدًا | 79-70: جيد | 69-50: مقبول | 49-0: ضعيف
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">مستوى التقييم</label>
                <select
                  data-testid="evaluation-form-rating-level"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.ratingLevel}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      ratingLevel: event.target.value as PerformanceRatingLevel | "",
                    }))
                  }
                >
                  <option value="">تلقائي حسب الدرجة</option>
                  {RATING_OPTIONS.map((rating) => (
                    <option key={rating} value={rating}>
                      {translatePerformanceRatingLevel(rating)}
                    </option>
                  ))}
                </select>
                {hasRatingMismatch && computedRating ? (
                  <p className="text-xs text-destructive">
                    مستوى التقييم الحالي لا يطابق الدرجة. المتوقع:{" "}
                    {translatePerformanceRatingLevel(computedRating)}.
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  الموظف المقيّم
                </label>
                <select
                  data-testid="evaluation-form-evaluator"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.evaluatorEmployeeId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      evaluatorEmployeeId: event.target.value,
                    }))
                  }
                  disabled={!canReadEmployees}
                >
                  <option value="">غير محدد</option>
                  {(employeesQuery.data ?? []).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.jobNumber ?? "بدون رقم"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">نقاط القوة</label>
                <Input
                  data-testid="evaluation-form-strengths"
                  value={formState.strengths}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, strengths: event.target.value }))
                  }
                  placeholder="إدارة صفية قوية"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">نقاط التحسين</label>
                <Input
                  data-testid="evaluation-form-weaknesses"
                  value={formState.weaknesses}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, weaknesses: event.target.value }))
                  }
                  placeholder="يحتاج إلى تحسين تخطيط التقييم"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  التوصيات
                </label>
                <Input
                  data-testid="evaluation-form-recommendations"
                  value={formState.recommendations}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      recommendations: event.target.value,
                    }))
                  }
                  placeholder="إكمال تدريب متقدم في أساليب التدريس"
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
                  يتطلب هذا الجزء صلاحيات القراءة: <code>employees.read</code> و{" "}
                  <code>academic-years.read</code>.
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  data-testid="evaluation-form-submit"
                  className="flex-1 gap-2"
                  disabled={
                    isFormSubmitting ||
                    (!canCreate && !isEditing) ||
                    !hasDependenciesReadPermissions ||
                    hasRatingMismatch
                  }
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Medal className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء تقييم"}
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
}





