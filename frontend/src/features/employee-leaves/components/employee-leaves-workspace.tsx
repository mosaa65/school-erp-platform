"use client";

import * as React from "react";
import {
  CalendarRange,
  CheckCircle2,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  UserRound,
  XCircle,
} from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useApproveEmployeeLeaveMutation,
  useCancelEmployeeLeaveMutation,
  useCreateEmployeeLeaveMutation,
  useDeleteEmployeeLeaveMutation,
  useRejectEmployeeLeaveMutation,
  useUpdateEmployeeLeaveMutation,
} from "@/features/employee-leaves/hooks/use-employee-leaves-mutations";
import { useEmployeeLeavesQuery } from "@/features/employee-leaves/hooks/use-employee-leaves-query";
import { useEmployeeOptionsQuery } from "@/features/employee-leaves/hooks/use-employee-options-query";
import type {
  EmployeeLeaveListItem,
  EmployeeLeaveRequestStatus,
  EmployeeLeaveType,
} from "@/lib/api/client";

type EmployeeLeaveWorkflowItem = EmployeeLeaveListItem & {
  createdById?: string | null;
};

type LeaveFormState = {
  employeeId: string;
  leaveType: EmployeeLeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: LeaveFormState = {
  employeeId: "",
  leaveType: "ANNUAL",
  startDate: "",
  endDate: "",
  reason: "",
  notes: "",
  isActive: true,
};

const LEAVE_TYPE_LABELS: Record<EmployeeLeaveType, string> = {
  ANNUAL: "سنوية",
  SICK: "مرضية",
  EMERGENCY: "طارئة",
  UNPAID: "بدون راتب",
  MATERNITY: "أمومة",
  OTHER: "أخرى",
};

const LEAVE_STATUS_LABELS: Record<EmployeeLeaveRequestStatus, string> = {
  PENDING: "قيد الانتظار",
  APPROVED: "معتمدة",
  REJECTED: "مرفوضة",
  CANCELLED: "ملغية",
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

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ar-YE");
}

function toFormState(leave: EmployeeLeaveListItem): LeaveFormState {
  return {
    employeeId: leave.employeeId,
    leaveType: leave.leaveType,
    startDate: toDateInput(leave.startDate),
    endDate: toDateInput(leave.endDate),
    reason: leave.reason ?? "",
    notes: leave.notes ?? "",
    isActive: leave.isActive,
  };
}

export function EmployeeLeavesWorkspace() {
  const auth = useAuth();
  const { hasPermission, hasRole } = useRbac();
  const canCreate = hasPermission("employee-leaves.create");
  const canUpdate = hasPermission("employee-leaves.update");
  const canDelete = hasPermission("employee-leaves.delete");
  const canApprove = hasPermission("employee-leaves.approve");
  const canReadEmployees = hasPermission("employees.read");
  const isSuperAdmin = hasRole("super_admin");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = React.useState<"all" | EmployeeLeaveType>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | EmployeeLeaveRequestStatus>("all");
  const [fromDateFilter, setFromDateFilter] = React.useState("");
  const [toDateFilter, setToDateFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    employee: "all",
    leaveType: "all" as "all" | EmployeeLeaveType,
    status: "all" as "all" | EmployeeLeaveRequestStatus,
    fromDate: "",
    toDate: "",
    active: "all" as "all" | "active" | "inactive",
  });
  const [editingLeaveId, setEditingLeaveId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<LeaveFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const leavesQuery = useEmployeeLeavesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    leaveType: leaveTypeFilter === "all" ? undefined : leaveTypeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    fromDate: fromDateFilter ? toDateIso(fromDateFilter) : undefined,
    toDate: toDateFilter ? toDateIso(toDateFilter) : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });
  const employeesQuery = useEmployeeOptionsQuery();

  const createMutation = useCreateEmployeeLeaveMutation();
  const updateMutation = useUpdateEmployeeLeaveMutation();
  const approveMutation = useApproveEmployeeLeaveMutation();
  const rejectMutation = useRejectEmployeeLeaveMutation();
  const cancelMutation = useCancelEmployeeLeaveMutation();
  const deleteMutation = useDeleteEmployeeLeaveMutation();

  const currentUserId = auth.session?.user.id ?? null;
  const leaves = React.useMemo(
    () => (leavesQuery.data?.data ?? []) as EmployeeLeaveWorkflowItem[],
    [leavesQuery.data?.data],
  );
  const pagination = leavesQuery.data?.pagination;
  const isEditing = editingLeaveId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (approveMutation.error as Error | null)?.message ??
    (rejectMutation.error as Error | null)?.message ??
    (cancelMutation.error as Error | null)?.message ??
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
      leaveType: leaveTypeFilter,
      status: statusFilter,
      fromDate: fromDateFilter,
      toDate: toDateFilter,
      active: activeFilter,
    });
  }, [
    activeFilter,
    employeeFilter,
    fromDateFilter,
    isFilterOpen,
    leaveTypeFilter,
    statusFilter,
    toDateFilter,
  ]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = leaves.some((item) => item.id === editingLeaveId);
    if (!stillExists) {
      setEditingLeaveId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingLeaveId, isEditing, leaves]);

  const resetForm = () => {
    setEditingLeaveId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setEditingLeaveId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    if (!formState.startDate) {
      setFormError("تاريخ بداية الإجازة مطلوب.");
      return false;
    }

    if (!formState.endDate) {
      setFormError("تاريخ نهاية الإجازة مطلوب.");
      return false;
    }

    if (formState.endDate < formState.startDate) {
      setFormError("تاريخ نهاية الإجازة يجب أن يكون بعد تاريخ البداية.");
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
      leaveType: formState.leaveType,
      startDate: toDateIso(formState.startDate),
      endDate: toDateIso(formState.endDate),
      reason: toOptionalString(formState.reason),
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingLeaveId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-leaves.update.");
        return;
      }

      updateMutation.mutate(
        {
          leaveId: editingLeaveId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-leaves.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (leave: EmployeeLeaveListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingLeaveId(leave.id);
    setFormState(toFormState(leave));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDelete = (leave: EmployeeLeaveListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف طلب الإجازة للموظف ${leave.employee.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(leave.id, {
      onSuccess: () => {
        if (editingLeaveId === leave.id) {
          resetForm();
        }
      },
    });
  };

  const handleApprove = (leave: EmployeeLeaveListItem) => {
    if (!canApprove || leave.status !== "PENDING") {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد اعتماد طلب الإجازة للموظف ${leave.employee.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    approveMutation.mutate(leave.id);
  };

  const handleReject = (leave: EmployeeLeaveListItem) => {
    if (!canApprove || leave.status !== "PENDING") {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد رفض طلب الإجازة للموظف ${leave.employee.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    rejectMutation.mutate(leave.id);
  };

  const handleCancel = (leave: EmployeeLeaveListItem) => {
    if (!canCancelLeave(leave)) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد إلغاء طلب الإجازة للموظف ${leave.employee.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    cancelMutation.mutate(leave.id);
  };

  const activeFiltersCount = React.useMemo(
    () =>
      [
        searchInput.trim() ? 1 : 0,
        employeeFilter !== "all" ? 1 : 0,
        leaveTypeFilter !== "all" ? 1 : 0,
        statusFilter !== "all" ? 1 : 0,
        fromDateFilter ? 1 : 0,
        toDateFilter ? 1 : 0,
        activeFilter !== "all" ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
    [
      activeFilter,
      employeeFilter,
      fromDateFilter,
      leaveTypeFilter,
      searchInput,
      statusFilter,
      toDateFilter,
    ],
  );

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setLeaveTypeFilter("all");
    setStatusFilter("all");
    setFromDateFilter("");
    setToDateFilter("");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setLeaveTypeFilter(filterDraft.leaveType);
    setStatusFilter(filterDraft.status);
    setFromDateFilter(filterDraft.fromDate);
    setToDateFilter(filterDraft.toDate);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const isWorkflowSubmitting =
    approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending;

  const canCancelLeave = React.useCallback(
    (leave: EmployeeLeaveWorkflowItem) => {
      if (leave.status !== "PENDING") {
        return false;
      }

      const isRequester = Boolean(currentUserId && leave.createdById === currentUserId);
      return isRequester || canApprove || isSuperAdmin;
    },
    [canApprove, currentUserId, isSuperAdmin],
  );

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالسبب أو الملاحظات أو اسم الموظف..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الإجازات"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="الموظف">
              <SelectField
                icon={<UserRound />}
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
            </FormField>

            <FormField label="نوع الإجازة">
              <SelectField
                icon={<CalendarRange />}
                value={filterDraft.leaveType}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    leaveType: event.target.value as "all" | EmployeeLeaveType,
                  }))
                }
              >
                <option value="all">كل أنواع الإجازات</option>
                {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="حالة الطلب">
              <SelectField
                icon={<CheckCircle2 />}
                value={filterDraft.status}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    status: event.target.value as "all" | EmployeeLeaveRequestStatus,
                  }))
                }
              >
                <option value="all">كل الحالات</option>
                {Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="من تاريخ">
              <Input
                icon={<CalendarRange />}
                type="date"
                value={filterDraft.fromDate}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, fromDate: event.target.value }))
                }
              />
            </FormField>

            <FormField label="إلى تاريخ">
              <Input
                icon={<CalendarRange />}
                type="date"
                value={filterDraft.toDate}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, toDate: event.target.value }))
                }
              />
            </FormField>

            <FormField label="الحالة">
              <SelectField
                icon={<CheckCircle2 />}
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
            </FormField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>طلبات الإجازات</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة طلبات إجازات الموظفين مع نوع الإجازة وحالة الاعتماد والفترة الزمنية.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {leavesQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {leavesQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {leavesQuery.error instanceof Error
                  ? leavesQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {mutationError ? (
              <div
                className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                data-testid="leave-workflow-error"
              >
                {mutationError}
              </div>
            ) : null}

            {!leavesQuery.isPending && leaves.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                data-testid="leave-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {LEAVE_TYPE_LABELS[leave.leaveType]} - {leave.totalDays} يوم
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الموظف: {leave.employee.fullName} ({leave.employee.jobNumber ?? "غير متوفر"})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      من {formatDate(leave.startDate)} إلى {formatDate(leave.endDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الحالة: {LEAVE_STATUS_LABELS[leave.status]}
                    </p>
                    {leave.approvedBy ? (
                      <p className="text-xs text-muted-foreground">
                        تمت المعالجة بواسطة: {leave.approvedBy.email}
                      </p>
                    ) : null}
                    {leave.approvedAt ? (
                      <p className="text-xs text-muted-foreground">
                        تاريخ القرار: {formatDate(leave.approvedAt)}
                      </p>
                    ) : null}
                    {leave.reason ? (
                      <p className="text-xs text-muted-foreground">السبب: {leave.reason}</p>
                    ) : null}
                    {leave.notes ? (
                      <p className="text-xs text-muted-foreground">ملاحظات: {leave.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={leave.status === "APPROVED" ? "default" : "outline"}>
                      {LEAVE_STATUS_LABELS[leave.status]}
                    </Badge>
                    <Badge variant={leave.isActive ? "secondary" : "outline"}>
                      {leave.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(leave)}
                    disabled={!canUpdate || updateMutation.isPending || leave.status !== "PENDING"}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  {canApprove ? (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleApprove(leave)}
                        disabled={isWorkflowSubmitting || leave.status !== "PENDING"}
                        data-testid="leave-approve-button"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        اعتماد
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleReject(leave)}
                        disabled={isWorkflowSubmitting || leave.status !== "PENDING"}
                        data-testid="leave-reject-button"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        رفض
                      </Button>
                    </>
                  ) : null}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleCancel(leave)}
                    disabled={!canCancelLeave(leave) || isWorkflowSubmitting}
                    data-testid="leave-cancel-button"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    إلغاء الطلب
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(leave)}
                    disabled={!canDelete || deleteMutation.isPending || leave.status !== "PENDING"}
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
                  disabled={!pagination || pagination.page <= 1 || leavesQuery.isFetching}
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
                    leavesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void leavesQuery.refetch()}
                  disabled={leavesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${leavesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء طلب إجازة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل طلب إجازة" : "إنشاء طلب إجازة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء طلب"}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[720px]"
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>employee-leaves.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="leave-form">
            <p className="text-sm text-muted-foreground">
              {isEditing ? "تحديث بيانات طلب الإجازة." : "إضافة طلب إجازة جديد للموظف."}
            </p>

            <FormField label="الموظف" required>
              <SelectField
                icon={<UserRound />}
                value={formState.employeeId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, employeeId: event.target.value }))
                }
                disabled={!canReadEmployees}
                required
                data-testid="leave-form-employee"
              >
                <option value="">اختر الموظف</option>
                {(employeesQuery.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.jobNumber ?? "غير متوفر"})
                  </option>
                ))}
              </SelectField>
            </FormField>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="نوع الإجازة">
                <SelectField
                  icon={<CalendarRange />}
                  value={formState.leaveType}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      leaveType: event.target.value as EmployeeLeaveType,
                    }))
                  }
                  data-testid="leave-form-type"
                >
                  {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <div className="flex items-end rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                سيتم إنشاء الطلب بحالة: <span className="mr-1 font-medium">قيد الانتظار</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="تاريخ البداية" required>
                <Input
                  icon={<CalendarRange />}
                  type="date"
                  value={formState.startDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  required
                  data-testid="leave-form-start-date"
                />
              </FormField>
              <FormField label="تاريخ النهاية" required>
                <Input
                  icon={<CalendarRange />}
                  type="date"
                  value={formState.endDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  required
                  data-testid="leave-form-end-date"
                />
              </FormField>
            </div>

            <FormField label="سبب الإجازة">
              <TextareaField
                icon={<Type />}
                value={formState.reason}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, reason: event.target.value }))
                }
                placeholder="ظرف صحي أو أسري"
                rows={3}
                data-testid="leave-form-reason"
              />
            </FormField>

            <FormField label="ملاحظات">
              <TextareaField
                icon={<Type />}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="أي ملاحظات إضافية"
                rows={3}
                data-testid="leave-form-notes"
              />
            </FormField>

            <FormBooleanField
              label="نشط"
              checked={formState.isActive}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, isActive: checked }))
              }
            />

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
                data-testid="leave-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarRange className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء طلب"}
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
