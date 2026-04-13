"use client";

import * as React from "react";
import {
  CalendarDays,
  BadgePercent,
  Hash,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
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
  const [editingId, setEditingId] = React.useState<number | null>(null);
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
    const inactiveCount = rules.filter((rule) => !rule.isActive).length;

    return {
      totalCount: pagination?.total ?? rules.length,
      activeCount,
      inactiveCount,
    };
  }, [pagination?.total, rules]);

  const categories = React.useMemo(() => {
    const unique = new Set(rules.map((rule) => rule.discountType));
    return ["all", ...Array.from(unique)];
  }, [rules]);

  const filteredRules = React.useMemo(() => {
    if (activeCategory === "all") {
      return rules;
    }
    return rules.filter((rule) => rule.discountType === activeCategory);
  }, [activeCategory, rules]);

  const ownerNote = discountRulesQuery.isFetching ? "جارٍ التحديث" : "بيانات مباشرة";
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

    const stillExists = rules.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingId, isEditing, rules]);

  useDebounceEffect(
    () => {
      setSearch(searchInput.trim());
    },
    350,
    [searchInput],
  );

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(filters);
  }, [filters, isFilterOpen]);

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

  const handleStartEdit = (item: DiscountRuleListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingId(item.id);
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

    if (value < 0) {
      setFormError("القيمة يجب أن تكون 0 أو أكثر.");
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

    const payload = {
      nameAr: form.nameAr.trim(),
      discountType: form.discountType,
      calculationMethod: form.calculationMethod,
      value: Number(form.value),
      appliesToFeeType: form.appliesToFeeType,
      siblingOrderFrom: form.siblingOrderFrom.trim()
        ? Number(form.siblingOrderFrom)
        : undefined,
      maxDiscountPercentage: form.maxDiscountPercentage.trim()
        ? Number(form.maxDiscountPercentage)
        : undefined,
      requiresApproval: form.requiresApproval,
      discountGlAccountId: form.discountGlAccountId.trim()
        ? Number(form.discountGlAccountId)
        : undefined,
      contraGlAccountId: form.contraGlAccountId.trim()
        ? Number(form.contraGlAccountId)
        : undefined,
      academicYearId: form.academicYearId.trim() || undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية التحديث: discount-rules.update.");
        return;
      }

      updateMutation.mutate(
        { discountRuleId: editingId, payload },
        {
          onSuccess: () => resetFormState(),
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية الإضافة: discount-rules.create.");
      return;
    }

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
      appliesToFeeType: "all",
      academicYearId: "",
      isActive: "all",
    });
    setFilterDraft({
      appliesToFeeType: "all",
      academicYearId: "",
      isActive: "all",
    });
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
      subtitle="إدارة الخصومات العائلية والتحفيزية والمنح وربطها بالفواتير."
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void discountRulesQuery.refetch()}
          disabled={discountRulesQuery.isFetching}
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
              <BadgePercent className="h-5 w-5 text-emerald-600" />
              ملخص الخصومات
            </CardTitle>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700">
              {ownerNote}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>إجمالي القواعد: {summary.totalCount}</span>
            <span>النشطة: {summary.activeCount}</span>
            <span>غير النشطة: {summary.inactiveCount}</span>
          </div>
        </CardHeader>
      </Card>

      <ManagementToolbar
        searchValue={searchInput}
        onSearchChange={(event) => setSearchInput(event.target.value)}
        searchPlaceholder="بحث بالاسم..."
        filterCount={activeFiltersCount}
        onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        searchWrapperClassName="max-w-md"
      />

      <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلاتر قواعد الخصم"
        actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="نطاق الرسوم">
            <SelectField
              icon={<BadgePercent />}
              value={filterDraft.appliesToFeeType}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  appliesToFeeType: event.target.value as "all" | DiscountAppliesToFeeType,
                }))
              }
            >
              <option value="all">كل الرسوم</option>
              {Object.entries(FEE_SCOPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="السنة الأكاديمية">
            <Input
              icon={<CalendarDays />}
              value={filterDraft.academicYearId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, academicYearId: event.target.value }))
              }
              placeholder="معرّف السنة الأكاديمية"
            />
          </FormField>
          <FormField label="الحالة">
            <SelectField
              icon={<BadgePercent />}
              value={filterDraft.isActive}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  isActive: event.target.value as "all" | "active" | "inactive",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </SelectField>
          </FormField>
        </div>
      </FilterDrawer>

      <Card className="border-border/70 bg-card/80">
        <CardContent className="flex flex-wrap items-center gap-2 py-4">
          <span className="text-sm text-muted-foreground">تصنيف سريع:</span>
          {categories.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={activeCategory === category ? "default" : "outline"}
              onClick={() =>
                setActiveCategory(category === "all" ? "all" : (category as DiscountType))
              }
            >
              {category === "all"
                ? "الكل"
                : DISCOUNT_TYPE_LABELS[category as DiscountType] ?? category}
            </Button>
          ))}
        </CardContent>
      </Card>

      {discountRulesQuery.isPending ? (
        <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
      ) : null}

      {discountRulesQuery.error ? (
        <FinanceAlert tone="error">
          {discountRulesQuery.error instanceof Error
            ? discountRulesQuery.error.message
            : "تعذّر تحميل البيانات."}
        </FinanceAlert>
      ) : null}

      {!discountRulesQuery.isPending && filteredRules.length === 0 ? (
        <FinanceEmptyState>لا توجد قواعد خصم مطابقة.</FinanceEmptyState>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filteredRules.map((rule: DiscountRuleListItem) => {
          const value = toNumber(rule.value);
          const valueLabel =
            rule.calculationMethod === "PERCENTAGE"
              ? `${value}%`
              : `${value.toLocaleString("ar-SA")} ريال`;
          const scopeLabel =
            FEE_SCOPE_LABELS[rule.appliesToFeeType] ?? rule.appliesToFeeType;
          const academicYearLabel = rule.academicYear?.name ?? "جميع السنوات";
          const requiresApprovalLabel = rule.requiresApproval ? "يتطلب اعتماد" : "آلي";

          return (
          <Card key={rule.id} className="border-border/70 bg-card/80">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{rule.nameAr}</CardTitle>
                <Badge variant={statusBadgeVariant(rule.isActive)}>
                  {statusLabel(rule.isActive)}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  التصنيف: {DISCOUNT_TYPE_LABELS[rule.discountType] ?? rule.discountType}
                </p>
                <p>النطاق: {scopeLabel}</p>
                <p>
                  القيمة ({CALCULATION_LABELS[rule.calculationMethod]}): {valueLabel}
                </p>
                <p>السنة الأكاديمية: {academicYearLabel}</p>
              </div>
              <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm">
                <span className="text-muted-foreground">سياسة الموافقة</span>
                <span className="flex items-center gap-2 font-medium">
                  <UsersRound className="h-4 w-4 text-emerald-600" />
                  {requiresApprovalLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(rule)}
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
                    if (!confirmFinanceAction(`تأكيد حذف قاعدة الخصم ${rule.nameAr}?`)) {
                      return;
                    }
                    deleteMutation.mutate(rule.id);
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

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إضافة"
        ariaLabel="إضافة قاعدة خصم"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل قاعدة خصم" : "إضافة قاعدة خصم"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التغييرات" : "إضافة قاعدة"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك صلاحية الإضافة: <code>discount-rules.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <FormField label="الاسم" required>
              <Input
                icon={<Type />}
                value={form.nameAr}
                onChange={(event) => setForm((prev) => ({ ...prev, nameAr: event.target.value }))}
                placeholder="اسم قاعدة الخصم"
                required
              />
            </FormField>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="التصنيف" required>
                <SelectField
                  icon={<UsersRound />}
                  value={form.discountType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      discountType: event.target.value as DiscountType,
                    }))
                  }
                  required
                >
                  {Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField label="النطاق" required>
                <SelectField
                  icon={<BadgePercent />}
                  value={form.appliesToFeeType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      appliesToFeeType: event.target.value as DiscountAppliesToFeeType,
                    }))
                  }
                  required
                >
                  {Object.entries(FEE_SCOPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="طريقة الحساب" required>
                <SelectField
                  icon={<BadgePercent />}
                  value={form.calculationMethod}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      calculationMethod: event.target.value as DiscountCalculationMethod,
                    }))
                  }
                  required
                >
                  {Object.entries(CALCULATION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField label="القيمة" required>
                <Input
                  icon={<Hash />}
                  type="number"
                  min="0"
                  value={form.value}
                  onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                  placeholder="0"
                  required
                />
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="ترتيب الأخوة من">
                <Input
                  icon={<Hash />}
                  type="number"
                  min="1"
                  value={form.siblingOrderFrom}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, siblingOrderFrom: event.target.value }))
                  }
                  placeholder="اختياري"
                />
              </FormField>
              <FormField label="الحد الأعلى للنسبة">
                <Input
                  icon={<Hash />}
                  type="number"
                  min="0"
                  value={form.maxDiscountPercentage}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, maxDiscountPercentage: event.target.value }))
                  }
                  placeholder="اختياري"
                />
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="حساب الخصم">
                <Input
                  icon={<Hash />}
                  type="number"
                  min="1"
                  value={form.discountGlAccountId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, discountGlAccountId: event.target.value }))
                  }
                  placeholder="معرّف الحساب (اختياري)"
                />
              </FormField>
              <FormField label="حساب مقابل">
                <Input
                  icon={<Hash />}
                  type="number"
                  min="1"
                  value={form.contraGlAccountId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, contraGlAccountId: event.target.value }))
                  }
                  placeholder="معرّف الحساب (اختياري)"
                />
              </FormField>
            </div>

            <FormField label="السنة الأكاديمية">
              <Input
                icon={<CalendarDays />}
                value={form.academicYearId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, academicYearId: event.target.value }))
                }
                placeholder="معرّف السنة (اختياري)"
              />
            </FormField>

            <div className="grid gap-2 md:grid-cols-2">
              <FormBooleanField
                label="يتطلب اعتماد"
                checked={form.requiresApproval}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, requiresApproval: checked }))
                }
              />
              <FormBooleanField
                label="نشط"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

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
                  <BadgePercent className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التغييرات" : "إضافة قاعدة"}
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
