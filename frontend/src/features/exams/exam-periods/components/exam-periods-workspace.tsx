"use client";

import * as React from "react";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";

import { PageShell } from "@/components/ui/page-shell";

import {
  Plus,
  Lock,
  LockOpen,
  PencilLine,
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
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateExamPeriodMutation,
  useDeleteExamPeriodMutation,
  useUpdateExamPeriodMutation,
} from "@/features/exams/exam-periods/hooks/use-exam-periods-mutations";
import { useExamPeriodsQuery } from "@/features/exams/exam-periods/hooks/use-exam-periods-query";
import { useAcademicYearOptionsQuery } from "@/features/exams/exam-periods/hooks/use-academic-year-options-query";
import { useAcademicTermOptionsQuery } from "@/features/exams/exam-periods/hooks/use-academic-term-options-query";
import {
  translateAssessmentType,
  translateGradingWorkflowStatus,
} from "@/lib/i18n/ar";
import { formatNameCodeLabel } from "@/lib/option-labels";
import type {
  AssessmentType,
  ExamPeriodListItem,
  GradingWorkflowStatus,
} from "@/lib/api/client";

type ExamPeriodFormState = {
  academicYearId: string;
  academicTermId: string;
  name: string;
  assessmentType: AssessmentType;
  startDate: string;
  endDate: string;
  status: GradingWorkflowStatus;
  isLocked: boolean;
  isActive: boolean;
};

type ExamPeriodFiltersState = {
  academicYearId: string;
  academicTermId: string;
  assessmentType: AssessmentType | "all";
  status: GradingWorkflowStatus | "all";
  locked: "all" | "locked" | "unlocked";
  active: "all" | "active" | "inactive";
};

const PAGE_SIZE = 12;

const ASSESSMENT_TYPE_OPTIONS: AssessmentType[] = [
  "MONTHLY",
  "MIDTERM",
  "FINAL",
  "QUIZ",
  "ORAL",
  "PRACTICAL",
  "PROJECT",
];

const WORKFLOW_STATUS_OPTIONS: GradingWorkflowStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "ARCHIVED",
];

const DEFAULT_FORM_STATE: ExamPeriodFormState = {
  academicYearId: "",
  academicTermId: "",
  name: "",
  assessmentType: "MONTHLY",
  startDate: "",
  endDate: "",
  status: "DRAFT",
  isLocked: false,
  isActive: true,
};

const DEFAULT_FILTERS: ExamPeriodFiltersState = {
  academicYearId: "all",
  academicTermId: "all",
  assessmentType: "all",
  status: "all",
  locked: "all",
  active: "all",
};

function toDateTimeLocalInput(isoDateTime: string | null): string {
  if (!isoDateTime) {
    return "";
  }

  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function toDateTimeIso(dateTimeLocalInput: string): string {
  return new Date(dateTimeLocalInput).toISOString();
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ar-YE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toFormState(item: ExamPeriodListItem): ExamPeriodFormState {
  return {
    academicYearId: item.academicYearId,
    academicTermId: item.academicTermId,
    name: item.name,
    assessmentType: item.assessmentType,
    startDate: toDateTimeLocalInput(item.startDate),
    endDate: toDateTimeLocalInput(item.endDate),
    status: item.status,
    isLocked: item.isLocked,
    isActive: item.isActive,
  };
}

function getAssessmentTypeLabel(value: AssessmentType): string {
  return translateAssessmentType(value);
}

function getStatusLabel(value: GradingWorkflowStatus): string {
  return translateGradingWorkflowStatus(value);
}

export function ExamPeriodsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("exam-periods.create");
  const canUpdate = hasPermission("exam-periods.update");
  const canDelete = hasPermission("exam-periods.delete");
  const canReadAcademicYears = hasPermission("academic-years.read");
  const canReadAcademicTerms = hasPermission("academic-terms.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [academicYearFilter, setAcademicYearFilter] = React.useState("all");
  const [academicTermFilter, setAcademicTermFilter] = React.useState("all");
  const [assessmentTypeFilter, setAssessmentTypeFilter] = React.useState<AssessmentType | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = React.useState<GradingWorkflowStatus | "all">("all");
  const [lockedFilter, setLockedFilter] = React.useState<"all" | "locked" | "unlocked">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<ExamPeriodFiltersState>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const [editingExamPeriodId, setEditingExamPeriodId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<ExamPeriodFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const selectedYearForTerms =
    (isFilterOpen && filterDraft.academicYearId !== "all"
      ? filterDraft.academicYearId
      : undefined) ||
    formState.academicYearId ||
    (academicYearFilter === "all" ? undefined : academicYearFilter);

  const yearsQuery = useAcademicYearOptionsQuery();
  const termsQuery = useAcademicTermOptionsQuery(selectedYearForTerms);
  const examPeriodsQuery = useExamPeriodsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: academicYearFilter === "all" ? undefined : academicYearFilter,
    academicTermId: academicTermFilter === "all" ? undefined : academicTermFilter,
    assessmentType: assessmentTypeFilter === "all" ? undefined : assessmentTypeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    isLocked: lockedFilter === "all" ? undefined : lockedFilter === "locked",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createMutation = useCreateExamPeriodMutation();
  const updateMutation = useUpdateExamPeriodMutation();
  const deleteMutation = useDeleteExamPeriodMutation();

  const examPeriods = React.useMemo(
    () => examPeriodsQuery.data?.data ?? [],
    [examPeriodsQuery.data?.data],
  );
  const pagination = examPeriodsQuery.data?.pagination;
  const isEditing = editingExamPeriodId !== null;

  const termsForForm = React.useMemo(() => {
    const all = termsQuery.data ?? [];
    if (!formState.academicYearId) {
      return [];
    }

    return all.filter((term) => term.academicYearId === formState.academicYearId);
  }, [formState.academicYearId, termsQuery.data]);

  const termsForFilter = React.useMemo(() => {
    const all = termsQuery.data ?? [];
    const selectedFilterYear =
      filterDraft.academicYearId !== "all"
        ? filterDraft.academicYearId
        : academicYearFilter === "all"
          ? undefined
          : academicYearFilter;

    if (!selectedFilterYear) {
      return all;
    }

    return all.filter((term) => term.academicYearId === selectedFilterYear);
  }, [academicYearFilter, filterDraft.academicYearId, termsQuery.data]);

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = examPeriods.some((item) => item.id === editingExamPeriodId);
    if (!stillExists) {
      setEditingExamPeriodId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingExamPeriodId, examPeriods, isEditing]);

  React.useEffect(() => {
    if (!formState.academicYearId || !formState.academicTermId) {
      return;
    }

    const exists = termsForForm.some((term) => term.id === formState.academicTermId);
    if (!exists) {
      setFormState((prev) => ({ ...prev, academicTermId: "" }));
    }
  }, [formState.academicTermId, formState.academicYearId, termsForForm]);

  const resetForm = () => {
    setEditingExamPeriodId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const closeFormSheet = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const openCreateSheet = () => {
    if (!canCreate) {
      return;
    }

    setActionSuccess(null);
    setIsFilterOpen(false);
    resetForm();
    setIsFormOpen(true);
  };

  const openFilterDrawer = () => {
    setIsFormOpen(false);
    setFilterDraft({
      academicYearId: academicYearFilter,
      academicTermId: academicTermFilter,
      assessmentType: assessmentTypeFilter,
      status: statusFilter,
      locked: lockedFilter,
      active: activeFilter,
    });
    setIsFilterOpen(true);
  };

  const handleStartCreate = () => {
    openCreateSheet();
  };

  const applyFilters = () => {
    setPage(1);
    setAcademicYearFilter(filterDraft.academicYearId);
    setAcademicTermFilter(filterDraft.academicTermId);
    setAssessmentTypeFilter(filterDraft.assessmentType);
    setStatusFilter(filterDraft.status);
    setLockedFilter(filterDraft.locked);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setAcademicYearFilter("all");
    setAcademicTermFilter("all");
    setAssessmentTypeFilter("all");
    setStatusFilter("all");
    setLockedFilter("all");
    setActiveFilter("all");
    setFilterDraft(DEFAULT_FILTERS);
    setPage(1);
    setIsFilterOpen(false);
  };

  const validateForm = (): boolean => {
    if (!formState.academicYearId || !formState.academicTermId || !formState.name.trim()) {
      setFormError("الحقول الأساسية مطلوبة: السنة، الفصل، الاسم.");
      return false;
    }

    if (formState.name.trim().length > 120) {
      setFormError("اسم الفترة الاختبارية يجب ألا يتجاوز 120 حرفًا.");
      return false;
    }

    if (formState.startDate && formState.endDate) {
      const start = new Date(formState.startDate);
      const end = new Date(formState.endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setFormError("تنسيق التاريخ غير صالح.");
        return false;
      }

      if (end < start) {
        setFormError("تاريخ النهاية يجب أن يكون بعد أو مساويًا لتاريخ البداية.");
        return false;
      }
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
      academicTermId: formState.academicTermId,
      name: formState.name.trim(),
      assessmentType: formState.assessmentType,
      startDate: formState.startDate ? toDateTimeIso(formState.startDate) : undefined,
      endDate: formState.endDate ? toDateTimeIso(formState.endDate) : undefined,
      status: formState.status,
      isLocked: formState.isLocked,
      isActive: formState.isActive,
    };

    if (isEditing && editingExamPeriodId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: exam-periods.update.");
        return;
      }

      updateMutation.mutate(
        {
          examPeriodId: editingExamPeriodId,
          payload,
        },
        {
          onSuccess: () => {
            closeFormSheet();
            setActionSuccess("تم تحديث الفترة الاختبارية بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: exam-periods.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        closeFormSheet();
        setPage(1);
        setActionSuccess("تم إنشاء الفترة الاختبارية بنجاح.");
      },
    });
  };

  const handleStartEdit = (item: ExamPeriodListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setIsFilterOpen(false);
    setEditingExamPeriodId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleToggleLock = (item: ExamPeriodListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate({
      examPeriodId: item.id,
      payload: {
        isLocked: !item.isLocked,
      },
    }, {
      onSuccess: () => {
        setActionSuccess(
          item.isLocked
            ? "تم فتح قفل الفترة الاختبارية بنجاح."
            : "تم قفل الفترة الاختبارية بنجاح.",
        );
      },
    });
  };

  const handleToggleActive = (item: ExamPeriodListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate({
      examPeriodId: item.id,
      payload: {
        isActive: !item.isActive,
      },
    }, {
      onSuccess: () => {
        setActionSuccess(
          item.isActive
            ? "تم تعطيل الفترة الاختبارية بنجاح."
            : "تم تفعيل الفترة الاختبارية بنجاح.",
        );
      },
    });
  };

  const handleDelete = (item: ExamPeriodListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الفترة الاختبارية ${item.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingExamPeriodId === item.id) {
          resetForm();
        }
        setActionSuccess("تم حذف الفترة الاختبارية بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions = canReadAcademicYears && canReadAcademicTerms;
  const activeFiltersCount = [
    search ? 1 : 0,
    academicYearFilter !== "all" ? 1 : 0,
    academicTermFilter !== "all" ? 1 : 0,
    assessmentTypeFilter !== "all" ? 1 : 0,
    statusFilter !== "all" ? 1 : 0,
    lockedFilter !== "all" ? 1 : 0,
    activeFilter !== "all" ? 1 : 0,
  ].reduce((total, count) => total + count, 0);

  return (
    <PageShell title="الفترات الاختبارية">
      <div className="space-y-4">
      <ManagementToolbar
        searchValue={searchInput}
        onSearchChange={(event) => setSearchInput(event.target.value)}
        searchPlaceholder="ابحث في الفترات الاختبارية..."
        filterCount={activeFiltersCount}
        onFilterClick={openFilterDrawer}
      />

      {actionSuccess || mutationError ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            actionSuccess
              ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {actionSuccess ?? mutationError}
        </div>
      ) : null}

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلترة الفترات الاختبارية"
        actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
      >
        <div className="space-y-4">
          <SelectField
            value={filterDraft.academicYearId}
            onChange={(event) =>
              setFilterDraft((prev) => ({
                ...prev,
                academicYearId: event.target.value,
                academicTermId: "all",
              }))
            }
          >
            <option value="all">كل السنوات</option>
            {(yearsQuery.data ?? []).map((year) => (
              <option key={year.id} value={year.id}>
                {formatNameCodeLabel(year.name, year.code)}
              </option>
            ))}
          </SelectField>

          <SelectField
            value={filterDraft.academicTermId}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, academicTermId: event.target.value }))
            }
            disabled={!filterDraft.academicYearId || filterDraft.academicYearId === "all"}
          >
            <option value="all">كل الفصول</option>
            {termsForFilter.map((term) => (
              <option key={term.id} value={term.id}>
                {formatNameCodeLabel(term.name, term.code)}
              </option>
            ))}
          </SelectField>

          <SelectField
            value={filterDraft.assessmentType}
            onChange={(event) =>
              setFilterDraft((prev) => ({
                ...prev,
                assessmentType: event.target.value as AssessmentType | "all",
              }))
            }
          >
            <option value="all">كل الأنواع</option>
            {ASSESSMENT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {translateAssessmentType(option)}
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
          >
            <option value="all">كل الحالات</option>
            {WORKFLOW_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {translateGradingWorkflowStatus(option)}
              </option>
            ))}
          </SelectField>

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.locked}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  locked: event.target.value as "all" | "locked" | "unlocked",
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
              <option value="all">الحالة: الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </SelectField>
          </div>
        </div>
      </FilterDrawer>

      <CrudFormSheet
        open={isFormOpen}
        title={isEditing ? "تعديل فترة اختبارية" : "إنشاء فترة اختبارية"}
        onClose={closeFormSheet}
        onSubmit={handleSubmitForm}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء فترة اختبارية"}
        isSubmitting={isFormSubmitting}
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">السنة *</label>
              <SelectField
                value={formState.academicYearId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    academicYearId: event.target.value,
                    academicTermId: "",
                  }))
                }
                disabled={!canReadAcademicYears}
              >
                <option value="">اختر السنة *</option>
                {(yearsQuery.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {formatNameCodeLabel(year.name, year.code)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الفصل *</label>
              <SelectField
                value={formState.academicTermId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, academicTermId: event.target.value }))
                }
                disabled={!canReadAcademicTerms || !formState.academicYearId}
              >
                <option value="">اختر الفصل *</option>
                {termsForForm.map((term) => (
                  <option key={term.id} value={term.id}>
                    {formatNameCodeLabel(term.name, term.code)}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">اسم الفترة *</label>
            <Input
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="اختبار شهري - محرم"
              required
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">نوع التقييم *</label>
              <SelectField
                value={formState.assessmentType}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    assessmentType: event.target.value as AssessmentType,
                  }))
                }
              >
                {ASSESSMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {translateAssessmentType(option)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة *</label>
              <SelectField
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    status: event.target.value as GradingWorkflowStatus,
                  }))
                }
              >
                {WORKFLOW_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {translateGradingWorkflowStatus(option)}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">بداية الفترة *</label>
              <Input
                type="datetime-local"
                value={formState.startDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">نهاية الفترة *</label>
              <Input
                type="datetime-local"
                value={formState.endDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>مقفل</span>
              <input
                type="checkbox"
                checked={formState.isLocked}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isLocked: event.target.checked }))
                }
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
          {!hasDependenciesReadPermissions ? (
            <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
              يتطلب هذا الجزء صلاحيات القراءة: <code>academic-years.read</code> و{" "}
              <code>academic-terms.read</code>.
            </div>
          ) : null}
        </div>
      </CrudFormSheet>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إضافة فترة"
        ariaLabel="إضافة فترة اختبارية"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>الفترات الاختبارية</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>النتائج معروضة هنا، بينما الفلترة التفصيلية في لوحة جانبية مستقلة.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {examPeriodsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {examPeriodsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {examPeriodsQuery.error instanceof Error
                ? examPeriodsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!examPeriodsQuery.isPending && examPeriods.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {examPeriods.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} / {formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code)} -{" "}
                    {getAssessmentTypeLabel(item.assessmentType)} - {getStatusLabel(item.status)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    البداية: {formatDateTime(item.startDate)} | النهاية: {formatDateTime(item.endDate)}
                  </p>
                  {item.lockedAt ? (
                    <p className="text-xs text-muted-foreground">
                      تم القفل في: {formatDateTime(item.lockedAt)} بواسطة{" "}
                      {item.lockedByUser?.email ?? "غير متوفر"}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{getAssessmentTypeLabel(item.assessmentType)}</Badge>
                  <Badge variant={item.status === "APPROVED" ? "default" : "secondary"}>
                    {getStatusLabel(item.status)}
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
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleToggleLock(item)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  {item.isLocked ? (
                    <LockOpen className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  {item.isLocked ? "فتح القفل" : "قفل"}
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
                disabled={!pagination || pagination.page <= 1 || examPeriodsQuery.isFetching}
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
                  examPeriodsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void examPeriodsQuery.refetch()}
                disabled={examPeriodsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${examPeriodsQuery.isFetching ? "animate-spin" : ""}`}
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







