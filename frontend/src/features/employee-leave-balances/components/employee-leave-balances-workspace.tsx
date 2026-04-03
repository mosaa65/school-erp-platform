"use client";

import * as React from "react";
import {
  CalendarDays,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateEmployeeLeaveBalanceMutation,
  useDeleteEmployeeLeaveBalanceMutation,
  useGenerateEmployeeLeaveBalancesMutation,
  useUpdateEmployeeLeaveBalanceMutation,
} from "@/features/employee-leave-balances/hooks/use-employee-leave-balances-mutations";
import { useEmployeeLeaveBalancesQuery } from "@/features/employee-leave-balances/hooks/use-employee-leave-balances-query";
import { useEmployeeOptionsQuery } from "@/features/employee-leave-balances/hooks/use-employee-options-query";
import type {
  EmployeeLeaveBalanceListItem,
  EmployeeLeaveType,
} from "@/lib/api/client";

type LeaveBalanceFormState = {
  employeeId: string;
  leaveType: EmployeeLeaveType;
  balanceYear: string;
  allocatedDays: string;
  carriedForwardDays: string;
  manualAdjustmentDays: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;
const CURRENT_YEAR = new Date().getUTCFullYear().toString();

const DEFAULT_FORM_STATE: LeaveBalanceFormState = {
  employeeId: "",
  leaveType: "ANNUAL",
  balanceYear: CURRENT_YEAR,
  allocatedDays: "",
  carriedForwardDays: "0",
  manualAdjustmentDays: "0",
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

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toRequiredNumber(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFormState(balance: EmployeeLeaveBalanceListItem): LeaveBalanceFormState {
  return {
    employeeId: balance.employeeId,
    leaveType: balance.leaveType,
    balanceYear: String(balance.balanceYear),
    allocatedDays: String(balance.allocatedDays),
    carriedForwardDays: String(balance.carriedForwardDays),
    manualAdjustmentDays: String(balance.manualAdjustmentDays),
    notes: balance.notes ?? "",
    isActive: balance.isActive,
  };
}

export function EmployeeLeaveBalancesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-leave-balances.create");
  const canGenerate = hasPermission("employee-leave-balances.generate");
  const canUpdate = hasPermission("employee-leave-balances.update");
  const canDelete = hasPermission("employee-leave-balances.delete");
  const canReadEmployees = hasPermission("employees.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = React.useState<"all" | EmployeeLeaveType>("all");
  const [yearFilter, setYearFilter] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    employee: "all",
    leaveType: "all" as "all" | EmployeeLeaveType,
    year: "",
    active: "all" as "all" | "active" | "inactive",
  });
  const [editingBalanceId, setEditingBalanceId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<LeaveBalanceFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = React.useState<string | null>(null);

  const balancesQuery = useEmployeeLeaveBalancesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    leaveType: leaveTypeFilter === "all" ? undefined : leaveTypeFilter,
    balanceYear: yearFilter ? Number(yearFilter) : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });
  const employeesQuery = useEmployeeOptionsQuery();

  const createMutation = useCreateEmployeeLeaveBalanceMutation();
  const updateMutation = useUpdateEmployeeLeaveBalanceMutation();
  const generateMutation = useGenerateEmployeeLeaveBalancesMutation();
  const deleteMutation = useDeleteEmployeeLeaveBalanceMutation();

  const balances = React.useMemo(
    () => balancesQuery.data?.data ?? [],
    [balancesQuery.data?.data],
  );
  const pagination = balancesQuery.data?.pagination;
  const isEditing = editingBalanceId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (generateMutation.error as Error | null)?.message ??
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
      year: yearFilter,
      active: activeFilter,
    });
  }, [activeFilter, employeeFilter, isFilterOpen, leaveTypeFilter, yearFilter]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = balances.some((item) => item.id === editingBalanceId);
    if (!stillExists) {
      setEditingBalanceId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [balances, editingBalanceId, isEditing]);

  const resetForm = () => {
    setEditingBalanceId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setEditingBalanceId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    const balanceYear = toRequiredNumber(formState.balanceYear);
    if (balanceYear === null || balanceYear < 2000 || balanceYear > 2100) {
      setFormError("سنة الرصيد مطلوبة ويجب أن تكون بين 2000 و2100.");
      return false;
    }

    const allocatedDays = toRequiredNumber(formState.allocatedDays);
    if (allocatedDays === null || allocatedDays < 0) {
      setFormError("عدد الأيام المخصصة مطلوب ويجب أن يكون رقمًا غير سالب.");
      return false;
    }

    const carriedForwardDays = toOptionalNumber(formState.carriedForwardDays) ?? 0;
    if (carriedForwardDays < 0) {
      setFormError("الأيام المرحلة لا يمكن أن تكون سالبة.");
      return false;
    }

    const manualAdjustmentDays = toOptionalNumber(formState.manualAdjustmentDays) ?? 0;
    if (allocatedDays + carriedForwardDays + manualAdjustmentDays < 0) {
      setFormError("إجمالي الاستحقاق لا يمكن أن يكون سالبًا.");
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
      balanceYear: Number(formState.balanceYear),
      allocatedDays: Number(formState.allocatedDays),
      carriedForwardDays: toOptionalNumber(formState.carriedForwardDays) ?? 0,
      manualAdjustmentDays: toOptionalNumber(formState.manualAdjustmentDays) ?? 0,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingBalanceId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-leave-balances.update.");
        return;
      }

      updateMutation.mutate(
        {
          balanceId: editingBalanceId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-leave-balances.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (balance: EmployeeLeaveBalanceListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingBalanceId(balance.id);
    setFormState(toFormState(balance));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDelete = (balance: EmployeeLeaveBalanceListItem) => {
    if (!canDelete) {
      return;
    }

    deleteMutation.mutate(balance.id);
  };

  const handleGenerateBalances = () => {
    if (!canGenerate) {
      return;
    }

    const targetYear = Number(yearFilter || CURRENT_YEAR);
    if (!Number.isFinite(targetYear) || targetYear < 2000 || targetYear > 2100) {
      setGenerationMessage("سنة التوليد غير صالحة. استخدم سنة بين 2000 و2100.");
      return;
    }

    setGenerationMessage(null);
    generateMutation.mutate(
      {
        balanceYear: targetYear,
        employeeId: employeeFilter === "all" ? undefined : employeeFilter,
        leaveType: leaveTypeFilter === "all" ? undefined : leaveTypeFilter,
      },
      {
        onSuccess: (result) => {
          setGenerationMessage(
            `تم فحص ${result.employeesScanned} موظفًا وإنشاء ${result.generatedCount} رصيدًا، مع تخطي ${result.skippedExistingCount} سجلًا موجودًا لسنة ${result.balanceYear}.`,
          );
          setPage(1);
        },
      },
    );
  };

  const activeFiltersCount = React.useMemo(
    () =>
      [
        searchInput.trim() ? 1 : 0,
        employeeFilter !== "all" ? 1 : 0,
        leaveTypeFilter !== "all" ? 1 : 0,
        yearFilter ? 1 : 0,
        activeFilter !== "all" ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
    [activeFilter, employeeFilter, leaveTypeFilter, searchInput, yearFilter],
  );

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setLeaveTypeFilter("all");
    setYearFilter("");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setLeaveTypeFilter(filterDraft.leaveType);
    setYearFilter(filterDraft.year);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث بالموظف أو رقم الوظيفة أو الملاحظات..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
          actions={
            <>
              {canGenerate ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleGenerateBalances}
                  disabled={generateMutation.isPending}
                  data-testid="generate-leave-balances"
                >
                  {generateMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  توليد أرصدة السنة
                </Button>
              ) : null}
              <Button
                type="button"
                className="gap-2"
                onClick={handleStartCreate}
                disabled={!canCreate}
              >
                <Plus className="h-4 w-4" />
                إضافة رصيد
              </Button>
            </>
          }
        />

        {generationMessage ? (
          <div
            className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary"
            data-testid="leave-balance-generation-message"
          >
            {generationMessage}
          </div>
        ) : null}

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="تصفية أرصدة الإجازات"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الموظف</label>
              <SelectField
                value={filterDraft.employee}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, employee: event.target.value }))
                }
              >
                <option value="all">كل الموظفين</option>
                {(employeesQuery.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">نوع الإجازة</label>
              <SelectField
                value={filterDraft.leaveType}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    leaveType: event.target.value as "all" | EmployeeLeaveType,
                  }))
                }
              >
                <option value="all">كل الأنواع</option>
                {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">السنة</label>
              <Input
                type="number"
                value={filterDraft.year}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, year: event.target.value }))
                }
                placeholder="2026"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة</label>
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
          </div>

        </FilterDrawer>

        <Card>
          <CardHeader>
            <CardTitle>السجل الحالي</CardTitle>
            <CardDescription>
              {pagination?.total ?? balances.length} رصيد مسجل ضمن النتائج الحالية.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {balancesQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-md border border-dashed py-8 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                جاري تحميل الأرصدة...
              </div>
            ) : null}

            {!balancesQuery.isLoading && balances.length === 0 ? (
              <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                لا توجد أرصدة إجازات مطابقة للفلاتر الحالية.
              </div>
            ) : null}

            {balances.map((balance) => (
              <div
                key={balance.id}
                className="rounded-xl border border-border/70 p-4"
                data-testid="leave-balance-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{balance.employee.fullName}</h3>
                      <Badge variant={balance.isActive ? "default" : "secondary"}>
                        {balance.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                      <Badge variant="outline">{LEAVE_TYPE_LABELS[balance.leaveType]}</Badge>
                      <Badge variant="outline">سنة {balance.balanceYear}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      الرقم الوظيفي: {balance.employee.jobNumber ?? "غير متوفر"}
                    </p>
                  </div>

                  <div className="grid min-w-[240px] gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <div className="rounded-md border bg-muted/30 p-2">
                      <div>المستحق</div>
                      <div className="text-sm font-semibold text-foreground">
                        {balance.totalEntitledDays} يوم
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <div>المستخدم</div>
                      <div className="text-sm font-semibold text-foreground">
                        {balance.usedDays} يوم
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <div>المتبقي</div>
                      <div className="text-sm font-semibold text-foreground">
                        {balance.remainingDays} يوم
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>مخصص سنوي: {balance.allocatedDays} يوم</div>
                  <div>ترحيل: {balance.carriedForwardDays} يوم</div>
                  <div>تعديل يدوي: {balance.manualAdjustmentDays} يوم</div>
                </div>

                {balance.notes ? (
                  <p className="mt-3 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                    {balance.notes}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(balance)}
                    disabled={!canUpdate || isFormSubmitting}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(balance)}
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
                  disabled={!pagination || pagination.page <= 1 || balancesQuery.isFetching}
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
                    balancesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void balancesQuery.refetch()}
                  disabled={balancesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${balancesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إضافة رصيد إجازة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل رصيد إجازة" : "إضافة رصيد إجازة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إضافة الرصيد"}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[720px]"
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>employee-leave-balances.create</code>.
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={handleSubmitForm}
            data-testid="leave-balance-form"
          >
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "تحديث رصيد الإجازة واحتساب أثره على المتبقي."
                : "إضافة رصيد سنوي جديد مع الأيام المرحلة والتعديلات اليدوية."}
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
                data-testid="leave-balance-form-employee"
              >
                <option value="">اختر الموظف</option>
                {(employeesQuery.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.jobNumber ?? "غير متوفر"})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">نوع الإجازة</label>
                <SelectField
                  value={formState.leaveType}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      leaveType: event.target.value as EmployeeLeaveType,
                    }))
                  }
                  data-testid="leave-balance-form-type"
                >
                  {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">سنة الرصيد *</label>
                <Input
                  type="number"
                  value={formState.balanceYear}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, balanceYear: event.target.value }))
                  }
                  data-testid="leave-balance-form-year"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  الأيام المخصصة *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formState.allocatedDays}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, allocatedDays: event.target.value }))
                  }
                  data-testid="leave-balance-form-allocated"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الأيام المرحلة</label>
                <Input
                  type="number"
                  min="0"
                  value={formState.carriedForwardDays}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      carriedForwardDays: event.target.value,
                    }))
                  }
                  data-testid="leave-balance-form-carried"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">تعديل يدوي</label>
                <Input
                  type="number"
                  value={formState.manualAdjustmentDays}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      manualAdjustmentDays: event.target.value,
                    }))
                  }
                  data-testid="leave-balance-form-adjustment"
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
                placeholder="ترحيل من العام السابق أو قرار إداري"
                data-testid="leave-balance-form-notes"
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
                data-testid="leave-balance-form-active"
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
                data-testid="leave-balance-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إضافة الرصيد"}
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
