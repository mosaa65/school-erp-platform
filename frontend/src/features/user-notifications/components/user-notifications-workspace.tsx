"use client";

import * as React from "react";
import Link from "next/link";
import {
  BellRing,
  CheckCheck,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useApproveAuthApprovalMutation,
  useDeleteUserNotificationMutation,
  useMarkAllUserNotificationsReadMutation,
  useMarkUserNotificationReadMutation,
  useRejectAuthApprovalMutation,
  useReissueAuthApprovalMutation,
  useUpdateUserNotificationPreferencesMutation,
} from "@/features/user-notifications/hooks/use-user-notifications-mutations";
import {
  usePendingAuthApprovalsQuery,
  useUserNotificationPreferencesQuery,
  useUserNotificationsQuery,
  type UserNotificationPreferences,
} from "@/features/user-notifications/hooks/use-user-notifications-query";
import type {
  AuthApprovalRequestItem,
  UserNotificationListItem,
  UserNotificationType,
} from "@/lib/api/client";

const PAGE_SIZE = 12;

const TYPE_LABELS: Record<UserNotificationType, string> = {
  INFO: "معلومة",
  SUCCESS: "نجاح",
  WARNING: "تنبيه",
  ACTION_REQUIRED: "إجراء مطلوب",
};

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ar-YE");
}

type AuthApprovalRequestKind =
  | "FIRST_PASSWORD_SETUP"
  | "NEW_DEVICE_LOGIN"
  | "PASSWORD_RESET";

type AuthApprovalRequestDetail = {
  label: string;
  value: string;
};

type AuthApprovalRequestCard = {
  request: AuthApprovalRequestItem;
  kind: AuthApprovalRequestKind;
  title: string;
  subtitle: string;
  details: AuthApprovalRequestDetail[];
};

const AUTH_APPROVAL_TITLES: Record<AuthApprovalRequestKind, string> = {
  FIRST_PASSWORD_SETUP: "طلب تفعيل كلمة المرور الأولى",
  NEW_DEVICE_LOGIN: "طلب اعتماد جهاز جديد",
  PASSWORD_RESET: "طلب استعادة كلمة المرور",
};

const AUTH_APPROVAL_SUBTITLES: Record<AuthApprovalRequestKind, string> = {
  FIRST_PASSWORD_SETUP:
    "هذا الطلب يخص أول كلمة مرور للمستخدم، ويحتاج تمرير الكود للمستخدم نفسه قبل تفعيل الحساب.",
  NEW_DEVICE_LOGIN:
    "هذا الطلب يخص دخولًا من جهاز جديد، ويحتاج تمرير الكود للمستخدم قبل إصدار الجلسة.",
  PASSWORD_RESET:
    "هذا الطلب يخص استعادة كلمة المرور، ويحتاج تمرير الكود للمستخدم لاستكمال إعادة التعيين.",
};

function toAuthApprovalCard(request: AuthApprovalRequestItem): AuthApprovalRequestCard {
  const kind: AuthApprovalRequestKind =
    request.purpose === "FIRST_PASSWORD_SETUP"
      ? "FIRST_PASSWORD_SETUP"
      : request.purpose === "NEW_DEVICE_LOGIN"
        ? "NEW_DEVICE_LOGIN"
        : "PASSWORD_RESET";

  const details: AuthApprovalRequestDetail[] = [
    {
      label: "المستخدم",
      value: `${request.user.firstName} ${request.user.lastName}`.trim(),
    },
  ];

  if (request.user.phoneE164) {
    details.push({
      label: "الهاتف",
      value: request.user.phoneE164,
    });
  }

  if (request.deviceLabel) {
    details.push({
      label: "الجهاز",
      value: request.deviceLabel,
    });
  }

  if (request.ipAddress) {
    details.push({
      label: "IP",
      value: request.ipAddress,
    });
  }

  return {
    request,
    kind,
    title: AUTH_APPROVAL_TITLES[kind],
    subtitle: AUTH_APPROVAL_SUBTITLES[kind],
    details,
  };
}

export function UserNotificationsWorkspace() {
  const { hasPermission } = useRbac();
  const canUpdate = hasPermission("user-notifications.update");
  const canDelete = hasPermission("user-notifications.delete");
  const canManageApprovals = hasPermission("users.update");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [readFilter, setReadFilter] = React.useState<"all" | "read" | "unread">("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | UserNotificationType>("all");

  const notificationsQuery = useUserNotificationsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    isRead:
      readFilter === "all" ? undefined : readFilter === "read",
    notificationType: typeFilter === "all" ? undefined : typeFilter,
  });
  const pendingApprovalsQuery = usePendingAuthApprovalsQuery({
    page: 1,
    limit: 50,
    enabled: canManageApprovals,
  });

  const markReadMutation = useMarkUserNotificationReadMutation();
  const markAllReadMutation = useMarkAllUserNotificationsReadMutation();
  const deleteMutation = useDeleteUserNotificationMutation();
  const approveApprovalMutation = useApproveAuthApprovalMutation();
  const rejectApprovalMutation = useRejectAuthApprovalMutation();
  const reissueApprovalMutation = useReissueAuthApprovalMutation();
  const preferencesQuery = useUserNotificationPreferencesQuery();
  const updatePreferencesMutation = useUpdateUserNotificationPreferencesMutation();
  const [preferencesDraft, setPreferencesDraft] =
    React.useState<UserNotificationPreferences | null>(null);
  const [preferencesMessage, setPreferencesMessage] = React.useState<string | null>(null);

  const notifications = React.useMemo(
    () => notificationsQuery.data?.data ?? [],
    [notificationsQuery.data?.data],
  );
  const authApprovalCards = React.useMemo(
    () => (pendingApprovalsQuery.data?.data ?? []).map(toAuthApprovalCard),
    [pendingApprovalsQuery.data?.data],
  );
  const authApprovalRequestIds = React.useMemo(
    () => new Set(authApprovalCards.map((item) => item.request.id)),
    [authApprovalCards],
  );
  const regularNotifications = React.useMemo(
    () => notifications.filter((item) => !authApprovalRequestIds.has(item.resourceId ?? "")),
    [authApprovalRequestIds, notifications],
  );
  const pagination = notificationsQuery.data?.pagination;
  const unreadCount =
    notificationsQuery.data?.unreadCount ??
    notifications.filter((item) => !item.isRead).length;

  const mutationError =
    (markReadMutation.error as Error | null)?.message ??
    (markAllReadMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    (approveApprovalMutation.error as Error | null)?.message ??
    (rejectApprovalMutation.error as Error | null)?.message ??
    (reissueApprovalMutation.error as Error | null)?.message ??
    (pendingApprovalsQuery.error as Error | null)?.message ??
    null;
  const preferencesError =
    (preferencesQuery.error as Error | null)?.message ??
    (updatePreferencesMutation.error as Error | null)?.message ??
    null;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!preferencesQuery.data) {
      return;
    }

    setPreferencesDraft(preferencesQuery.data);
  }, [preferencesQuery.data]);

  const handleMarkAsRead = (item: UserNotificationListItem) => {
    if (!canUpdate || item.isRead) {
      return;
    }

    markReadMutation.mutate(item.id);
  };

  const handleMarkAllRead = () => {
    if (!canUpdate || unreadCount === 0) {
      return;
    }

    markAllReadMutation.mutate();
  };

  const handleDelete = (item: UserNotificationListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الإشعار: ${item.title}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id);
  };

  const handleApprove = (requestId: string) => {
    if (!canManageApprovals) {
      return;
    }

    approveApprovalMutation.mutate(requestId);
  };

  const handleReject = (requestId: string) => {
    if (!canManageApprovals) {
      return;
    }

    rejectApprovalMutation.mutate(requestId);
  };

  const handleReissue = (requestId: string) => {
    if (!canManageApprovals) {
      return;
    }

    reissueApprovalMutation.mutate(requestId, {
      onSuccess: (response) => {
        window.alert(`كود جديد: ${response.approvalCode}`);
      },
    });
  };

  const handleTogglePreference = (
    key:
      | "inAppEnabled"
      | "actionRequiredOnly"
      | "leaveNotificationsEnabled"
      | "contractNotificationsEnabled"
      | "documentNotificationsEnabled"
      | "lifecycleNotificationsEnabled",
    checked: boolean,
  ) => {
    setPreferencesMessage(null);
    setPreferencesDraft((prev) => (prev ? { ...prev, [key]: checked } : prev));
  };

  const handleSavePreferences = () => {
    if (!preferencesDraft || !canUpdate) {
      return;
    }

    setPreferencesMessage(null);
    updatePreferencesMutation.mutate(
      {
        inAppEnabled: preferencesDraft.inAppEnabled,
        actionRequiredOnly: preferencesDraft.actionRequiredOnly,
        leaveNotificationsEnabled: preferencesDraft.leaveNotificationsEnabled,
        contractNotificationsEnabled: preferencesDraft.contractNotificationsEnabled,
        documentNotificationsEnabled: preferencesDraft.documentNotificationsEnabled,
        lifecycleNotificationsEnabled: preferencesDraft.lifecycleNotificationsEnabled,
      },
      {
        onSuccess: () => {
          setPreferencesMessage("تم حفظ تفضيلات الإشعارات بنجاح.");
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">تفضيلات الإشعارات</CardTitle>
          <CardDescription>
            التحكم في أنواع إشعارات HR التي تظهر داخل التطبيق.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {preferencesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              جارٍ تحميل التفضيلات...
            </div>
          ) : null}

          {preferencesError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {preferencesError}
            </div>
          ) : null}

          {preferencesMessage ? (
            <div
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
              data-testid="user-notification-preferences-message"
            >
              {preferencesMessage}
            </div>
          ) : null}

          {preferencesDraft ? (
            <>
              <div className="grid gap-2 md:grid-cols-2">
                <FormBooleanField
                  label="تفعيل إشعارات داخل التطبيق"
                  checked={preferencesDraft.inAppEnabled}
                  onCheckedChange={(checked) =>
                    handleTogglePreference("inAppEnabled", checked)
                  }
                  data-testid="pref-in-app-enabled"
                />
                <FormBooleanField
                  label="الإجراءات المطلوبة فقط"
                  checked={preferencesDraft.actionRequiredOnly}
                  onCheckedChange={(checked) =>
                    handleTogglePreference("actionRequiredOnly", checked)
                  }
                  data-testid="pref-action-required-only"
                />
                <FormBooleanField
                  label="إشعارات الإجازات"
                  checked={preferencesDraft.leaveNotificationsEnabled}
                  onCheckedChange={(checked) =>
                    handleTogglePreference("leaveNotificationsEnabled", checked)
                  }
                  data-testid="pref-leave-enabled"
                />
                <FormBooleanField
                  label="إشعارات العقود"
                  checked={preferencesDraft.contractNotificationsEnabled}
                  onCheckedChange={(checked) =>
                    handleTogglePreference("contractNotificationsEnabled", checked)
                  }
                  data-testid="pref-contract-enabled"
                />
                <FormBooleanField
                  label="إشعارات المستندات"
                  checked={preferencesDraft.documentNotificationsEnabled}
                  onCheckedChange={(checked) =>
                    handleTogglePreference("documentNotificationsEnabled", checked)
                  }
                  data-testid="pref-document-enabled"
                />
                <FormBooleanField
                  label="إشعارات دورة الحياة"
                  checked={preferencesDraft.lifecycleNotificationsEnabled}
                  onCheckedChange={(checked) =>
                    handleTogglePreference("lifecycleNotificationsEnabled", checked)
                  }
                  data-testid="pref-lifecycle-enabled"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleSavePreferences}
                  disabled={!canUpdate || updatePreferencesMutation.isPending}
                  data-testid="user-notification-preferences-save"
                >
                  {updatePreferencesMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : null}
                  حفظ التفضيلات
                </Button>
              </div>
              {!canUpdate ? (
                <p className="text-xs text-muted-foreground">
                  لا تملك الصلاحية المطلوبة: <code>user-notifications.update</code>.
                </p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/70 p-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">إشعاراتي</h3>
          <p className="text-xs text-muted-foreground">
            إشعارات داخلية مرتبطة بسير العمل والقرارات التشغيلية داخل النظام.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
            غير المقروء: {unreadCount}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleMarkAllRead}
            disabled={!canUpdate || markAllReadMutation.isPending || unreadCount === 0}
          >
            {markAllReadMutation.isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            قراءة الكل
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="ابحث في العنوان أو الرسالة..."
        />
        <SelectField
          value={readFilter}
          onChange={(event) => {
            setPage(1);
            setReadFilter(event.target.value as "all" | "read" | "unread");
          }}
        >
          <option value="all">كل الحالات</option>
          <option value="unread">غير المقروءة</option>
          <option value="read">المقروءة</option>
        </SelectField>
        <SelectField
          value={typeFilter}
          onChange={(event) => {
            setPage(1);
            setTypeFilter(event.target.value as "all" | UserNotificationType);
          }}
        >
          <option value="all">كل الأنواع</option>
          <option value="ACTION_REQUIRED">إجراء مطلوب</option>
          <option value="WARNING">تنبيه</option>
          <option value="SUCCESS">نجاح</option>
          <option value="INFO">معلومة</option>
        </SelectField>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            void notificationsQuery.refetch();
            if (canManageApprovals) {
              void pendingApprovalsQuery.refetch();
            }
          }}
          disabled={notificationsQuery.isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 ${notificationsQuery.isFetching ? "animate-spin" : ""}`}
          />
          تحديث
        </Button>
      </div>

      {authApprovalCards.length > 0 ? (
        <Card className="border-amber-400/30 bg-amber-500/5 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>طلبات الاعتماد</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  التفعيل الأولي:{" "}
                  {authApprovalCards.filter((item) => item.kind === "FIRST_PASSWORD_SETUP").length}
                </Badge>
                <Badge variant="secondary">
                  الأجهزة الجديدة:{" "}
                  {authApprovalCards.filter((item) => item.kind === "NEW_DEVICE_LOGIN").length}
                </Badge>
                <Badge variant="secondary">
                  استعادة المرور:{" "}
                  {authApprovalCards.filter((item) => item.kind === "PASSWORD_RESET").length}
                </Badge>
              </div>
            </div>
            <CardDescription>
              تظهر هنا طلبات تفعيل أول كلمة مرور وطلبات اعتماد الجهاز الجديد مع تفاصيل الطلب.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {pendingApprovalsQuery.isFetching ? (
              <div className="rounded-md border border-dashed border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">
                جارٍ تحديث طلبات الاعتماد...
              </div>
            ) : null}

            {authApprovalCards.map((card) => (
              <div
                key={card.request.id}
                className="space-y-3 rounded-lg border border-amber-400/30 bg-background/80 p-3"
                data-testid="auth-approval-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{card.title}</p>
                      <Badge variant="default">معلّق</Badge>
                      <Badge variant="secondary">إجراء مطلوب</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                    <p className="text-xs text-muted-foreground">
                      أُنشئ في: {formatDate(card.request.createdAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      معرف الطلب: <code>{card.request.id}</code>
                    </p>
                  </div>

                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <Link href="/app/user-notifications">
                        <ExternalLink className="h-3.5 w-3.5" />
                        فتح
                    </Link>
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {card.details.map((detail) => (
                    <div
                      key={`${card.request.id}-${detail.label}`}
                      className="rounded-md border border-border/60 bg-background/70 p-2"
                    >
                      <p className="text-[10px] text-muted-foreground">{detail.label}</p>
                      <p className="mt-1 break-all text-xs font-medium">{detail.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleApprove(card.request.id)}
                    disabled={!canManageApprovals || approveApprovalMutation.isPending}
                  >
                    اعتماد
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleReject(card.request.id)}
                    disabled={!canManageApprovals || rejectApprovalMutation.isPending}
                  >
                    رفض
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleReissue(card.request.id)}
                    disabled={!canManageApprovals || reissueApprovalMutation.isPending}
                  >
                    إعادة إصدار الكود
                  </Button>
                  {!canManageApprovals ? (
                    <p className="text-[10px] text-muted-foreground">
                      لا تملك الصلاحية المطلوبة: <code>users.update</code>.
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>قائمة الإشعارات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            متابعة طلبات الاعتماد والقرارات والتنبيهات المرتبطة بحسابك.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {notificationsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل الإشعارات...
            </div>
          ) : null}

          {notificationsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {notificationsQuery.error instanceof Error
                ? notificationsQuery.error.message
                : "تعذّر تحميل الإشعارات."}
            </div>
          ) : null}

          {mutationError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {mutationError}
            </div>
          ) : null}

          {!notificationsQuery.isPending &&
          authApprovalCards.length === 0 &&
          regularNotifications.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد إشعارات مطابقة.
            </div>
          ) : null}

          {regularNotifications.map((item) => (
            <div
              key={item.id}
              className={`space-y-3 rounded-lg border p-3 ${item.isRead ? "border-border/70 bg-background/60" : "border-sky-500/30 bg-sky-500/5"}`}
              data-testid="user-notification-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant={item.isRead ? "outline" : "default"}>
                      {item.isRead ? "مقروء" : "جديد"}
                    </Badge>
                    <Badge variant="secondary">{TYPE_LABELS[item.notificationType]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">
                    أُنشئ في: {formatDate(item.createdAt)}
                  </p>
                  {item.triggeredByUser ? (
                    <p className="text-xs text-muted-foreground">
                      بواسطة: {item.triggeredByUser.email}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!item.isRead ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleMarkAsRead(item)}
                      disabled={!canUpdate || markReadMutation.isPending}
                      data-testid="user-notification-mark-read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      تم الاطلاع
                    </Button>
                  ) : null}
                  {item.actionUrl ? (
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <Link href={item.actionUrl}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        فتح
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(item)}
                    disabled={!canDelete || deleteMutation.isPending}
                    data-testid="user-notification-delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
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
                disabled={!pagination || pagination.page <= 1 || notificationsQuery.isFetching}
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
                  notificationsQuery.isFetching
                }
              >
                التالي
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4" />
          <span>
            ستظهر هنا الإشعارات العامة وطلبات الاعتماد المرتبطة بحسابك، وتُعرض
            طلبات تفعيل الحساب أو اعتماد الجهاز أعلى الصفحة كبطاقات منفصلة.
          </span>
        </div>
      </div>
    </div>
  );
}
