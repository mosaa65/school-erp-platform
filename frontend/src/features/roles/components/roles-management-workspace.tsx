"use client";

import * as React from "react";
import {
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  ShieldPlus,
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
  useAssignRolePermissionsMutation,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useUpdateRoleMutation,
} from "@/features/roles/hooks/use-roles-mutations";
import { useRolesQuery } from "@/features/roles/hooks/use-roles-query";
import { usePermissionsOptionsQuery } from "@/features/roles/hooks/use-permissions-options-query";
import type { RoleListItem } from "@/lib/api/client";
import { translatePermissionCode } from "@/lib/i18n/ar";

type RoleFormState = {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  permissionIds: string[];
};

const PAGE_SIZE = 10;

const DEFAULT_FORM_STATE: RoleFormState = {
  code: "",
  name: "",
  description: "",
  isActive: true,
  permissionIds: [],
};

function toFormState(role: RoleListItem): RoleFormState {
  return {
    code: role.code,
    name: role.name,
    description: role.description ?? "",
    isActive: role.isActive,
    permissionIds: role.rolePermissions.map((item) => item.permission.id),
  };
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeRoleCode(code: string): string {
  return code.trim().toLowerCase();
}

function areIdSetsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftSet = new Set(left);

  for (const id of right) {
    if (!leftSet.has(id)) {
      return false;
    }
  }

  return true;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "حدث خطأ غير متوقع";
}

export function RolesManagementWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("roles.create");
  const canUpdate = hasPermission("roles.update");
  const canDelete = hasPermission("roles.delete");
  const canAssignPermissions = hasPermission("roles.assign-permissions");
  const canReadPermissions = hasPermission("permissions.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");

  const [editingRoleId, setEditingRoleId] = React.useState<string | null>(null);
  const [originalRoleFormState, setOriginalRoleFormState] =
    React.useState<RoleFormState | null>(null);
  const [formState, setFormState] = React.useState<RoleFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [permissionSearch, setPermissionSearch] = React.useState("");

  const rolesQuery = useRolesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });
  const permissionsQuery = usePermissionsOptionsQuery();

  const createRoleMutation = useCreateRoleMutation();
  const updateRoleMutation = useUpdateRoleMutation();
  const assignPermissionsMutation = useAssignRolePermissionsMutation();
  const deleteRoleMutation = useDeleteRoleMutation();

  const roles = React.useMemo(() => rolesQuery.data?.data ?? [], [rolesQuery.data?.data]);
  const pagination = rolesQuery.data?.pagination;
  const isEditing = editingRoleId !== null;

  const mutationError =
    (createRoleMutation.error as Error | null)?.message ??
    (updateRoleMutation.error as Error | null)?.message ??
    (assignPermissionsMutation.error as Error | null)?.message ??
    (deleteRoleMutation.error as Error | null)?.message ??
    null;

  const filteredPermissions = React.useMemo(() => {
    const keyword = permissionSearch.trim().toLowerCase();
    const allPermissions = permissionsQuery.data ?? [];

    if (!keyword) {
      return allPermissions;
    }

    return allPermissions.filter((permission) =>
      `${permission.code} ${permission.resource} ${permission.action} ${permission.description ?? ""}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [permissionSearch, permissionsQuery.data]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const roleStillExists = roles.some((role) => role.id === editingRoleId);

    if (!roleStillExists) {
      setEditingRoleId(null);
      setOriginalRoleFormState(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingRoleId, isEditing, roles]);

  const togglePermission = (permissionId: string, checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      permissionIds: checked
        ? [...prev.permissionIds, permissionId]
        : prev.permissionIds.filter((existingId) => existingId !== permissionId),
    }));
  };

  const resetForm = () => {
    setEditingRoleId(null);
    setOriginalRoleFormState(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setPermissionSearch("");
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStartEdit = (role: RoleListItem) => {
    const nextFormState = toFormState(role);
    setEditingRoleId(role.id);
    setOriginalRoleFormState(nextFormState);
    setFormState(nextFormState);
    setFormError(null);
    setActionSuccess(null);
  };

  const validateForm = (): boolean => {
    const code = normalizeRoleCode(formState.code);
    const name = formState.name.trim();

    if (!code || !name) {
      setFormError("الرجاء تعبئة الحقول الإلزامية: الكود والاسم.");
      return false;
    }

    if (!/^[a-z0-9_.:-]+$/.test(code)) {
      setFormError("صيغة الكود غير صحيحة. استخدم أحرفًا صغيرة وأرقامًا و . _ : - فقط.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const normalizedPayload = {
      code: normalizeRoleCode(formState.code),
      name: formState.name.trim(),
      description: toOptionalString(formState.description),
      isActive: formState.isActive,
    };

    if (!isEditing) {
      if (!canCreate) {
        setFormError("لا تملك الصلاحية المطلوبة: roles.create.");
        return;
      }

      const createPayload = canAssignPermissions
        ? {
            ...normalizedPayload,
            permissionIds: formState.permissionIds,
          }
        : normalizedPayload;

      createRoleMutation.mutate(createPayload, {
        onSuccess: () => {
          resetForm();
          setPage(1);
          setActionSuccess("تم إنشاء الدور بنجاح.");
        },
      });

      return;
    }

    if (!editingRoleId || !originalRoleFormState) {
      setFormError("تعذر تحميل بيانات الدور الجاري تعديله.");
      return;
    }

    const baseFieldsChanged =
      normalizedPayload.code !== normalizeRoleCode(originalRoleFormState.code) ||
      normalizedPayload.name !== originalRoleFormState.name.trim() ||
      (normalizedPayload.description ?? "") !==
        (toOptionalString(originalRoleFormState.description) ?? "") ||
      normalizedPayload.isActive !== originalRoleFormState.isActive;

    const permissionsChanged = !areIdSetsEqual(
      formState.permissionIds,
      originalRoleFormState.permissionIds,
    );

    if (!baseFieldsChanged && !permissionsChanged) {
      setFormError("لا يوجد تغييرات للحفظ.");
      return;
    }

    if (permissionsChanged && !canAssignPermissions) {
      setFormError("لا تملك الصلاحية المطلوبة: roles.assign-permissions لتعديل صلاحيات الدور.");
      return;
    }

    if (baseFieldsChanged && !canUpdate) {
      setFormError("لا تملك الصلاحية المطلوبة: roles.update لتعديل بيانات الدور.");
      return;
    }

    setFormError(null);

    try {
      if (baseFieldsChanged) {
        await updateRoleMutation.mutateAsync({
          roleId: editingRoleId,
          payload: normalizedPayload,
        });
      }

      if (permissionsChanged) {
        if (formState.permissionIds.length === 0) {
          if (!canUpdate) {
            setFormError("تفريغ صلاحيات الدور يتطلب صلاحية roles.update.");
            return;
          }

          await updateRoleMutation.mutateAsync({
            roleId: editingRoleId,
            payload: {
              permissionIds: [],
            },
          });
        } else {
          await assignPermissionsMutation.mutateAsync({
            roleId: editingRoleId,
            permissionIds: formState.permissionIds,
          });
        }
      }

      resetForm();
      setActionSuccess("تم تحديث الدور بنجاح.");
    } catch (error) {
      setFormError(readErrorMessage(error));
    }
  };

  const handleToggleActive = (role: RoleListItem) => {
    if (!canUpdate) {
      return;
    }

    updateRoleMutation.mutate(
      {
        roleId: role.id,
        payload: {
          isActive: !role.isActive,
        },
      },
      {
        onSuccess: () => {
          setActionSuccess(
            role.isActive ? "تم تعطيل الدور بنجاح." : "تم تفعيل الدور بنجاح.",
          );
        },
      },
    );
  };

  const handleDeleteRole = (role: RoleListItem) => {
    if (!canDelete) {
      return;
    }

    if (role.isSystem) {
      setFormError("لا يمكن حذف دور نظامي.");
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الدور ${role.name} (${role.code})؟`);
    if (!confirmed) {
      return;
    }

    deleteRoleMutation.mutate(role.id, {
      onSuccess: () => {
        if (editingRoleId === role.id) {
          resetForm();
        }
        setActionSuccess("تم حذف الدور بنجاح.");
      },
    });
  };

  const isFormSubmitting =
    createRoleMutation.isPending ||
    updateRoleMutation.isPending ||
    assignPermissionsMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldPlus className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل دور" : "إنشاء دور"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل بيانات الدور وإسناد الصلاحيات."
              : "إضافة دور جديد للاستخدام في نظام الصلاحيات."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>roles.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الكود *</label>
                <Input
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="school_admin"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم *</label>
                <Input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="مدير المدرسة"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الوصف</label>
                <Input
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="وصول كامل لعمليات المدرسة"
                />
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>الحالة</span>
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">الصلاحيات</p>
                  {!canAssignPermissions ? (
                    <Badge variant="outline">يتطلب صلاحية roles.assign-permissions</Badge>
                  ) : null}
                </div>
                <Input
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.target.value)}
                  placeholder="ابحث عن صلاحية..."
                  disabled={!canReadPermissions || !canAssignPermissions}
                />
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
                  {(filteredPermissions ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {canReadPermissions
                        ? "لا توجد صلاحيات مطابقة."
                        : "لا تملك الصلاحية المطلوبة: permissions.read لعرض الصلاحيات."}
                    </p>
                  ) : (
                    filteredPermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1 text-xs hover:border-border"
                      >
                        <span className="truncate">
                          {translatePermissionCode(permission.code)} ({permission.code})
                        </span>
                        <input
                          type="checkbox"
                          checked={formState.permissionIds.includes(permission.id)}
                          onChange={(event) =>
                            togglePermission(permission.id, event.target.checked)
                          }
                          disabled={!canAssignPermissions}
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

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
              {actionSuccess ? (
                <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                  {actionSuccess}
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
                    <ShieldPlus className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء دور"}
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
            <CardTitle>قائمة الأدوار</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة الأدوار مع إمكانيات البحث والتعديل والإسناد والحذف الناعم.
          </CardDescription>
          <form onSubmit={handleSearchSubmit} className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث في الكود أو الاسم..."
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
          {rolesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {rolesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {rolesQuery.error instanceof Error
                ? rolesQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!rolesQuery.isPending && roles.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد أدوار مطابقة.
            </div>
          ) : null}

          {roles.map((role) => (
            <div
              key={role.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{role.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{role.code}</code>
                  </p>
                  {role.description ? (
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={role.isActive ? "default" : "destructive"}>
                    {role.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                  {role.isSystem ? <Badge variant="outline">نظامي</Badge> : null}
                  <Badge variant="secondary">
                    الصلاحيات: {role.rolePermissions.length}
                  </Badge>
                </div>
              </div>

              {role.rolePermissions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {role.rolePermissions.slice(0, 6).map((item) => (
                    <Badge key={item.id} variant="outline">
                      {translatePermissionCode(item.permission.code)}
                    </Badge>
                  ))}
                  {role.rolePermissions.length > 6 ? (
                    <Badge variant="secondary">+{role.rolePermissions.length - 6}</Badge>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">لا توجد صلاحيات مسندة.</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(role)}
                  disabled={(!canUpdate && !canAssignPermissions) || isFormSubmitting}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(role)}
                  disabled={!canUpdate || updateRoleMutation.isPending}
                >
                  {role.isActive ? "تعطيل" : "تفعيل"}
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDeleteRole(role)}
                  disabled={!canDelete || role.isSystem || deleteRoleMutation.isPending}
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
                disabled={!pagination || pagination.page <= 1 || rolesQuery.isFetching}
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
                  rolesQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void rolesQuery.refetch()}
                disabled={rolesQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${rolesQuery.isFetching ? "animate-spin" : ""}`}
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





