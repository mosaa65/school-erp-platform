"use client";

import * as React from "react";
import {
  CircleDollarSign,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAppliedFiltersSummary,
  FinanceAlert,
  FinanceEmptyState,
  FinanceInlineHint,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import {
  useCreateStudentInvoiceMutation,
  useDeleteStudentInvoiceMutation,
  useUpdateStudentInvoiceMutation,
} from "@/features/student-invoices/hooks/use-student-invoices-mutations";
import { useStudentInvoicesQuery } from "@/features/student-invoices/hooks/use-student-invoices-query";
import type { FeeType, InvoiceStatus, StudentInvoiceListItem } from "@/lib/api/client";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "مسودة",
  ISSUED: "صادرة",
  PARTIAL: "جزئي",
  PAID: "مسدد",
  CANCELLED: "ملغاة",
  CREDITED: "مُعادة",
};

const STATUS_VARIANTS: Record<
  InvoiceStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  ISSUED: "secondary",
  PARTIAL: "secondary",
  PAID: "default",
  CANCELLED: "destructive",
  CREDITED: "outline",
};

const STATUS_FILTER_OPTIONS: Array<{ value: "all" | InvoiceStatus; label: string }> = [
  { value: "all", label: "كل الحالات" },
  { value: "ISSUED", label: "صادرة" },
  { value: "PARTIAL", label: "جزئية" },
  { value: "PAID", label: "مسددة" },
  { value: "DRAFT", label: "مسودات" },
];

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.split("T")[0];
}

type FormState = {
  invoiceNumber: string;
  enrollmentId: string;
  academicYearId: string;
  branchId: string;
  invoiceDate: string;
  dueDate: string;
  currencyId: string;
  status: InvoiceStatus;
  notes: string;
  lineFeeType: FeeType;
  lineDescription: string;
  lineQuantity: string;
  lineUnitPrice: string;
};

const DEFAULT_FORM: FormState = {
  invoiceNumber: "",
  enrollmentId: "",
  academicYearId: "",
  branchId: "",
  invoiceDate: "",
  dueDate: "",
  currencyId: "",
  status: "DRAFT",
  notes: "",
  lineFeeType: "TUITION",
  lineDescription: "",
  lineQuantity: "1",
  lineUnitPrice: "",
};

function toFormState(item: StudentInvoiceListItem): FormState {
  return {
    invoiceNumber: item.invoiceNumber,
    enrollmentId: item.enrollmentId,
    academicYearId: item.academicYearId,
    branchId: item.branchId ? String(item.branchId) : "",
    invoiceDate: toDateInputValue(item.invoiceDate),
    dueDate: toDateInputValue(item.dueDate),
    currencyId: item.currencyId ? String(item.currencyId) : "",
    status: item.status,
    notes: item.notes ?? "",
    lineFeeType: "TUITION",
    lineDescription: "",
    lineQuantity: "1",
    lineUnitPrice: "",
  };
}

export function StudentInvoicesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-invoices.create");
  const canUpdate = hasPermission("student-invoices.update");
  const canDelete = hasPermission("student-invoices.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | InvoiceStatus
  >("all");
  const [filters, setFilters] = React.useState({
    enrollmentId: "",
    academicYearId: "",
    branchId: "",
    currencyId: "",
  });
  const [filterDraft, setFilterDraft] = React.useState(filters);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const createMutation = useCreateStudentInvoiceMutation();
  const updateMutation = useUpdateStudentInvoiceMutation();
  const deleteMutation = useDeleteStudentInvoiceMutation();

  const invoicesQuery = useStudentInvoicesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    enrollmentId: filters.enrollmentId || undefined,
    academicYearId: filters.academicYearId || undefined,
    branchId: filters.branchId ? Number(filters.branchId) : undefined,
    currencyId: filters.currencyId ? Number(filters.currencyId) : undefined,
  });

  const invoices = React.useMemo(
    () => invoicesQuery.data?.data ?? [],
    [invoicesQuery.data?.data],
  );
  const pagination = invoicesQuery.data?.pagination;

  useDebounceEffect(
    () => {
      setPage(1);
      setSearch(searchInput.trim());
    },
    350,
    [searchInput],
  );

  React.useEffect(() => {
    setPage(1);
  }, [
    statusFilter,
    filters.enrollmentId,
    filters.academicYearId,
    filters.branchId,
    filters.currencyId,
  ]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(filters);
  }, [filters, isFilterOpen]);

  const summary = React.useMemo(() => {
    const counts = invoices.reduce<Record<InvoiceStatus, number>>(
      (acc, invoice) => {
        acc[invoice.status] = (acc[invoice.status] ?? 0) + 1;
        return acc;
      },
      {
        DRAFT: 0,
        ISSUED: 0,
        PARTIAL: 0,
        PAID: 0,
        CANCELLED: 0,
        CREDITED: 0,
      },
    );

    const totalAmount = invoices.reduce(
      (total, invoice) => total + toNumber(invoice.totalAmount),
      0,
    );
    const totalBalance = invoices.reduce(
      (total, invoice) => total + toNumber(invoice.balanceDue),
      0,
    );

    return {
      totalAmount,
      totalBalance,
      counts,
      totalCount: pagination?.total ?? invoices.length,
    };
  }, [invoices, pagination?.total]);

  const notes = invoicesQuery.isFetching ? "جارٍ التحديث" : "بيانات مباشرة";
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const linePreviewTotal = React.useMemo(() => {
    if (isEditing) {
      return null;
    }

    const quantity = Number(form.lineQuantity);
    const unitPrice = Number(form.lineUnitPrice);
    if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
      return null;
    }

    return Math.max(quantity, 0) * Math.max(unitPrice, 0);
  }, [form.lineQuantity, form.lineUnitPrice, isEditing]);

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = invoices.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingId, invoices, isEditing]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: StudentInvoiceListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const invoiceDate = form.invoiceDate.trim();
    const dueDate = form.dueDate.trim();

    if (!invoiceDate || !dueDate) {
      setFormError("يرجى تعبئة تواريخ الفاتورة والاستحقاق.");
      return false;
    }

    if (!isEditing) {
      const enrollmentId = form.enrollmentId.trim();
      const academicYearId = form.academicYearId.trim();
      const description = form.lineDescription.trim();
      const quantity = Number(form.lineQuantity);
      const unitPrice = Number(form.lineUnitPrice);

      if (!enrollmentId || !academicYearId || !description) {
        setFormError("يرجى تعبئة بيانات الطالب والسنة ووصف البند.");
        return false;
      }

      if (Number.isNaN(quantity) || quantity <= 0) {
        setFormError("الكمية يجب أن تكون رقمًا أكبر من 0.");
        return false;
      }

      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        setFormError("سعر الوحدة يجب أن يكون 0 أو أكثر.");
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditing && editingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية التحديث: student-invoices.update.");
        return;
      }

      const payload = {
        invoiceDate: form.invoiceDate.trim(),
        dueDate: form.dueDate.trim(),
        status: form.status,
        branchId: form.branchId.trim() ? Number(form.branchId) : undefined,
        currencyId: form.currencyId.trim() ? Number(form.currencyId) : undefined,
        notes: form.notes.trim() || undefined,
      };

      updateMutation.mutate(
        { invoiceId: editingId, payload },
        {
          onSuccess: () => resetFormState(),
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية الإضافة: student-invoices.create.");
      return;
    }

    const payload = {
      invoiceNumber: form.invoiceNumber.trim() || undefined,
      enrollmentId: form.enrollmentId.trim(),
      academicYearId: form.academicYearId.trim(),
      branchId: form.branchId.trim() ? Number(form.branchId) : undefined,
      invoiceDate: form.invoiceDate.trim(),
      dueDate: form.dueDate.trim(),
      currencyId: form.currencyId.trim() ? Number(form.currencyId) : undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
      lines: [
        {
          feeType: form.lineFeeType,
          descriptionAr: form.lineDescription.trim(),
          quantity: Number(form.lineQuantity),
          unitPrice: Number(form.lineUnitPrice),
        },
      ],
    };

    createMutation.mutate(payload, {
      onSuccess: () => resetFormState(),
    });
  };

  const applyFilters = () => {
    setFilters(filterDraft);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      enrollmentId: "",
      academicYearId: "",
      branchId: "",
      currencyId: "",
    });
    setFilterDraft({
      enrollmentId: "",
      academicYearId: "",
      branchId: "",
      currencyId: "",
    });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      filters.enrollmentId ? 1 : 0,
      filters.academicYearId ? 1 : 0,
      filters.branchId ? 1 : 0,
      filters.currencyId ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [filters, searchInput, statusFilter]);

  const appliedFilterItems = React.useMemo(
    () =>
      [
        search ? { key: "search", label: "بحث", value: search } : null,
        statusFilter !== "all"
          ? { key: "status", label: "الحالة", value: STATUS_LABELS[statusFilter] }
          : null,
        filters.enrollmentId
          ? { key: "enrollmentId", label: "القيد", value: filters.enrollmentId }
          : null,
        filters.academicYearId
          ? { key: "academicYearId", label: "السنة", value: filters.academicYearId }
          : null,
        filters.branchId ? { key: "branchId", label: "الفرع", value: filters.branchId } : null,
        filters.currencyId
          ? { key: "currencyId", label: "العملة", value: filters.currencyId }
          : null,
      ].filter((item): item is { key: string; label: string; value: string } => item !== null),
    [filters, search, statusFilter],
  );

  return (
    <PageShell
      title="فواتير الطلاب"
      subtitle="متابعة الفواتير حسب الحالة والاستحقاق ورصيد كل طالب."
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void invoicesQuery.refetch()}
          disabled={invoicesQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </Button>
      }
    >
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-emerald-600" />
              ملخص الفواتير
            </CardTitle>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700">
              {notes}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>الإجمالي: {summary.totalAmount.toLocaleString("ar-SA")}</span>
            <span>الرصيد المتبقي: {summary.totalBalance.toLocaleString("ar-SA")}</span>
            <span>مسددة: {summary.counts.PAID}</span>
            <span>جزئية: {summary.counts.PARTIAL}</span>
            <span>صادرة: {summary.counts.ISSUED}</span>
            <span>مسودة: {summary.counts.DRAFT}</span>
            <span>ملغاة: {summary.counts.CANCELLED}</span>
            <span>مُعادة: {summary.counts.CREDITED}</span>
          </div>
        </CardHeader>
      </Card>

      <FinanceInlineHint title="طريقة أسرع للعمل على الفواتير">
        ابدأ بفلترة الحالة إلى <strong>صادرة</strong> أو <strong>جزئية</strong> لمتابعة الذمم المفتوحة بسرعة،
        ثم استخدم البحث برقم الفاتورة للوصول المباشر قبل فتح الفلاتر التفصيلية.
      </FinanceInlineHint>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            containerClassName="max-w-md"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="بحث برقم الفاتورة..."
          />
          <SelectField
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | InvoiceStatus)}
            className="max-w-[180px]"
          >
            <option value="all">كل الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="ISSUED">صادرة</option>
            <option value="PARTIAL">جزئي</option>
            <option value="PAID">مسدد</option>
            <option value="CANCELLED">ملغاة</option>
            <option value="CREDITED">مُعادة</option>
          </SelectField>
          <Badge variant="secondary" className="h-10">
            النتائج: {pagination?.total ?? invoices.length}
          </Badge>
        </div>
        <FilterTriggerButton
          count={activeFiltersCount}
          onClick={() => setIsFilterOpen((prev) => !prev)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTER_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      <FinanceAppliedFiltersSummary
        items={appliedFilterItems}
        onClear={() => {
          setSearchInput("");
          setSearch("");
          setStatusFilter("all");
          clearFilters();
        }}
      />

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر الفواتير"
        actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={filterDraft.enrollmentId}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, enrollmentId: event.target.value }))
            }
            placeholder="معرّف القيد الدراسي"
          />
          <Input
            value={filterDraft.academicYearId}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, academicYearId: event.target.value }))
            }
            placeholder="معرّف السنة الأكاديمية"
          />
          <Input
            type="number"
            min="1"
            value={filterDraft.branchId}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, branchId: event.target.value }))
            }
            placeholder="معرّف الفرع"
          />
          <Input
            type="number"
            min="1"
            value={filterDraft.currencyId}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, currencyId: event.target.value }))
            }
            placeholder="معرّف العملة"
          />
        </div>
      </FilterDrawer>

      {invoicesQuery.isPending ? (
        <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
      ) : null}

      {invoicesQuery.error ? (
        <FinanceAlert tone="error">
          {invoicesQuery.error instanceof Error
            ? invoicesQuery.error.message
            : "تعذّر تحميل البيانات."}
        </FinanceAlert>
      ) : null}

      {!invoicesQuery.isPending && invoices.length === 0 ? (
        <FinanceEmptyState>لا توجد فواتير مطابقة.</FinanceEmptyState>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {invoices.map((invoice: StudentInvoiceListItem) => {
          const totalAmount = toNumber(invoice.totalAmount);
          const balanceDue = toNumber(invoice.balanceDue);
          const currencyLabel = invoice.currency?.code ?? "SAR";
          const studentName = invoice.enrollment?.student?.fullName ?? "غير محدد";
          const branchName = invoice.branch?.nameAr ?? "كافة الفروع";
          const academicYearName = invoice.academicYear?.name ?? "غير محددة";

          return (
          <Card key={invoice.id} className="border-border/70 bg-card/80">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{invoice.invoiceNumber}</CardTitle>
                <Badge variant={STATUS_VARIANTS[invoice.status]}>
                  {STATUS_LABELS[invoice.status]}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>الطالب: {studentName}</p>
                <p>الفرع: {branchName}</p>
                <p>السنة الأكاديمية: {academicYearName}</p>
                <p>تاريخ الاستحقاق: {invoice.dueDate}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-dashed px-3 py-2 text-sm">
                  <span className="text-muted-foreground">الإجمالي</span>
                  <div className="font-semibold text-emerald-700">
                    {totalAmount.toLocaleString("ar-SA")} {currencyLabel}
                  </div>
                </div>
                <div className="rounded-md border border-dashed px-3 py-2 text-sm">
                  <span className="text-muted-foreground">الرصيد</span>
                  <div className="font-semibold text-amber-700">
                    {balanceDue.toLocaleString("ar-SA")} {currencyLabel}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="justify-start gap-2">
                <CircleDollarSign className="h-4 w-4" />
                عرض تفاصيل التحصيل
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(invoice)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (!canDelete) {
                      return;
                    }
                    if (!confirmFinanceAction(`تأكيد حذف الفاتورة ${invoice.invoiceNumber}?`)) {
                      return;
                    }
                    deleteMutation.mutate(invoice.id);
                  }}
                  disabled={!canDelete || deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </CardHeader>
          </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <p className="text-xs text-muted-foreground">
          الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={!pagination || pagination.page <= 1 || invoicesQuery.isFetching}
          >
            السابق
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
            }
            disabled={
              !pagination ||
              pagination.page >= pagination.totalPages ||
              invoicesQuery.isFetching
            }
          >
            التالي
          </Button>
        </div>
      </div>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إضافة"
        ariaLabel="إضافة فاتورة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل فاتورة" : "إضافة فاتورة"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التغييرات" : "إضافة فاتورة"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك صلاحية الإضافة: <code>student-invoices.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            {!isEditing ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    رقم الفاتورة (اختياري)
                  </label>
                  <Input
                    value={form.invoiceNumber}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, invoiceNumber: event.target.value }))
                    }
                    placeholder="INV-2026-0001"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      معرّف القيد الدراسي *
                    </label>
                    <Input
                      value={form.enrollmentId}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, enrollmentId: event.target.value }))
                      }
                      placeholder="enrollmentId"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      السنة الأكاديمية *
                    </label>
                    <Input
                      value={form.academicYearId}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, academicYearId: event.target.value }))
                      }
                      placeholder="academicYearId"
                      required
                    />
                  </div>
                </div>
              </>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الفرع</label>
                <Input
                  type="number"
                  min="1"
                  value={form.branchId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  placeholder="branchId"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">العملة</label>
                <Input
                  type="number"
                  min="1"
                  value={form.currencyId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, currencyId: event.target.value }))
                  }
                  placeholder="currencyId"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  تاريخ الفاتورة *
                </label>
                <Input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, invoiceDate: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  تاريخ الاستحقاق *
                </label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة</label>
              <SelectField
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as InvoiceStatus }))
                }
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="ملاحظات إضافية"
              />
            </div>

            {!isEditing ? (
              <div className="rounded-md border border-dashed p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  بند الفاتورة (إلزامي)
                </p>
                <FinanceInlineHint title="قبل إنشاء الفاتورة" className="border-none bg-muted/40">
                  أدخل وصف البند والكمية وسعر الوحدة فقط. ستظهر لك قيمة تقديرية مباشرة قبل الحفظ.
                </FinanceInlineHint>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      نوع الرسوم *
                    </label>
                    <SelectField
                      value={form.lineFeeType}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          lineFeeType: event.target.value as FeeType,
                        }))
                      }
                    >
                      <option value="TUITION">رسوم دراسية</option>
                      <option value="TRANSPORT">نقل</option>
                      <option value="UNIFORM">زي مدرسي</option>
                      <option value="REGISTRATION">تسجيل</option>
                      <option value="ACTIVITY">نشاط</option>
                      <option value="PENALTY">غرامة</option>
                      <option value="OTHER">أخرى</option>
                    </SelectField>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      الوصف *
                    </label>
                    <Input
                      value={form.lineDescription}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          lineDescription: event.target.value,
                        }))
                      }
                      placeholder="وصف البند"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      الكمية *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={form.lineQuantity}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          lineQuantity: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      سعر الوحدة *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.lineUnitPrice}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          lineUnitPrice: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="rounded-lg border bg-background/70 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">القيمة التقديرية للبند:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {linePreviewTotal === null
                      ? "أدخل الكمية وسعر الوحدة"
                      : linePreviewTotal.toLocaleString("ar-SA")}
                  </span>
                </div>
              </div>
            ) : null}

            {formError ? (
              <FinanceAlert tone="error" className="p-2 text-xs">
                {formError}
              </FinanceAlert>
            ) : null}

            {mutationError ? (
              <FinanceAlert tone="error" className="p-2 text-xs">
                {mutationError}
              </FinanceAlert>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ReceiptText className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التغييرات" : "إضافة فاتورة"}
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
    </PageShell>
  );
}
