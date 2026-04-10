"use client";

import * as React from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Rocket,
  Trash2,
  UserCheck,
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
import { Label } from "@/components/ui/label";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCompleteEmployeeLifecycleChecklistMutation,
  useCreateEmployeeLifecycleChecklistMutation,
  useDeleteEmployeeLifecycleChecklistMutation,
  useGenerateEmployeeLifecycleChecklistDueAlertsMutation,
  useGenerateEmployeeLifecycleChecklistTemplatesMutation,
  useStartEmployeeLifecycleChecklistMutation,
  useUpdateEmployeeLifecycleChecklistMutation,
  useWaiveEmployeeLifecycleChecklistMutation,
} from "@/features/employee-lifecycle-checklists/hooks/use-employee-lifecycle-checklists-mutations";
import { useEmployeeLifecycleChecklistsQuery } from "@/features/employee-lifecycle-checklists/hooks/use-employee-lifecycle-checklists-query";
import { useEmployeeOptionsQuery } from "@/features/employee-lifecycle-checklists/hooks/use-employee-options-query";
import type {
  EmployeeLifecycleChecklistListItem,
  EmployeeLifecycleChecklistStatus,
  EmployeeLifecycleChecklistType,
} from "@/lib/api/client";

type LifecycleChecklistFormState = {
  employeeId: string;
  checklistType: EmployeeLifecycleChecklistType;
  title: string;
  assignedToEmployeeId: string;
  dueDate: string;
  notes: string;
  isActive: boolean;
};

type LifecycleTemplateFormState = {
  employeeId: string;
  checklistType: EmployeeLifecycleChecklistType;
  assignedToEmployeeId: string;
};

const PAGE_SIZE = 12;
const DUE_WARNING_DAYS = 3;

const DEFAULT_FORM_STATE: LifecycleChecklistFormState = {
  employeeId: "",
  checklistType: "ONBOARDING",
  title: "",
  assignedToEmployeeId: "",
  dueDate: "",
  notes: "",
  isActive: true,
};

const DEFAULT_TEMPLATE_FORM_STATE: LifecycleTemplateFormState = {
  employeeId: "",
  checklistType: "ONBOARDING",
  assignedToEmployeeId: "",
};

const CHECKLIST_TYPE_LABELS: Record<EmployeeLifecycleChecklistType, string> = {
  ONBOARDING: "تهيئة",
  OFFBOARDING: "إنهاء خدمة",
};

const CHECKLIST_STATUS_LABELS: Record<EmployeeLifecycleChecklistStatus, string> = {
  PENDING: "معلقة",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتملة",
  WAIVED: "معفاة",
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

function toFormState(
  checklist: EmployeeLifecycleChecklistListItem,
): LifecycleChecklistFormState {
  return {
    employeeId: checklist.employeeId,
    checklistType: checklist.checklistType,
    title: checklist.title,
    assignedToEmployeeId: checklist.assignedToEmployeeId ?? "",
    dueDate: toDateInput(checklist.dueDate),
    notes: checklist.notes ?? "",
    isActive: checklist.isActive,
  };
}

function calculateRemainingDays(dueDate: string | null): number | null {
  if (!dueDate) {
    return null;
  }

  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dueDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  return Math.floor((dueDay.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
}

export function EmployeeLifecycleChecklistsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-lifecycle-checklists.create");
  const canTransition = hasPermission("employee-lifecycle-checklists.transition");
  const canUpdate = hasPermission("employee-lifecycle-checklists.update");
  const canDelete = hasPermission("employee-lifecycle-checklists.delete");
  const canNotifyDue = hasPermission("employee-lifecycle-checklists.notify-due");
  const canReadEmployees = hasPermission("employees.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | EmployeeLifecycleChecklistType>(
    "all",
  );
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | EmployeeLifecycleChecklistStatus
  >("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState({
    employee: "all",
    assignee: "all",
    type: "all" as "all" | EmployeeLifecycleChecklistType,
    status: "all" as "all" | EmployeeLifecycleChecklistStatus,
    active: "all" as "all" | "active" | "inactive",
  });
  const [editingChecklistId, setEditingChecklistId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<LifecycleChecklistFormState>(
    DEFAULT_FORM_STATE,
  );
  const [templateFormState, setTemplateFormState] =
    React.useState<LifecycleTemplateFormState>(DEFAULT_TEMPLATE_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [templateFormError, setTemplateFormError] = React.useState<string | null>(null);
  const [workflowMessage, setWorkflowMessage] = React.useState<string | null>(null);
  const [dueAlertsMessage, setDueAlertsMessage] = React.useState<string | null>(null);
  const [templateMessage, setTemplateMessage] = React.useState<string | null>(null);

  const checklistsQuery = useEmployeeLifecycleChecklistsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    assignedToEmployeeId: assigneeFilter === "all" ? undefined : assigneeFilter,
    checklistType: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });
  const employeesQuery = useEmployeeOptionsQuery();

  const createMutation = useCreateEmployeeLifecycleChecklistMutation();
  const startMutation = useStartEmployeeLifecycleChecklistMutation();
  const completeMutation = useCompleteEmployeeLifecycleChecklistMutation();
  const waiveMutation = useWaiveEmployeeLifecycleChecklistMutation();
  const generateDueAlertsMutation = useGenerateEmployeeLifecycleChecklistDueAlertsMutation();
  const generateTemplatesMutation = useGenerateEmployeeLifecycleChecklistTemplatesMutation();
  const updateMutation = useUpdateEmployeeLifecycleChecklistMutation();
  const deleteMutation = useDeleteEmployeeLifecycleChecklistMutation();

  const checklists = React.useMemo(
    () => checklistsQuery.data?.data ?? [],
    [checklistsQuery.data?.data],
  );
  const employees = React.useMemo(
    () => employeesQuery.data ?? [],
    [employeesQuery.data],
  );
  const pagination = checklistsQuery.data?.pagination;
  const isEditing = editingChecklistId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (startMutation.error as Error | null)?.message ??
    (completeMutation.error as Error | null)?.message ??
    (waiveMutation.error as Error | null)?.message ??
    (generateDueAlertsMutation.error as Error | null)?.message ??
    (generateTemplatesMutation.error as Error | null)?.message ??
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
      assignee: assigneeFilter,
      type: typeFilter,
      status: statusFilter,
      active: activeFilter,
    });
  }, [activeFilter, assigneeFilter, employeeFilter, isFilterOpen, statusFilter, typeFilter]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = checklists.some((item) => item.id === editingChecklistId);
    if (!stillExists) {
      setEditingChecklistId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [checklists, editingChecklistId, isEditing]);

  const resetForm = () => {
    setEditingChecklistId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const resetTemplateForm = () => {
    setTemplateFormState(DEFAULT_TEMPLATE_FORM_STATE);
    setTemplateFormError(null);
    setIsTemplateFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setEditingChecklistId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenTemplateForm = () => {
    if (!canCreate) {
      return;
    }

    setTemplateFormState(DEFAULT_TEMPLATE_FORM_STATE);
    setTemplateFormError(null);
    setIsTemplateFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    if (!formState.title.trim()) {
      setFormError("عنوان المهمة مطلوب.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const validateTemplateForm = (): boolean => {
    if (!templateFormState.employeeId) {
      setTemplateFormError("الموظف مطلوب لتوليد المهام الافتراضية.");
      return false;
    }

    setTemplateFormError(null);
    return true;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      employeeId: formState.employeeId,
      checklistType: formState.checklistType,
      title: formState.title.trim(),
      assignedToEmployeeId: toOptionalString(formState.assignedToEmployeeId),
      dueDate: formState.dueDate ? toDateIso(formState.dueDate) : undefined,
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingChecklistId) {
      if (!canUpdate) {
        setFormError(
          "لا تملك الصلاحية المطلوبة: employee-lifecycle-checklists.update.",
        );
        return;
      }

      updateMutation.mutate(
        {
          checklistId: editingChecklistId,
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
      setFormError(
        "لا تملك الصلاحية المطلوبة: employee-lifecycle-checklists.create.",
      );
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (checklist: EmployeeLifecycleChecklistListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingChecklistId(checklist.id);
    setFormState(toFormState(checklist));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDelete = (checklist: EmployeeLifecycleChecklistListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف المهمة ${checklist.title} للموظف ${checklist.employee.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(checklist.id, {
      onSuccess: () => {
        if (editingChecklistId === checklist.id) {
          resetForm();
        }
      },
    });
  };

  const handleStartWorkflow = (checklist: EmployeeLifecycleChecklistListItem) => {
    if (!canTransition) {
      return;
    }

    setWorkflowMessage(null);
    startMutation.mutate(checklist.id, {
      onSuccess: () => {
        setWorkflowMessage(`تم بدء تنفيذ المهمة "${checklist.title}".`);
      },
    });
  };

  const handleCompleteWorkflow = (checklist: EmployeeLifecycleChecklistListItem) => {
    if (!canTransition) {
      return;
    }

    setWorkflowMessage(null);
    completeMutation.mutate(checklist.id, {
      onSuccess: () => {
        setWorkflowMessage(`تم إكمال المهمة "${checklist.title}".`);
      },
    });
  };

  const handleWaiveWorkflow = (checklist: EmployeeLifecycleChecklistListItem) => {
    if (!canTransition) {
      return;
    }

    setWorkflowMessage(null);
    waiveMutation.mutate(checklist.id, {
      onSuccess: () => {
        setWorkflowMessage(`تم إعفاء المهمة "${checklist.title}".`);
      },
    });
  };

  const handleGenerateDueAlerts = () => {
    if (!canNotifyDue) {
      return;
    }

    setDueAlertsMessage(null);
    generateDueAlertsMutation.mutate(
      { daysThreshold: DUE_WARNING_DAYS },
      {
        onSuccess: (result) => {
          setDueAlertsMessage(
            `تم فحص ${result.scannedCount} مهمة وإنشاء ${result.generatedCount} تنبيهًا ضمن نافذة ${result.daysThreshold} أيام.`,
          );
        },
      },
    );
  };

  const handleSubmitTemplateForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!canCreate) {
      setTemplateFormError(
        "لا تملك الصلاحية المطلوبة: employee-lifecycle-checklists.create.",
      );
      return;
    }

    if (!validateTemplateForm()) {
      return;
    }

    setTemplateMessage(null);
    generateTemplatesMutation.mutate(
      {
        employeeId: templateFormState.employeeId,
        checklistType: templateFormState.checklistType,
        assignedToEmployeeId: toOptionalString(templateFormState.assignedToEmployeeId),
      },
      {
        onSuccess: (result) => {
          setTemplateMessage(
            `تم إنشاء ${result.generatedCount} مهمة افتراضية وتخطي ${result.skippedCount} مهمة موجودة مسبقًا للموظف المحدد.`,
          );
          resetTemplateForm();
          setPage(1);
        },
      },
    );
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const isTemplateSubmitting = generateTemplatesMutation.isPending;
  const isWorkflowSubmitting =
    startMutation.isPending ||
    completeMutation.isPending ||
    waiveMutation.isPending ||
    generateDueAlertsMutation.isPending;
  const activeFiltersCount = [
    employeeFilter,
    assigneeFilter,
    typeFilter,
    statusFilter,
    activeFilter,
  ].filter((value) => value !== "all").length;

  return (
    <>
      <div className="space-y-4">
        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة التهيئة وإنهاء الخدمة"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={
            <FilterDrawerActions
              onClear={() => {
                setFilterDraft({
                  employee: "all",
                  assignee: "all",
                  type: "all",
                  status: "all",
                  active: "all",
                });
                setEmployeeFilter("all");
                setAssigneeFilter("all");
                setTypeFilter("all");
                setStatusFilter("all");
                setActiveFilter("all");
                setPage(1);
                setIsFilterOpen(false);
              }}
              onApply={() => {
                setEmployeeFilter(filterDraft.employee);
                setAssigneeFilter(filterDraft.assignee);
                setTypeFilter(filterDraft.type);
                setStatusFilter(filterDraft.status);
                setActiveFilter(filterDraft.active);
                setPage(1);
                setIsFilterOpen(false);
              }}
            />
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>الموظف</Label>
              <SelectField
                value={filterDraft.employee}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, employee: event.target.value }))
                }
                disabled={!canReadEmployees || employeesQuery.isLoading}
                icon={<UserCheck className="h-4 w-4" />}
              >
                <option value="all">كل الموظفين</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>المسند إليه</Label>
              <SelectField
                value={filterDraft.assignee}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, assignee: event.target.value }))
                }
                disabled={!canReadEmployees || employeesQuery.isLoading}
                icon={<UserCheck className="h-4 w-4" />}
              >
                <option value="all">كل المكلفين</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>النوع</Label>
              <SelectField
                value={filterDraft.type}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    type: event.target.value as "all" | EmployeeLifecycleChecklistType,
                  }))
                }
                icon={<ClipboardCheck className="h-4 w-4" />}
              >
                <option value="all">كل الأنواع</option>
                <option value="ONBOARDING">تهيئة</option>
                <option value="OFFBOARDING">إنهاء خدمة</option>
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>الحالة</Label>
              <SelectField
                value={filterDraft.status}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    status: event.target.value as "all" | EmployeeLifecycleChecklistStatus,
                  }))
                }
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                <option value="all">كل الحالات</option>
                <option value="PENDING">معلقة</option>
                <option value="IN_PROGRESS">قيد التنفيذ</option>
                <option value="COMPLETED">مكتملة</option>
                <option value="WAIVED">معفاة</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث بالعنوان أو الموظف..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canCreate ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleOpenTemplateForm}
                  disabled={isTemplateSubmitting}
                  data-testid="generate-lifecycle-templates"
                >
                  {generateTemplatesMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                  توليد مهام افتراضية
                </Button>
              ) : null}

              {canNotifyDue ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleGenerateDueAlerts}
                  disabled={isWorkflowSubmitting}
                  data-testid="generate-lifecycle-due-alerts"
                >
                  {generateDueAlertsMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <BellRing className="h-4 w-4" />
                  )}
                  توليد تنبيهات الاستحقاق
                </Button>
              ) : null}
            </div>
          }
        />

        {mutationError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {mutationError}
          </div>
        ) : null}

        {workflowMessage ? (
          <div
            className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary"
            data-testid="lifecycle-workflow-message"
          >
            {workflowMessage}
          </div>
        ) : null}

        {dueAlertsMessage ? (
          <div
            className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary"
            data-testid="lifecycle-due-alerts-message"
          >
            {dueAlertsMessage}
          </div>
        ) : null}

        {templateMessage ? (
          <div
            className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary"
            data-testid="lifecycle-template-message"
          >
            {templateMessage}
          </div>
        ) : null}

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة التهيئة وإنهاء الخدمة</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              متابعة مهام اليوم الأول واليوم الأخير للموظف ضمن سجل واضح.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {checklistsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {checklists.map((checklist) => (
              (() => {
                const remainingDays = calculateRemainingDays(checklist.dueDate);
                const isOverdue = remainingDays !== null && remainingDays < 0;
                const isDueSoon =
                  remainingDays !== null &&
                  remainingDays >= 0 &&
                  remainingDays <= DUE_WARNING_DAYS;

                return (
                  <div
                    key={checklist.id}
                    className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4 transition-all hover:bg-background/80"
                    data-testid="lifecycle-card"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-lg">{checklist.title}</p>
                      <Badge variant="outline">
                        {CHECKLIST_TYPE_LABELS[checklist.checklistType]}
                      </Badge>
                      <Badge
                        variant={
                          checklist.status === "COMPLETED" ? "default" : "secondary"
                        }
                      >
                        {CHECKLIST_STATUS_LABELS[checklist.status]}
                      </Badge>
                      {isOverdue ? (
                        <Badge variant="destructive">متأخرة</Badge>
                      ) : null}
                      {isDueSoon ? (
                        <Badge variant="outline" className="gap-1 text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          تستحق خلال {remainingDays} يوم
                        </Badge>
                      ) : null}
                    </div>
                    <div className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <span>الموظف: {checklist.employee.fullName}</span>
                      <span>
                        المسند إليه: {checklist.assignedTo?.fullName ?? "غير مسندة"}
                      </span>
                      <span>تاريخ الاستحقاق: {formatDate(checklist.dueDate)}</span>
                      <span>تاريخ الإكمال: {formatDate(checklist.completedAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {checklist.notes ?? "لا توجد ملاحظات."}
                    </p>
                  </div>

                  <Badge variant={checklist.isActive ? "default" : "outline"}>
                    {checklist.isActive ? "نشطة" : "غير نشطة"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-2">
                  {checklist.status === "PENDING" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleStartWorkflow(checklist)}
                      disabled={!canTransition || isWorkflowSubmitting}
                    >
                      <Rocket className="h-3.5 w-3.5" />
                      بدء التنفيذ
                    </Button>
                  ) : null}
                  {checklist.status === "PENDING" || checklist.status === "IN_PROGRESS" ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleCompleteWorkflow(checklist)}
                      disabled={!canTransition || isWorkflowSubmitting}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      إكمال
                    </Button>
                  ) : null}
                  {checklist.status === "PENDING" || checklist.status === "IN_PROGRESS" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleWaiveWorkflow(checklist)}
                      disabled={!canTransition || isWorkflowSubmitting}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      إعفاء
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(checklist)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(checklist)}
                    disabled={!canDelete || deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
                );
              })()
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
                  disabled={!pagination || pagination.page <= 1 || checklistsQuery.isFetching}
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
                    checklistsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void checklistsQuery.refetch()}
                  disabled={checklistsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${checklistsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إضافة مهمة تهيئة أو إنهاء خدمة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isTemplateFormOpen}
        title="توليد مهام افتراضية"
        onClose={resetTemplateForm}
        onSubmit={() => handleSubmitTemplateForm()}
        isSubmitting={isTemplateSubmitting}
        submitLabel="توليد المهام"
        showFooter={false}
      >
        <form
          className="space-y-6"
          onSubmit={handleSubmitTemplateForm}
          data-testid="lifecycle-template-form"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label required>الموظف</Label>
              <SelectField
                value={templateFormState.employeeId}
                onChange={(event) =>
                  setTemplateFormState((prev) => ({
                    ...prev,
                    employeeId: event.target.value,
                  }))
                }
                disabled={!canReadEmployees || employeesQuery.isLoading}
                icon={<UserCheck className="h-4 w-4" />}
                data-testid="lifecycle-template-form-employee"
              >
                <option value="">اختر الموظف</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label required>نوع القالب</Label>
              <SelectField
                value={templateFormState.checklistType}
                onChange={(event) =>
                  setTemplateFormState((prev) => ({
                    ...prev,
                    checklistType: event.target.value as EmployeeLifecycleChecklistType,
                  }))
                }
                icon={<ClipboardCheck className="h-4 w-4" />}
                data-testid="lifecycle-template-form-type"
              >
                <option value="ONBOARDING">تهيئة</option>
                <option value="OFFBOARDING">إنهاء خدمة</option>
              </SelectField>
            </div>
          </div>

          <div className="space-y-1">
            <Label>إسناد جميع المهام إلى</Label>
            <SelectField
              value={templateFormState.assignedToEmployeeId}
              onChange={(event) =>
                setTemplateFormState((prev) => ({
                  ...prev,
                  assignedToEmployeeId: event.target.value,
                }))
              }
              disabled={!canReadEmployees || employeesQuery.isLoading}
              icon={<UserCheck className="h-4 w-4" />}
              data-testid="lifecycle-template-form-assignee"
            >
              <option value="">غير مسندة</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </SelectField>
            <p className="text-xs text-muted-foreground">
              سيتم إنشاء مهام مدمجة بعناوين ومواعيد استحقاق افتراضية وفق نوع
              التهيئة أو إنهاء الخدمة.
            </p>
          </div>

          {templateFormError ? (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
              data-testid="lifecycle-template-form-error"
            >
              {templateFormError}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
              disabled={isTemplateSubmitting}
              data-testid="lifecycle-template-form-submit"
            >
              {isTemplateSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4" />
              )}
              توليد المهام
            </button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-2xl"
              onClick={resetTemplateForm}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </BottomSheetForm>

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل مهمة" : "إضافة مهمة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "تحديث المهمة" : "إضافة المهمة"}
        showFooter={false}
      >
        <form className="space-y-6" onSubmit={handleSubmitForm} data-testid="lifecycle-form">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label required>الموظف</Label>
              <SelectField
                value={formState.employeeId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, employeeId: event.target.value }))
                }
                disabled={!canReadEmployees || employeesQuery.isLoading}
                icon={<UserCheck className="h-4 w-4" />}
                data-testid="lifecycle-form-employee"
              >
                <option value="">اختر الموظف</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label required>النوع</Label>
              <SelectField
                value={formState.checklistType}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    checklistType: event.target.value as EmployeeLifecycleChecklistType,
                  }))
                }
                icon={<ClipboardCheck className="h-4 w-4" />}
                data-testid="lifecycle-form-type"
              >
                <option value="ONBOARDING">تهيئة</option>
                <option value="OFFBOARDING">إنهاء خدمة</option>
              </SelectField>
            </div>
          </div>

          <div className="space-y-1">
            <Label required>عنوان المهمة</Label>
            <Input
              value={formState.title}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="تسليم البريد المؤسسي"
              data-testid="lifecycle-form-title"
            />
          </div>

          <div className="space-y-1">
              <Label>المسند إليه</Label>
              <SelectField
                value={formState.assignedToEmployeeId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    assignedToEmployeeId: event.target.value,
                  }))
                }
                disabled={!canReadEmployees || employeesQuery.isLoading}
                icon={<UserCheck className="h-4 w-4" />}
                data-testid="lifecycle-form-assignee"
              >
                <option value="">غير مسندة</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </SelectField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>تاريخ الاستحقاق</Label>
              <Input
                type="date"
                value={formState.dueDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                data-testid="lifecycle-form-due-date"
              />
            </div>

            <label className="flex items-center gap-2 pt-7 text-sm">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                data-testid="lifecycle-form-active"
              />
              المهمة نشطة
            </label>
          </div>

          <div className="space-y-1">
            <Label>ملاحظات</Label>
            <Input
              value={formState.notes}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, notes: event.target.value }))
              }
              placeholder="تفاصيل إضافية"
              data-testid="lifecycle-form-notes"
            />
          </div>

          {formError ? (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
              data-testid="lifecycle-form-error"
            >
              {formError}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
              disabled={isFormSubmitting}
              data-testid="lifecycle-form-submit"
            >
              {isFormSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEditing ? "حفظ التعديلات" : "إضافة المهمة"}
            </button>
            <Button type="button" variant="outline" className="h-12 rounded-2xl" onClick={resetForm}>
              إلغاء
            </Button>
          </div>
        </form>
      </BottomSheetForm>
    </>
  );
}

