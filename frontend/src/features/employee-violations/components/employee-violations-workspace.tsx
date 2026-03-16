"use client";

import * as React from "react";
import {
  AlertTriangle,
  LoaderCircle,
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
  const [fromDateInput, setFromDateInput] = React.useState("");
  const [toDateInputValue, setToDateInputValue] = React.useState("");
  const [fromDateFilter, setFromDateFilter] = React.useState("");
  const [toDateFilter, setToDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingViolationId, setEditingViolationId] = React.useState<string | null>(null);
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

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = violations.some((item) => item.id === editingViolationId);
    if (!stillExists) {
      setEditingViolationId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingViolationId, violations, isEditing]);

  const resetForm = () => {
    setEditingViolationId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (fromDateInput && toDateInputValue && fromDateInput > toDateInputValue) {
      setFiltersError("تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية.");
      return;
    }

    setFiltersError(null);
    setPage(1);
    setSearch(searchInput.trim());
    setFromDateFilter(fromDateInput);
    setToDateFilter(toDateInputValue);
  };

  const handleResetFilters = () => {
    setFiltersError(null);
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setReporterFilter("all");
    setSeverityFilter("all");
    setFromDateInput("");
    setToDateInputValue("");
    setFromDateFilter("");
    setToDateFilter("");
    setActiveFilter("all");
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    if (!formState.violationDate) {
      setFormError("تاريخ المخالفة مطلوب.");
      return false;
    }

    if (!formState.violationAspect.trim()) {
      setFormError("عنوان/نوع المخالفة مطلوب.");
      return false;
    }

    if (!formState.violationText.trim()) {
      setFormError("وصف المخالفة مطلوب.");
      return false;
    }

    if (
      (formState.severity === "HIGH" || formState.severity === "CRITICAL") &&
      !formState.actionTaken.trim()
    ) {
      setFormError("الإجراء المتخذ مطلوب للمخالفات العالية والحرجة.");
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
      employeeId: formState.employeeId,
      violationDate: toDateIso(formState.violationDate),
      violationAspect: formState.violationAspect.trim(),
      violationText: formState.violationText.trim(),
      actionTaken: toOptionalString(formState.actionTaken),
      severity: formState.severity,
      hasWarning: formState.hasWarning,
      hasMinutes: formState.hasMinutes,
      reportedByEmployeeId: formState.reportedByEmployeeId || undefined,
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

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل مخالفة موظف" : "إنشاء مخالفة موظف"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث سجل المخالفة."
              : "إضافة سجل مخالفة جديد ضمن الموارد البشرية."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>employee-violations.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
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
                  placeholder="تأخر عن الحضور"
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
                  placeholder="وصل الموظف متأخرًا 20 دقيقة دون إشعار"
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
                  placeholder="تم إصدار إنذار خطي"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الشدة</label>
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
                    للمستويات العالية والحرجة يجب توثيق الإجراء المتخذ.
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  الموظف المُبلِّغ
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
                  <option value="">غير محدد</option>
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

              {!canReadEmployees ? (
                <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  يتطلب هذا الجزء الصلاحية: <code>employees.read</code> لاختيار الموظفين.
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
                  {isEditing ? "حفظ التعديلات" : "إنشاء مخالفة"}
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
            <CardTitle>مخالفات الموظفين</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة مخالفات الموظفين حسب الشدة والتاريخ والموظف.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            data-testid="violation-filters-form"
            className="grid gap-2 md:grid-cols-[1fr_160px_160px_150px_150px_150px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالموظف أو نص المخالفة..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={employeeFilter}
              onChange={(event) => {
                setPage(1);
                setEmployeeFilter(event.target.value);
              }}
            >
              <option value="all">كل الموظفين</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.jobNumber ?? employee.fullName}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={reporterFilter}
              onChange={(event) => {
                setPage(1);
                setReporterFilter(event.target.value);
              }}
            >
              <option value="all">كل المُبلِّغين</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.jobNumber ?? employee.fullName}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={severityFilter}
              onChange={(event) => {
                setPage(1);
                setSeverityFilter(event.target.value as ViolationSeverity | "all");
              }}
            >
              <option value="all">كل مستويات الشدة</option>
              {SEVERITY_OPTIONS.map((severity) => (
                <option key={severity} value={severity}>
                  {translateViolationSeverity(severity)}
                </option>
              ))}
            </select>

            <Input
              data-testid="violation-filter-from-date"
              type="date"
              value={fromDateInput}
              onChange={(event) => setFromDateInput(event.target.value)}
            />

            <Input
              data-testid="violation-filter-to-date"
              type="date"
              value={toDateInputValue}
              onChange={(event) => setToDateInputValue(event.target.value)}
            />

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </select>

            <Button type="submit" variant="outline" className="gap-2" data-testid="violation-filters-submit">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
            <Button
              type="button"
              variant="ghost"
              data-testid="violation-filters-reset"
              onClick={handleResetFilters}
              disabled={violationsQuery.isFetching}
            >
              إعادة ضبط
            </Button>
          </form>
          {filtersError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {filtersError}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-3">
          {violationsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {violationsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {violationsQuery.error instanceof Error
                ? violationsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!violationsQuery.isPending && violations.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
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
                    المُبلِّغ: {violation.reportedBy?.fullName ?? "غير محدد"}
                  </p>
                  <p className="text-xs text-muted-foreground">{violation.violationText}</p>
                  {violation.actionTaken ? (
                    <p className="text-xs text-muted-foreground">
                      الإجراء: {violation.actionTaken}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={severityBadgeClass(violation.severity)}>
                    {translateViolationSeverity(violation.severity)}
                  </Badge>
                  {violation.hasWarning ? <Badge variant="secondary">إنذار</Badge> : null}
                  {violation.hasMinutes ? <Badge variant="secondary">محضر</Badge> : null}
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
  );
}





