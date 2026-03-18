"use client";

import * as React from "react";
import {
  BadgeCheck,
  Filter,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type {
  CreateLookupCatalogItemPayload,
  LookupCatalogListItem,
} from "@/lib/api/client";
import type { LookupCatalogDefinition } from "@/features/lookup-catalog/config/lookup-catalog-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
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
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateLookupCatalogItemMutation,
  useDeleteLookupCatalogItemMutation,
  useUpdateLookupCatalogItemMutation,
} from "@/features/lookup-catalog/hooks/use-lookup-catalog-mutations";
import { useLookupCatalogQuery } from "@/features/lookup-catalog/hooks/use-lookup-catalog-query";

type LookupCatalogFormState = {
  name: string;
  code: string;
  nameAr: string;
  nameEn: string;
  sortOrder: string;
  nameArFemale: string;
  orderNum: string;
  isWorkingDay: boolean;
  governorateId: string;
  directorateId: string;
  subDistrictId: string;
  villageId: string;
  appliesTo: string;
  colorCode: string;
  requiresDetails: boolean;
  gender: string;
  localityType: string;
  category: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: LookupCatalogFormState = {
  name: "",
  code: "",
  nameAr: "",
  nameEn: "",
  sortOrder: "",
  nameArFemale: "",
  orderNum: "",
  isWorkingDay: true,
  governorateId: "",
  directorateId: "",
  subDistrictId: "",
  villageId: "",
  appliesTo: "ALL",
  colorCode: "",
  requiresDetails: false,
  gender: "ALL",
  localityType: "RURAL",
  category: "",
  isActive: true,
};

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function toFormState(item: LookupCatalogListItem): LookupCatalogFormState {
  return {
    name: item.name ?? "",
    code: item.code ?? "",
    nameAr: item.nameAr ?? "",
    nameEn: item.nameEn ?? "",
    sortOrder: item.sortOrder === undefined ? "" : String(item.sortOrder),
    nameArFemale: item.nameArFemale ?? "",
    orderNum: item.orderNum === undefined ? "" : String(item.orderNum),
    isWorkingDay: item.isWorkingDay ?? true,
    governorateId: item.governorateId === undefined ? "" : String(item.governorateId),
    directorateId: item.directorateId === undefined ? "" : String(item.directorateId),
    subDistrictId: item.subDistrictId === undefined ? "" : String(item.subDistrictId),
    villageId: item.villageId === undefined ? "" : String(item.villageId),
    appliesTo: item.appliesTo ?? "ALL",
    colorCode: item.colorCode ?? "",
    requiresDetails: item.requiresDetails ?? false,
    gender: item.gender ?? "ALL",
    localityType: item.localityType ?? "RURAL",
    category: item.category ?? "",
    isActive: item.isActive,
  };
}

function resolveDisplayValue(item: LookupCatalogListItem, key: string): string {
  const appliesMap: Record<string, string> = {
    ALL: "الكل",
    STUDENTS: "طلاب",
    EMPLOYEES: "موظفون",
  };
  const genderMap: Record<string, string> = {
    ALL: "الكل",
    MALE: "ذكر",
    FEMALE: "أنثى",
  };
  const localityTypeMap: Record<string, string> = {
    RURAL: "ريف",
    URBAN: "حضر",
  };

  const value = (item as Record<string, unknown>)[key];

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (key === "appliesTo" && typeof value === "string") {
    return appliesMap[value] ?? value;
  }

  if (key === "gender" && typeof value === "string") {
    return genderMap[value] ?? value;
  }

  if (key === "localityType" && typeof value === "string") {
    return localityTypeMap[value] ?? value;
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  return String(value);
}

export function LookupCatalogWorkspace({ definition }: { definition: LookupCatalogDefinition }) {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission(definition.createPermission);
  const canUpdate = hasPermission(definition.updatePermission);
  const canDelete = hasPermission(definition.deletePermission);

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);
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
  const [editingItemId, setEditingItemId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<LookupCatalogFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const listQuery = useLookupCatalogQuery(definition.type, {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive:
      activeFilter === "all" || activeFilter === "deleted"
        ? undefined
        : activeFilter === "active",
    deletedOnly: activeFilter === "deleted" ? true : undefined,
  });

  const createMutation = useCreateLookupCatalogItemMutation(definition.type);
  const updateMutation = useUpdateLookupCatalogItemMutation(definition.type);
  const deleteMutation = useDeleteLookupCatalogItemMutation(definition.type);

  const items = React.useMemo(() => listQuery.data?.data ?? [], [listQuery.data?.data]);
  const pagination = listQuery.data?.pagination;
  const isEditing = editingItemId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = items.some((item) => item.id === editingItemId);
    if (!stillExists) {
      setEditingItemId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingItemId, isEditing, items]);

  React.useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

    setDebounceTimer(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(activeFilter);
  }, [activeFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingItemId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingItemId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    for (const field of definition.fields) {
      const value = (formState as Record<string, unknown>)[field.key];

      if (!field.required) {
        continue;
      }

      if (field.type === "checkbox") {
        if (typeof value !== "boolean") {
          setFormError(`حقل ${field.label} مطلوب.`);
          return false;
        }
        continue;
      }

      if (typeof value !== "string" || !value.trim()) {
        setFormError(`حقل ${field.label} مطلوب.`);
        return false;
      }
    }

    const code = normalizeCode(formState.code);
    const codeField = definition.fields.find((field) => field.key === "code");
    if (codeField && code.length > 0) {
      if (!/^[A-Z0-9_]+$/.test(code) || code.length > 50) {
        setFormError("الكود يجب أن يحتوي أحرف كبيرة/أرقام/underscore فقط وبحد أقصى 50.");
        return false;
      }
    }

    if (formState.colorCode && !/^#[0-9A-Fa-f]{6}$/.test(formState.colorCode.trim())) {
      setFormError("لون العرض يجب أن يكون بصيغة HEX مثل #28A745.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const buildPayload = (): CreateLookupCatalogItemPayload => {
    const payload: CreateLookupCatalogItemPayload = {
      isActive: formState.isActive,
    };

    for (const field of definition.fields) {
      const value = (formState as Record<string, unknown>)[field.key];

      if (field.type === "checkbox") {
        payload[field.key] = Boolean(value) as never;
        continue;
      }

      if (field.type === "number") {
        if (typeof value === "string" && value.trim()) {
          payload[field.key] = Number(value) as never;
        }
        continue;
      }

      if (field.type === "select") {
        if (typeof value === "string" && value.trim()) {
          payload[field.key] = value.trim() as never;
        }
        continue;
      }

      if (typeof value === "string") {
        const normalized = field.key === "code" ? normalizeCode(value) : value.trim();
        if (normalized) {
          payload[field.key] = normalized as never;
        }
      }
    }

    return payload;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = buildPayload();

    if (isEditing && editingItemId !== null) {
      if (!canUpdate) {
        setFormError(`لا تملك الصلاحية المطلوبة: ${definition.updatePermission}.`);
        return;
      }

      updateMutation.mutate(
        {
          itemId: editingItemId,
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
      setFormError(`لا تملك الصلاحية المطلوبة: ${definition.createPermission}.`);
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: LookupCatalogListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingItemId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleDelete = (item: LookupCatalogListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف ${item.nameAr ?? item.name ?? item.code ?? `#${item.id}` }؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingItemId === item.id) {
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterTriggerButton
              count={activeFiltersCount}
              onClick={() => setIsFilterOpen((prev) => !prev)}
            />
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر البحث"
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
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{definition.title}</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>{definition.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {listQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {listQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {listQuery.error instanceof Error ? listQuery.error.message : "فشل تحميل البيانات"}
              </div>
            ) : null}

            {!listQuery.isPending && items.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة.
              </div>
            ) : null}

            {items.map((item) => (
              <div
                key={item.id}
                data-testid="lookup-catalog-card"
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {item.nameAr ?? item.name ?? item.code ?? `#${item.id}`}
                    </p>
                    {item.code ? (
                      <p className="text-xs text-muted-foreground">
                        <code>{item.code}</code>
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>

                <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                  {definition.fields
                    .filter(
                      (field) =>
                        field.key !== "code" && field.key !== "nameAr" && field.key !== "name",
                    )
                    .map((field) => (
                      <p key={`${item.id}-${field.key}`}>
                        {field.label}: {resolveDisplayValue(item, field.key)}
                      </p>
                    ))}
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
                  disabled={!pagination || pagination.page <= 1 || listQuery.isFetching}
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
                    !pagination || pagination.page >= pagination.totalPages || listQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void listQuery.refetch()}
                  disabled={listQuery.isFetching}
                >
                  <RefreshCw className={`h-4 w-4 ${listQuery.isFetching ? "animate-spin" : ""}`} />
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
        ariaLabel={`إنشاء ${definition.title}`}
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? `تعديل ${definition.title}` : `إنشاء ${definition.title}`}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>{definition.createPermission}</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="lookup-catalog-form">
            {definition.fields.map((field) => {
              if (field.type === "checkbox") {
                return (
                  <label
                    key={field.key}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{field.label}</span>
                    <input
                      data-testid={`lookup-catalog-form-${field.key}`}
                      type="checkbox"
                      checked={Boolean((formState as Record<string, unknown>)[field.key])}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          [field.key]: event.target.checked,
                        }))
                      }
                    />
                  </label>
                );
              }

              if (field.type === "select") {
                return (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {field.label}
                      {field.required ? " *" : ""}
                    </label>
                    <SelectField
                      data-testid={`lookup-catalog-form-${field.key}`}
                      value={String((formState as Record<string, unknown>)[field.key] ?? "")}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          [field.key]: event.target.value,
                        }))
                      }
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                );
              }

              const inputType =
                field.type === "number" ? "number" : field.type === "color" ? "color" : "text";

              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>
                  <Input
                    data-testid={`lookup-catalog-form-${field.key}`}
                    type={inputType}
                    value={String((formState as Record<string, unknown>)[field.key] ?? "")}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </div>
              );
            })}

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
                data-testid="lookup-catalog-form-is-active"
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
            </label>

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
                data-testid="lookup-catalog-form-submit"
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء"}
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
