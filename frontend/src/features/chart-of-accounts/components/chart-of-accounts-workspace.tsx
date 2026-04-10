"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  BookOpenCheck,
  LoaderCircle,
  Network,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
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
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  FinanceAlert,
  FinanceEmptyState,
  confirmFinanceAction,
} from "@/features/finance/shared/finance-ui";
import {
  useCreateChartOfAccountMutation,
  useDeleteChartOfAccountMutation,
  useUpdateChartOfAccountMutation,
} from "@/features/chart-of-accounts/hooks/use-chart-of-accounts-mutations";
import { useChartOfAccountsQuery } from "@/features/chart-of-accounts/hooks/use-chart-of-accounts-query";
import type { ChartOfAccountListItem, CreateChartOfAccountPayload } from "@/lib/api/client";

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

const PAGE_SIZE = 12;

type FormState = CreateChartOfAccountPayload;

const DEFAULT_FORM: FormState = {
  nameAr: "",
  nameEn: "",
  accountType: "ASSET",
  parentId: undefined,
  isHeader: false,
  isBankAccount: false,
  isActive: true,
};

function toFormState(item: ChartOfAccountListItem): FormState {
  return {
    nameAr: item.nameAr,
    nameEn: item.nameEn ?? "",
    accountType: item.accountType as AccountType,
    parentId: item.parentId ?? undefined,
    isHeader: item.isHeader,
    isBankAccount: item.isBankAccount,
    isActive: item.isActive,
  };
}

function typeLabel(type: AccountType): string {
  switch (type) {
    case "ASSET":
      return "أصول";
    case "LIABILITY":
      return "التزامات";
    case "EQUITY":
      return "حقوق ملكية";
    case "REVENUE":
      return "إيرادات";
    case "EXPENSE":
      return "مصروفات";
    default:
      return type;
  }
}

export function ChartOfAccountsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("chart-of-accounts.create");
  const canUpdate = hasPermission("chart-of-accounts.update");
  const canDelete = hasPermission("chart-of-accounts.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [typeFilter, setTypeFilter] = React.useState<AccountType | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    active: "all" as "all" | "active" | "inactive",
    type: "all" as AccountType | "all",
  });

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const chartOfAccountsQuery = useChartOfAccountsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    accountType: typeFilter === "all" ? undefined : typeFilter,
  });

  const allAccountsQuery = useChartOfAccountsQuery({ page: 1, limit: 200 });
  const allAccounts = allAccountsQuery.data?.data ?? [];

  const createMutation = useCreateChartOfAccountMutation();
  const updateMutation = useUpdateChartOfAccountMutation();
  const deleteMutation = useDeleteChartOfAccountMutation();

  const records = React.useMemo(
    () => chartOfAccountsQuery.data?.data ?? [],
    [chartOfAccountsQuery.data?.data],
  );
  const pagination = chartOfAccountsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  const accountLookup = React.useMemo(() => {
    return new Map(allAccounts.map((account) => [account.id, account]));
  }, [allAccounts]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = records.some((item) => item.id === editingId);
    if (!stillExists) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingId, isEditing, records]);

  useDebounceEffect(
    () => {
      setPage(1);
      setSearch(searchInput.trim());
    },
    400,
    [searchInput],
  );

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      active: activeFilter,
      type: typeFilter,
    });
  }, [activeFilter, isFilterOpen, typeFilter]);

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

  const handleStartEdit = (item: ChartOfAccountListItem) => {
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
    const nameEn = form.nameEn?.trim() ?? "";

    if (!nameAr) {
      setFormError("الرجاء تعبئة الحقل المطلوب: الاسم العربي.");
      return false;
    }

    if (nameAr.length > 150) {
      setFormError("يجب ألا يتجاوز الاسم العربي 150 حرفًا.");
      return false;
    }

    if (nameEn.length > 150) {
      setFormError("يجب ألا يتجاوز الاسم الإنجليزي 150 حرفًا.");
      return false;
    }

    if (form.parentId && form.parentId === editingId) {
      setFormError("لا يمكن اختيار الحساب نفسه كأب.");
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

    const payload: CreateChartOfAccountPayload = {
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn?.trim() || undefined,
      accountType: form.accountType,
      parentId: form.parentId || undefined,
      isHeader: form.isHeader,
      isBankAccount: form.isBankAccount,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية التحديث: chart-of-accounts.update.");
        return;
      }

      updateMutation.mutate(
        { accountId: editingId, payload },
        {
          onSuccess: () => {
            resetFormState();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية الإضافة: chart-of-accounts.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetFormState();
        setPage(1);
      },
    });
  };

  const handleDelete = (item: ChartOfAccountListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = confirmFinanceAction(`تأكيد حذف الحساب ${item.nameAr}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingId === item.id) {
          resetForm();
        }
      },
    });
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setTypeFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft.active);
    setTypeFilter(filterDraft.type);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
      typeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, searchInput, typeFilter]);

  return (
    <>
      <div className="space-y-4">
                  <ManagementToolbar
            searchValue={searchInput}
            onSearchChange={(event) => setSearchInput(event.target.value)}
            searchPlaceholder="بحث بالاسم..."
            filterCount={activeFiltersCount}
            onFilterClick={() => setIsFilterOpen((prev) => !prev)}
            showFilterButton={true}
          />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر دليل الحسابات"
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
              value={filterDraft.active}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  active: event.target.value as "all" | "active" | "inactive",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </SelectField>

            <SelectField
              value={filterDraft.type}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  type: event.target.value as AccountType | "all",
                }))
              }
            >
              <option value="all">كل الأنواع</option>
              <option value="ASSET">أصول</option>
              <option value="LIABILITY">التزامات</option>
              <option value="EQUITY">حقوق ملكية</option>
              <option value="REVENUE">إيرادات</option>
              <option value="EXPENSE">مصروفات</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>دليل الحسابات</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              تنظيم الحسابات المالية وتصنيفها وربطها بالحسابات الأب.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {chartOfAccountsQuery.isPending ? (
              <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
            ) : null}

            {chartOfAccountsQuery.error ? (
              <FinanceAlert tone="error">
                {chartOfAccountsQuery.error instanceof Error
                  ? chartOfAccountsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </FinanceAlert>
            ) : null}

            {!chartOfAccountsQuery.isPending && records.length === 0 ? (
              <FinanceEmptyState>لا توجد حسابات مطابقة.</FinanceEmptyState>
            ) : null}

            {records.map((item) => {
              const parent = item.parentId ? accountLookup.get(item.parentId) : null;
              const branchScopeLabel =
                item.branchId === null ? "كافة الفروع" : `فرع #${item.branchId}`;
              return (
                <div
                  key={item.id}
                  className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.nameAr}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        النوع: {typeLabel(item.accountType as AccountType)}
                        {parent ? ` · الأب: ${parent.nameAr}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        النطاق: {branchScopeLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={item.isHeader ? "secondary" : "outline"} className="gap-1.5">
                        <Network className="h-3.5 w-3.5" />
                        {item.isHeader ? "تحكمي" : "تفصيلي"}
                      </Badge>
                      <Badge variant={item.isActive ? "default" : "outline"} className="gap-1.5">
                        {item.isActive ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldX className="h-3.5 w-3.5" />
                        )}
                        {item.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate || updateMutation.isPending}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      تعديل
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleDelete(item)}
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
                  disabled={!pagination || pagination.page <= 1 || chartOfAccountsQuery.isFetching}
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
                    chartOfAccountsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void chartOfAccountsQuery.refetch()}
                  disabled={chartOfAccountsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${chartOfAccountsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إضافة حساب"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل حساب" : "إضافة حساب"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التغييرات" : "إضافة حساب"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك صلاحية الإضافة: <code>chart-of-accounts.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم العربي *</label>
                <Input
                  value={form.nameAr}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nameAr: event.target.value }))
                  }
                  placeholder="الصندوق"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم الإنجليزي</label>
                <Input
                  value={form.nameEn ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nameEn: event.target.value }))
                  }
                  placeholder="Cash"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">نوع الحساب *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.accountType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      accountType: event.target.value as AccountType,
                    }))
                  }
                >
                  <option value="ASSET">أصول</option>
                  <option value="LIABILITY">التزامات</option>
                  <option value="EQUITY">حقوق ملكية</option>
                  <option value="REVENUE">إيرادات</option>
                  <option value="EXPENSE">مصروفات</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحساب الأب</label>
              <SelectField
                value={form.parentId ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    parentId: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              >
                <option value="">بدون حساب أب</option>
                {allAccounts
                  .filter((account) => account.id !== editingId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.nameAr}
                    </option>
                  ))}
              </SelectField>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  حساب تحكمي
                </span>
                <input
                  type="checkbox"
                  checked={form.isHeader ?? false}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isHeader: event.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4" />
                  حساب بنكي
                </span>
                <input
                  type="checkbox"
                  checked={form.isBankAccount ?? false}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isBankAccount: event.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  نشط
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
              </label>
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
                  <BookOpenCheck className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التغييرات" : "إضافة حساب"}
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
