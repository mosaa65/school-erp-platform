"use client";

import * as React from "react";
import {
  Building,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Trash2,
} from "lucide-react";
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
  useCreateSchoolProfileMutation,
  useDeleteSchoolProfileMutation,
  useUpdateSchoolProfileMutation,
} from "@/features/school-profiles/hooks/use-school-profiles-mutations";
import { useSchoolProfilesQuery } from "@/features/school-profiles/hooks/use-school-profiles-query";
import { useOwnershipTypeOptionsQuery } from "@/features/school-profiles/hooks/use-ownership-type-options-query";
import type { SchoolProfileListItem } from "@/lib/api/client";

type SchoolProfileFormState = {
  code: string;
  nameAr: string;
  nameEn: string;
  ownershipTypeId: string;
  phone: string;
  email: string;
  addressText: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: SchoolProfileFormState = {
  code: "",
  nameAr: "",
  nameEn: "",
  ownershipTypeId: "",
  phone: "",
  email: "",
  addressText: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

function toFormState(item: SchoolProfileListItem): SchoolProfileFormState {
  return {
    code: item.code,
    nameAr: item.nameAr,
    nameEn: item.nameEn ?? "",
    ownershipTypeId: item.ownershipTypeId ? String(item.ownershipTypeId) : "",
    phone: item.phone ?? "",
    email: item.email ?? "",
    addressText: item.addressText ?? "",
    isActive: item.isActive,
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function SchoolProfilesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("school-profiles.create");
  const canUpdate = hasPermission("school-profiles.update");
  const canDelete = hasPermission("school-profiles.delete");
  const canReadOwnershipTypes = hasPermission("lookup-ownership-types.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "active" | "inactive" | "deleted"
  >(
    "all",
  );
  const [ownershipFilter, setOwnershipFilter] = React.useState<string>("all");
  const [activeFilterDraft, setActiveFilterDraft] = React.useState<
    "all" | "active" | "inactive" | "deleted"
  >("all");
  const [ownershipFilterDraft, setOwnershipFilterDraft] = React.useState<string>("all");
  const [editingSchoolProfileId, setEditingSchoolProfileId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<SchoolProfileFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const schoolProfilesQuery = useSchoolProfilesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    ownershipTypeId: ownershipFilter === "all" ? undefined : Number(ownershipFilter),
    isActive:
      activeFilter === "all" || activeFilter === "deleted"
        ? undefined
        : activeFilter === "active",
    deletedOnly: activeFilter === "deleted" ? true : undefined,
  });
  const ownershipTypeOptionsQuery = useOwnershipTypeOptionsQuery();

  const createMutation = useCreateSchoolProfileMutation();
  const updateMutation = useUpdateSchoolProfileMutation();
  const deleteMutation = useDeleteSchoolProfileMutation();

  const schoolProfiles = React.useMemo(
    () => schoolProfilesQuery.data?.data ?? [],
    [schoolProfilesQuery.data?.data],
  );
  const ownershipTypeOptions = ownershipTypeOptionsQuery.data ?? [];
  const pagination = schoolProfilesQuery.data?.pagination;
  const isEditing = editingSchoolProfileId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = schoolProfiles.some((item) => item.id === editingSchoolProfileId);
    if (!stillExists) {
      setEditingSchoolProfileId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingSchoolProfileId, isEditing, schoolProfiles]);

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

    setActiveFilterDraft(activeFilter);
    setOwnershipFilterDraft(ownershipFilter);
  }, [activeFilter, isFilterOpen, ownershipFilter]);

  const resetForm = () => {
    setEditingSchoolProfileId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingSchoolProfileId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const code = normalizeCode(formState.code);
    const nameAr = formState.nameAr.trim();
    const nameEn = formState.nameEn.trim();
    const phone = formState.phone.trim();
    const email = formState.email.trim();
    const addressText = formState.addressText.trim();

    if (!code || !nameAr) {
      setFormError("الحقول المطلوبة: الكود والاسم العربي.");
      return false;
    }

    if (!/^[a-z0-9_-]+$/.test(code) || code.length > 40) {
      setFormError("الكود يجب أن يحتوي أحرفًا صغيرة/أرقامًا/-/_ فقط وبحد أقصى 40.");
      return false;
    }

    if (nameAr.length > 150 || nameEn.length > 150) {
      setFormError("الاسم العربي/الإنجليزي يجب ألا يتجاوز 150 حرفًا.");
      return false;
    }

    if (phone.length > 20) {
      setFormError("رقم الهاتف يجب ألا يتجاوز 20 حرفًا.");
      return false;
    }

    if (email && (!isValidEmail(email) || email.length > 191)) {
      setFormError("صيغة البريد الإلكتروني غير صحيحة أو أطول من 191 حرفًا.");
      return false;
    }

    if (addressText.length > 255) {
      setFormError("العنوان يجب ألا يتجاوز 255 حرفًا.");
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
      code: normalizeCode(formState.code),
      nameAr: formState.nameAr.trim(),
      nameEn: toOptionalString(formState.nameEn),
      ownershipTypeId: formState.ownershipTypeId ? Number(formState.ownershipTypeId) : undefined,
      phone: toOptionalString(formState.phone),
      email: toOptionalString(formState.email)?.toLowerCase(),
      addressText: toOptionalString(formState.addressText),
      isActive: formState.isActive,
    };

    if (isEditing && editingSchoolProfileId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: school-profiles.update.");
        return;
      }

      updateMutation.mutate(
        {
          schoolProfileId: editingSchoolProfileId,
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
      setFormError("لا تملك الصلاحية المطلوبة: school-profiles.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: SchoolProfileListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingSchoolProfileId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleDelete = (item: SchoolProfileListItem) => {
    if (!canDelete) {
      return;
    }

    if (item.code === "default_school") {
      setFormError("لا يمكن حذف ملف المدرسة الافتراضي.");
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف ملف المدرسة ${item.nameAr}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingSchoolProfileId === item.id) {
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
    setOwnershipFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(activeFilterDraft);
    setOwnershipFilter(ownershipFilterDraft);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
      ownershipFilter !== "all" ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return count;
  }, [activeFilter, ownershipFilter, searchInput]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ابحث بالاسم/الكود..."
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
          title="خيارات الفلترة"
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
              value={ownershipFilterDraft}
              onChange={(event) => setOwnershipFilterDraft(event.target.value)}
            >
              <option value="all">كل الملكيات</option>
              {ownershipTypeOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.nameAr}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={activeFilterDraft}
              onChange={(event) =>
                setActiveFilterDraft(
                  event.target.value as "all" | "active" | "inactive" | "deleted",
                )
              }
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="deleted">محذوف فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة ملفات المدارس</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إدارة البيانات الأساسية للمدارس.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {schoolProfilesQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل المدارس...
              </div>
            ) : null}

            {schoolProfilesQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {schoolProfilesQuery.error instanceof Error
                  ? schoolProfilesQuery.error.message
                  : "تعذر تحميل المدارس"}
              </div>
            ) : null}

            {!schoolProfilesQuery.isPending && schoolProfiles.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد مدارس مطابقة.
              </div>
            ) : null}

            {schoolProfiles.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                data-testid="school-profile-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{item.nameAr}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.code}
                      {item.nameEn ? ` • ${item.nameEn}` : ""}
                    </p>
                    {item.addressText ? (
                      <p className="text-xs text-muted-foreground">{item.addressText}</p>
                    ) : null}
                    {item.ownershipType ? (
                      <Badge variant="outline">{item.ownershipType.nameAr}</Badge>
                    ) : null}
                  </div>
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
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
                  disabled={!pagination || pagination.page <= 1 || schoolProfilesQuery.isFetching}
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
                    schoolProfilesQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void schoolProfilesQuery.refetch()}
                  disabled={schoolProfilesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${schoolProfilesQuery.isFetching ? "animate-spin" : ""}`}
                  />
                  تحديث
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Building className="h-4 w-4" />}
        label="إنشاء"
        ariaLabel="إنشاء ملف مدرسة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل ملف مدرسة" : "إنشاء ملف مدرسة"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء ملف"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            ليس لديك الصلاحية المطلوبة: <code>school-profiles.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الاسم العربي *</label>
              <Input
                value={formState.nameAr}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, nameAr: event.target.value }))
                }
                placeholder="اسم المدرسة بالعربية"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الاسم الإنجليزي</label>
              <Input
                value={formState.nameEn}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, nameEn: event.target.value }))
                }
                placeholder="اسم المدرسة بالإنجليزية"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الكود *</label>
                <Input
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="SCH-001"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">نوع الملكية</label>
                <SelectField
                  value={formState.ownershipTypeId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, ownershipTypeId: event.target.value }))
                  }
                  disabled={!canReadOwnershipTypes}
                >
                  <option value="">اختر نوع الملكية</option>
                  {ownershipTypeOptions.map((option) => (
                    <option key={option.id} value={String(option.id)}>
                      {option.nameAr}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الهاتف</label>
                <Input
                  value={formState.phone}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="رقم الهاتف"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">البريد الإلكتروني</label>
                <Input
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="school@example.com"
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">العنوان</label>
              <Input
                value={formState.addressText}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, addressText: event.target.value }))
                }
                placeholder="عنوان المدرسة"
              />
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
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
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Building className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء ملف"}
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
