"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Settings2,
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
  useCreateSystemSettingMutation,
  useDeleteSystemSettingMutation,
  useUpdateSystemSettingMutation,
} from "@/features/system-settings/hooks/use-system-settings-mutations";
import { useSystemSettingsQuery } from "@/features/system-settings/hooks/use-system-settings-query";
import type { SystemSettingListItem, SystemSettingType } from "@/lib/api/client";

type SystemSettingFormState = {
  settingKey: string;
  settingValue: string;
  settingType: SystemSettingType;
  category: string;
  description: string;
  isEditable: boolean;
};

const PAGE_SIZE = 12;
const SETTING_TYPE_OPTIONS: Array<{ value: SystemSettingType; label: string }> = [
  { value: "TEXT", label: "نصي" },
  { value: "NUMBER", label: "رقمي" },
  { value: "BOOLEAN", label: "منطقي" },
  { value: "IMAGE", label: "صورة" },
  { value: "JSON", label: "JSON" },
];

const DEFAULT_FORM_STATE: SystemSettingFormState = {
  settingKey: "",
  settingValue: "",
  settingType: "TEXT",
  category: "",
  description: "",
  isEditable: true,
};

function toFormState(item: SystemSettingListItem): SystemSettingFormState {
  return {
    settingKey: item.settingKey,
    settingValue: item.settingValue ?? "",
    settingType: item.settingType,
    category: item.category ?? "",
    description: item.description ?? "",
    isEditable: item.isEditable,
  };
}

function normalizeSettingKey(value: string): string {
  return value.trim().toLowerCase();
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function getSettingTypeLabel(settingType: SystemSettingType): string {
  return SETTING_TYPE_OPTIONS.find((option) => option.value === settingType)?.label ?? settingType;
}

export function SystemSettingsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("system-settings.create");
  const canUpdate = hasPermission("system-settings.update");
  const canDelete = hasPermission("system-settings.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [editableFilter, setEditableFilter] = React.useState<"all" | "editable" | "readonly">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<"all" | "editable" | "readonly">(
    "all",
  );

  const [editingSettingId, setEditingSettingId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<SystemSettingFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const systemSettingsQuery = useSystemSettingsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isEditable:
      editableFilter === "all" ? undefined : editableFilter === "editable" ? true : false,
  });

  const createMutation = useCreateSystemSettingMutation();
  const updateMutation = useUpdateSystemSettingMutation();
  const deleteMutation = useDeleteSystemSettingMutation();

  const systemSettings = React.useMemo(
    () => systemSettingsQuery.data?.data ?? [],
    [systemSettingsQuery.data?.data],
  );
  const pagination = systemSettingsQuery.data?.pagination;
  const isEditing = editingSettingId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = systemSettings.some((item) => item.id === editingSettingId);
    if (!stillExists) {
      setEditingSettingId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingSettingId, isEditing, systemSettings]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(editableFilter);
  }, [editableFilter, isFilterOpen]);

  const resetForm = () => {
    setEditingSettingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingSettingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: SystemSettingListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingSettingId(item.id);
    setFormState(toFormState(item));
    setFormError(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!isEditing) {
      const normalizedKey = normalizeSettingKey(formState.settingKey);
      if (!normalizedKey) {
        setFormError("مفتاح الإعداد إلزامي.");
        return false;
      }

      if (!/^[a-z0-9_.:-]+$/.test(normalizedKey)) {
        setFormError("صيغة مفتاح الإعداد غير صحيحة.");
        return false;
      }
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
      settingValue: formState.settingValue,
      settingType: formState.settingType,
      category: toOptionalString(formState.category),
      description: toOptionalString(formState.description),
      isEditable: formState.isEditable,
    };

    if (isEditing && editingSettingId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: system-settings.update.");
        return;
      }

      updateMutation.mutate(
        {
          settingId: editingSettingId,
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
      setFormError("لا تملك الصلاحية المطلوبة: system-settings.create.");
      return;
    }

    createMutation.mutate(
      {
        settingKey: normalizeSettingKey(formState.settingKey),
        ...payload,
      },
      {
        onSuccess: () => {
          resetForm();
          setPage(1);
        },
      },
    );
  };

  const handleDelete = (item: SystemSettingListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الإعداد ${item.settingKey}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingSettingId === item.id) {
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
    setEditableFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setEditableFilter(filterDraft);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [searchInput.trim() ? 1 : 0, editableFilter !== "all" ? 1 : 0].reduce(
      (a, b) => a + b,
      0,
    );
    return count;
  }, [editableFilter, searchInput]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ابحث بالمفتاح أو الفئة..."
              data-testid="setting-filter-search"
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
              value={filterDraft}
              onChange={(event) =>
                setFilterDraft(event.target.value as "all" | "editable" | "readonly")
              }
              data-testid="setting-filter-editable"
            >
              <option value="all">كل الحالات</option>
              <option value="editable">قابل للتعديل</option>
              <option value="readonly">للقراءة فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>إعدادات النظام</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>إعدادات داخلية للنظام ويمكن تحديد قابلية تعديلها.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemSettingsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل الإعدادات...
              </div>
            ) : null}

            {systemSettingsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {systemSettingsQuery.error instanceof Error
                  ? systemSettingsQuery.error.message
                  : "تعذر تحميل الإعدادات"}
              </div>
            ) : null}

            {!systemSettingsQuery.isPending && systemSettings.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد إعدادات مطابقة.
              </div>
            ) : null}

            {systemSettings.map((item) => (
              <div
                key={item.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                data-testid="setting-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      <code>{item.settingKey}</code>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{getSettingTypeLabel(item.settingType)}</Badge>
                      {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                      <Badge variant={item.isEditable ? "default" : "outline"}>
                        {item.isEditable ? "قابل للتعديل" : "للقراءة فقط"}
                      </Badge>
                    </div>
                    {item.description ? (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  القيمة: <code>{item.settingValue ?? "NULL"}</code>
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
                  disabled={!pagination || pagination.page <= 1 || systemSettingsQuery.isFetching}
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
                    systemSettingsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void systemSettingsQuery.refetch()}
                  disabled={systemSettingsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${systemSettingsQuery.isFetching ? "animate-spin" : ""}`}
                  />
                  تحديث
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Settings2 className="h-4 w-4" />}
        label="إنشاء"
        ariaLabel="إنشاء إعداد نظام"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل إعداد نظام" : "إنشاء إعداد نظام"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء إعداد"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            ليس لديك الصلاحية المطلوبة: <code>system-settings.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="setting-form">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">مفتاح الإعداد *</label>
              <Input
                value={formState.settingKey}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, settingKey: event.target.value }))
                }
                placeholder="default_date_format"
                required
                disabled={isEditing}
                data-testid="setting-form-key"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">نوع القيمة</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.settingType}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    settingType: event.target.value as SystemSettingType,
                  }))
                }
                data-testid="setting-form-type"
              >
                {SETTING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">القيمة</label>
              <Input
                value={formState.settingValue}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, settingValue: event.target.value }))
                }
                placeholder="hijri"
                data-testid="setting-form-value"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الفئة</label>
              <Input
                value={formState.category}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="general"
                data-testid="setting-form-category"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الوصف</label>
              <Input
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="وصف مختصر للإعدادات"
                data-testid="setting-form-description"
              />
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>قابل للتعديل</span>
              <input
                type="checkbox"
                checked={formState.isEditable}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isEditable: event.target.checked }))
                }
                data-testid="setting-form-editable"
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
                data-testid="setting-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings2 className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء إعداد"}
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
