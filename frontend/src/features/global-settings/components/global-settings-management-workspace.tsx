"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Settings2,
  Trash2,
  Type,
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
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateGlobalSettingMutation,
  useDeleteGlobalSettingMutation,
  useUpdateGlobalSettingMutation,
} from "@/features/global-settings/hooks/use-global-settings-mutations";
import { useGlobalSettingsQuery } from "@/features/global-settings/hooks/use-global-settings-query";
import type { GlobalSettingListItem, SettingValueType } from "@/lib/api/client";

type GlobalSettingFormState = {
  key: string;
  valueType: SettingValueType;
  valueInput: string;
  description: string;
  isPublic: boolean;
};

const PAGE_SIZE = 12;
const VALUE_TYPE_OPTIONS: Array<{ value: SettingValueType; label: string }> = [
  { value: "STRING", label: "نصي" },
  { value: "NUMBER", label: "رقمي" },
  { value: "BOOLEAN", label: "منطقي" },
  { value: "JSON", label: "JSON" },
];

const DEFAULT_FORM_STATE: GlobalSettingFormState = {
  key: "",
  valueType: "STRING",
  valueInput: "",
  description: "",
  isPublic: false,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function formatSettingValueForInput(valueType: SettingValueType, value: unknown): string {
  if (valueType === "STRING") {
    return typeof value === "string" ? value : String(value ?? "");
  }

  if (valueType === "NUMBER") {
    return typeof value === "number" ? String(value) : String(value ?? "");
  }

  if (valueType === "BOOLEAN") {
    return typeof value === "boolean" ? (value ? "true" : "false") : "false";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function formatSettingValueForDisplay(
  valueType: SettingValueType,
  value: unknown,
): string {
  if (valueType === "JSON") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value ?? "");
    }
  }

  return formatSettingValueForInput(valueType, value);
}

function parseValueByType(
  valueType: SettingValueType,
  valueInput: string,
): { valid: true; value: unknown } | { valid: false; error: string } {
  const raw = valueInput.trim();

  if (valueType === "STRING") {
    return { valid: true, value: valueInput };
  }

  if (valueType === "NUMBER") {
    if (!raw) {
      return { valid: false, error: "القيمة الرقمية لا يمكن أن تكون فارغة." };
    }

    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      return { valid: false, error: "القيمة الرقمية غير صالحة." };
    }

    return { valid: true, value: parsed };
  }

  if (valueType === "BOOLEAN") {
    const normalized = raw.toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return { valid: true, value: true };
    }
    if (normalized === "false" || normalized === "0") {
      return { valid: true, value: false };
    }

    return { valid: false, error: "القيمة المنطقية يجب أن تكون true أو false." };
  }

  if (!raw) {
    return { valid: false, error: "قيمة JSON لا يمكن أن تكون فارغة." };
  }

  try {
    return { valid: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { valid: false, error: "صيغة JSON غير صالحة." };
  }
}

function toFormState(setting: GlobalSettingListItem): GlobalSettingFormState {
  return {
    key: setting.key,
    valueType: setting.valueType,
    valueInput: formatSettingValueForInput(setting.valueType, setting.value),
    description: setting.description ?? "",
    isPublic: setting.isPublic,
  };
}

export function GlobalSettingsManagementWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("global-settings.create");
  const canUpdate = hasPermission("global-settings.update");
  const canDelete = hasPermission("global-settings.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [visibilityFilter, setVisibilityFilter] = React.useState<
    "all" | "public" | "private"
  >("all");
  const [filterDraft, setFilterDraft] = React.useState<"all" | "public" | "private">(
    "all",
  );

  const [editingSettingId, setEditingSettingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<GlobalSettingFormState>(
    DEFAULT_FORM_STATE,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const settingsQuery = useGlobalSettingsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isPublic:
      visibilityFilter === "all"
        ? undefined
        : visibilityFilter === "public"
          ? true
          : false,
  });

  const createMutation = useCreateGlobalSettingMutation();
  const updateMutation = useUpdateGlobalSettingMutation();
  const deleteMutation = useDeleteGlobalSettingMutation();

  const settings = React.useMemo(
    () => settingsQuery.data?.data ?? [],
    [settingsQuery.data?.data],
  );
  const pagination = settingsQuery.data?.pagination;
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

    const stillExists = settings.some((setting) => setting.id === editingSettingId);
    if (!stillExists) {
      setEditingSettingId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingSettingId, isEditing, settings]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(visibilityFilter);
  }, [isFilterOpen, visibilityFilter]);

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

  const handleStartEdit = (setting: GlobalSettingListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingSettingId(setting.id);
    setFormState(toFormState(setting));
    setIsFormOpen(true);
  };

  const validateForm = (): { valid: true; parsedValue: unknown } | { valid: false } => {
    const key = normalizeKey(formState.key);

    if (!isEditing && !key) {
      setFormError("حقل المفتاح إلزامي.");
      return { valid: false };
    }

    if (!isEditing && !/^[a-z0-9_.:-]+$/.test(key)) {
      setFormError("صيغة المفتاح غير صحيحة.");
      return { valid: false };
    }

    const parsed = parseValueByType(formState.valueType, formState.valueInput);
    if (!parsed.valid) {
      setFormError(parsed.error);
      return { valid: false };
    }

    setFormError(null);
    return { valid: true, parsedValue: parsed.value };
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const validation = validateForm();
    if (!validation.valid) {
      return;
    }

    const payload = {
      valueType: formState.valueType,
      value: validation.parsedValue,
      description: toOptionalString(formState.description),
      isPublic: formState.isPublic,
    };

    if (isEditing && editingSettingId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: global-settings.update.");
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
      setFormError("لا تملك الصلاحية المطلوبة: global-settings.create.");
      return;
    }

    createMutation.mutate(
      {
        key: normalizeKey(formState.key),
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

  const handleDelete = (setting: GlobalSettingListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الإعداد ${setting.key}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(setting.id, {
      onSuccess: () => {
        if (editingSettingId === setting.id) {
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
    setVisibilityFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setVisibilityFilter(filterDraft);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [searchInput.trim() ? 1 : 0, visibilityFilter !== "all" ? 1 : 0].reduce(
      (a, b) => a + b,
      0,
    );
    return count;
  }, [searchInput, visibilityFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ابحث بالمفتاح أو الوصف..."
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
                setFilterDraft(event.target.value as "all" | "public" | "private")
              }
            >
              <option value="all">كل الحالات</option>
              <option value="public">عام</option>
              <option value="private">خاص</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة الإعدادات العامة</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إعدادات عامة للتطبيق ويمكن تحديد ظهورها كعام/خاص.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settingsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل الإعدادات...
              </div>
            ) : null}

            {settingsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {settingsQuery.error instanceof Error
                  ? settingsQuery.error.message
                  : "تعذر تحميل الإعدادات"}
              </div>
            ) : null}

            {!settingsQuery.isPending && settings.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد إعدادات مطابقة.
              </div>
            ) : null}

            {settings.map((setting) => (
              <div
                key={setting.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      <code>{setting.key}</code>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {setting.description ?? "بدون وصف"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{setting.valueType}</Badge>
                      <Badge variant={setting.isPublic ? "default" : "outline"}>
                        {setting.isPublic ? "عام" : "خاص"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {setting.isPublic ? (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  القيمة: <code>{formatSettingValueForDisplay(setting.valueType, setting.value)}</code>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(setting)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(setting)}
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
                  disabled={!pagination || pagination.page <= 1 || settingsQuery.isFetching}
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
                    settingsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void settingsQuery.refetch()}
                  disabled={settingsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${settingsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء إعداد عام"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل إعداد" : "إنشاء إعداد عام"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء إعداد"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            ليس لديك الصلاحية المطلوبة: <code>global-settings.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <FormField label="المفتاح" required>
              <Input
                icon={<KeyRound />}
                value={formState.key}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, key: event.target.value }))
                }
                placeholder="school_name"
                required
                disabled={isEditing}
              />
            </FormField>

            <FormField label="نوع القيمة">
              <SelectField
                icon={<Settings2 />}
                value={formState.valueType}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    valueType: event.target.value as SettingValueType,
                    valueInput: "",
                  }))
                }
              >
                {VALUE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField label="القيمة" required>
              {formState.valueType === "JSON" ? (
                <TextareaField
                  icon={<Settings2 />}
                  value={formState.valueInput}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, valueInput: event.target.value }))
                  }
                  placeholder='{ "primary": "#2563eb" }'
                  required
                />
              ) : formState.valueType === "BOOLEAN" ? (
                <SelectField
                  icon={<Eye />}
                  value={formState.valueInput.toLowerCase() === "true" ? "true" : "false"}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, valueInput: event.target.value }))
                  }
                  required
                >
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </SelectField>
              ) : (
                <Input
                  icon={<Type />}
                  value={formState.valueInput}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, valueInput: event.target.value }))
                  }
                  placeholder={formState.valueType === "NUMBER" ? "123" : "قيمة نصية"}
                  required
                />
              )}
            </FormField>

            <FormField label="الوصف">
              <Input
                icon={<Type />}
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="وصف مختصر للإعداد"
              />
            </FormField>

            <FormBooleanField
              label="عام"
              checked={formState.isPublic}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, isPublic: checked }))
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
