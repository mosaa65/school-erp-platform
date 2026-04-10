"use client";

import * as React from "react";
import {
  BadgePercent,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  UsersRound,
  ShieldCheck,
  Scale,
  Calendar,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAlert,
  FinanceEmptyState,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import {
  useCreateDiscountRuleMutation,
  useDeleteDiscountRuleMutation,
  useUpdateDiscountRuleMutation,
} from "@/features/discount-rules/hooks/use-discount-rules-mutations";
import { useDiscountRulesQuery } from "@/features/discount-rules/hooks/use-discount-rules-query";
import type {
  DiscountAppliesToFeeType,
  DiscountCalculationMethod,
  DiscountRuleListItem,
  DiscountType,
} from "@/lib/api/client";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";

const PAGE_SIZE = 24;

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  SIBLING: "أشقاء",
  ORPHAN: "أيتام",
  EMPLOYEE_CHILD: "أبناء الموظفين",
  SCHOLARSHIP: "منح",
  HARDSHIP: "حالات خاصة",
  CUSTOM: "مخصص",
};

const CALCULATION_LABELS: Record<DiscountCalculationMethod, string> = {
  PERCENTAGE: "نسبة",
  FIXED: "مبلغ",
};

const FEE_SCOPE_LABELS: Record<DiscountAppliesToFeeType, string> = {
  TUITION: "رسوم دراسية",
  TRANSPORT: "نقل",
  ALL: "جميع الرسوم",
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
  nameAr: string;
  discountType: DiscountType;
  calculationMethod: DiscountCalculationMethod;
  value: string;
  appliesToFeeType: DiscountAppliesToFeeType;
  siblingOrderFrom: string;
  maxDiscountPercentage: string;
  requiresApproval: boolean;
  discountGlAccountId: string;
  contraGlAccountId: string;
  academicYearId: string;
  isActive: boolean;
};

const DEFAULT_FORM: FormState = {
  nameAr: "",
  discountType: "SIBLING",
  calculationMethod: "PERCENTAGE",
  value: "",
  appliesToFeeType: "TUITION",
  siblingOrderFrom: "",
  maxDiscountPercentage: "",
  requiresApproval: false,
  discountGlAccountId: "",
  contraGlAccountId: "",
  academicYearId: "",
  isActive: true,
};

function toFormState(item: DiscountRuleListItem): FormState {
  return {
    nameAr: item.nameAr,
    discountType: item.discountType,
    calculationMethod: item.calculationMethod,
    value: item.value ? String(item.value) : "",
    appliesToFeeType: item.appliesToFeeType,
    siblingOrderFrom: item.siblingOrderFrom ? String(item.siblingOrderFrom) : "",
    maxDiscountPercentage: item.maxDiscountPercentage
      ? String(item.maxDiscountPercentage)
      : "",
    requiresApproval: item.requiresApproval,
    discountGlAccountId: item.discountGlAccountId ? String(item.discountGlAccountId) : "",
    contraGlAccountId: item.contraGlAccountId ? String(item.contraGlAccountId) : "",
    academicYearId: item.academicYearId ?? "",
    isActive: item.isActive,
  };
}

export function DiscountRulesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("discount-rules.create");
  const canUpdate = hasPermission("discount-rules.update");
  const canDelete = hasPermission("discount-rules.delete");

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<DiscountType | "all">(
    "all",
  );
  const [filters, setFilters] = React.useState({
    appliesToFeeType: "all" as "all" | DiscountAppliesToFeeType,
    academicYearId: "",
    isActive: "all" as "all" | "active" | "inactive",
  });
  const [filterDraft, setFilterDraft] = React.useState(filters);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<DiscountRuleListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const createMutation = useCreateDiscountRuleMutation();
  const updateMutation = useUpdateDiscountRuleMutation();
  const deleteMutation = useDeleteDiscountRuleMutation();

  const discountRulesQuery = useDiscountRulesQuery({
    page: 1,
    limit: PAGE_SIZE,
    search: search || undefined,
    discountType: activeCategory === "all" ? undefined : activeCategory,
    appliesToFeeType:
      filters.appliesToFeeType === "all" ? undefined : filters.appliesToFeeType,
    academicYearId: filters.academicYearId || undefined,
    isActive: filters.isActive === "all" ? undefined : filters.isActive === "active",
  });

  const rules = React.useMemo(
    () => discountRulesQuery.data?.data ?? [],
    [discountRulesQuery.data?.data],
  );
  const pagination = discountRulesQuery.data?.pagination;

  const summary = React.useMemo(() => {
    const activeCount = rules.filter((rule) => rule.isActive).length;
    return {
      totalCount: pagination?.total ?? rules.length,
      activeCount,
    };
  }, [pagination?.total, rules]);

  const categories = React.useMemo(() => {
    return ["all", ...Object.keys(DISCOUNT_TYPE_LABELS)];
  }, []);

  const isEditing = editingItem !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  useDebounceEffect(
    () => {
      setSearch(searchInput.trim());
    },
    350,
    [searchInput],
  );

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

  const handleStartEdit = (item: DiscountRuleListItem) => {
    if (!canUpdate) return;
    setFormError(null);
    setEditingItem(item);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const nameAr = form.nameAr.trim();
    const value = Number(form.value);
    if (!nameAr || Number.isNaN(value)) {
      setFormError("يرجى تعبئة الحقول المطلوبة: الاسم والقيمة.");
      return false;
    }
    return true;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateForm()) return;

    const payload = {
      nameAr: form.nameAr.trim(),
      discountType: form.discountType,
      calculationMethod: form.calculationMethod,
      value: Number(form.value),
      appliesToFeeType: form.appliesToFeeType,
      siblingOrderFrom: form.siblingOrderFrom.trim() ? Number(form.siblingOrderFrom) : undefined,
      maxDiscountPercentage: form.maxDiscountPercentage.trim() ? Number(form.maxDiscountPercentage) : undefined,
      requiresApproval: form.requiresApproval,
      discountGlAccountId: form.discountGlAccountId.trim() ? Number(form.discountGlAccountId) : undefined,
      contraGlAccountId: form.contraGlAccountId.trim() ? Number(form.contraGlAccountId) : undefined,
      academicYearId: form.academicYearId.trim() || undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingItem) {
      updateMutation.mutate(
        { discountRuleId: editingItem.id, payload },
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
    const cleared = { appliesToFeeType: "all" as const, academicYearId: "", isActive: "all" as const };
    setFilters(cleared);
    setFilterDraft(cleared);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      filters.appliesToFeeType !== "all" ? 1 : 0,
      filters.academicYearId ? 1 : 0,
      filters.isActive !== "all" ? 1 : 0,
      activeCategory !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeCategory, filters, searchInput]);

  return (
    <PageShell
      title="قواعد الخصومات"
      subtitle="إدارة وتخصيص سياسات الخصم للأشقاء والمنح والحالات الخاصة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم قاعدة الخصم..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void discountRulesQuery.refetch()}
              disabled={discountRulesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${discountRulesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            size="sm"
            variant={activeCategory === "all" ? "default" : "outline"}
            className="rounded-full px-4"
            onClick={() => setActiveCategory("all")}
          >
            الكل
            <Badge variant="secondary" className="mr-1.5 h-4 px-1 text-[10px]">{summary.totalCount}</Badge>
          </Button>
          {Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={activeCategory === value ? "default" : "outline"}
              className="rounded-full px-4"
              onClick={() => setActiveCategory(value as DiscountType)}
            >
              {label}
            </Button>
          ))}
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر قواعد الخصم"
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
              <label className="text-xs font-medium text-muted-foreground">نطاق الرسوم</label>
              <SelectField
                value={filterDraft.appliesToFeeType}
                onChange={(e) => setFilterDraft((p) => ({ ...p, appliesToFeeType: e.target.value as any }))}
              >
                <option value="all">كل الرسوم</option>
                {Object.entries(FEE_SCOPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">السنة الأكاديمية</label>
              <Input
                value={filterDraft.academicYearId}
                onChange={(e) => setFilterDraft((p) => ({ ...p, academicYearId: e.target.value }))}
                placeholder="Id"
              />
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

        {discountRulesQuery.isPending && <FinanceEmptyState>جارٍ تحميل القواعد...</FinanceEmptyState>}
        
        {!discountRulesQuery.isPending && rules.length === 0 && (
          <FinanceEmptyState>لا توجد قواعد خصم مسجلة حتى الآن.</FinanceEmptyState>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => {
            const valueLabel = rule.calculationMethod === "PERCENTAGE" ? `${rule.value}%` : `${rule.value.toLocaleString()} ريال`;
            return (
              <Card key={rule.id} className="group relative overflow-hidden border-border/70 bg-card/80 transition-all hover:border-primary/40 hover:shadow-lg">
                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                      {rule.nameAr}
                    </CardTitle>
                    <Badge variant="outline" className="h-5 text-[10px] font-medium bg-muted/50">
                      {DISCOUNT_TYPE_LABELS[rule.discountType] ?? rule.discountType}
                    </Badge>
                  </div>
                  <Badge variant={rule.isActive ? "default" : "secondary"} className="h-5 text-[9px] uppercase tracking-tighter">
                    {rule.isActive ? "نشط" : "معطل"}
                  </Badge>
                </CardHeader>
                
                <CardContent className="p-4 pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground font-bold leading-none">قيمة الخصم</span>
                      <p className="text-lg font-black text-primary">{valueLabel}</p>
                    </div>
                    <div className="rounded-xl bg-muted/20 p-2.5 space-y-1">
                      <span className="text-[9px] uppercase text-muted-foreground leading-none font-bold">النطاق</span>
                      <p className="text-sm font-bold truncate">{FEE_SCOPE_LABELS[rule.appliesToFeeType] ?? rule.appliesToFeeType}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-[11px] text-muted-foreground border-t border-border/50 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> الاعتماد:</span>
                      <span className="font-bold text-foreground">{rule.requiresApproval ? "يدوي (يتطلب موافقة)" : "تلقائي"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> السنة:</span>
                      <span className="font-bold text-foreground">{rule.academicYear?.name ?? "عام"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-[11px] gap-1.5 rounded-lg group-hover:border-primary/50"
                      onClick={() => handleStartEdit(rule)}
                      disabled={!canUpdate || updateMutation.isPending}
                    >
                      <PencilLine className="h-3.5 w-3.5 text-primary" />
                      تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[11px] gap-1.5 rounded-lg text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (!canDelete) return;
                        if (!confirmFinanceAction(`تأكيد حذف قاعدة الخصم ${rule.nameAr}?`)) return;
                        deleteMutation.mutate(rule.id);
                      }}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
                {!rule.isActive && <div className="absolute inset-0 bg-background/40 backdrop-grayscale pointer-events-none" />}
              </Card>
            );
          })}
        </div>

        <Fab
          icon={<Plus className="h-5 w-5" />}
          label="إضافة قاعدة جديدة"
          onClick={handleStartCreate}
          disabled={!canCreate}
        />

        <CrudFormSheet
          open={isFormOpen}
          onClose={resetForm}
          title={isEditing ? "تحديث قاعدة الخصم" : "إنشاء قاعدة خصم جديدة"}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">اسم القاعدة *</label>
              <Input
                value={form.nameAr}
                onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                placeholder="مثال: خصم الأخ الثاني الابتدائي"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> التصنيف الرئيسي *
                </label>
                <SelectField
                  value={form.discountType}
                  onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as DiscountType }))}
                >
                  {Object.entries(DISCOUNT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" /> نطاق التطبيق *
                </label>
                <SelectField
                  value={form.appliesToFeeType}
                  onChange={(e) => setForm((p) => ({ ...p, appliesToFeeType: e.target.value as DiscountAppliesToFeeType }))}
                >
                  {Object.entries(FEE_SCOPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <BadgePercent className="h-3.5 w-3.5" /> طريقة الحساب *
                </label>
                <SelectField
                  value={form.calculationMethod}
                  onChange={(e) => setForm((p) => ({ ...p, calculationMethod: e.target.value as DiscountCalculationMethod }))}
                >
                  {Object.entries(CALCULATION_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">القيمة *</label>
                <Input
                  type="number"
                  min="0"
                  value={form.value}
                  onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {form.discountType === 'SIBLING' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">ترتيب الأخ من</label>
                  <Input
                    type="number"
                    min="1"
                    value={form.siblingOrderFrom}
                    onChange={(e) => setForm((p) => ({ ...p, siblingOrderFrom: e.target.value }))}
                    placeholder="مثال: 2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">الحد الأعلى للخصم %</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.maxDiscountPercentage}
                    onChange={(e) => setForm((p) => ({ ...p, maxDiscountPercentage: e.target.value }))}
                    placeholder="100"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> السنة الأكاديمية
              </label>
              <Input
                value={form.academicYearId}
                onChange={(e) => setForm((p) => ({ ...p, academicYearId: e.target.value }))}
                placeholder="Id للسنة (اختياري)"
              />
            </div>

            <div className="grid gap-3 pt-2">
              <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
                <span className="font-bold flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-emerald-600" /> يتطلب اعتماد مدير النظام
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded-lg border-primary/30 text-primary focus:ring-primary"
                  checked={form.requiresApproval}
                  onChange={(e) => setForm((p) => ({ ...p, requiresApproval: e.target.checked }))}
                />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
                <span className="font-bold flex items-center gap-2">تفعيل القاعدة</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded-lg border-primary/30 text-primary focus:ring-primary"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
              </label>
            </div>

            {formError && <FinanceAlert tone="error">{formError}</FinanceAlert>}
            {mutationError && <FinanceAlert tone="error">{mutationError}</FinanceAlert>}
          </div>
        </CrudFormSheet>
      </div>
    </PageShell>
  );
}
