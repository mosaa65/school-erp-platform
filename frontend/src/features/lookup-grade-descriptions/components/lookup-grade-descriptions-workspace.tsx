"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Activity,
  BadgeCheck,
  LoaderCircle,
  ListOrdered,
  Palette,
  PencilLine,
  Percent,
  Plus,
  RefreshCw,
  Type,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateLookupGradeDescriptionMutation,
  useDeleteLookupGradeDescriptionMutation,
  useUpdateLookupGradeDescriptionMutation,
} from "@/features/lookup-grade-descriptions/hooks/use-lookup-grade-descriptions-mutations";
import { useLookupGradeDescriptionsQuery } from "@/features/lookup-grade-descriptions/hooks/use-lookup-grade-descriptions-query";
import type { LookupGradeDescriptionListItem } from "@/lib/api/client";

type LookupGradeDescriptionFormState = {
  minPercentage: string;
  maxPercentage: string;
  nameAr: string;
  nameEn: string;
  colorCode: string;
  sortOrder: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: LookupGradeDescriptionFormState = {
  minPercentage: "",
  maxPercentage: "",
  nameAr: "",
  nameEn: "",
  colorCode: "",
  sortOrder: "1",
  isActive: true,
};

function parseNumber(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  return Number.parseFloat(value);
}

function toNumberInputValue(value: string | number): string {
  const parsed = parseNumber(value);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return String(parsed);
}

function toFormState(item: LookupGradeDescriptionListItem): LookupGradeDescriptionFormState {
  return {
    minPercentage: toNumberInputValue(item.minPercentage),
    maxPercentage: toNumberInputValue(item.maxPercentage),
    nameAr: item.nameAr,
    nameEn: item.nameEn ?? "",
    colorCode: item.colorCode ?? "",
    sortOrder: String(item.sortOrder),
    isActive: item.isActive,
  };
}

function numberLabel(value: string | number): string {
  const parsed = parseNumber(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }

  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2);
}

export function LookupGradeDescriptionsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("lookup-grade-descriptions.create");
  const canUpdate = hasPermission("lookup-grade-descriptions.update");
  const canDelete = hasPermission("lookup-grade-descriptions.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "active" | "inactive" | "deleted"
  >(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<
    "all" | "active" | "inactive" | "deleted"
  >(
    "all",
  );
  const [editingLookupGradeDescriptionId, setEditingLookupGradeDescriptionId] = React.useState<
    number | null
  >(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<LookupGradeDescriptionFormState>(
    DEFAULT_FORM_STATE,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const lookupGradeDescriptionsQuery = useLookupGradeDescriptionsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive:
      activeFilter === "all" || activeFilter === "deleted"
        ? undefined
        : activeFilter === "active",
    deletedOnly: activeFilter === "deleted" ? true : undefined,
  });

  const createMutation = useCreateLookupGradeDescriptionMutation();
  const updateMutation = useUpdateLookupGradeDescriptionMutation();
  const deleteMutation = useDeleteLookupGradeDescriptionMutation();

  const lookupGradeDescriptions = React.useMemo(
    () => lookupGradeDescriptionsQuery.data?.data ?? [],
    [lookupGradeDescriptionsQuery.data?.data],
  );
  const pagination = lookupGradeDescriptionsQuery.data?.pagination;
  const isEditing = editingLookupGradeDescriptionId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = lookupGradeDescriptions.some(
      (item) => item.id === editingLookupGradeDescriptionId,
    );
    if (!stillExists) {
      setEditingLookupGradeDescriptionId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingLookupGradeDescriptionId, isEditing, lookupGradeDescriptions]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(activeFilter);
  }, [activeFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingLookupGradeDescriptionId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;

    setFormError(null);
    setEditingLookupGradeDescriptionId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const minPercentage = Number.parseFloat(formState.minPercentage);
    const maxPercentage = Number.parseFloat(formState.maxPercentage);
    const nameAr = formState.nameAr.trim();
    const nameEn = formState.nameEn.trim();
    const colorCode = formState.colorCode.trim();
    const sortOrder = Number.parseInt(formState.sortOrder, 10);

    if (!Number.isFinite(minPercentage) || !Number.isFinite(maxPercentage)) {
      setFormError("حدّا النسبة (من/إلى) مطلوبان بصيغة رقمية صحيحة.");
      return false;
    }

    if (
      minPercentage < 0 ||
      minPercentage > 100 ||
      maxPercentage < 0 ||
      maxPercentage > 100
    ) {
      setFormError("حدّا النسبة يجب أن يكونا بين 0 و100.");
      return false;
    }

    if (maxPercentage < minPercentage) {
      setFormError("الحد الأعلى يجب أن يكون أكبر من أو يساوي الحد الأدنى.");
      return false;
    }

    if (!nameAr) {
      setFormError("الاسم العربي مطلوب.");
      return false;
    }

    if (nameAr.length > 100 || nameEn.length > 100) {
      setFormError("الاسم العربي/الإنجليزي يجب ألا يتجاوز 100 حرف.");
      return false;
    }

    if (colorCode && !/^#([A-Fa-f0-9]{6})$/.test(colorCode)) {
      setFormError("لون العرض يجب أن يكون بصيغة Hex مثل #2ecc71.");
      return false;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 999) {
      setFormError("ترتيب العرض يجب أن يكون رقمًا صحيحًا بين 1 و999.");
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
      minPercentage: Number.parseFloat(formState.minPercentage),
      maxPercentage: Number.parseFloat(formState.maxPercentage),
      nameAr: formState.nameAr.trim(),
      nameEn: formState.nameEn.trim() || undefined,
      colorCode: formState.colorCode.trim() || undefined,
      sortOrder: Number.parseInt(formState.sortOrder, 10),
      isActive: formState.isActive,
    };

    if (isEditing && editingLookupGradeDescriptionId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: lookup-grade-descriptions.update.");
        return;
      }

      updateMutation.mutate(
        {
          lookupGradeDescriptionId: editingLookupGradeDescriptionId,
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
      setFormError("لا تملك الصلاحية المطلوبة: lookup-grade-descriptions.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: LookupGradeDescriptionListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingLookupGradeDescriptionId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleDelete = (item: LookupGradeDescriptionListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف وصف التقدير ${item.nameAr}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingLookupGradeDescriptionId === item.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [searchInput.trim() ? 1 : 0, activeFilter !== "all" ? 1 : 0].reduce(
      (a, b) => a + b,
      0,
    );
    return count;
  }, [activeFilter, searchInput]);

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالاسم..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر البحث"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="الحالة">
              <SelectField
                icon={<Activity />}
                value={filterDraft}
                onChange={(event) =>
                  setFilterDraft(
                    event.target.value as "all" | "active" | "inactive" | "deleted",
                  )
                }
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">غير نشط فقط</option>
                <option value="deleted">محذوف فقط</option>
              </SelectField>
            </FormField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>أوصاف التقديرات</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة نطاقات النِّسَب وأوصاف التقدير المرتبطة بها.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {lookupGradeDescriptionsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل أوصاف التقديرات...
              </div>
            ) : null}

            {lookupGradeDescriptionsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {lookupGradeDescriptionsQuery.error instanceof Error
                  ? lookupGradeDescriptionsQuery.error.message
                  : "فشل تحميل أوصاف التقديرات"}
              </div>
            ) : null}

            {!lookupGradeDescriptionsQuery.isPending && lookupGradeDescriptions.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {lookupGradeDescriptions.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                data-testid="grade-description-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{item.nameAr}</p>
                    <p className="text-xs text-muted-foreground">
                      النطاق: {numberLabel(item.minPercentage)}% - {numberLabel(item.maxPercentage)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.nameEn ?? "-"} | ترتيب: {item.sortOrder}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.colorCode ? (
                      <span
                        className="inline-block h-4 w-4 rounded-full border"
                        style={{ backgroundColor: item.colorCode }}
                      />
                    ) : null}
                    <Badge variant={item.isActive ? "default" : "outline"}>
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
                  disabled={
                    !pagination || pagination.page <= 1 || lookupGradeDescriptionsQuery.isFetching
                  }
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
                    lookupGradeDescriptionsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void lookupGradeDescriptionsQuery.refetch()}
                  disabled={lookupGradeDescriptionsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${lookupGradeDescriptionsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء وصف تقدير"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل وصف تقدير" : "إنشاء وصف تقدير"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء وصف تقدير"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>lookup-grade-descriptions.create</code>.
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={handleSubmitForm}
            data-testid="grade-description-form"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="الحد الأدنى %" required>
                <Input
                  type="number"
                  icon={<Percent />}
                  step="0.01"
                  min={0}
                  max={100}
                  value={formState.minPercentage}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, minPercentage: event.target.value }))
                  }
                  required
                  data-testid="grade-description-form-min"
                />
              </FormField>
              <FormField label="الحد الأعلى %" required>
                <Input
                  type="number"
                  icon={<Percent />}
                  step="0.01"
                  min={0}
                  max={100}
                  value={formState.maxPercentage}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, maxPercentage: event.target.value }))
                  }
                  required
                  data-testid="grade-description-form-max"
                />
              </FormField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="الاسم بالعربية" required>
                <Input
                  icon={<Type />}
                  value={formState.nameAr}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, nameAr: event.target.value }))
                  }
                  placeholder="ممتاز"
                  required
                  data-testid="grade-description-form-name-ar"
                />
              </FormField>
              <FormField label="الاسم بالإنجليزية">
                <Input
                  icon={<Type />}
                  value={formState.nameEn}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, nameEn: event.target.value }))
                  }
                  placeholder="Excellent"
                  data-testid="grade-description-form-name-en"
                />
              </FormField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="لون العرض">
                <Input
                  type="text"
                  icon={<Palette />}
                  value={formState.colorCode}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, colorCode: event.target.value }))
                  }
                  placeholder="#2ecc71"
                  data-testid="grade-description-form-color"
                />
              </FormField>
              <FormField label="ترتيب العرض" required>
                <Input
                  type="number"
                  icon={<ListOrdered />}
                  min={1}
                  max={999}
                  value={formState.sortOrder}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, sortOrder: event.target.value }))
                  }
                  required
                  data-testid="grade-description-form-sort"
                />
              </FormField>
            </div>

            <FormBooleanField
              label="نشط"
              checked={formState.isActive}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, isActive: checked }))
              }
            />

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

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
                data-testid="grade-description-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء وصف تقدير"}
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
