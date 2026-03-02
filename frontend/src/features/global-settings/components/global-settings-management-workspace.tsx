"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function getValueTypeLabel(valueType: SettingValueType): string {
  if (valueType === "STRING") {
    return "نصي";
  }
  if (valueType === "NUMBER") {
    return "رقمي";
  }
  if (valueType === "BOOLEAN") {
    return "منطقي";
  }

  return "JSON";
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

function valuePreview(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
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

  const [editingSettingId, setEditingSettingId] = React.useState<string | null>(null);
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
    }
  }, [editingSettingId, isEditing, settings]);

  const resetForm = () => {
    setEditingSettingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleVisibilityFilterChange = (value: "all" | "public" | "private") => {
    setPage(1);
    setVisibilityFilter(value);
  };

  const handleStartEdit = (setting: GlobalSettingListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingSettingId(setting.id);
    setFormState(toFormState(setting));
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

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
        setFormError("لا تملك صلاحية global-settings.update.");
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
      setFormError("لا تملك صلاحية global-settings.create.");
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

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل إعداد" : "إنشاء إعداد عام"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل قيمة الإعداد ونوعه ووصفه."
              : "إضافة مفتاح إعداد جديد على مستوى النظام."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>global-settings.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">المفتاح *</label>
                <Input
                  value={formState.key}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, key: event.target.value }))
                  }
                  placeholder="school.name"
                  required
                  disabled={isEditing}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">نوع القيمة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.valueType}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      valueType: event.target.value as SettingValueType,
                    }))
                  }
                >
                  <option value="STRING">نصي</option>
                  <option value="NUMBER">رقمي</option>
                  <option value="BOOLEAN">منطقي</option>
                  <option value="JSON">JSON</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">القيمة *</label>
                {formState.valueType === "JSON" ? (
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-input bg-background p-3 text-sm"
                    value={formState.valueInput}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, valueInput: event.target.value }))
                    }
                    placeholder='{"name":"نظام المدرسة"}'
                  />
                ) : formState.valueType === "BOOLEAN" ? (
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.valueInput.toLowerCase() === "true" ? "true" : "false"}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, valueInput: event.target.value }))
                    }
                  >
                    <option value="true">true (صحيح)</option>
                    <option value="false">false (خطأ)</option>
                  </select>
                ) : (
                  <Input
                    value={formState.valueInput}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, valueInput: event.target.value }))
                    }
                    placeholder={formState.valueType === "NUMBER" ? "123" : "اسم المدرسة"}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الوصف</label>
                <Input
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="يظهر في التقارير"
                />
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>إعداد عام</span>
                <input
                  type="checkbox"
                  checked={formState.isPublic}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isPublic: event.target.checked }))
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
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>قائمة الإعدادات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إعدادات عامة قابلة للبحث والفلترة حسب عام/خاص.
          </CardDescription>
          <form onSubmit={handleSearchSubmit} className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث في المفتاح أو الوصف..."
                className="pr-8"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={visibilityFilter}
              onChange={(event) =>
                handleVisibilityFilterChange(
                  event.target.value as "all" | "public" | "private",
                )
              }
            >
              <option value="all">الكل</option>
              <option value="public">عام</option>
              <option value="private">خاص</option>
            </select>
            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-3">
          {settingsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {settingsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {settingsQuery.error instanceof Error
                ? settingsQuery.error.message
                : "فشل التحميل"}
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
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{getValueTypeLabel(setting.valueType)}</Badge>
                    {setting.isPublic ? (
                      <Badge variant="secondary" className="gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        عام
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1.5">
                        <EyeOff className="h-3.5 w-3.5" />
                        خاص
                      </Badge>
                    )}
                  </div>
                  {setting.description ? (
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                القيمة: <code>{valuePreview(setting.value)}</code>
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
              الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
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
  );
}





