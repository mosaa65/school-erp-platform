"use client";

import * as React from "react";
import {
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
  UserRoundPlus,
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
  useCreateUserMutation,
  useDeleteUserMutation,
  useLinkUserEmployeeMutation,
  useUnlinkUserEmployeeMutation,
  useUpdateUserMutation,
} from "@/features/users/hooks/use-users-mutations";
import { useUsersQuery } from "@/features/users/hooks/use-users-query";
import {
  useEmployeeOptionsQuery,
  useRoleOptionsQuery,
} from "@/features/users/hooks/use-user-form-options-query";
import type { UserListItem } from "@/lib/api/client";
import { translateRoleCode } from "@/lib/i18n/ar";

type UserFormState = {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  isActive: boolean;
  employeeId: string;
  roleIds: string[];
};

const PAGE_SIZE = 10;

const DEFAULT_FORM_STATE: UserFormState = {
  email: "",
  username: "",
  firstName: "",
  lastName: "",
  password: "",
  isActive: true,
  employeeId: "",
  roleIds: [],
};

function toFormState(user: UserListItem): UserFormState {
  return {
    email: user.email,
    username: user.username ?? "",
    firstName: user.firstName,
    lastName: user.lastName,
    password: "",
    isActive: user.isActive,
    employeeId: user.employee?.id ?? "",
    roleIds: user.userRoles.map((item) => item.role.id),
  };
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

type UsersManagementWorkspaceProps = {
  initialSearchQuery?: string;
};

export function UsersManagementWorkspace({
  initialSearchQuery = "",
}: UsersManagementWorkspaceProps) {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("users.create");
  const canUpdate = hasPermission("users.update");
  const canDelete = hasPermission("users.delete");
  const canReadRoles = hasPermission("roles.read");
  const canReadEmployees = hasPermission("employees.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState(initialSearchQuery);
  const [search, setSearch] = React.useState(initialSearchQuery.trim());
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "active" | "inactive"
  >("all");

  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [formState, setFormState] =
    React.useState<UserFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [employeeSelections, setEmployeeSelections] = React.useState<
    Record<string, string>
  >({});

  const usersQuery = useUsersQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const rolesQuery = useRoleOptionsQuery();
  const employeesQuery = useEmployeeOptionsQuery();

  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const linkUserEmployeeMutation = useLinkUserEmployeeMutation();
  const unlinkUserEmployeeMutation = useUnlinkUserEmployeeMutation();

  const isEditing = editingUserId !== null;

  const mutationError =
    (createUserMutation.error as Error | null)?.message ??
    (updateUserMutation.error as Error | null)?.message ??
    (deleteUserMutation.error as Error | null)?.message ??
    (linkUserEmployeeMutation.error as Error | null)?.message ??
    (unlinkUserEmployeeMutation.error as Error | null)?.message ??
    null;

  const linkedEmployeeIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const user of usersQuery.data?.data ?? []) {
      if (user.employee?.id) {
        set.add(user.employee.id);
      }
    }
    return set;
  }, [usersQuery.data?.data]);

  React.useEffect(() => {
    setSearchInput(initialSearchQuery);
    setSearch(initialSearchQuery.trim());
    setPage(1);
  }, [initialSearchQuery]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const currentUsers = usersQuery.data?.data ?? [];
    const userStillExists = currentUsers.some(
      (user) => user.id === editingUserId,
    );

    if (!userStillExists) {
      setEditingUserId(null);
      setFormState(DEFAULT_FORM_STATE);
    }
  }, [editingUserId, isEditing, usersQuery.data?.data]);

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      roleIds: checked
        ? [...prev.roleIds, roleId]
        : prev.roleIds.filter((existingRoleId) => existingRoleId !== roleId),
    }));
  };

  const resetForm = () => {
    setEditingUserId(null);
    setFormError(null);
    setFormState(DEFAULT_FORM_STATE);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStatusFilterChange = (
    nextFilter: "all" | "active" | "inactive",
  ) => {
    setPage(1);
    setActiveFilter(nextFilter);
  };

  const handleStartEdit = (user: UserListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingUserId(user.id);
    setFormError(null);
    setActionSuccess(null);
    setFormState(toFormState(user));
  };

  const validateForm = (): boolean => {
    const email = formState.email.trim();
    const firstName = formState.firstName.trim();
    const lastName = formState.lastName.trim();

    if (!email || !firstName || !lastName) {
      setFormError(
        "الرجاء تعبئة الحقول الإلزامية: البريد، الاسم الأول، الاسم الأخير.",
      );
      return false;
    }

    if (!isValidEmail(email)) {
      setFormError("صيغة البريد الإلكتروني غير صحيحة.");
      return false;
    }

    if (!isEditing && formState.password.trim().length < 8) {
      setFormError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return false;
    }

    if (
      isEditing &&
      formState.password.trim() &&
      formState.password.trim().length < 8
    ) {
      setFormError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      email: formState.email.trim().toLowerCase(),
      username: toOptionalString(formState.username),
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      employeeId: toOptionalString(formState.employeeId),
      isActive: formState.isActive,
      roleIds: formState.roleIds,
    };

    if (isEditing && editingUserId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة لتعديل المستخدمين.");
        return;
      }

      const updatePayload = {
        ...payload,
        password: toOptionalString(formState.password),
      };

      updateUserMutation.mutate(
        {
          userId: editingUserId,
          payload: updatePayload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث المستخدم بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة لإنشاء مستخدم جديد.");
      return;
    }

    createUserMutation.mutate(
      {
        ...payload,
        password: formState.password.trim(),
      },
      {
        onSuccess: () => {
          resetForm();
          setPage(1);
          setActionSuccess("تم إنشاء المستخدم بنجاح.");
        },
      },
    );
  };

  const handleToggleActive = (user: UserListItem) => {
    if (!canUpdate) {
      return;
    }

    updateUserMutation.mutate(
      {
        userId: user.id,
        payload: {
          isActive: !user.isActive,
        },
      },
      {
        onSuccess: () => {
          setActionSuccess(
            user.isActive
              ? "تم تعطيل المستخدم بنجاح."
              : "تم تفعيل المستخدم بنجاح.",
          );
        },
      },
    );
  };

  const handleDeleteUser = (user: UserListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف المستخدم ${user.firstName} ${user.lastName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteUserMutation.mutate(user.id, {
      onSuccess: () => {
        if (editingUserId === user.id) {
          resetForm();
        }
        setActionSuccess("تم حذف المستخدم بنجاح.");
      },
    });
  };

  const handleLinkEmployee = (userId: string) => {
    if (!canUpdate || !canReadEmployees) {
      return;
    }

    const selectedEmployeeId = employeeSelections[userId];
    if (!selectedEmployeeId) {
      return;
    }

    linkUserEmployeeMutation.mutate(
      {
        userId,
        employeeId: selectedEmployeeId,
      },
      {
        onSuccess: () => {
          setEmployeeSelections((prev) => ({ ...prev, [userId]: "" }));
          setActionSuccess("تم ربط المستخدم بالموظف بنجاح.");
        },
      },
    );
  };

  const handleUnlinkEmployee = (userId: string) => {
    if (!canUpdate) {
      return;
    }

    unlinkUserEmployeeMutation.mutate(userId, {
      onSuccess: () => {
        setActionSuccess("تم فك ربط المستخدم عن الموظف بنجاح.");
      },
    });
  };

  const users = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;

  const isFormSubmitting =
    createUserMutation.isPending || updateUserMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل مستخدم" : "إنشاء مستخدم"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث بيانات المستخدم والأدوار وربط الموظف."
              : "إضافة مستخدم جديد مع اختيار الأدوار وربط موظف اختياريًا."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>users.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label
                  htmlFor="user-email"
                  className="text-xs font-medium text-muted-foreground"
                >
                  البريد الإلكتروني *
                </label>
                <Input
                  id="user-email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  placeholder="user@school.local"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="user-username"
                  className="text-xs font-medium text-muted-foreground"
                >
                  اسم المستخدم
                </label>
                <Input
                  id="user-username"
                  value={formState.username}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  placeholder="ahmad_teacher"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الاسم الأول *
                  </label>
                  <Input
                    value={formState.firstName}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        firstName: event.target.value,
                      }))
                    }
                    placeholder="أحمد"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الاسم الأخير *
                  </label>
                  <Input
                    value={formState.lastName}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        lastName: event.target.value,
                      }))
                    }
                    placeholder="العواضي"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {isEditing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور *"}
                </label>
                <Input
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  placeholder="StrongPassword123!"
                  required={!isEditing}
                  minLength={isEditing ? undefined : 8}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  ربط موظف (اختياري)
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.employeeId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      employeeId: event.target.value,
                    }))
                  }
                  disabled={!canReadEmployees || employeesQuery.isLoading}
                >
                  <option value="">بدون ربط</option>
                  {(employeesQuery.data ?? []).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.jobNumber})
                    </option>
                  ))}
                </select>
                {!canReadEmployees ? (
                  <p className="text-xs text-muted-foreground">
                    لا تملك الصلاحية المطلوبة: <code>employees.read</code> لجلب قائمة
                    الموظفين.
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  الأدوار
                </p>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                  {(rolesQuery.data ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {canReadRoles
                        ? "لا توجد أدوار متاحة حاليًا."
                        : "لا تملك الصلاحية المطلوبة: roles.read لعرض قائمة الأدوار."}
                    </p>
                  ) : (
                    (rolesQuery.data ?? []).map((role) => (
                      <label
                        key={role.id}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1 text-sm hover:border-border"
                      >
                        <span>
                          {translateRoleCode(role.code)} ({role.code})
                        </span>
                        <input
                          type="checkbox"
                          checked={formState.roleIds.includes(role.id)}
                          onChange={(event) =>
                            handleRoleToggle(role.id, event.target.checked)
                          }
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>الحالة</span>
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      isActive: event.target.checked,
                    }))
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
                    <UserRoundPlus className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء مستخدم"}
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
            <CardTitle>قائمة المستخدمين</CardTitle>
            <Badge variant="secondary">
              الإجمالي: {pagination?.total ?? 0}
            </Badge>
          </div>
          <CardDescription>
            إدارة كاملة للمستخدمين: بحث، فلترة، تعديل، حذف ناعم، وربط موظف.
          </CardDescription>
          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_160px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالاسم، البريد، اسم المستخدم..."
                className="pr-8"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) =>
                handleStatusFilterChange(
                  event.target.value as "all" | "active" | "inactive",
                )
              }
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط فقط</option>
              <option value="inactive">غير نشط فقط</option>
            </select>
            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-3">
          {usersQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل قائمة المستخدمين...
            </div>
          ) : null}

          {usersQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {usersQuery.error instanceof Error
                ? usersQuery.error.message
                : "فشل تحميل قائمة المستخدمين"}
            </div>
          ) : null}

          {!usersQuery.isPending && users.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {users.map((user) => {
            const hasLinkedEmployee = Boolean(user.employee);
            const selectableEmployees = (employeesQuery.data ?? []).filter(
              (employee) =>
                !linkedEmployeeIds.has(employee.id) ||
                employee.id === user.employee?.id,
            );

            return (
              <div
                key={user.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    {user.username ? (
                      <p className="text-xs text-muted-foreground">
                        اسم المستخدم: <code>{user.username}</code>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                    {user.userRoles.length > 0 ? (
                      <Badge variant="outline">
                        {user.userRoles
                          .map((item) => translateRoleCode(item.role.code))
                          .join("، ")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">بدون أدوار</Badge>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  الموظف المرتبط:{" "}
                  {hasLinkedEmployee ? (
                    <span>
                      {user.employee?.fullName} ({user.employee?.jobNumber})
                    </span>
                  ) : (
                    <span>لا يوجد</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(user)}
                    disabled={!canUpdate || updateUserMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(user)}
                    disabled={!canUpdate || updateUserMutation.isPending}
                  >
                    {user.isActive ? "تعطيل" : "تفعيل"}
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDeleteUser(user)}
                    disabled={!canDelete || deleteUserMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2">
                  {hasLinkedEmployee ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlinkEmployee(user.id)}
                      disabled={
                        !canUpdate || unlinkUserEmployeeMutation.isPending
                      }
                    >
                      فك الربط
                    </Button>
                  ) : (
                    <>
                      <select
                        className="h-9 min-w-[220px] rounded-md border border-input bg-background px-2 text-sm"
                        value={employeeSelections[user.id] ?? ""}
                        onChange={(event) =>
                          setEmployeeSelections((prev) => ({
                            ...prev,
                            [user.id]: event.target.value,
                          }))
                        }
                        disabled={
                          !canReadEmployees ||
                          !canUpdate ||
                          employeesQuery.isLoading ||
                          selectableEmployees.length === 0
                        }
                      >
                        <option value="">اختر موظف للربط</option>
                        {selectableEmployees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.fullName} ({employee.jobNumber})
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLinkEmployee(user.id)}
                        disabled={
                          !canReadEmployees ||
                          !canUpdate ||
                          !employeeSelections[user.id] ||
                          linkUserEmployeeMutation.isPending
                        }
                      >
                        ربط موظف
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

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
                  !pagination || pagination.page <= 1 || usersQuery.isFetching
                }
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) =>
                    pagination
                      ? Math.min(prev + 1, pagination.totalPages)
                      : prev,
                  )
                }
                disabled={
                  !pagination ||
                  pagination.page >= pagination.totalPages ||
                  usersQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void usersQuery.refetch()}
                disabled={usersQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${usersQuery.isFetching ? "animate-spin" : ""}`}
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
