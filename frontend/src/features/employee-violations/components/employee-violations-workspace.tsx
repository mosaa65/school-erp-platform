"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  AlertTriangle,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
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
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateEmployeeViolationMutation,
  useDeleteEmployeeViolationMutation,
  useUpdateEmployeeViolationMutation,
} from "@/features/employee-violations/hooks/use-employee-violations-mutations";
import { useEmployeeViolationsQuery } from "@/features/employee-violations/hooks/use-employee-violations-query";
import { useEmployeeOptionsQuery } from "@/features/employee-violations/hooks/use-employee-options-query";
import type { EmployeeViolationListItem, ViolationSeverity } from "@/lib/api/client";
import { translateViolationSeverity } from "@/lib/i18n/ar";

type ViolationFormState = {
  employeeId: string;
  violationDate: string;
  violationAspect: string;
  violationText: string;
  actionTaken: string;
  severity: ViolationSeverity;
  hasWarning: boolean;
  hasMinutes: boolean;
  reportedByEmployeeId: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const SEVERITY_OPTIONS: ViolationSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const DEFAULT_FORM_STATE: ViolationFormState = {
  employeeId: "",
  violationDate: "",
  violationAspect: "",
  violationText: "",
  actionTaken: "",
  severity: "MEDIUM",
  hasWarning: false,
  hasMinutes: false,
  reportedByEmployeeId: "",
  isActive: true,
};

function severityBadgeClass(severity: ViolationSeverity): string {
  switch (severity) {
    case "LOW":
      return "border-emerald-300/70 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "MEDIUM":
      return "border-amber-300/70 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "HIGH":
      return "border-orange-300/70 bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "CRITICAL":
      return "border-rose-300/70 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    default:
      return "";
  }
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

function toFormState(violation: EmployeeViolationListItem): ViolationFormState {
  return {
    employeeId: violation.employeeId,
    violationDate: toDateInput(violation.violationDate),
    violationAspect: violation.violationAspect,
    violationText: violation.violationText,
    actionTaken: violation.actionTaken ?? "",
    severity: violation.severity,
    hasWarning: violation.hasWarning,
    hasMinutes: violation.hasMinutes,
    reportedByEmployeeId: violation.reportedByEmployeeId ?? "",
    isActive: violation.isActive,
  };
}

export function EmployeeViolationsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-violations.create");
  const canUpdate = hasPermission("employee-violations.update");
  const canDelete = hasPermission("employee-violations.delete");
  const canReadEmployees = hasPermission("employees.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [reporterFilter, setReporterFilter] = React.useState("all");
  const [severityFilter, setSeverityFilter] = React.useState<ViolationSeverity | "all">(
    "all",
  );
  const [fromDateFilter, setFromDateFilter] = React.useState("");
  const [toDateFilter, setToDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    employee: string;
    reporter: string;
    severity: ViolationSeverity | "all";
    fromDate: string;
    toDate: string;
    active: "all" | "active" | "inactive";
  }>({
    employee: "all",
    reporter: "all",
    severity: "all",
    fromDate: "",
    toDate: "",
    active: "all",
  });

  const [editingViolationId, setEditingViolationId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<ViolationFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [filtersError, setFiltersError] = React.useState<string | null>(null);

  const violationsQuery = useEmployeeViolationsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    reportedByEmployeeId: reporterFilter === "all" ? undefined : reporterFilter,
    severity: severityFilter === "all" ? undefined : severityFilter,
    fromDate: fromDateFilter ? toDateIso(fromDateFilter) : undefined,
    toDate: toDateFilter ? toDateIso(toDateFilter) : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const employeesQuery = useEmployeeOptionsQuery();

  const createMutation = useCreateEmployeeViolationMutation();
  const updateMutation = useUpdateEmployeeViolationMutation();
  const deleteMutation = useDeleteEmployeeViolationMutation();

  const violations = React.useMemo(
    () => violationsQuery.data?.data ?? [],
    [violationsQuery.data?.data],
  );
  const pagination = violationsQuery.data?.pagination;
  const isEditing = editingViolationId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = violations.some((item) => item.id === editingViolationId);
    if (!stillExists) {
      setEditingViolationId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingViolationId, isEditing, violations]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      employee: employeeFilter,
      reporter: reporterFilter,
      severity: severityFilter,
      fromDate: fromDateFilter,
      toDate: toDateFilter,
      active: activeFilter,
    });
    setFiltersError(null);
  }, [
    activeFilter,
    employeeFilter,
    fromDateFilter,
    isFilterOpen,
    reporterFilter,
    severityFilter,
    toDateFilter,
  ]);

  const resetForm = () => {
    setEditingViolationId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingViolationId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId || !formState.violationDate) {
      setFormError("الموظف وتاريخ المخالفة حقول مطلوبة.");
      return false;
    }

    if (!formState.violationAspect.trim() || !formState.violationText.trim()) {
      setFormError("البند والنص التفصيلي للمخالفة حقول مطلوبة.");
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
      violationDate: toDateIso(formState.violationDate),
      violationAspect: formState.violationAspect.trim(),
      violationText: formState.violationText.trim(),
      actionTaken: toOptionalString(formState.actionTaken),
      severity: formState.severity,
      hasWarning: formState.hasWarning,
      hasMinutes: formState.hasMinutes,
      reportedByEmployeeId: toOptionalString(formState.reportedByEmployeeId),
      isActive: formState.isActive,
    };

    if (isEditing && editingViolationId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-violations.update.");
        return;
      }

      updateMutation.mutate(
        {
          violationId: editingViolationId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-violations.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (violation: EmployeeViolationListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingViolationId(violation.id);
    setFormState(toFormState(violation));
    setIsFormOpen(true);
  };

  const handleDelete = (violation: EmployeeViolationListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف مخالفة ${violation.employee.fullName} بتاريخ ${formatDate(
        violation.violationDate,
      )}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(violation.id, {
      onSuccess: () => {
        if (editingViolationId === violation.id) {
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
    setEmployeeFilter("all");
    setReporterFilter("all");
    setSeverityFilter("all");
    setFromDateFilter("");
    setToDateFilter("");
    setActiveFilter("all");
    setFiltersError(null);
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    if (
      filterDraft.fromDate &&
      filterDraft.toDate &&
      filterDraft.toDate.localeCompare(filterDraft.fromDate) < 0
    ) {
      setFiltersError("تاريخ النهاية يجب أن يكون في نفس يوم البداية أو بعده.");
      return;
    }

    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setReporterFilter(filterDraft.reporter);
    setSeverityFilter(filterDraft.severity);
    setFromDateFilter(filterDraft.fromDate);
    setToDateFilter(filterDraft.toDate);
    setActiveFilter(filterDraft.active);
    setFiltersError(null);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      employeeFilter !== "all" ? 1 : 0,
      reporterFilter !== "all" ? 1 : 0,
      severityFilter !== "all" ? 1 : 0,
      fromDateFilter ? 1 : 0,
      toDateFilter ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [
    activeFilter,
    employeeFilter,
    fromDateFilter,
    reporterFilter,
    searchInput,
    severityFilter,
    toDateFilter,
  ]);

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث عن الموظف أو نوع المخالفة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة المخالفات"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.employee}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, employee: event.target.value }))
              }
            >
              <option value="all">كل الموظفين</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.jobNumber ?? employee.fullName}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.reporter}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, reporter: event.target.value }))
              }
            >
              <option value="all">كل المبلغين</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.jobNumber ?? employee.fullName}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.severity}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  severity: event.target.value as ViolationSeverity | "all",
                }))
              }
            >
              <option value="all">كل درجات المخالفة</option>
              {SEVERITY_OPTIONS.map((severity) => (
                <option key={severity} value={severity}>
                  {translateViolationSeverity(severity)}
                </option>
              ))}
            </SelectField>

            <Input
              type="date"
              value={filterDraft.fromDate}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, fromDate: event.target.value }))
              }
            />

            <Input
              type="date"
              value={filterDraft.toDate}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, toDate: event.target.value }))
              }
            />

            <SelectField
              value={filterDraft.active}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  active: event.target.value as "all" | "active" | "inactive",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط فقط</option>
              <option value="inactive">غير نشط فقط</option>
            </SelectField>
          </div>
          {filtersError ? (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {filtersError}
            </div>
          ) : null}
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>سجل المخالفات</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              عرض مخالفات الموظفين مع الفلترة حسب الموظف والمبلّغ ودرجة المخالفة والتاريخ.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {violationsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل المخالفات...
              </div>
            ) : null}

            {violationsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {violationsQuery.error instanceof Error
                  ? violationsQuery.error.message
                  : "تعذّر تحميل المخالفات."}
              </div>
            ) : null}

            {!violationsQuery.isPending && violations.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد مخالفات مطابقة.
              </div>
            ) : null}

            {violations.map((violation) => (
              <div
                key={violation.id}
                data-testid="violation-card"
                className={`space-y-3 rounded-lg border border-border/70 bg-background/70 p-3 ${
                  violation.severity === "CRITICAL"
                    ? "ring-1 ring-rose-300/60"
                    : violation.severity === "HIGH"
                      ? "ring-1 ring-orange-300/60"
                      : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{violation.employee.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      التاريخ: {formatDate(violation.violationDate)} | النوع:{" "}
                      {violation.violationAspect}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      المبلّغ: {violation.reportedBy?.fullName ?? "غير محدد"}
                    </p>
                    <p className="text-xs text-muted-foreground">{violation.violationText}</p>
                    {violation.actionTaken ? (
                      <p className="text-xs text-muted-foreground">
                        الإجراء المتخذ: {violation.actionTaken}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={severityBadgeClass(violation.severity)}>
                      {translateViolationSeverity(violation.severity)}
                    </Badge>
                    {violation.hasWarning ? <Badge variant="secondary">يوجد إنذار</Badge> : null}
                    {violation.hasMinutes ? <Badge variant="secondary">يوجد محضر</Badge> : null}
                    <Badge variant={violation.isActive ? "default" : "outline"}>
                      {violation.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(violation)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(violation)}
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
                  disabled={!pagination || pagination.page <= 1 || violationsQuery.isFetching}
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
                    violationsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void violationsQuery.refetch()}
                  disabled={violationsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${violationsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إضافة مخالفة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل مخالفة" : "إضافة مخالفة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "تحديث المخالفة" : "إضافة مخالفة"}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[720px]"
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>employee-violations.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
              <p className="text-sm text-muted-foreground">
                {isEditing
                  ? "عدّل بيانات المخالفة الحالية."
                  : "أدخل بيانات المخالفة الجديدة لإنشاء سجل جديد."}
              </p>
              <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الموظف *</label>
              <select
                data-testid="violation-form-employee"
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
                تاريخ المخالفة *
              </label>
              <Input
                data-testid="violation-form-date"
                type="date"
                value={formState.violationDate}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    violationDate: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                نوع المخالفة *
              </label>
              <Input
                data-testid="violation-form-aspect"
                value={formState.violationAspect}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    violationAspect: event.target.value,
                  }))
                }
                placeholder="اكتب نوع المخالفة"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                وصف المخالفة *
              </label>
              <Input
                data-testid="violation-form-text"
                value={formState.violationText}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    violationText: event.target.value,
                  }))
                }
                placeholder="اكتب تفاصيل المخالفة بحد أدنى 20 حرفًا"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الإجراء المتخذ</label>
              <Input
                data-testid="violation-form-action-taken"
                value={formState.actionTaken}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, actionTaken: event.target.value }))
                }
                placeholder="إن وجد اكتب الإجراء المتخذ"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الدرجة</label>
              <select
                data-testid="violation-form-severity"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.severity}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    severity: event.target.value as ViolationSeverity,
                  }))
                }
              >
                {SEVERITY_OPTIONS.map((severity) => (
                  <option key={severity} value={severity}>
                    {translateViolationSeverity(severity)}
                  </option>
                ))}
              </select>
              {formState.severity === "HIGH" || formState.severity === "CRITICAL" ? (
                <p className="text-xs text-destructive">
                  المخالفات الشديدة تتطلب متابعة فورية من الإدارة.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                المبلّغ
              </label>
              <select
                data-testid="violation-form-reporter"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.reportedByEmployeeId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    reportedByEmployeeId: event.target.value,
                  }))
                }
                disabled={!canReadEmployees}
              >
                <option value="">اختر المبلّغ</option>
                {(employeesQuery.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.jobNumber ?? "بدون رقم"})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>يوجد إنذار</span>
                <input
                  type="checkbox"
                  checked={formState.hasWarning}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      hasWarning: event.target.checked,
                    }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>يوجد محضر</span>
                <input
                  type="checkbox"
                  checked={formState.hasMinutes}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      hasMinutes: event.target.checked,
                    }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>نشطة</span>
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

            {!canReadEmployees ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                تحتاج صلاحية عرض الموظفين: <code>employees.read</code> لعرض القائمة.
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                data-testid="violation-form-submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing) || !canReadEmployees}
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                {isEditing ? "تحديث المخالفة" : "إضافة مخالفة"}
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





