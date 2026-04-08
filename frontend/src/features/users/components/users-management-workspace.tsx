"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  LoaderCircle,
  Mail,
  Lock,
  PencilLine,
  RefreshCw,
  Trash2,
  User,
  UserPlus,
  UserRoundPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { Fab } from "@/components/ui/fab";
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
import { Label } from "@/components/ui/label";

type UserFormState = {
  email: string;
  username: string;
  phoneCountryCode: string;
  phoneNationalNumber: string;
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
  phoneCountryCode: "",
  phoneNationalNumber: "",
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
    phoneCountryCode: user.phoneCountryCode ?? "",
    phoneNationalNumber: user.phoneNationalNumber ?? "",
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
    "all" | "active" | "inactive" | "deleted"
  >("all");
  const [filterDraft, setFilterDraft] = React.useState<
    "all" | "active" | "inactive" | "deleted"
  >(
    "all",
  );

  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
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
    isActive:
      activeFilter === "all" || activeFilter === "deleted"
        ? undefined
        : activeFilter === "active",
    deletedOnly: activeFilter === "deleted" ? true : undefined,
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

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft(activeFilter);
  }, [activeFilter, isFilterOpen]);

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
      setFormError(null);
      setIsFormOpen(false);
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
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingUserId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (user: UserListItem) => {
    if (!canUpdate) {
      return;
    }

    setEditingUserId(user.id);
    setFormError(null);
    setActionSuccess(null);
    setFormState(toFormState(user));
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const email = formState.email.trim();
    const firstName = formState.firstName.trim();
    const lastName = formState.lastName.trim();
    const phoneCountryCode = formState.phoneCountryCode.trim();
    const phoneNationalNumber = formState.phoneNationalNumber.trim();

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

    if (Boolean(phoneCountryCode) !== Boolean(phoneNationalNumber)) {
      setFormError("الرجاء إدخال مفتاح الدولة ورقم الهاتف معًا أو تركهما فارغين.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      email: formState.email.trim().toLowerCase(),
      username: toOptionalString(formState.username),
      phoneCountryCode: toOptionalString(formState.phoneCountryCode),
      phoneNationalNumber: toOptionalString(formState.phoneNationalNumber),
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
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث بالاسم، البريد، اسم المستخدم..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفلترة"
          actionButtons={
            <FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>حالة المستخدم</Label>
              <SelectField
                value={filterDraft}
                onChange={(event) =>
                  setFilterDraft(
                    event.target.value as "all" | "active" | "inactive" | "deleted",
                  )
                }
                icon={<User className="h-4 w-4" />}
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">غير نشط فقط</option>
                <option value="deleted">محذوف فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة المستخدمين</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة المستخدمين: بحث، فلترة، تعديل، حذف وربط موظف.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {usersQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل المستخدمين...
              </div>
            ) : null}

            {usersQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {usersQuery.error instanceof Error
                  ? usersQuery.error.message
                  : "تعذر تحميل المستخدمين"}
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
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {user.username ? (
                        <p className="text-xs text-muted-foreground">
                          اسم المستخدم: <code>{user.username}</code>
                        </p>
                      ) : null}
                      {user.phoneE164 ? (
                        <p className="text-xs text-muted-foreground">
                          الهاتف: <code>{user.phoneE164}</code>
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
                        disabled={!canUpdate || unlinkUserEmployeeMutation.isPending}
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
                          <option value="">اختر موظفًا للربط</option>
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
                  disabled={!pagination || pagination.page <= 1 || usersQuery.isFetching}
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

      <Fab
        icon={<UserRoundPlus className="h-4 w-4" />}
        label="إنشاء"
        ariaLabel="إنشاء مستخدم"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل مستخدم" : "إنشاء مستخدم"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء مستخدم"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            ليس لديك الصلاحية المطلوبة: <code>users.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1">
              <Label required>البريد الإلكتروني</Label>
              <Input
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="user@school.local"
                icon={<Mail className="h-4 w-4" />}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>اسم المستخدم</Label>
              <Input
                value={formState.username}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    username: event.target.value,
                  }))
                }
                placeholder="ahmad_teacher"
                icon={<User className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>مفتاح الدولة</Label>
                <Input
                  value={formState.phoneCountryCode}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      phoneCountryCode: event.target.value,
                    }))
                  }
                  placeholder="+967"
                />
              </div>
              <div className="space-y-1">
                <Label>رقم الهاتف</Label>
                <Input
                  value={formState.phoneNationalNumber}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      phoneNationalNumber: event.target.value,
                    }))
                  }
                  placeholder="7XXXXXXXX"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label required>الاسم الأول</Label>
                <Input
                  value={formState.firstName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      firstName: event.target.value,
                    }))
                  }
                  placeholder="أحمد"
                  icon={<User className="h-4 w-4" />}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label required>الاسم الأخير</Label>
                <Input
                  value={formState.lastName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      lastName: event.target.value,
                    }))
                  }
                  placeholder="القحطاني"
                  icon={<User className="h-4 w-4" />}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label required={!isEditing}>
                {isEditing ? "تغيير كلمة المرور (اختياري)" : "كلمة المرور"}
              </Label>
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
                icon={<Lock className="h-4 w-4" />}
                required={!isEditing}
                minLength={isEditing ? undefined : 8}
              />
            </div>

            <div className="space-y-1">
              <Label>ربط موظف (اختياري)</Label>
              <SelectField
                value={formState.employeeId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    employeeId: event.target.value,
                  }))
                }
                disabled={!canReadEmployees || employeesQuery.isLoading}
                icon={<UserPlus className="h-4 w-4" />}
              >
                <option value="">اختر موظفًا</option>
                {(employeesQuery.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.jobNumber})
                  </option>
                ))}
              </SelectField>
              {!canReadEmployees ? (
                <p className="text-[10px] text-muted-foreground px-1">
                  ليس لديك الصلاحية المطلوبة: <code>employees.read</code> لعرض الموظفين.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">الأدوار</p>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                {(rolesQuery.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {canReadRoles
                      ? "لا توجد أدوار متاحة."
                      : "ليس لديك الصلاحية المطلوبة: roles.read لعرض الأدوار."}
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
                        onChange={(event) => handleRoleToggle(role.id, event.target.checked)}
                      />
                    </label>
                  ))
                )}
              </div>
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
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
      </BottomSheetForm>
    </>
  );
}
