"use client";

import * as React from "react";
import {
  KeyRound,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  ShieldOff,
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
  useCreateUserPermissionMutation,
  useDeleteUserPermissionMutation,
  useRevokeUserPermissionMutation,
  useUpdateUserPermissionMutation,
} from "@/features/user-permissions/hooks/use-user-permissions-mutations";
import { useUserPermissionsQuery } from "@/features/user-permissions/hooks/use-user-permissions-query";
import { usePermissionsQuery } from "@/features/permissions/hooks/use-permissions-query";
import { useUsersQuery } from "@/features/users/hooks/use-users-query";
import type { UserPermissionListItem } from "@/lib/api/client";
import { translatePermissionCode } from "@/lib/i18n/ar";

type UserPermissionFormState = {
  userId: string;
  permissionId: string;
  validFrom: string;
  validUntil: string;
  grantReason: string;
  notes: string;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM_STATE: UserPermissionFormState = {
  userId: "",
  permissionId: "",
  validFrom: "",
  validUntil: "",
  grantReason: "",
  notes: "",
};

function toLocalDateTimeInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  return new Date(normalized).toISOString();
}

function toFormState(item: UserPermissionListItem): UserPermissionFormState {
  return {
    userId: item.userId,
    permissionId: item.permissionId,
    validFrom: toLocalDateTimeInput(item.validFrom),
    validUntil: toLocalDateTimeInput(item.validUntil),
    grantReason: item.grantReason,
    notes: item.notes ?? "",
  };
}

function ensureDateRange(validFrom: string, validUntil: string): string | null {
  if (!validFrom || !validUntil) {
    return null;
  }

  if (new Date(validUntil) < new Date(validFrom)) {
    return "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية.";
  }

  return null;
}

function toDisplayName(user: UserPermissionListItem["user"]): string {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName.length > 0 ? fullName : user.email;
}

function getPermissionOptionLabel(permissionCode: string): string {
  return `${translatePermissionCode(permissionCode)} (${permissionCode})`;
}

export function UserPermissionsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("user-permissions.create");
  const canUpdate = hasPermission("user-permissions.update");
  const canDelete = hasPermission("user-permissions.delete");
  const canRevoke = hasPermission("user-permissions.revoke");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "current" | "revoked">("all");
  const [userFilter, setUserFilter] = React.useState<string>("all");
  const [permissionFilter, setPermissionFilter] = React.useState<string>("all");

  const [editingItemId, setEditingItemId] = React.useState<number | null>(null);
  const [formState, setFormState] = React.useState<UserPermissionFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const usersOptionsQuery = useUsersQuery({
    page: 1,
    limit: 200,
    isActive: true,
  });

  const permissionsOptionsQuery = usePermissionsQuery({
    page: 1,
    limit: 300,
  });

  const userPermissionsQuery = useUserPermissionsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    userId: userFilter === "all" ? undefined : userFilter,
    permissionId: permissionFilter === "all" ? undefined : permissionFilter,
    isRevoked: statusFilter === "revoked" ? true : undefined,
    isCurrent: statusFilter === "current" ? true : undefined,
  });

  const createMutation = useCreateUserPermissionMutation();
  const updateMutation = useUpdateUserPermissionMutation();
  const revokeMutation = useRevokeUserPermissionMutation();
  const deleteMutation = useDeleteUserPermissionMutation();

  const users = React.useMemo(() => usersOptionsQuery.data?.data ?? [], [usersOptionsQuery.data?.data]);
  const permissions = React.useMemo(
    () => permissionsOptionsQuery.data?.data ?? [],
    [permissionsOptionsQuery.data?.data],
  );
  const items = React.useMemo(() => userPermissionsQuery.data?.data ?? [], [userPermissionsQuery.data?.data]);
  const pagination = userPermissionsQuery.data?.pagination;
  const isEditing = editingItemId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (revokeMutation.error as Error | null)?.message ??
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

  const resetForm = () => {
    setEditingItemId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStartEdit = (item: UserPermissionListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingItemId(item.id);
    setFormState(toFormState(item));
    setFormError(null);
  };

  const validateForm = (): boolean => {
    if (!isEditing) {
      if (!formState.userId || !formState.permissionId) {
        setFormError("اختر المستخدم والصلاحية.");
        return false;
      }
    }

    const grantReason = formState.grantReason.trim();
    if (!grantReason) {
      setFormError("سبب المنح إلزامي.");
      return false;
    }

    const dateRangeError = ensureDateRange(formState.validFrom, formState.validUntil);
    if (dateRangeError) {
      setFormError(dateRangeError);
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
      validFrom: toIsoFromLocal(formState.validFrom),
      validUntil: toIsoFromLocal(formState.validUntil),
      grantReason: formState.grantReason.trim(),
      notes: formState.notes.trim() || undefined,
    };

    if (isEditing && editingItemId !== null) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية user-permissions.update.");
        return;
      }

      updateMutation.mutate(
        {
          userPermissionId: editingItemId,
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
      setFormError("لا تملك صلاحية user-permissions.create.");
      return;
    }

    createMutation.mutate(
      {
        userId: formState.userId,
        permissionId: formState.permissionId,
        grantReason: payload.grantReason,
        validFrom: payload.validFrom,
        validUntil: payload.validUntil,
        notes: payload.notes,
      },
      {
        onSuccess: () => {
          resetForm();
          setPage(1);
        },
      },
    );
  };

  const handleRevoke = (item: UserPermissionListItem) => {
    if (!canRevoke || item.revokedAt) {
      return;
    }

    const revokeReason = window.prompt("اكتب سبب سحب الصلاحية (اختياري):") ?? "";

    revokeMutation.mutate({
      userPermissionId: item.id,
      payload: {
        revokeReason: revokeReason.trim() || undefined,
      },
    });
  };

  const handleDelete = (item: UserPermissionListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm("تأكيد حذف سجل الصلاحية المباشرة؟");
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

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل صلاحية مباشرة" : "منح صلاحية مباشرة"}
          </CardTitle>
          <CardDescription>
            منح صلاحية مباشرة لمستخدم خارج إطار الدور، مع إمكانية تحديد فترة زمنية.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>user-permissions.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">المستخدم *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.userId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, userId: event.target.value }))
                  }
                  disabled={isEditing}
                >
                  <option value="">اختر مستخدمًا</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الصلاحية *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.permissionId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, permissionId: event.target.value }))
                  }
                  disabled={isEditing}
                >
                  <option value="">اختر صلاحية</option>
                  {permissions.map((permission) => (
                    <option key={permission.id} value={permission.id}>
                      {getPermissionOptionLabel(permission.code)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">بداية الصلاحية</label>
                  <Input
                    type="datetime-local"
                    value={formState.validFrom}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, validFrom: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">نهاية الصلاحية</label>
                  <Input
                    type="datetime-local"
                    value={formState.validUntil}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, validUntil: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">سبب المنح *</label>
                <Input
                  value={formState.grantReason}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, grantReason: event.target.value }))
                  }
                  placeholder="سبب منح الصلاحية"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
                <Input
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="ملاحظات إضافية"
                />
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
                  {isEditing ? "حفظ التعديلات" : "منح الصلاحية"}
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
            <CardTitle>الصلاحيات المباشرة</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>عرض وإدارة صلاحيات المستخدمين المباشرة (سارية أو مسحوبة).</CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_140px_200px_200px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as "all" | "current" | "revoked");
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="current">سارية</option>
              <option value="revoked">مسحوبة</option>
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={userFilter}
              onChange={(event) => {
                setPage(1);
                setUserFilter(event.target.value);
              }}
            >
              <option value="all">كل المستخدمين</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={permissionFilter}
              onChange={(event) => {
                setPage(1);
                setPermissionFilter(event.target.value);
              }}
            >
              <option value="all">كل الصلاحيات</option>
              {permissions.map((permission) => (
                <option key={permission.id} value={permission.id}>
                  {getPermissionOptionLabel(permission.code)}
                </option>
              ))}
            </select>

            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-3">
          {userPermissionsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {userPermissionsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {userPermissionsQuery.error instanceof Error
                ? userPermissionsQuery.error.message
                : "فشل تحميل البيانات"}
            </div>
          ) : null}

          {!userPermissionsQuery.isPending && items.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {items.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{toDisplayName(item.user)}</p>
                  <p className="text-xs text-muted-foreground">{item.user.email}</p>
                  <p className="text-xs">
                    <code>{item.permission.code}</code> - {translatePermissionCode(item.permission.code)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={item.revokedAt ? "outline" : "default"}>
                      {item.revokedAt ? "مسحوبة" : "سارية"}
                    </Badge>
                    {item.validUntil ? (
                      <Badge variant="secondary">تنتهي: {item.validUntil.slice(0, 10)}</Badge>
                    ) : (
                      <Badge variant="secondary">بدون انتهاء</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">سبب المنح: {item.grantReason}</p>
                  {item.revokeReason ? (
                    <p className="text-xs text-destructive">سبب السحب: {item.revokeReason}</p>
                  ) : null}
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
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleRevoke(item)}
                  disabled={!canRevoke || revokeMutation.isPending || Boolean(item.revokedAt)}
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  سحب
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
                disabled={!pagination || pagination.page <= 1 || userPermissionsQuery.isFetching}
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
                  userPermissionsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void userPermissionsQuery.refetch()}
                disabled={userPermissionsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${userPermissionsQuery.isFetching ? "animate-spin" : ""}`}
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
