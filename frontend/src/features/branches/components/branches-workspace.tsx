"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Building2,
  LoaderCircle,
  MapPin,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Star,
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
  useCreateBranchMutation,
  useDeleteBranchMutation,
  useUpdateBranchMutation,
} from "@/features/branches/hooks/use-branches-mutations";
import { useBranchesQuery } from "@/features/branches/hooks/use-branches-query";
import type {
  CreateFinanceBranchPayload,
  FinanceBranchListItem,
} from "@/lib/api/client";

type FormState = CreateFinanceBranchPayload;

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  nameAr: "",
  nameEn: "",
  address: "",
  phone: "",
  isHeadquarters: false,
  isActive: true,
};

function toFormState(item: FinanceBranchListItem): FormState {
  return {
    nameAr: item.nameAr,
    nameEn: item.nameEn ?? "",
    address: item.address ?? "",
    phone: item.phone ?? "",
    isHeadquarters: item.isHeadquarters,
    isActive: item.isActive,
  };
}

export function BranchesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("branches.create");
  const canUpdate = hasPermission("branches.update");
  const canDelete = hasPermission("branches.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [hqFilter, setHqFilter] = React.useState<"all" | "hq" | "branch">("all");
  const [filterDraft, setFilterDraft] = React.useState({
    active: "all" as "all" | "active" | "inactive",
    headquarters: "all" as "all" | "hq" | "branch",
  });

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const branchesQuery = useBranchesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    isHeadquarters: hqFilter === "all" ? undefined : hqFilter === "hq",
  });

  const createMutation = useCreateBranchMutation();
  const updateMutation = useUpdateBranchMutation();
  const deleteMutation = useDeleteBranchMutation();

  const records = React.useMemo(() => branchesQuery.data?.data ?? [], [branchesQuery.data?.data]);
  const pagination = branchesQuery.data?.pagination;
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
      headquarters: hqFilter,
    });
  }, [activeFilter, hqFilter, isFilterOpen]);

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

  const handleStartEdit = (item: FinanceBranchListItem) => {
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
    const address = form.address?.trim() ?? "";
    const phone = form.phone?.trim() ?? "";

    if (!nameAr) {
      setFormError("الرجاء تعبئة الحقول المطلوبة: الاسم العربي.");
      return false;
    }

    if (nameAr.length > 120) {
      setFormError("يجب ألا يتجاوز الاسم العربي 120 حرفًا.");
      return false;
    }

    if (nameEn.length > 120) {
      setFormError("يجب ألا يتجاوز الاسم الإنجليزي 120 حرفًا.");
      return false;
    }

    if (address.length > 180) {
      setFormError("يجب ألا يتجاوز العنوان 180 حرفًا.");
      return false;
    }

    if (phone.length > 20) {
      setFormError("رقم الهاتف يجب ألا يتجاوز 20 رقمًا.");
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

    const payload: CreateFinanceBranchPayload = {
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn?.trim() || undefined,
      address: form.address?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      isHeadquarters: form.isHeadquarters,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية التحديث: branches.update.");
        return;
      }

      updateMutation.mutate(
        { branchId: editingId, payload },
        {
          onSuccess: () => {
            resetFormState();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك صلاحية الإضافة: branches.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetFormState();
        setPage(1);
      },
    });
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setHqFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft.active);
    setHqFilter(filterDraft.headquarters);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
      hqFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, hqFilter, searchInput]);

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
          title="فلاتر الفروع"
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
              value={filterDraft.headquarters}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  headquarters: event.target.value as "all" | "hq" | "branch",
                }))
              }
            >
              <option value="all">كل الفروع</option>
              <option value="hq">المقر الرئيسي فقط</option>
              <option value="branch">الفروع فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة الفروع</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة فروع المؤسسة مع حالة التفعيل وتحديد الفرع الرئيسي.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {branchesQuery.isPending ? (
              <FinanceEmptyState>جارٍ تحميل البيانات...</FinanceEmptyState>
            ) : null}

            {branchesQuery.error ? (
              <FinanceAlert tone="error">
                {branchesQuery.error instanceof Error
                  ? branchesQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </FinanceAlert>
            ) : null}

            {!branchesQuery.isPending && records.length === 0 ? (
              <FinanceEmptyState>لا توجد فروع مطابقة.</FinanceEmptyState>
            ) : null}

            {records.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{item.nameAr}</p>
                    {item.nameEn ? (
                      <p className="text-xs text-muted-foreground">{item.nameEn}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.address ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.address}
                        </span>
                      ) : null}
                      {item.phone ? <span>هاتف: {item.phone}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.isHeadquarters ? (
                      <Badge variant="secondary" className="gap-1.5">
                        <Star className="h-3.5 w-3.5" />
                        مقر رئيسي
                      </Badge>
                    ) : null}
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
                    onClick={() => {
                      if (!canDelete) {
                        return;
                      }
                      if (!confirmFinanceAction(`تأكيد حذف الفرع ${item.nameAr}?`)) {
                        return;
                      }
                      deleteMutation.mutate(item.id, {
                        onSuccess: () => {
                          if (editingId === item.id) {
                            resetForm();
                          }
                        },
                      });
                    }}
                    disabled={!canDelete || deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || branchesQuery.isFetching}
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
                    branchesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void branchesQuery.refetch()}
                  disabled={branchesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${branchesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إضافة فرع"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل فرع" : "إضافة فرع"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التغييرات" : "إضافة فرع"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك صلاحية الإضافة: <code>branches.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  الاسم العربي *
                </label>
                <Input
                  value={form.nameAr}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nameAr: event.target.value }))
                  }
                  placeholder="الفرع الرئيسي"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  الاسم الإنجليزي
                </label>
                <Input
                  value={form.nameEn ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nameEn: event.target.value }))
                  }
                  placeholder="Main Branch"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">العنوان</label>
                <Input
                  value={form.address ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                  placeholder="عنوان الفرع"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الهاتف</label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="0111111111"
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  مقر رئيسي
                </span>
                <input
                  type="checkbox"
                  checked={form.isHeadquarters ?? false}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isHeadquarters: event.target.checked }))
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
                  checked={form.isActive}
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
                  <Building2 className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التغييرات" : "إضافة فرع"}
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
