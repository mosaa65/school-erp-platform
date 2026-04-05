"use client";

import * as React from "react";
import {
  AlertTriangle,
  BellRing,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  ScrollText,
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
  useCreateEmployeeContractRenewalDraftMutation,
  useCreateEmployeeContractMutation,
  useDeleteEmployeeContractMutation,
  useGenerateEmployeeContractExpiryAlertsMutation,
  useUpdateEmployeeContractMutation,
} from "@/features/employee-contracts/hooks/use-employee-contracts-mutations";
import { useEmployeeContractsQuery } from "@/features/employee-contracts/hooks/use-employee-contracts-query";
import { useEmployeeOptionsQuery } from "@/features/employee-contracts/hooks/use-employee-options-query";
import type { EmployeeContractListItem } from "@/lib/api/client";

type ContractFormState = {
  employeeId: string;
  contractTitle: string;
  contractNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  salaryAmount: string;
  notes: string;
  isCurrent: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;
const CONTRACT_EXPIRY_WARNING_DAYS = 30;

const DEFAULT_FORM_STATE: ContractFormState = {
  employeeId: "",
  contractTitle: "",
  contractNumber: "",
  contractStartDate: "",
  contractEndDate: "",
  salaryAmount: "",
  notes: "",
  isCurrent: true,
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

function formatSalaryAmount(value: number | string | null): string {
  if (value === null || value === "") {
    return "-";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("ar-YE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function toFormState(contract: EmployeeContractListItem): ContractFormState {
  return {
    employeeId: contract.employeeId,
    contractTitle: contract.contractTitle,
    contractNumber: contract.contractNumber ?? "",
    contractStartDate: toDateInput(contract.contractStartDate),
    contractEndDate: toDateInput(contract.contractEndDate),
    salaryAmount: contract.salaryAmount === null ? "" : String(contract.salaryAmount),
    notes: contract.notes ?? "",
    isCurrent: contract.isCurrent,
    isActive: contract.isActive,
  };
}

function calculateRemainingDays(contractEndDate: string | null): number | null {
  if (!contractEndDate) {
    return null;
  }

  const endDate = new Date(contractEndDate);
  if (Number.isNaN(endDate.getTime())) {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const endOfContractDay = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
  );

  return Math.floor((endOfContractDay.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
}

export function EmployeeContractsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-contracts.create");
  const canNotifyExpiring = hasPermission("employee-contracts.notify-expiring");
  const canUpdate = hasPermission("employee-contracts.update");
  const canDelete = hasPermission("employee-contracts.delete");
  const canReadEmployees = hasPermission("employees.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [fromDateFilter, setFromDateFilter] = React.useState("");
  const [toDateFilter, setToDateFilter] = React.useState("");
  const [currentFilter, setCurrentFilter] = React.useState<"all" | "current" | "archived">(
    "all",
  );
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState({
    employee: "all",
    fromDate: "",
    toDate: "",
    current: "all" as "all" | "current" | "archived",
    active: "all" as "all" | "active" | "inactive",
  });
  const [editingContractId, setEditingContractId] = React.useState<string | null>(null);
  const [renewalSourceTitle, setRenewalSourceTitle] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<ContractFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [expiryAlertsMessage, setExpiryAlertsMessage] = React.useState<string | null>(null);

  const contractsQuery = useEmployeeContractsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    fromDate: fromDateFilter ? toDateIso(fromDateFilter) : undefined,
    toDate: toDateFilter ? toDateIso(toDateFilter) : undefined,
    isCurrent: currentFilter === "all" ? undefined : currentFilter === "current",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });
  const employeesQuery = useEmployeeOptionsQuery();

  const createMutation = useCreateEmployeeContractMutation();
  const updateMutation = useUpdateEmployeeContractMutation();
  const renewDraftMutation = useCreateEmployeeContractRenewalDraftMutation();
  const generateExpiryAlertsMutation = useGenerateEmployeeContractExpiryAlertsMutation();
  const deleteMutation = useDeleteEmployeeContractMutation();

  const contracts = React.useMemo(
    () => contractsQuery.data?.data ?? [],
    [contractsQuery.data?.data],
  );
  const pagination = contractsQuery.data?.pagination;
  const isEditing = editingContractId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (renewDraftMutation.error as Error | null)?.message ??
    (generateExpiryAlertsMutation.error as Error | null)?.message ??
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
      fromDate: fromDateFilter,
      toDate: toDateFilter,
      current: currentFilter,
      active: activeFilter,
    });
  }, [activeFilter, currentFilter, employeeFilter, fromDateFilter, isFilterOpen, toDateFilter]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = contracts.some((item) => item.id === editingContractId);
    if (!stillExists) {
      if (contractsQuery.isFetching) {
        return;
      }

      setEditingContractId(null);
      setRenewalSourceTitle(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [contracts, contractsQuery.isFetching, editingContractId, isEditing]);

  const resetForm = () => {
    setEditingContractId(null);
    setRenewalSourceTitle(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setEditingContractId(null);
    setRenewalSourceTitle(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    if (!formState.contractTitle.trim()) {
      setFormError("عنوان العقد مطلوب.");
      return false;
    }

    if (!formState.contractStartDate) {
      setFormError("تاريخ بداية العقد مطلوب.");
      return false;
    }

    if (formState.contractEndDate && formState.contractEndDate < formState.contractStartDate) {
      setFormError("تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية.");
      return false;
    }

    if (formState.salaryAmount.trim()) {
      const salaryValue = Number(formState.salaryAmount);
      if (!Number.isFinite(salaryValue) || salaryValue < 0) {
        setFormError("قيمة الراتب يجب أن تكون رقمًا صالحًا غير سالب.");
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
      contractTitle: formState.contractTitle.trim(),
      contractNumber: toOptionalString(formState.contractNumber),
      contractStartDate: toDateIso(formState.contractStartDate),
      contractEndDate: formState.contractEndDate ? toDateIso(formState.contractEndDate) : undefined,
      salaryAmount: toOptionalString(formState.salaryAmount),
      notes: toOptionalString(formState.notes),
      isCurrent: formState.isCurrent,
      isActive: formState.isActive,
    };

    if (isEditing && editingContractId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-contracts.update.");
        return;
      }

      updateMutation.mutate(
        {
          contractId: editingContractId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-contracts.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (contract: EmployeeContractListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingContractId(contract.id);
    setRenewalSourceTitle(null);
    setFormState(toFormState(contract));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleStartRenewal = (contract: EmployeeContractListItem) => {
    const canRenew =
      canCreate && contract.isActive && contract.isCurrent && Boolean(contract.contractEndDate);

    if (!canRenew) {
      return;
    }

    setFormError(null);
    renewDraftMutation.mutate(contract.id, {
      onSuccess: (renewalDraft) => {
        setEditingContractId(renewalDraft.id);
        setRenewalSourceTitle(contract.contractTitle);
        setFormState(toFormState(renewalDraft));
        setFormError(null);
        setIsFormOpen(true);
      },
    });
  };

  const handleDelete = (contract: EmployeeContractListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف العقد ${contract.contractTitle} للموظف ${contract.employee.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(contract.id, {
      onSuccess: () => {
        if (editingContractId === contract.id) {
          resetForm();
        }
      },
    });
  };

  const handleGenerateExpiryAlerts = () => {
    if (!canNotifyExpiring) {
      return;
    }

    setExpiryAlertsMessage(null);
    generateExpiryAlertsMutation.mutate(
      { daysThreshold: CONTRACT_EXPIRY_WARNING_DAYS },
      {
        onSuccess: (response) => {
          setExpiryAlertsMessage(
            `تم فحص ${response.scannedCount} عقدًا وإنشاء ${response.generatedCount} تنبيهًا ضمن نافذة ${response.daysThreshold} يوم.`,
          );
        },
      },
    );
  };

  const activeFiltersCount = React.useMemo(
    () =>
      [
        searchInput.trim() ? 1 : 0,
        employeeFilter !== "all" ? 1 : 0,
        fromDateFilter ? 1 : 0,
        toDateFilter ? 1 : 0,
        currentFilter !== "all" ? 1 : 0,
        activeFilter !== "all" ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
    [activeFilter, currentFilter, employeeFilter, fromDateFilter, searchInput, toDateFilter],
  );

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setFromDateFilter("");
    setToDateFilter("");
    setCurrentFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setFromDateFilter(filterDraft.fromDate);
    setToDateFilter(filterDraft.toDate);
    setCurrentFilter(filterDraft.current);
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
          searchPlaceholder="بحث بعنوان العقد أو الرقم أو الملاحظات..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
          actions={
            canNotifyExpiring ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleGenerateExpiryAlerts}
                disabled={generateExpiryAlertsMutation.isPending}
                data-testid="generate-contract-expiry-alerts"
              >
                {generateExpiryAlertsMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BellRing className="h-4 w-4" />
                )}
                توليد تنبيهات الانتهاء
              </Button>
            ) : null
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر العقود"
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
              value={filterDraft.current}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  current: event.target.value as "all" | "current" | "archived",
                }))
              }
            >
              <option value="all">كل العقود</option>
              <option value="current">العقود الحالية</option>
              <option value="archived">العقود المؤرشفة</option>
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
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>عقود الموظفين</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة عقود الموظفين الحالية والسابقة مع التواريخ والقيم المرجعية.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {contractsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {contractsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {contractsQuery.error instanceof Error
                  ? contractsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {expiryAlertsMessage ? (
              <div
                className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
                data-testid="contract-expiry-alerts-message"
              >
                {expiryAlertsMessage}
              </div>
            ) : null}

            {!contractsQuery.isPending && contracts.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {contracts.map((contract) => {
              const remainingDays = calculateRemainingDays(contract.contractEndDate);
              const isExpired =
                contract.contractEndDate !== null &&
                remainingDays !== null &&
                remainingDays < 0;
              const isExpiringSoon =
                contract.isCurrent &&
                contract.isActive &&
                remainingDays !== null &&
                remainingDays >= 0 &&
                remainingDays <= CONTRACT_EXPIRY_WARNING_DAYS;
              const canRenewContract =
                canCreate &&
                contract.isActive &&
                contract.isCurrent &&
                Boolean(contract.contractEndDate);

              return (
                <div
                  key={contract.id}
                  className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                  data-testid="contract-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{contract.contractTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        الموظف: {contract.employee.fullName} ({contract.employee.jobNumber ?? "غير متوفر"})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        رقم العقد: {contract.contractNumber ?? "-"} | البداية:{" "}
                        {formatDate(contract.contractStartDate)} | النهاية:{" "}
                        {formatDate(contract.contractEndDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        الراتب المرجعي: {formatSalaryAmount(contract.salaryAmount)}
                      </p>
                      {contract.notes ? (
                        <p className="text-xs text-muted-foreground">ملاحظات: {contract.notes}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={contract.isCurrent ? "default" : "outline"}>
                        {contract.isCurrent ? "حالي" : "سابق"}
                      </Badge>
                      <Badge variant={contract.isActive ? "secondary" : "outline"}>
                        {contract.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                      {isExpiringSoon ? (
                        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          ينتهي خلال {remainingDays} يوم
                        </Badge>
                      ) : null}
                      {isExpired ? (
                        <Badge variant="destructive">منتهي</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartRenewal(contract)}
                    disabled={!canRenewContract || renewDraftMutation.isPending}
                    data-testid={`contract-renew-button-${contract.id}`}
                  >
                    {renewDraftMutation.isPending ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    تجديد
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(contract)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(contract)}
                    disabled={!canDelete || deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || contractsQuery.isFetching}
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
                    contractsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void contractsQuery.refetch()}
                  disabled={contractsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${contractsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء عقد"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={
          renewalSourceTitle
            ? "مراجعة مسودة تجديد العقد"
            : isEditing
              ? "تعديل عقد موظف"
              : "إنشاء عقد موظف"
        }
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={
          renewalSourceTitle
            ? "حفظ مسودة التجديد"
            : isEditing
              ? "حفظ التعديلات"
              : "إنشاء عقد"
        }
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[720px]"
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>employee-contracts.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="contract-form">
            <p className="text-sm text-muted-foreground">
              {renewalSourceTitle
                ? "تم إنشاء مسودة تجديد مستقلة. راجع الحقول ثم احفظ التعديلات المطلوبة."
                : isEditing
                  ? "تحديث بيانات العقد."
                  : "إضافة عقد جديد للموظف."}
            </p>

            {renewalSourceTitle ? (
              <div
                className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs text-primary"
                data-testid="contract-renewal-banner"
              >
                تم إنشاء مسودة تجديد للعقد: {renewalSourceTitle}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الموظف *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.employeeId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, employeeId: event.target.value }))
                }
                disabled={!canReadEmployees}
                data-testid="contract-form-employee"
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
              <label className="text-xs font-medium text-muted-foreground">عنوان العقد *</label>
              <Input
                value={formState.contractTitle}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, contractTitle: event.target.value }))
                }
                placeholder="عقد معلم رياضيات"
                required
                data-testid="contract-form-title"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">رقم العقد</label>
              <Input
                value={formState.contractNumber}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, contractNumber: event.target.value }))
                }
                placeholder="CNT-2026-001"
                data-testid="contract-form-number"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">تاريخ البداية *</label>
                <Input
                  type="date"
                  value={formState.contractStartDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, contractStartDate: event.target.value }))
                  }
                  data-testid="contract-form-start-date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">تاريخ النهاية</label>
                <Input
                  type="date"
                  value={formState.contractEndDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, contractEndDate: event.target.value }))
                  }
                  data-testid="contract-form-end-date"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الراتب المرجعي</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={formState.salaryAmount}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, salaryAmount: event.target.value }))
                }
                placeholder="120000.00"
                data-testid="contract-form-salary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="عقد قابل للتجديد وفق الحاجة"
                data-testid="contract-form-notes"
              />
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>العقد الحالي</span>
              <input
                type="checkbox"
                checked={formState.isCurrent}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isCurrent: event.target.checked }))
                }
                data-testid="contract-form-current"
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
                data-testid="contract-form-active"
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
                data-testid="contract-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ScrollText className="h-4 w-4" />
                )}
                {renewalSourceTitle
                  ? "حفظ مسودة التجديد"
                  : isEditing
                    ? "حفظ التعديلات"
                    : "إنشاء عقد"}
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
