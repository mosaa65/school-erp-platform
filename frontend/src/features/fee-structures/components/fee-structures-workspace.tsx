"use client";

import * as React from "react";
import {
  Layers,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  WalletCards,
  Calendar,
  GraduationCap,
  Banknote,
  Percent,
} from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import {
  useCreateFeeStructureMutation,
  useDeleteFeeStructureMutation,
  useUpdateFeeStructureMutation,
} from "@/features/fee-structures/hooks/use-fee-structures-mutations";
import { useFeeStructuresQuery } from "@/features/fee-structures/hooks/use-fee-structures-query";
import type { CreateFeeStructurePayload, FeeStructureListItem, FeeType } from "@/lib/api/client";

const PAGE_SIZE = 24;

const FEE_TYPE_LABELS: Record<FeeType, string> = {
  TUITION: "رسوم دراسية",
  TRANSPORT: "نقل",
  UNIFORM: "زي مدرسي",
  REGISTRATION: "تسجيل",
  ACTIVITY: "نشاط",
  PENALTY: "غرامة",
  OTHER: "أخرى",
};

function statusBadgeVariant(isActive: boolean): "default" | "outline" {
  return isActive ? "default" : "outline";
}

function statusLabel(isActive: boolean): string {
  return isActive ? "نشط" : "غير نشط";
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
}

type FormState = {
  academicYearId: string;
  gradeLevelId: string;
  feeType: FeeType;
  nameAr: string;
  amount: string;
  currencyId: string;
  vatRate: string;
  isActive: boolean;
};

const DEFAULT_FORM: FormState = {
  academicYearId: "",
  gradeLevelId: "",
  feeType: "TUITION",
  nameAr: "",
  amount: "",
  currencyId: "",
  vatRate: "",
  isActive: true,
};

function toFormState(item: FeeStructureListItem): FormState {
  return {
    academicYearId: item.academicYearId,
    gradeLevelId: item.gradeLevelId ?? "",
    feeType: item.feeType,
    nameAr: item.nameAr,
    amount: item.amount ? String(item.amount) : "",
    currencyId: item.currencyId ? String(item.currencyId) : "",
    vatRate: item.vatRate ? String(item.vatRate) : "",
    isActive: item.isActive,
  };
}

export function FeeStructuresWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("fee-structures.create");
  const canUpdate = hasPermission("fee-structures.update");
  const canDelete = hasPermission("fee-structures.delete");

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({
    academicYearId: "",
    gradeLevelId: "",
    feeType: "all" as "all" | FeeType,
    currencyId: "",
    isActive: "all" as "all" | "active" | "inactive",
  });
  const [filterDraft, setFilterDraft] = React.useState(filters);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<FeeStructureListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const createMutation = useCreateFeeStructureMutation();
  const updateMutation = useUpdateFeeStructureMutation();
  const deleteMutation = useDeleteFeeStructureMutation();

  const feeStructuresQuery = useFeeStructuresQuery({
    page: 1,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: filters.academicYearId || undefined,
    gradeLevelId: filters.gradeLevelId || undefined,
    feeType: filters.feeType === "all" ? undefined : filters.feeType,
    currencyId: filters.currencyId ? Number(filters.currencyId) : undefined,
    isActive:
      filters.isActive === "all" ? undefined : filters.isActive === "active",
  });

  const structures = React.useMemo(
    () => feeStructuresQuery.data?.data ?? [],
    [feeStructuresQuery.data?.data],
  );
  const pagination = feeStructuresQuery.data?.pagination;

  useDebounceEffect(
    () => {
      setSearch(searchInput.trim());
    },
    350,
    [searchInput],
  );

  const summary = React.useMemo(() => {
    const activeCount = structures.filter((item) => item.isActive).length;
    const inactiveCount = structures.filter((item) => !item.isActive).length;
    const totalAmount = structures.reduce(
      (total, item) => total + toNumber(item.amount),
      0,
    );

    return {
      totalCount: pagination?.total ?? structures.length,
      activeCount,
      inactiveCount,
      totalAmount,
    };
  }, [pagination?.total, structures]);

  const isEditing = editingItem !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  const resetForm = () => {
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setFormError(null);
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: FeeStructureListItem) => {
    if (!canUpdate) return;
    setFormError(null);
    setEditingItem(item);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const academicYearId = form.academicYearId.trim();
    const nameAr = form.nameAr.trim();
    const amount = Number(form.amount);

    if (!academicYearId || !nameAr || Number.isNaN(amount)) {
      setFormError("يرجى تعبئة الحقول المطلوبة: السنة الأكاديمية، الاسم، والقيمة.");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: CreateFeeStructurePayload = {
      academicYearId: form.academicYearId.trim(),
      gradeLevelId: form.gradeLevelId.trim() || undefined,
      feeType: form.feeType,
      nameAr: form.nameAr.trim(),
      amount: Number(form.amount),
      currencyId: form.currencyId.trim() ? Number(form.currencyId) : undefined,
      vatRate: form.vatRate.trim() ? Number(form.vatRate) : undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingItem) {
      updateMutation.mutate(
        { feeStructureId: editingItem.id, payload },
        { onSuccess: resetForm }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: resetForm });
    }
  };

  const applyFilters = () => {
    setFilters(filterDraft);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const cleared = {
      academicYearId: "",
      gradeLevelId: "",
      feeType: "all" as const,
      currencyId: "",
      isActive: "all" as const,
    };
    setFilters(cleared);
    setFilterDraft(cleared);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      filters.academicYearId ? 1 : 0,
      filters.gradeLevelId ? 1 : 0,
      filters.feeType !== "all" ? 1 : 0,
      filters.currencyId ? 1 : 0,
      filters.isActive !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [filters, searchInput]);

  return (
    <PageShell
      title="هياكل الرسوم"
      subtitle="إدارة وتنظيم هياكل الرسوم الدراسية والخدمات المساندة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الهيكل..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void feeStructuresQuery.refetch()}
              disabled={feeStructuresQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${feeStructuresQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <WalletCards className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase text-muted-foreground font-bold leading-none">الإجمالي</p>
                <p className="text-xl font-bold">{summary.totalCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase text-muted-foreground font-bold leading-none">النشطة</p>
                <p className="text-xl font-bold text-emerald-600">{summary.activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60 md:col-span-2">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold leading-none">إجمالي القيم المسجلة</p>
                  <p className="text-xl font-bold">{summary.totalAmount.toLocaleString()} <span className="text-xs font-normal opacity-70">ريال</span></p>
                </div>
              </div>
              <Badge variant="outline" className="h-6 border-primary/20 bg-primary/5 text-primary">تحليل البيانات</Badge>
            </CardContent>
          </Card>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر هياكل الرسوم"
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
              <label className="text-xs font-medium text-muted-foreground">السنة الأكاديمية</label>
              <Input
                value={filterDraft.academicYearId}
                onChange={(e) => setFilterDraft((p) => ({ ...p, academicYearId: e.target.value }))}
                placeholder="Id"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">المرحلة</label>
              <Input
                value={filterDraft.gradeLevelId}
                onChange={(e) => setFilterDraft((p) => ({ ...p, gradeLevelId: e.target.value }))}
                placeholder="Id"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">نوع الرسوم</label>
              <SelectField
                value={filterDraft.feeType}
                onChange={(e) => setFilterDraft((p) => ({ ...p, feeType: e.target.value as any }))}
              >
                <option value="all">كل الأنواع</option>
                {Object.entries(FEE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة</label>
              <SelectField
                value={filterDraft.isActive}
                onChange={(e) => setFilterDraft((p) => ({ ...p, isActive: e.target.value as any }))}
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        {feeStructuresQuery.isPending && <FinanceEmptyState>جارٍ تحميل هياكل الرسوم...</FinanceEmptyState>}
        
        {!feeStructuresQuery.isPending && structures.length === 0 && (
          <FinanceEmptyState>لا توجد هياكل رسوم مطابقة للبحث.</FinanceEmptyState>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {structures.map((item) => (
            <Card key={item.id} className="group overflow-hidden border-border/70 bg-card/80 transition-all hover:border-primary/40 hover:shadow-xl">
              <CardHeader className="p-4 pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors leading-tight">
                      {item.nameAr}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                      <GraduationCap className="h-3 w-3" />
                      <span>{item.gradeLevel?.name ?? "جميع المراحل"}</span>
                    </div>
                  </div>
                  <Badge variant={item.isActive ? "default" : "secondary"} className="h-5 text-[9px] uppercase tracking-tighter">
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/20 p-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase text-muted-foreground leading-none font-bold">المبلغ الأساسي</span>
                    <p className="text-sm font-bold text-emerald-600">{item.amount.toLocaleString()} <span className="text-[10px] font-normal opacity-70">ريال</span></p>
                  </div>
                  <div className="space-y-0.5 border-r border-border/60 pr-2">
                    <span className="text-[9px] uppercase text-muted-foreground leading-none font-bold">الضريبة</span>
                    <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                      <Percent className="h-3 w-3" />
                      <span>{item.vatRate}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Layers className="h-3 w-3" /> نوع الرسوم:</span>
                    <span className="font-medium text-foreground">{FEE_TYPE_LABELS[item.feeType] ?? item.feeType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> السنة الأكاديمية:</span>
                    <span className="font-medium text-foreground">{item.academicYear?.name ?? "N/A"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg font-bold"
                    onClick={() => handleStartEdit(item)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5 text-primary" />
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[11px] gap-1.5 rounded-lg font-bold text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (!canDelete) return;
                      if (!confirmFinanceAction(`تأكيد حذف هيكل الرسوم ${item.nameAr}?`)) return;
                      deleteMutation.mutate(item.id);
                    }}
                    disabled={!canDelete || deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Fab
          icon={<Plus className="h-5 w-5" />}
          label="إضافة هيكل جديد"
          onClick={handleStartCreate}
          disabled={!canCreate}
        />

        <CrudFormSheet
          open={isFormOpen}
          onClose={resetForm}
          title={isEditing ? "تعديل هيكل رسوم" : "إضافة هيكل رسوم جديد"}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> السنة الأكاديمية *
                </label>
                <Input
                  value={form.academicYearId}
                  onChange={(e) => setForm((p) => ({ ...p, academicYearId: e.target.value }))}
                  placeholder="معرّف السنة"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" /> المرحلة
                </label>
                <Input
                  value={form.gradeLevelId}
                  onChange={(e) => setForm((p) => ({ ...p, gradeLevelId: e.target.value }))}
                  placeholder="معرّف المرحلة"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> نوع الرسوم *
              </label>
              <SelectField
                value={form.feeType}
                onChange={(e) => setForm((p) => ({ ...p, feeType: e.target.value as FeeType }))}
              >
                {Object.entries(FEE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">الاسم المعتمد للهيكل *</label>
              <Input
                value={form.nameAr}
                onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                placeholder="مثال: رسوم دراسة المستوى الأول"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5" /> القيمة الأساسية *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5" /> نسبة الضريبة
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.vatRate}
                  onChange={(e) => setForm((p) => ({ ...p, vatRate: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
              <span className="font-bold flex items-center gap-2">
                تفعيل الهيكل
                {!form.isActive && <Badge variant="outline" className="text-[10px] h-5">معطل</Badge>}
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 rounded-lg border-primary/30 text-primary focus:ring-primary"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
            </label>

            {formError && <FinanceAlert tone="error">{formError}</FinanceAlert>}
            {mutationError && <FinanceAlert tone="error">{mutationError}</FinanceAlert>}
          </div>
        </CrudFormSheet>
      </div>
    </PageShell>
  );
}
function BadgeCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.85 11.7a1.94 1.94 0 0 0-2.1 2.1 1.94 1.94 0 0 0 2.1 2.1 1.94 1.94 0 0 0 2.1-2.1 1.94 1.94 0 0 0-2.1-2.1z" />
      <path d="m9 11 3 3 8-8" />
    </svg>
  )
}
