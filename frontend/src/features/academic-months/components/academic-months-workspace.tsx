"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Activity,
  CalendarDays,
  CalendarClock,
  Hash,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Type,
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
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Fab } from "@/components/ui/fab";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateAcademicMonthMutation,
  useDeleteAcademicMonthMutation,
  useUpdateAcademicMonthMutation,
} from "@/features/academic-months/hooks/use-academic-months-mutations";
import { useAcademicMonthsQuery } from "@/features/academic-months/hooks/use-academic-months-query";
import { useAcademicTermOptionsQuery } from "@/features/academic-months/hooks/use-academic-term-options-query";
import { useAcademicYearOptionsQuery } from "@/features/academic-months/hooks/use-academic-year-options-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import type { AcademicMonthListItem, GradingWorkflowStatus } from "@/lib/api/client";

type AcademicMonthFormState = {
  academicYearId: string;
  academicTermId: string;
  code: string;
  name: string;
  sequence: string;
  startDate: string;
  endDate: string;
  status: GradingWorkflowStatus;
  isCurrent: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const WORKFLOW_OPTIONS: GradingWorkflowStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "ARCHIVED",
];

const DEFAULT_FORM_STATE: AcademicMonthFormState = {
  academicYearId: "",
  academicTermId: "",
  code: "",
  name: "",
  sequence: "1",
  startDate: "",
  endDate: "",
  status: "DRAFT",
  isCurrent: false,
  isActive: true,
};


function formatDateInput(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toUtcStartIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function toUtcEndIso(dateInput: string): string {
  return `${dateInput}T23:59:59.999Z`;
}

function toFormState(month: AcademicMonthListItem): AcademicMonthFormState {
  return {
    academicYearId: month.academicYearId,
    academicTermId: month.academicTermId,
    code: month.code,
    name: month.name,
    sequence: String(month.sequence),
    startDate: formatDateInput(month.startDate),
    endDate: formatDateInput(month.endDate),
    status: month.status,
    isCurrent: month.isCurrent,
    isActive: month.isActive,
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

export function AcademicMonthsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("academic-months.create");
  const canUpdate = hasPermission("academic-months.update");
  const canDelete = hasPermission("academic-months.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [termFilter, setTermFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<GradingWorkflowStatus | "all">("all");
  const [currentFilter, setCurrentFilter] = React.useState<"all" | "current" | "not-current">(
    "all",
  );
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<{
    year: string;
    term: string;
    status: GradingWorkflowStatus | "all";
    current: "all" | "current" | "not-current";
    active: "all" | "active" | "inactive";
  }>({
    year: "all",
    term: "all",
    status: "all",
    current: "all",
    active: "all",
  });

  const [editingMonthId, setEditingMonthId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<AcademicMonthFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const monthsQuery = useAcademicMonthsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    isCurrent:
      currentFilter === "all" ? undefined : currentFilter === "current" ? true : false,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const yearOptionsQuery = useAcademicYearOptionsQuery();
  const draftYearForTerms = isFilterOpen ? filterDraft.year : yearFilter;
  const termOptionsQuery = useAcademicTermOptionsQuery(
    formState.academicYearId ||
      (draftYearForTerms !== "all" ? draftYearForTerms : undefined),
  );

  const createMutation = useCreateAcademicMonthMutation();
  const updateMutation = useUpdateAcademicMonthMutation();
  const deleteMutation = useDeleteAcademicMonthMutation();

  const months = React.useMemo(() => monthsQuery.data?.data ?? [], [monthsQuery.data?.data]);
  const pagination = monthsQuery.data?.pagination;
  const yearOptions = React.useMemo(() => yearOptionsQuery.data ?? [], [yearOptionsQuery.data]);
  const termOptions = React.useMemo(() => termOptionsQuery.data ?? [], [termOptionsQuery.data]);
  const isEditing = editingMonthId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = months.some((month) => month.id === editingMonthId);
    if (!stillExists) {
      setEditingMonthId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingMonthId, isEditing, months]);

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
      term: termFilter,
      status: statusFilter,
      current: currentFilter,
      active: activeFilter,
    });
  }, [activeFilter, currentFilter, isFilterOpen, statusFilter, termFilter, yearFilter]);

  React.useEffect(() => {
    if (!formState.academicTermId) {
      return;
    }

    const exists = termOptions.some((term) => term.id === formState.academicTermId);
    if (!exists) {
      setFormState((prev) => ({ ...prev, academicTermId: "" }));
    }
  }, [formState.academicTermId, termOptions]);

  const resetForm = () => {
    setEditingMonthId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingMonthId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const name = formState.name.trim();

    if (!formState.academicYearId || !formState.academicTermId || !name) {
      setFormError("الحقول الأساسية مطلوبة.");
      return false;
    }

    if (name.length > 120) {
      setFormError("الاسم يجب ألا يتجاوز 120 حرفًا.");
      return false;
    }

    const sequence = Number(formState.sequence);
    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 24) {
      setFormError("الترتيب يجب أن يكون رقمًا صحيحًا بين 1 و 24.");
      return false;
    }

    if (!formState.startDate || !formState.endDate) {
      setFormError("تاريخ البداية والنهاية مطلوبان.");
      return false;
    }

    const start = new Date(toUtcStartIso(formState.startDate));
    const end = new Date(toUtcEndIso(formState.endDate));
    if (start >= end) {
      setFormError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
      return false;
    }

    const selectedTerm = termOptions.find((term) => term.id === formState.academicTermId);
    if (selectedTerm) {
      const termStart = new Date(selectedTerm.startDate);
      const termEnd = new Date(selectedTerm.endDate);
      if (start < termStart || end > termEnd) {
        setFormError("نطاق الشهر يجب أن يكون ضمن نطاق الفصل الأكاديمي المختار.");
        return false;
      }
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
      academicYearId: formState.academicYearId,
      academicTermId: formState.academicTermId,
      name: formState.name.trim(),
      sequence: Number(formState.sequence),
      startDate: toUtcStartIso(formState.startDate),
      endDate: toUtcEndIso(formState.endDate),
      status: formState.status,
      isCurrent: formState.isCurrent,
      isActive: formState.isActive,
    };

    if (isEditing && editingMonthId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: academic-months.update.");
        return;
      }

      updateMutation.mutate(
        {
          academicMonthId: editingMonthId,
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
      setFormError("لا تملك الصلاحية المطلوبة: academic-months.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (month: AcademicMonthListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingMonthId(month.id);
    setFormState(toFormState(month));
    setIsFormOpen(true);
  };

  const handleDelete = (month: AcademicMonthListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الشهر ${month.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(month.id, {
      onSuccess: () => {
        if (editingMonthId === month.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setTermFilter("all");
    setStatusFilter("all");
    setCurrentFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setTermFilter(filterDraft.term);
    setStatusFilter(filterDraft.status);
    setCurrentFilter(filterDraft.current);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      termFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      currentFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, currentFilter, searchInput, statusFilter, termFilter, yearFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0 sm:min-w-[240px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث..."
              data-testid="academic-month-filter-search"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterTriggerButton
              count={activeFiltersCount}
              onClick={() => setIsFilterOpen((prev) => !prev)}
            />
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الأشهر الأكاديمية"
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
              <Button
                type="button"
                onClick={applyFilters}
                className="flex-1 gap-1.5"
                data-testid="academic-month-filters-submit"
              >
                تطبيق
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.year}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  year: event.target.value,
                  term: "all",
                }))
              }
              data-testid="academic-month-filter-year"
            >
              <option value="all">كل السنوات</option>
              {yearOptions.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.code}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.term}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, term: event.target.value }))
              }
              data-testid="academic-month-filter-term"
            >
              <option value="all">كل الفصول</option>
              {termOptions.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.code}
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
              data-testid="academic-month-filter-status"
            >
              <option value="all">كل الحالات</option>
              {WORKFLOW_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {translateGradingWorkflowStatus(status)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.current}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  current: event.target.value as "all" | "current" | "not-current",
                }))
              }
              data-testid="academic-month-filter-current"
            >
              <option value="all">الكل</option>
              <option value="current">الحالي فقط</option>
              <option value="not-current">غير الحالي</option>
            </SelectField>

            <SelectField
              value={filterDraft.active}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  active: event.target.value as "all" | "active" | "inactive",
                }))
              }
              data-testid="academic-month-filter-active"
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة الأشهر الأكاديمية</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              فلترة حسب السنة/الفصل/الحالة مع متابعة ارتباط الدرجات الشهرية.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {monthsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل الأشهر الأكاديمية...
              </div>
            ) : null}

            {monthsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {monthsQuery.error instanceof Error
                  ? monthsQuery.error.message
                  : "فشل تحميل الأشهر الأكاديمية"}
              </div>
            ) : null}

            {!monthsQuery.isPending && months.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد أشهر مطابقة.
              </div>
            ) : null}

            {months.map((month) => (
              <div
                key={month.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                data-testid="academic-month-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{month.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <code>{month.code}</code> - الترتيب: {month.sequence}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(month.startDate).toLocaleDateString()} -{" "}
                      {new Date(month.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {month.academicYear.code} / {month.academicTerm.code} - الدرجات الشهرية:{" "}
                      {month._count.monthlyGrades}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={statusBadgeVariant(month.status)}>
                      {translateGradingWorkflowStatus(month.status)}
                    </Badge>
                    <Badge variant={month.isCurrent ? "secondary" : "outline"}>
                      {month.isCurrent ? "حالي" : "غير حالي"}
                    </Badge>
                    <Badge variant={month.isActive ? "default" : "outline"}>
                      {month.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(month)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(month)}
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
                صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || monthsQuery.isFetching}
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
                    monthsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void monthsQuery.refetch()}
                  disabled={monthsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${monthsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء شهر أكاديمي"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل شهر أكاديمي" : "إنشاء شهر أكاديمي"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء شهر أكاديمي"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>academic-months.create</code>.
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={handleSubmitForm}
            data-testid="academic-month-form"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="السنة الأكاديمية" required>
                <SelectField
                  icon={<CalendarClock />}
                  value={formState.academicYearId}
                  onChange={(event) => {
                    const academicYearId = event.target.value;
                    setFormState((prev) => ({
                      ...prev,
                      academicYearId,
                      academicTermId: "",
                    }));
                  }}
                  required
                  data-testid="academic-month-form-year"
                >
                  <option value="">اختر السنة الأكاديمية</option>
                  {yearOptions.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.code}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField label="الفصل الأكاديمي" required>
                <SelectField
                  icon={<CalendarDays />}
                  value={formState.academicTermId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      academicTermId: event.target.value,
                    }))
                  }
                  required
                  data-testid="academic-month-form-term"
                >
                  <option value="">اختر الفصل الأكاديمي</option>
                  {termOptions.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.code}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_110px]">
              <FormField label="الترتيب" required>
                <Input
                  icon={<Hash />}
                  type="number"
                  min={1}
                  max={24}
                  value={formState.sequence}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, sequence: event.target.value }))
                  }
                  required
                  data-testid="academic-month-form-sequence"
                />
              </FormField>
            </div>

            <FormField label="الاسم" required>
              <Input
                icon={<Type />}
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="الشهر الأول - سبتمبر"
                required
                data-testid="academic-month-form-name"
              />
            </FormField>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="تاريخ البداية" required>
                <Input
                  icon={<CalendarDays />}
                  type="date"
                  value={formState.startDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  required
                  data-testid="academic-month-form-start-date"
                />
              </FormField>
              <FormField label="تاريخ النهاية" required>
                <Input
                  icon={<CalendarDays />}
                  type="date"
                  value={formState.endDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  required
                  data-testid="academic-month-form-end-date"
                />
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="الحالة" required>
                <SelectField
                  icon={<Activity />}
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: event.target.value as GradingWorkflowStatus,
                    }))
                  }
                  required
                  data-testid="academic-month-form-status"
                >
                  {WORKFLOW_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {translateGradingWorkflowStatus(status)}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField label="الخيارات" contentClassName="grid grid-cols-2 gap-2">
                <FormBooleanField
                  label="الحالي"
                  checked={formState.isCurrent}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      isCurrent: checked,
                    }))
                  }
                  className="min-h-14"
                />
                <FormBooleanField
                  label="نشط"
                  checked={formState.isActive}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      isActive: checked,
                    }))
                  }
                  className="min-h-14"
                />
              </FormField>
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
                data-testid="academic-month-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء شهر أكاديمي"}
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
