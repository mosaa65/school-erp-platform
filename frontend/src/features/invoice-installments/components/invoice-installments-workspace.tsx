"use client";

import * as React from "react";
import {
  CalendarClock,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Timer,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAlert,
  FinanceEmptyState,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import {
  useCreateInvoiceInstallmentMutation,
  useDeleteInvoiceInstallmentMutation,
  useUpdateInvoiceInstallmentMutation,
} from "@/features/invoice-installments/hooks/use-invoice-installments-mutations";
import { useInvoiceInstallmentsQuery } from "@/features/invoice-installments/hooks/use-invoice-installments-query";
import type {
  CreateInvoiceInstallmentPayload,
  InstallmentStatus,
  InvoiceInstallmentListItem,
  UpdateInvoiceInstallmentPayload,
} from "@/lib/api/client";

const PAGE_SIZE = 12;

const STATUS_LABELS: Record<InstallmentStatus, string> = {
  PENDING: "معلق",
  PARTIAL: "جزئي",
  PAID: "مسدد",
  OVERDUE: "متأخر",
  CANCELLED: "ملغى",
};

const STATUS_VARIANTS: Record<
  InstallmentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "outline",
  PARTIAL: "secondary",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

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
  invoiceId: string;
  installmentNumber: string;
  dueDate: string;
  amount: string;
  paidAmount: string;
  paymentDate: string;
  status: InstallmentStatus;
  lateFee: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  invoiceId: "",
  installmentNumber: "1",
  dueDate: "",
  amount: "",
  paidAmount: "",
  paymentDate: "",
  status: "PENDING",
  lateFee: "",
  notes: "",
};

function toFormState(item: InvoiceInstallmentListItem): FormState {
  return {
    invoiceId: item.invoiceId,
    installmentNumber: String(item.installmentNumber),
    dueDate: toDateInputValue(item.dueDate),
    amount: item.amount ? String(item.amount) : "",
    paidAmount: item.paidAmount ? String(item.paidAmount) : "",
    paymentDate: toDateInputValue(item.paymentDate),
    status: item.status,
    lateFee: item.lateFee ? String(item.lateFee) : "",
    notes: item.notes ?? "",
  };
}

export function InvoiceInstallmentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("invoice-installments.create");
  const canUpdate = hasPermission("invoice-installments.update");
  const canDelete = hasPermission("invoice-installments.delete");

  const [page, setPage] = React.useState(1);
  const [filter, setFilter] = React.useState<"all" | InstallmentStatus>("all");
  const [filters, setFilters] = React.useState({
    invoiceId: "",
    dueDateFrom: "",
    dueDateTo: "",
  });
  const [filterDraft, setFilterDraft] = React.useState(filters);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const createMutation = useCreateInvoiceInstallmentMutation();
  const updateMutation = useUpdateInvoiceInstallmentMutation();
  const deleteMutation = useDeleteInvoiceInstallmentMutation();

  const installmentsQuery = useInvoiceInstallmentsQuery({
    page,
    limit: PAGE_SIZE,
    status: filter === "all" ? undefined : filter,
    invoiceId: filters.invoiceId || undefined,
    dueDateFrom: filters.dueDateFrom || undefined,
    dueDateTo: filters.dueDateTo || undefined,
  });

  const installments = React.useMemo(
    () => installmentsQuery.data?.data ?? [],
    [installmentsQuery.data?.data],
  );
  const pagination = installmentsQuery.data?.pagination;

  const summary = React.useMemo(() => {
    const counts = installments.reduce<Record<InstallmentStatus, number>>(
      (acc, installment) => {
        acc[installment.status] = (acc[installment.status] ?? 0) + 1;
        return acc;
      },
      {
        PENDING: 0,
        PARTIAL: 0,
        PAID: 0,
        OVERDUE: 0,
        CANCELLED: 0,
      },
    );

    return {
      totalCount: pagination?.total ?? installments.length,
      counts,
    };
  }, [installments, pagination?.total]);

  const helperText = installmentsQuery.isFetching ? "جارٍ التحديث" : "بيانات مباشرة";
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = installments.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingId, installments, isEditing]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(filters);
  }, [filters, isFilterOpen]);

  React.useEffect(() => {
    setPage(1);
  }, [filter, filters.invoiceId, filters.dueDateFrom, filters.dueDateTo]);

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

  const handleStartEdit = (item: InvoiceInstallmentListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const dueDate = form.dueDate.trim();
    const amount = Number(form.amount);
    const installmentNumber = Number(form.installmentNumber);

    if (!dueDate || Number.isNaN(amount) || Number.isNaN(installmentNumber)) {
      setFormError("يرجى تعبئة تاريخ الاستحقاق والقيمة ورقم القسط.");
      return false;
    }

    if (amount < 0) {
      setFormError("القيمة يجب أن تكون 0 أو أكثر.");
      return false;
    }

    if (installmentNumber <= 0) {
      setFormError("رقم القسط يجب أن يكون 1 أو أكثر.");
      return false;
    }

    if (!isEditing && !form.invoiceId.trim()) {
      setFormError("يرجى إدخال معرف الفاتورة.");
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

    const payload: UpdateInvoiceInstallmentPayload = {
      invoiceId: form.invoiceId.trim() || undefined,
      installmentNumber: Number(form.installmentNumber),
      dueDate: form.dueDate.trim(),
      amount: Number(form.amount),
      paidAmount: form.paidAmount.trim() ? Number(form.paidAmount) : undefined,
      paymentDate: form.paymentDate.trim() || undefined,
      status: form.status,
      lateFee: form.lateFee.trim() ? Number(form.lateFee) : undefined,
      notes: form.notes.trim() || undefined,
    };

    if (isEditing && editingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية التحديث: invoice-installments.update.");
        return;
      }

      updateMutation.mutate(
        { installmentId: editingId, payload },
        {
          onSuccess: () => resetFormState(),
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية الإضافة: invoice-installments.create.");
      return;
    }

    const createPayload: CreateInvoiceInstallmentPayload = {
      invoiceId: form.invoiceId.trim(),
      installmentNumber: Number(form.installmentNumber),
      dueDate: form.dueDate.trim(),
      amount: Number(form.amount),
      paidAmount: form.paidAmount.trim() ? Number(form.paidAmount) : undefined,
      paymentDate: form.paymentDate.trim() || undefined,
      status: form.status,
      lateFee: form.lateFee.trim() ? Number(form.lateFee) : undefined,
      notes: form.notes.trim() || undefined,
    };

    createMutation.mutate(createPayload, {
      onSuccess: () => resetFormState(),
    });
  };

  const applyFilters = () => {
    setFilters(filterDraft);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const resetFilters = {
      invoiceId: "",
      dueDateFrom: "",
      dueDateTo: "",
    };
    setFilters(resetFilters);
    setFilterDraft(resetFilters);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      filters.invoiceId ? 1 : 0,
      filters.dueDateFrom ? 1 : 0,
      filters.dueDateTo ? 1 : 0,
      filter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [filter, filters]);

  return (
    <PageShell
      title="تقسيط الفواتير"
      subtitle="لوحة متابعة أقساط الفواتير ومواعيد الاستحقاق لكل طالب."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={filters.invoiceId}
          onSearchChange={(event) => setFilters((prev) => ({ ...prev, invoiceId: event.target.value }))}
          searchPlaceholder="بحث بمعرف الفاتورة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void installmentsQuery.refetch()}
              disabled={installmentsQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${installmentsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="md:col-span-3 border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-emerald-600" />
                  ملخص التقسيط
                </CardTitle>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-700">
                  {helperText}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>الإجمالي: <strong className="text-foreground">{summary.totalCount}</strong></span>
                <span>معلق: <strong className="text-foreground">{summary.counts.PENDING}</strong></span>
                <span>جزئي: <strong className="text-foreground">{summary.counts.PARTIAL}</strong></span>
                <span>مسدد: <strong className="text-foreground">{summary.counts.PAID}</strong></span>
                <span>متأخر: <strong className="text-foreground">{summary.counts.OVERDUE}</strong></span>
                <span>ملغى: <strong className="text-foreground">{summary.counts.CANCELLED}</strong></span>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">تصنيف سريع</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <SelectField
                value={filter}
                onChange={(event) => setFilter(event.target.value as any)}
                className="h-9 text-xs"
              >
                <option value="all">الكل</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectField>
            </CardContent>
          </Card>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الأقساط"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">
                مسح
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1">
                تطبيق
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">من تاريخ الاستحقاق</label>
              <Input
                type="date"
                value={filterDraft.dueDateFrom}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, dueDateFrom: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">إلى تاريخ الاستحقاق</label>
              <Input
                type="date"
                value={filterDraft.dueDateTo}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, dueDateTo: event.target.value }))
                }
              />
            </div>
          </div>
        </FilterDrawer>

        {installmentsQuery.isPending ? (
          <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
        ) : null}

        {installmentsQuery.error ? (
          <FinanceAlert tone="error">
            {installmentsQuery.error instanceof Error
              ? installmentsQuery.error.message
              : "تعذّر تحميل البيانات."}
          </FinanceAlert>
        ) : null}

        {!installmentsQuery.isPending && installments.length === 0 ? (
          <FinanceEmptyState>لا توجد أقساط مطابقة.</FinanceEmptyState>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {installments.map((installment: InvoiceInstallmentListItem) => {
            const amount = toNumber(installment.amount);
            const paidAmount = toNumber(installment.paidAmount);
            const remainingAmount = Math.max(amount - paidAmount, 0);
            const progressPercent = amount > 0 ? Math.round((paidAmount / amount) * 100) : 0;
            const invoiceNumber = installment.invoice?.invoiceNumber ?? "غير محددة";

            return (
              <Card key={installment.id} className="border-border/70 bg-card/80 transition-all hover:border-emerald-500/30">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base font-bold">
                      قسط رقم {installment.installmentNumber}
                    </CardTitle>
                    <Badge variant={STATUS_VARIANTS[installment.status]}>
                      {STATUS_LABELS[installment.status]}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center justify-between font-medium text-foreground">
                      <span>الفاتورة:</span>
                      <span className="text-primary">{invoiceNumber}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>الاستحقاق:</span>
                      <span>{installment.dueDate}</span>
                    </p>
                    {installment.paymentDate ? (
                      <p className="flex items-center justify-between">
                        <span>السداد:</span>
                        <span>{installment.paymentDate}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 grid-cols-2">
                    <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-3 py-1.5 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">الإجمالي</span>
                      <div className="font-bold text-emerald-700">
                        {amount.toLocaleString("ar-SA")}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-3 py-1.5 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">المتبقي</span>
                      <div className="font-bold text-amber-700">
                        {remainingAmount.toLocaleString("ar-SA")}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-muted-foreground">نسبة السداد</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleStartEdit(installment)}
                      disabled={!canUpdate || updateMutation.isPending}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (!canDelete) return;
                        if (!confirmFinanceAction(`تأكيد حذف القسط رقم ${installment.installmentNumber}?`)) return;
                        deleteMutation.mutate(installment.id);
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4">
          <p className="text-xs text-muted-foreground">
            الصفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={!pagination || pagination.page <= 1 || installmentsQuery.isFetching}
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
                installmentsQuery.isFetching
              }
            >
              التالي
            </Button>
          </div>
        </div>
      </div>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إضافة"
        ariaLabel="إضافة قسط"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل قسط" : "إضافة قسط"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التغييرات" : "إضافة قسط"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground text-center">
            لا تملك صلاحية الإضافة: <code>invoice-installments.create</code>.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                معرف الفاتورة {!isEditing ? "*" : ""}
              </label>
              <Input
                value={form.invoiceId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, invoiceId: event.target.value }))
                }
                placeholder="مثال: inv-12345"
                required={!isEditing}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  رقم القسط *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={form.installmentNumber}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, installmentNumber: event.target.value }))
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

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">القيمة *</label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  المدفوع
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.paidAmount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, paidAmount: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  تاريخ السداد
                </label>
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, paymentDate: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">غرامة تأخير</label>
                <Input
                  type="number"
                  min="0"
                  value={form.lateFee}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lateFee: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة</label>
              <SelectField
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as InstallmentStatus,
                  }))
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
                placeholder="ملاحظات إضافية بخصوص القسط"
              />
            </div>

            {formError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            ) : null}

            {mutationError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {mutationError}
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground h-10 px-4 py-2 rounded-2xl font-medium transition-colors hover:bg-primary/90 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التغييرات" : "إضافة قسط جديد"}
              </button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm} className="rounded-2xl h-10">
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
