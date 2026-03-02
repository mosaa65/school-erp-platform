"use client";

import * as React from "react";
import {
  KeyRound,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  WandSparkles,
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
  useCreatePermissionMutation,
  useDeletePermissionMutation,
  useUpdatePermissionMutation,
} from "@/features/permissions/hooks/use-permissions-mutations";
import { usePermissionsQuery } from "@/features/permissions/hooks/use-permissions-query";
import type { PermissionListItem } from "@/lib/api/client";
import { translatePermissionCode } from "@/lib/i18n/ar";

type PermissionFormState = {
  code: string;
  resource: string;
  action: string;
  description: string;
  isSystem: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: PermissionFormState = {
  code: "",
  resource: "",
  action: "",
  description: "",
  isSystem: false,
};

function toFormState(permission: PermissionListItem): PermissionFormState {
  return {
    code: permission.code,
    resource: permission.resource,
    action: permission.action,
    description: permission.description ?? "",
    isSystem: permission.isSystem,
  };
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function isCodePatternValid(code: string): boolean {
  return /^[a-z0-9_.:-]+$/.test(code);
}

export function PermissionsManagementWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("permissions.create");
  const canUpdate = hasPermission("permissions.update");
  const canDelete = hasPermission("permissions.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");

  const [editingPermissionId, setEditingPermissionId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<PermissionFormState>(
    DEFAULT_FORM_STATE,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const permissionsQuery = usePermissionsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });

  const createPermissionMutation = useCreatePermissionMutation();
  const updatePermissionMutation = useUpdatePermissionMutation();
  const deletePermissionMutation = useDeletePermissionMutation();

  const permissions = React.useMemo(
    () => permissionsQuery.data?.data ?? [],
    [permissionsQuery.data?.data],
  );
  const pagination = permissionsQuery.data?.pagination;
  const isEditing = editingPermissionId !== null;

  const mutationError =
    (createPermissionMutation.error as Error | null)?.message ??
    (updatePermissionMutation.error as Error | null)?.message ??
    (deletePermissionMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = permissions.some(
      (permission) => permission.id === editingPermissionId,
    );

    if (!stillExists) {
      setEditingPermissionId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingPermissionId, isEditing, permissions]);

  const resetForm = () => {
    setEditingPermissionId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStartEdit = (permission: PermissionListItem) => {
    if (!canUpdate) {
      return;
    }

    if (permission.isSystem) {
      setFormError(
        "هذه صلاحية نظامية. التعديل عليها محجوب من الواجهة لحماية استقرار النظام.",
      );
      return;
    }

    setFormError(null);
    setEditingPermissionId(permission.id);
    setFormState(toFormState(permission));
  };

  const handleGenerateCode = () => {
    const resource = normalizeToken(formState.resource);
    const action = normalizeToken(formState.action);

    if (!resource || !action) {
      setFormError("املأ المورد والإجراء أولًا لتوليد رمز الصلاحية.");
      return;
    }

    setFormError(null);
    setFormState((prev) => ({
      ...prev,
      code: `${resource}.${action}`,
    }));
  };

  const validateForm = (): boolean => {
    const code = normalizeToken(formState.code);
    const resource = normalizeToken(formState.resource);
    const action = normalizeToken(formState.action);

    if (!code || !resource || !action) {
      setFormError("الحقول الإلزامية: الرمز، المورد، الإجراء.");
      return false;
    }

    if (!isCodePatternValid(code)) {
      setFormError("صيغة الكود غير صحيحة. استخدم أحرفًا صغيرة وأرقامًا و . _ : - فقط.");
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
      code: normalizeToken(formState.code),
      resource: normalizeToken(formState.resource),
      action: normalizeToken(formState.action),
      description: toOptionalString(formState.description),
      isSystem: formState.isSystem,
    };

    if (isEditing && editingPermissionId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية permissions.update.");
        return;
      }

      updatePermissionMutation.mutate(
        {
          permissionId: editingPermissionId,
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
      setFormError("لا تملك صلاحية permissions.create.");
      return;
    }

    createPermissionMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleDeletePermission = (permission: PermissionListItem) => {
    if (!canDelete) {
      return;
    }

    if (permission.isSystem) {
      setFormError("لا يمكن حذف صلاحية نظامية من الواجهة.");
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الصلاحية ${permission.code}؟`);
    if (!confirmed) {
      return;
    }

    deletePermissionMutation.mutate(permission.id, {
      onSuccess: () => {
        if (editingPermissionId === permission.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting =
    createPermissionMutation.isPending || updatePermissionMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل صلاحية" : "إنشاء صلاحية"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل صلاحية غير نظامية."
              : "إضافة صلاحية جديدة لاستخدامها داخل نظام التحكم بالصلاحيات."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>permissions.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  رمز الصلاحية (الكود) *
                </label>
                <Input
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="users.create"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    المورد *
                  </label>
                  <Input
                    value={formState.resource}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, resource: event.target.value }))
                    }
                    placeholder="users"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الإجراء *
                  </label>
                  <Input
                    value={formState.action}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, action: event.target.value }))
                    }
                    placeholder="create"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateCode}>
                  <WandSparkles className="me-2 h-4 w-4" />
                  توليد الرمز من المورد/الإجراء
                </Button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الوصف</label>
                <Input
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="مثال: إمكانية إنشاء مستخدمين"
                />
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>صلاحية نظامية</span>
                <input
                  type="checkbox"
                  checked={formState.isSystem}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isSystem: event.target.checked }))
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
                    <KeyRound className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء صلاحية"}
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
            <CardTitle>قائمة الصلاحيات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة صلاحيات نظام التحكم بالصلاحيات. الصلاحيات النظامية محمية من
            التعديل والحذف عبر الواجهة.
          </CardDescription>
          <form onSubmit={handleSearchSubmit} className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث في الرمز/المورد/الإجراء..."
                className="pr-8"
              />
            </div>
            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-3">
          {permissionsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل قائمة الصلاحيات...
            </div>
          ) : null}

          {permissionsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {permissionsQuery.error instanceof Error
                ? permissionsQuery.error.message
                : "فشل تحميل قائمة الصلاحيات"}
            </div>
          ) : null}

          {!permissionsQuery.isPending && permissions.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد صلاحيات مطابقة.
            </div>
          ) : null}

          {permissions.map((permission) => (
            <div
              key={permission.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    <code>{permission.code}</code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {translatePermissionCode(permission.code)}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{permission.resource}</Badge>
                    <Badge variant="secondary">{permission.action}</Badge>
                  </div>
                  {permission.description ? (
                    <p className="text-xs text-muted-foreground">{permission.description}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5">
                  {permission.isSystem ? (
                    <Badge variant="outline" className="gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      نظامية
                    </Badge>
                  ) : (
                    <Badge variant="default">مخصصة</Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(permission)}
                  disabled={!canUpdate || permission.isSystem || updatePermissionMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDeletePermission(permission)}
                  disabled={!canDelete || permission.isSystem || deletePermissionMutation.isPending}
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
                disabled={!pagination || pagination.page <= 1 || permissionsQuery.isFetching}
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
                  permissionsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void permissionsQuery.refetch()}
                disabled={permissionsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${permissionsQuery.isFetching ? "animate-spin" : ""}`}
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





