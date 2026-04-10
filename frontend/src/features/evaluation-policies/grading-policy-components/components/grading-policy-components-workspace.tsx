"use client";

import * as React from "react";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";

import { ManagementToolbar } from "@/components/ui/management-toolbar";

import { PageShell } from "@/components/ui/page-shell";

import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BadgeCheck,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { CrudFormSheet } from "@/components/ui/bottom-sheet-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useGradingPoliciesQuery } from "@/features/evaluation-policies/grading-policies/hooks/use-grading-policies-query";
import {
  useCreateGradingPolicyComponentMutation,
  useDeleteGradingPolicyComponentMutation,
  useUpdateGradingPolicyComponentMutation,
} from "@/features/evaluation-policies/grading-policy-components/hooks/use-grading-policy-components-mutations";
import { useGradingPolicyComponentsQuery } from "@/features/evaluation-policies/grading-policy-components/hooks/use-grading-policy-components-query";
import { formatNameCodeLabel } from "@/lib/option-labels";
import type {
  GradingComponentCalculationMode,
  GradingPolicyComponentListItem,
} from "@/lib/api/client";

const PAGE_SIZE = 12;

const CALCULATION_MODE_OPTIONS: GradingComponentCalculationMode[] = [
  "MANUAL",
  "AUTO_ATTENDANCE",
  "AUTO_HOMEWORK",
  "AUTO_EXAM",
];

const calculationModeLabel = (
  mode: GradingComponentCalculationMode,
): string => {
  switch (mode) {
    case "AUTO_ATTENDANCE":
      return "تلقائي: الحضور";
    case "AUTO_HOMEWORK":
      return "تلقائي: الواجبات";
    case "AUTO_EXAM":
      return "تلقائي: الاختبارات";
    case "MANUAL":
    default:
      return "يدوي";
  }
};

type GradingPolicyComponentFormState = {
  gradingPolicyId: string;
  code: string;
  name: string;
  maxScore: string;
  calculationMode: GradingComponentCalculationMode;
  includeInMonthly: boolean;
  includeInSemester: boolean;
  sortOrder: string;
  isActive: boolean;
};

const DEFAULT_FORM_STATE: GradingPolicyComponentFormState = {
  gradingPolicyId: "",
  code: "",
  name: "",
  maxScore: "",
  calculationMode: "MANUAL",
  includeInMonthly: true,
  includeInSemester: true,
  sortOrder: "1",
  isActive: true,
};

export function GradingPolicyComponentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grading-policy-components.create");
  const canUpdate = hasPermission("grading-policy-components.update");
  const canDelete = hasPermission("grading-policy-components.delete");
  const canRead = hasPermission("grading-policy-components.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selectedPolicyId, setSelectedPolicyId] = React.useState("all");
  const [filterDraft, setFilterDraft] = React.useState<{ policy: string }>({
    policy: "all",
  });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const policiesQuery = useGradingPoliciesQuery({
    page: 1,
    limit: 200,
    isActive: true,
  });

  const componentsQuery = useGradingPolicyComponentsQuery({
    page,
    limit: PAGE_SIZE,
    search,
    gradingPolicyId: selectedPolicyId === "all" ? undefined : selectedPolicyId,
  });

  const createMutation = useCreateGradingPolicyComponentMutation();
  const updateMutation = useUpdateGradingPolicyComponentMutation();
  const deleteMutation = useDeleteGradingPolicyComponentMutation();

  const policyLabelById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const policy of policiesQuery.data?.data ?? []) {
      const subjectLabel = formatNameCodeLabel(policy.subject.name, policy.subject.code);
      const gradeLabel = formatNameCodeLabel(policy.gradeLevel.name, policy.gradeLevel.code);
      const yearLabel = formatNameCodeLabel(policy.academicYear.name, policy.academicYear.code);
      map.set(policy.id, `${subjectLabel} / ${gradeLabel} / ${yearLabel}`);
    }
    return map;
  }, [policiesQuery.data]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      policy: selectedPolicyId,
    });
  }, [isFilterOpen, selectedPolicyId]);

  const resetFormState = () => {
    setEditingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
    setActionSuccess(null);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: GradingPolicyComponentListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingId(item.id);
    setFormState({
      gradingPolicyId: item.gradingPolicyId,
      code: item.code ?? "",
      name: item.name ?? "",
      maxScore: String(item.maxScore ?? ""),
      calculationMode: item.calculationMode,
      includeInMonthly: item.includeInMonthly,
      includeInSemester: item.includeInSemester,
      sortOrder: String(item.sortOrder ?? 1),
      isActive: item.isActive,
    });
    setFormError(null);
    setActionSuccess(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.gradingPolicyId || !formState.name.trim()) {
      setFormError("السياسة والاسم مطلوبان.");
      return false;
    }

    if (!formState.maxScore.trim()) {
      setFormError("الدرجة القصوى مطلوبة.");
      return false;
    }

    const maxScore = Number(formState.maxScore);
    if (!Number.isFinite(maxScore) || maxScore < 0) {
      setFormError("الدرجة القصوى يجب أن تكون رقمًا غير سالب.");
      return false;
    }

    const sortOrder = Number(formState.sortOrder);
    if (!Number.isFinite(sortOrder) || sortOrder < 1) {
      setFormError("ترتيب العرض يجب أن يكون رقمًا صحيحًا أكبر من صفر.");
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    setFormError(null);
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      gradingPolicyId: formState.gradingPolicyId,
      name: formState.name.trim(),
      maxScore: Number(formState.maxScore),
      calculationMode: formState.calculationMode,
      includeInMonthly: formState.includeInMonthly,
      includeInSemester: formState.includeInSemester,
      sortOrder: Number(formState.sortOrder),
      isActive: formState.isActive,
    };

    if (editingId) {
      updateMutation.mutate(
        { gradingPolicyComponentId: editingId, payload },
        {
          onSuccess: () => {
            resetFormState();
            setActionSuccess("تم تحديث المكوّن بنجاح.");
          },
        },
      );
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetFormState();
        setActionSuccess("تم إنشاء المكوّن بنجاح.");
      },
    });
  };

  const handleDelete = (item: GradingPolicyComponentListItem) => {
    if (!confirm(`تأكيد حذف المكوّن ${item.name}؟`)) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        setActionSuccess("تم حذف المكوّن بنجاح.");
      },
    });
  };

  const isBusy =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setSelectedPolicyId("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setSelectedPolicyId(filterDraft.policy);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [searchInput.trim() ? 1 : 0, selectedPolicyId !== "all" ? 1 : 0].reduce(
      (acc, value) => acc + value,
      0,
    );
    return count;
  }, [searchInput, selectedPolicyId]);

  return (
    <PageShell title="فلاتر المكوّنات">

      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث بالاسم أو الرمز..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
          showFilterButton={true}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر المكوّنات"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="flex-1 gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                مسح
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
                تطبيق
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.policy}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, policy: event.target.value }))
              }
            >
              <option value="all">كل السياسات</option>
              {(policiesQuery.data?.data ?? []).map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {formatNameCodeLabel(policy.subject.name, policy.subject.code)} /{" "}
                  {formatNameCodeLabel(policy.gradeLevel.name, policy.gradeLevel.code)}
                </option>
              ))}
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-2">
            <CardTitle>قائمة المكوّنات</CardTitle>
            <CardDescription>عرض المكوّنات حسب السياسة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!canRead ? (
              <p className="text-sm text-muted-foreground">لا تملك صلاحية القراءة.</p>
            ) : componentsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" /> جارٍ التحميل
              </div>
            ) : componentsQuery.data?.data.length ? (
              <div className="space-y-2">
                {componentsQuery.data.data.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {item.name} ({item.code})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {calculationModeLabel(item.calculationMode)} | الدرجة القصوى:{" "}
                        {item.maxScore}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        السياسة:{" "}
                        {policyLabelById.get(item.gradingPolicyId) ?? item.gradingPolicyId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isActive ? (
                        <Badge variant="secondary" className="gap-1">
                          <BadgeCheck className="h-3 w-3" /> نشط
                        </Badge>
                      ) : (
                        <Badge variant="outline">غير نشط</Badge>
                      )}
                      <Badge variant="outline">
                        شهري: {item.includeInMonthly ? "نعم" : "لا"}
                      </Badge>
                      <Badge variant="outline">
                        فصلي: {item.includeInSemester ? "نعم" : "لا"}
                      </Badge>
                      {canUpdate ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartEdit(item)}
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>
            )}

            {componentsQuery.data?.pagination ? (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  صفحة {componentsQuery.data.pagination.page} من{" "}
                  {componentsQuery.data.pagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (componentsQuery.data.pagination.totalPages ?? 1)}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    التالي
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => componentsQuery.refetch()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    تحديث
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إنشاء"
        ariaLabel="إنشاء مكوّن سياسة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        title={editingId ? "تعديل مكوّن سياسة" : "إنشاء مكوّن سياسة"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isBusy}
        submitLabel={editingId ? "حفظ التعديلات" : "إنشاء المكوّن"}
      >
        {!canCreate && !editingId ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>grading-policy-components.create</code>.
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <p className="text-sm text-muted-foreground">
              هذه شاشة تعريف المكوّنات (قالب السياسة)، وليست درجات فعلية للطلاب.
            </p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">سياسة الدرجات *</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={formState.gradingPolicyId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      gradingPolicyId: event.target.value,
                    }))
                  }
                >
                  <option value="">اختر سياسة الدرجات</option>
                  {(policiesQuery.data?.data ?? []).map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {formatNameCodeLabel(policy.subject.name, policy.subject.code)} /{" "}
                      {formatNameCodeLabel(policy.gradeLevel.name, policy.gradeLevel.code)} /{" "}
                      {formatNameCodeLabel(policy.academicYear.name, policy.academicYear.code)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">الاسم *</label>
                <Input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="الحضور"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">الدرجة القصوى *</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formState.maxScore}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, maxScore: event.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">نوع الحساب *</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={formState.calculationMode}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      calculationMode: event.target.value as GradingComponentCalculationMode,
                    }))
                  }
                >
                  {CALCULATION_MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {calculationModeLabel(mode)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">ترتيب العرض</label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={formState.sortOrder}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, sortOrder: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formState.includeInMonthly}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      includeInMonthly: event.target.checked,
                    }))
                  }
                />
                يدخل في المحصلة الشهرية
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formState.includeInSemester}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      includeInSemester: event.target.checked,
                    }))
                  }
                />
                يدخل في نتيجة الفصل
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                نشط
              </label>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            {actionSuccess ? (
              <p className="text-sm text-emerald-600">{actionSuccess}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!canCreate && !editingId || isBusy}>
                {editingId ? "حفظ التعديلات" : "إنشاء المكوّن"}
              </Button>
              {editingId ? (
                <Button variant="outline" type="button" onClick={resetForm} disabled={isBusy}>
                  إلغاء
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </CrudFormSheet>
    
    </PageShell>
  );
}
