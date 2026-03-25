"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  KeyRound,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  ShieldOff,
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
  useCreateUserPermissionMutation,
  useDeleteUserPermissionMutation,
  useRevokeUserPermissionMutation,
  useUpdateUserPermissionMutation,
} from "@/features/user-permissions/hooks/use-user-permissions-mutations";
import { useUserPermissionsQuery } from "@/features/user-permissions/hooks/use-user-permissions-query";
import { usePermissionsOptionsQuery } from "@/features/permissions/hooks/use-permissions-options-query";
import { useUsersOptionsQuery } from "@/features/users/hooks/use-users-options-query";
import { PermissionsSelector } from "@/components/ui/permissions-selector";
import type { UserPermissionListItem } from "@/lib/api/client";
import { translatePermissionCode } from "@/lib/i18n/ar";

type UserPermissionFormState = {
  userId: string;
  permissionId: string;
  selectedPermissionIds: string[];
  validFrom: string;
  validUntil: string;
  grantReason: string;
  notes: string;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM_STATE: UserPermissionFormState = {
  userId: "",
  permissionId: "",
  selectedPermissionIds: [],
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

function formatLocalDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toFormState(item: UserPermissionListItem): UserPermissionFormState {
  return {
    userId: item.userId,
    permissionId: item.permissionId,
    selectedPermissionIds: [item.permissionId],
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

function getPermissionOptionLabel(permissionCode: string): string {
  return `${translatePermissionCode(permissionCode)} (${permissionCode})`;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "حدث خطأ غير متوقع";
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
  const [statusFilterDraft, setStatusFilterDraft] = React.useState<
    "all" | "current" | "revoked"
  >("all");
  const [userFilterDraft, setUserFilterDraft] = React.useState<string>("all");
  const [permissionFilterDraft, setPermissionFilterDraft] = React.useState<string>("all");
  const [isBulkSubmitting, setIsBulkSubmitting] = React.useState(false);

  const [editingItemId, setEditingItemId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<UserPermissionFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const usersOptionsQuery = useUsersOptionsQuery();
  const permissionsOptionsQuery = usePermissionsOptionsQuery();

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

  const users = React.useMemo(() => usersOptionsQuery.data ?? [], [usersOptionsQuery.data]);
  const permissions = React.useMemo(() => permissionsOptionsQuery.data ?? [], [permissionsOptionsQuery.data]);
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
      setIsFormOpen(false);
    }
  }, [editingItemId, isEditing, items]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setStatusFilterDraft(statusFilter);
    setUserFilterDraft(userFilter);
    setPermissionFilterDraft(permissionFilter);
  }, [isFilterOpen, permissionFilter, statusFilter, userFilter]);

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

  const handleStartEdit = (item: UserPermissionListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingItemId(item.id);
    setFormState(toFormState(item));
    setFormError(null);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!isEditing) {
      if (!formState.userId || formState.selectedPermissionIds.length === 0) {
        setFormError("اختر المستخدم وصلاحية واحدة على الأقل.");
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

  const handleSubmitForm = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

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
        setFormError("لا تملك الصلاحية المطلوبة: user-permissions.update.");
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
      setFormError("لا تملك الصلاحية المطلوبة: user-permissions.create.");
      return;
    }

    const uniquePermissionIds = Array.from(
      new Set(formState.selectedPermissionIds),
    );
    setIsBulkSubmitting(true);

    try {
      const results = await Promise.allSettled(
        uniquePermissionIds.map((permissionId) =>
          createMutation.mutateAsync({
            userId: formState.userId,
            permissionId,
            grantReason: payload.grantReason,
            validFrom: payload.validFrom,
            validUntil: payload.validUntil,
            notes: payload.notes,
          }),
        ),
      );

      const failedResults = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );

      if (failedResults.length > 0) {
        const successCount = results.length - failedResults.length;
        const firstError = readErrorMessage(failedResults[0].reason);
        setFormError(
          `تم منح ${successCount} من ${results.length}. فشل جزئي: ${firstError}`,
        );
        return;
      }

      resetForm();
      setPage(1);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleToggleRevoke = (item: UserPermissionListItem) => {
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

  const isFormSubmitting =
    isBulkSubmitting || createMutation.isPending || updateMutation.isPending;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setUserFilter("all");
    setPermissionFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setStatusFilter(statusFilterDraft);
    setUserFilter(userFilterDraft);
    setPermissionFilter(permissionFilterDraft);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      statusFilter !== "all" ? 1 : 0,
      userFilter !== "all" ? 1 : 0,
      permissionFilter !== "all" ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return count;
  }, [permissionFilter, searchInput, statusFilter, userFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 sm:min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ابحث بالمستخدم أو الصلاحية..."
              data-testid="user-permission-filter-search"
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
              value={statusFilterDraft}
              onChange={(event) =>
                setStatusFilterDraft(event.target.value as "all" | "current" | "revoked")
              }
              data-testid="user-permission-filter-status"
            >
              <option value="all">كل الحالات</option>
              <option value="current">سارية</option>
              <option value="revoked">ملغاة</option>
            </SelectField>

            <SelectField
              value={userFilterDraft}
              onChange={(event) => setUserFilterDraft(event.target.value)}
              data-testid="user-permission-filter-user"
            >
              <option value="all">كل المستخدمين</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={permissionFilterDraft}
              onChange={(event) => setPermissionFilterDraft(event.target.value)}
              data-testid="user-permission-filter-permission"
            >
              <option value="all">كل الصلاحيات</option>
              {permissions.map((permission) => (
                <option key={permission.id} value={permission.id}>
                  {getPermissionOptionLabel(permission.code)}
                </option>
              ))}
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>صلاحيات المستخدمين</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة الصلاحيات الخاصة بالمستخدمين (منح وتحديث وسحب).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {userPermissionsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل الصلاحيات...
              </div>
            ) : null}

            {userPermissionsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {userPermissionsQuery.error instanceof Error
                  ? userPermissionsQuery.error.message
                  : "تعذر تحميل الصلاحيات"}
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
                data-testid="user-permission-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {item.user?.firstName} {item.user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.user?.email ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {getPermissionOptionLabel(item.permission.code)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.validFrom ? `من ${formatLocalDateTime(item.validFrom)}` : "بدون بداية"}
                      {item.validUntil ? ` إلى ${formatLocalDateTime(item.validUntil)}` : ""}
                    </p>
                  </div>
                  <Badge variant={item.revokedAt ? "outline" : "default"}>
                    {item.revokedAt ? "ملغاة" : "سارية"}
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
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleToggleRevoke(item)}
                    disabled={!canRevoke || revokeMutation.isPending}
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    {item.revokedAt ? "إعادة تفعيل" : "سحب"}
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

      <Fab
        icon={<KeyRound className="h-4 w-4" />}
        label="منح"
        ariaLabel="منح صلاحية لمستخدم"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل صلاحية مستخدم" : "منح صلاحية لمستخدم"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "منح الصلاحيات المحددة"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            ليس لديك الصلاحية المطلوبة: <code>user-permissions.create</code>.
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={handleSubmitForm}
            data-testid="user-permission-form"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">المستخدم *</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formState.userId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, userId: event.target.value }))
                }
                disabled={isEditing}
                data-testid="user-permission-form-user"
              >
                <option value="">اختر مستخدمًا</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                {isEditing ? "الصلاحية" : "الصلاحيات *"}
              </label>
              {isEditing ? (
                <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                  {formState.permissionId
                    ? (() => {
                        const currentPermission = permissions.find(
                          (permission) => permission.id === formState.permissionId,
                        );
                        return currentPermission
                          ? getPermissionOptionLabel(currentPermission.code)
                          : formState.permissionId;
                      })()
                    : "لم يتم اختيار صلاحية"}
                </div>
              ) : (
                <PermissionsSelector
                  permissions={permissions}
                  selectedIds={formState.selectedPermissionIds}
                  onChange={(ids) => setFormState(prev => ({ ...prev, selectedPermissionIds: ids }))}
                />
              )}
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
                  data-testid="user-permission-form-valid-from"
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
                  data-testid="user-permission-form-valid-until"
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
                placeholder="مثال: صلاحية مؤقتة"
                required
                data-testid="user-permission-form-grant-reason"
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
                data-testid="user-permission-form-notes"
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
                data-testid="user-permission-form-submit"
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "منح الصلاحيات المحددة"}
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
