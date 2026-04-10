"use client";

import * as React from "react";
import {
  AlertTriangle,
  BellRing,
  BookOpenText,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
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
  useCreateEmployeeDocumentMutation,
  useDeleteEmployeeDocumentMutation,
  useGenerateEmployeeDocumentExpiryAlertsMutation,
  useUpdateEmployeeDocumentMutation,
} from "@/features/employee-documents/hooks/use-employee-documents-mutations";
import { useEmployeeDocumentsQuery } from "@/features/employee-documents/hooks/use-employee-documents-query";
import { useEmployeeOptionsQuery } from "@/features/employee-documents/hooks/use-employee-options-query";
import type { EmployeeDocumentListItem } from "@/lib/api/client";

type DocumentFormState = {
  employeeId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  fileCategory: string;
  description: string;
  expiresAt: string;
};

const PAGE_SIZE = 12;
const DOCUMENT_EXPIRY_WARNING_DAYS = 30;
const DOCUMENT_CATEGORY_PRESETS = [
  "هوية",
  "إقامة",
  "جواز سفر",
  "شهادة",
  "رخصة",
  "قرار تعيين",
  "عقد",
  "أخرى",
] as const;
const EXPIRY_REQUIRED_CATEGORIES = new Set([
  "هوية",
  "إقامة",
  "جواز سفر",
  "شهادة",
  "رخصة",
]);

const DEFAULT_FORM_STATE: DocumentFormState = {
  employeeId: "",
  fileName: "",
  filePath: "",
  fileType: "",
  fileSize: "",
  fileCategory: "",
  description: "",
  expiresAt: "",
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFormState(document: EmployeeDocumentListItem): DocumentFormState {
  return {
    employeeId: document.employeeId,
    fileName: document.fileName,
    filePath: document.filePath,
    fileType: document.fileType ?? "",
    fileSize: document.fileSize === null ? "" : String(document.fileSize),
    fileCategory: document.fileCategory ?? "",
    description: document.description ?? "",
    expiresAt: document.expiresAt ? document.expiresAt.slice(0, 10) : "",
  };
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

function toDateIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function calculateRemainingDays(expiresAt: string | null): number | null {
  if (!expiresAt) {
    return null;
  }

  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const endOfExpiryDay = new Date(
    Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth(), expiryDate.getUTCDate()),
  );

  return Math.floor((endOfExpiryDay.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
}

function formatFileSize(value: number | null): string {
  if (value === null) {
    return "-";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmployeeDocumentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-documents.create");
  const canNotifyExpiring = hasPermission("employee-documents.notify-expiring");
  const canUpdate = hasPermission("employee-documents.update");
  const canDelete = hasPermission("employee-documents.delete");
  const canReadEmployees = hasPermission("employees.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [filterDraft, setFilterDraft] = React.useState({
    employee: "all",
    category: "",
    fileType: "",
  });
  const [editingDocumentId, setEditingDocumentId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<DocumentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [expiryAlertsMessage, setExpiryAlertsMessage] = React.useState<string | null>(null);

  const documentsQuery = useEmployeeDocumentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    fileCategory: categoryFilter || undefined,
    fileType: typeFilter || undefined,
  });
  const employeesQuery = useEmployeeOptionsQuery();

  const createMutation = useCreateEmployeeDocumentMutation();
  const updateMutation = useUpdateEmployeeDocumentMutation();
  const generateExpiryAlertsMutation = useGenerateEmployeeDocumentExpiryAlertsMutation();
  const deleteMutation = useDeleteEmployeeDocumentMutation();

  const documents = React.useMemo(
    () => documentsQuery.data?.data ?? [],
    [documentsQuery.data?.data],
  );
  const pagination = documentsQuery.data?.pagination;
  const isEditing = editingDocumentId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
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
      category: categoryFilter,
      fileType: typeFilter,
    });
  }, [categoryFilter, employeeFilter, isFilterOpen, typeFilter]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = documents.some((item) => item.id === editingDocumentId);
    if (!stillExists) {
      setEditingDocumentId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [documents, editingDocumentId, isEditing]);

  const resetForm = () => {
    setEditingDocumentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setEditingDocumentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.employeeId) {
      setFormError("الموظف مطلوب.");
      return false;
    }

    if (!formState.fileName.trim()) {
      setFormError("اسم المستند مطلوب.");
      return false;
    }

    if (!formState.filePath.trim()) {
      setFormError("مسار الملف أو رابطه مطلوب.");
      return false;
    }

    if (formState.fileSize.trim()) {
      const fileSize = Number(formState.fileSize);
      if (!Number.isInteger(fileSize) || fileSize < 0) {
        setFormError("حجم الملف يجب أن يكون رقمًا صحيحًا صفرًا أو أكبر.");
        return false;
      }
    }

    if (
      EXPIRY_REQUIRED_CATEGORIES.has(formState.fileCategory.trim()) &&
      !formState.expiresAt
    ) {
      setFormError("تاريخ الصلاحية مطلوب لهذا النوع من المستندات.");
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
      fileName: formState.fileName.trim(),
      filePath: formState.filePath.trim(),
      fileType: toOptionalString(formState.fileType),
      fileSize: formState.fileSize.trim() ? Number(formState.fileSize) : undefined,
      fileCategory: toOptionalString(formState.fileCategory),
      description: toOptionalString(formState.description),
      expiresAt: formState.expiresAt ? toDateIso(formState.expiresAt) : undefined,
    };

    if (isEditing && editingDocumentId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employee-documents.update.");
        return;
      }

      updateMutation.mutate(
        {
          documentId: editingDocumentId,
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
      setFormError("لا تملك الصلاحية المطلوبة: employee-documents.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (document: EmployeeDocumentListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingDocumentId(document.id);
    setFormState(toFormState(document));
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDelete = (document: EmployeeDocumentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف المستند ${document.fileName} للموظف ${document.employee?.fullName ?? document.employeeId}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(document.id, {
      onSuccess: () => {
        if (editingDocumentId === document.id) {
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
      { daysThreshold: DOCUMENT_EXPIRY_WARNING_DAYS },
      {
        onSuccess: (response) => {
          setExpiryAlertsMessage(
            `تم فحص ${response.scannedCount} مستندًا وإنشاء ${response.generatedCount} تنبيهًا ضمن نافذة ${response.daysThreshold} يوم.`,
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
        categoryFilter ? 1 : 0,
        typeFilter ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
    [categoryFilter, employeeFilter, searchInput, typeFilter],
  );

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setCategoryFilter("");
    setTypeFilter("");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setCategoryFilter(filterDraft.category);
    setTypeFilter(filterDraft.fileType);
    setIsFilterOpen(false);
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث باسم الملف أو المسار أو التصنيف..."
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
                data-testid="generate-document-expiry-alerts"
              >
                {generateExpiryAlertsMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BellRing className="h-4 w-4" />
                )}
                توليد تنبيهات الصلاحية
              </Button>
            ) : null
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر المستندات"
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
              value={filterDraft.category}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="مثال: هوية"
            />

            <Input
              value={filterDraft.fileType}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, fileType: event.target.value }))
              }
              placeholder="مثال: application/pdf"
            />
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>مستندات الموظفين</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة سجل مستندات الموظفين وروابطها ومساراتها المرجعية داخل النظام.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {documentsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {documentsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {documentsQuery.error instanceof Error
                  ? documentsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {expiryAlertsMessage ? (
              <div
                className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
                data-testid="document-expiry-alerts-message"
              >
                {expiryAlertsMessage}
              </div>
            ) : null}

            {!documentsQuery.isPending && documents.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {documents.map((document) => {
              const remainingDays = calculateRemainingDays(document.expiresAt);
              const isExpired = remainingDays !== null && remainingDays < 0;
              const isExpiringSoon =
                remainingDays !== null &&
                remainingDays >= 0 &&
                remainingDays <= DOCUMENT_EXPIRY_WARNING_DAYS;

              return (
              <div
                key={document.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                data-testid="document-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{document.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      الموظف: {document.employee?.fullName ?? document.employeeId} (
                      {document.employee?.jobNumber ?? "غير متوفر"})
                    </p>
                    <p className="text-xs text-muted-foreground">المسار/الرابط: {document.filePath}</p>
                    <p className="text-xs text-muted-foreground">
                      التصنيف: {document.fileCategory ?? "-"} | النوع: {document.fileType ?? "-"} |
                      الحجم: {formatFileSize(document.fileSize)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      تاريخ الصلاحية: {formatDate(document.expiresAt)}
                    </p>
                    {document.description ? (
                      <p className="text-xs text-muted-foreground">الوصف: {document.description}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {isExpiringSoon ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        تنتهي خلال {remainingDays} يوم
                      </Badge>
                    ) : null}
                    {isExpired ? <Badge variant="destructive">منتهي</Badge> : null}
                    <Badge variant="outline">#{document.id}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(document)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(document)}
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
                  disabled={!pagination || pagination.page <= 1 || documentsQuery.isFetching}
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
                    documentsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void documentsQuery.refetch()}
                  disabled={documentsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${documentsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء مستند"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل مستند موظف" : "إنشاء مستند موظف"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء مستند"}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[720px]"
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>employee-documents.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="document-form">
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "تحديث بيانات المستند المرجعي."
                : "إضافة مستند جديد للموظف عبر اسم الملف ومساره أو رابطه."}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">الموظف *</label>
              <SelectField
                
                value={formState.employeeId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, employeeId: event.target.value }))
                }
                disabled={!canReadEmployees}
                data-testid="document-form-employee"
              >
                <option value="">اختر الموظف</option>
                {(employeesQuery.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.jobNumber ?? "غير متوفر"})
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">اسم المستند *</label>
              <Input
                value={formState.fileName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, fileName: event.target.value }))
                }
                placeholder="صورة الهوية الوطنية.pdf"
                data-testid="document-form-file-name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">مسار الملف أو رابطه *</label>
              <Input
                value={formState.filePath}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, filePath: event.target.value }))
                }
                placeholder="https://cdn.school.local/hr/employees/emp-1/id-card.pdf"
                data-testid="document-form-file-path"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">تصنيف المستند</label>
                <Input
                  value={formState.fileCategory}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fileCategory: event.target.value }))
                  }
                  placeholder="هوية"
                  list="employee-document-category-presets"
                  data-testid="document-form-category"
                />
                <datalist id="employee-document-category-presets">
                  {DOCUMENT_CATEGORY_PRESETS.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">نوع الملف</label>
                <Input
                  value={formState.fileType}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fileType: event.target.value }))
                  }
                  placeholder="application/pdf"
                  data-testid="document-form-type"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">حجم الملف بالبايت</label>
              <Input
                type="number"
                min={0}
                value={formState.fileSize}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, fileSize: event.target.value }))
                }
                placeholder="245000"
                data-testid="document-form-size"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">الوصف</label>
              <Input
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="نسخة واضحة من بطاقة الهوية"
                data-testid="document-form-description"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">تاريخ الصلاحية</label>
              <Input
                type="date"
                value={formState.expiresAt}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
                data-testid="document-form-expiry-date"
              />
              {EXPIRY_REQUIRED_CATEGORIES.has(formState.fileCategory.trim()) ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  هذا التصنيف يتطلب تاريخ صلاحية حتى يمكن متابعته تشغيليًا.
                </p>
              ) : null}
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
                يتطلب هذا الجزء الصلاحية: <code>employees.read</code> لاختيار الموظف.
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing) || !canReadEmployees}
                data-testid="document-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpenText className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء مستند"}
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

