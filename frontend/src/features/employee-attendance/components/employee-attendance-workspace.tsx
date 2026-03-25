"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ClipboardCheck,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
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
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateEmployeeAttendanceMutation,
  useDeleteEmployeeAttendanceMutation,
  useUpdateEmployeeAttendanceMutation,
} from "@/features/employee-attendance/hooks/use-employee-attendance-mutations";
import { useEmployeeAttendanceQuery } from "@/features/employee-attendance/hooks/use-employee-attendance-query";
import { useEmployeeOptionsQuery } from "@/features/employee-attendance/hooks/use-employee-options-query";
import type {
  EmployeeAttendanceListItem,
  EmployeeAttendanceStatus,
} from "@/lib/api/client";
import { translateAttendanceStatus } from "@/lib/i18n/ar";

type AttendanceFormState = {
  employeeId: string;
  attendanceDate: string;
  status: EmployeeAttendanceStatus;
  checkInAt: string;
  checkOutAt: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const STATUS_OPTIONS: EmployeeAttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED_ABSENCE",
  "EARLY_LEAVE",
];

const DEFAULT_FORM_STATE: AttendanceFormState = {
  employeeId: "",
  attendanceDate: "",
  status: "PRESENT",
  checkInAt: "",
  checkOutAt: "",
  notes: "",
  isActive: true,
};

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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ar-YE");
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

function toFormState(attendance: EmployeeAttendanceListItem): AttendanceFormState {
  return {
    employeeId: attendance.employeeId,
    attendanceDate: toDateInput(attendance.attendanceDate),
    status: attendance.status,
    checkInAt: toDateTimeLocalInput(attendance.checkInAt),
    checkOutAt: toDateTimeLocalInput(attendance.checkOutAt),
    notes: attendance.notes ?? "",
    isActive: attendance.isActive,
  };
}

export function EmployeeAttendanceWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-attendance.create");
  const canUpdate = hasPermission("employee-attendance.update");
  const canDelete = hasPermission("employee-attendance.delete");
  const canReadEmployees = hasPermission("employees.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<
    EmployeeAttendanceStatus | "all"
  >("all");
  const [fromDateFilter, setFromDateFilter] = React.useState("");
  const [toDateFilter, setToDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    employee: string;
    status: EmployeeAttendanceStatus | "all";
    fromDate: string;
    toDate: string;
    active: "all" | "active" | "inactive";
  }>({
    employee: "all",
    status: "all",
    fromDate: "",
    toDate: "",
    active: "all",
  });

  const [editingAttendanceId, setEditingAttendanceId] = React.useState<string | null>(
    null,
  );
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<AttendanceFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const attendanceQuery = useEmployeeAttendanceQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    fromDate: fromDateFilter ? toDateIso(fromDateFilter) : undefined,
    toDate: toDateFilter ? toDateIso(toDateFilter) : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const employeesQuery = useEmployeeOptionsQuery();
  const createMutation = useCreateEmployeeAttendanceMutation();
  const updateMutation = useUpdateEmployeeAttendanceMutation();
  const deleteMutation = useDeleteEmployeeAttendanceMutation();

  const records = React.useMemo(
    () => attendanceQuery.data?.data ?? [],
    [attendanceQuery.data?.data],
  );
  const pagination = attendanceQuery.data?.pagination;
  const isEditing = editingAttendanceId !== null;

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
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      employee: employeeFilter,
      status: statusFilter,
      fromDate: fromDateFilter,
      toDate: toDateFilter,
      active: activeFilter,
    });
  }, [activeFilter, employeeFilter, fromDateFilter, isFilterOpen, statusFilter, toDateFilter]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = records.some((item) => item.id === editingAttendanceId);
    if (!stillExists) {
      setEditingAttendanceId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [records, editingAttendanceId, isEditing]);

  const resetForm = () => {
    setEditingAttendanceId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingAttendanceId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    if (!formState.attendanceDate) {
      setFormError("تاريخ الحضور مطلوب.");
      return false;
    }

    if (formState.checkInAt && formState.checkOutAt) {
      const checkIn = new Date(formState.checkInAt);
      const checkOut = new Date(formState.checkOutAt);
      if (checkOut <= checkIn) {
        setFormError("وقت الخروج يجب أن يكون بعد وقت الدخول.");
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
      employeeId: formState.employeeId,
      attendanceDate: toDateIso(formState.attendanceDate),
      status: formState.status,
      checkInAt: formState.checkInAt ? toDateTimeIso(formState.checkInAt) : undefined,
      checkOutAt: formState.checkOutAt ? toDateTimeIso(formState.checkOutAt) : undefined,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingAttendanceId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-attendance.update.");
        return;
      }

      updateMutation.mutate(
        {
          attendanceId: editingAttendanceId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-attendance.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (attendance: EmployeeAttendanceListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingAttendanceId(attendance.id);
    setFormState(toFormState(attendance));
    setIsFormOpen(true);
  };

  const handleDelete = (attendance: EmployeeAttendanceListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف حضور ${attendance.employee.fullName} بتاريخ ${formatDate(
        attendance.attendanceDate,
      )}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(attendance.id, {
      onSuccess: () => {
        if (editingAttendanceId === attendance.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      employeeFilter !== "all" ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      fromDateFilter ? 1 : 0,
      toDateFilter ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [
    activeFilter,
    employeeFilter,
    fromDateFilter,
    searchInput,
    statusFilter,
    toDateFilter,
  ]);

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setStatusFilter("all");
    setFromDateFilter("");
    setToDateFilter("");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setStatusFilter(filterDraft.status);
    setFromDateFilter(filterDraft.fromDate);
    setToDateFilter(filterDraft.toDate);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالموظف أو الملاحظات..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الحضور"
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
              value={filterDraft.status}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  status: event.target.value as EmployeeAttendanceStatus | "all",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {translateAttendanceStatus(status)}
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
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>حضور الموظفين</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة سجلات حضور الموظفين حسب التاريخ والحالة والموظف.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
          {attendanceQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {attendanceQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {attendanceQuery.error instanceof Error
                ? attendanceQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!attendanceQuery.isPending && records.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {records.map((record) => (
            <div
              key={record.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{record.employee.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    التاريخ: {formatDate(record.attendanceDate)} | الرقم الوظيفي:{" "}
                    {record.employee.jobNumber ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    دخول: {formatDateTime(record.checkInAt)} | خروج:{" "}
                    {formatDateTime(record.checkOutAt)}
                  </p>
                  {record.notes ? (
                    <p className="text-xs text-muted-foreground">ملاحظات: {record.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">
                    {translateAttendanceStatus(record.status)}
                  </Badge>
                  <Badge variant={record.isActive ? "default" : "outline"}>
                    {record.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(record)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(record)}
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
                disabled={!pagination || pagination.page <= 1 || attendanceQuery.isFetching}
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
                  attendanceQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void attendanceQuery.refetch()}
                disabled={attendanceQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${attendanceQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء سجل حضور"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل حضور موظف" : "إنشاء حضور موظف"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء سجل حضور"}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[720px]"
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>employee-attendance.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <p className="text-sm text-muted-foreground">
              {isEditing ? "تحديث سجل حضور الموظف." : "إضافة سجل حضور جديد ضمن الموارد البشرية."}
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الموظف *</label>
              <select
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
                    {employee.fullName} ({employee.jobNumber ?? "غير متوفر"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                تاريخ الحضور *
              </label>
              <Input
                type="date"
                value={formState.attendanceDate}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    attendanceDate: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    status: event.target.value as EmployeeAttendanceStatus,
                  }))
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {translateAttendanceStatus(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">وقت الدخول</label>
                <Input
                  type="datetime-local"
                  value={formState.checkInAt}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, checkInAt: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">وقت الخروج</label>
                <Input
                  type="datetime-local"
                  value={formState.checkOutAt}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, checkOutAt: event.target.value }))
                  }
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
                placeholder="تأخر 10 دقائق"
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

            {!canReadEmployees ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                يتطلب هذا الجزء الصلاحية: <code>employees.read</code> لاختيار الموظف.
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing) || !canReadEmployees}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء سجل حضور"}
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





