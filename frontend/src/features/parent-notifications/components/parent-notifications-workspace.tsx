"use client";

import * as React from "react";
import {
  BellRing,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentPickerSheet } from "@/components/ui/student-picker-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useRelationshipTypeOptionsQuery } from "@/features/student-guardians/hooks/use-relationship-type-options-query";
import {
  useCreateParentNotificationMutation,
  useDeleteParentNotificationMutation,
  useUpdateParentNotificationMutation,
} from "@/features/parent-notifications/hooks/use-parent-notifications-mutations";
import { useParentNotificationsQuery } from "@/features/parent-notifications/hooks/use-parent-notifications-query";
import type { StudentPickerOption } from "@/features/students/lib/student-picker";
import type {
  ParentNotificationListItem,
  ParentNotificationSendMethod,
  ParentNotificationType,
} from "@/lib/api/client";

const NOTIFICATION_TYPE_LABELS: Record<ParentNotificationType, string> = {
  POSITIVE: "إيجابي",
  NEGATIVE: "سلبي",
};

const SEND_METHOD_LABELS: Record<ParentNotificationSendMethod, string> = {
  PAPER: "ورقي",
  WHATSAPP: "واتس",
  PHONE: "هاتف",
  OTHER: "أخرى",
};

type ParentNotificationFormState = {
  studentId: string;
  notificationType: ParentNotificationType;
  guardianTitleId: string;
  behaviorType: string;
  behaviorDescription: string;
  requiredAction: string;
  sendMethod: ParentNotificationSendMethod;
  messengerName: string;
  isSent: boolean;
  sentDate: string;
  results: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: ParentNotificationFormState = {
  studentId: "",
  notificationType: "NEGATIVE",
  guardianTitleId: "",
  behaviorType: "",
  behaviorDescription: "",
  requiredAction: "",
  sendMethod: "PAPER",
  messengerName: "",
  isSent: false,
  sentDate: "",
  results: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateInput(isoDate: string | null): string {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toDateIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ar-YE");
}

function toFormState(item: ParentNotificationListItem): ParentNotificationFormState {
  return {
    studentId: item.studentId,
    notificationType: item.notificationType,
    guardianTitleId:
      item.guardianTitleId === null ? "" : String(item.guardianTitleId),
    behaviorType: item.behaviorType ?? "",
    behaviorDescription: item.behaviorDescription ?? "",
    requiredAction: item.requiredAction ?? "",
    sendMethod: item.sendMethod,
    messengerName: item.messengerName ?? "",
    isSent: item.isSent,
    sentDate: toDateInput(item.sentDate),
    results: item.results ?? "",
    isActive: item.isActive,
  };
}

function buildStudentPickerOptionFromNotification(
  item: ParentNotificationListItem,
): StudentPickerOption {
  return {
    id: item.studentId,
    title: item.student.fullName,
    subtitle: item.student.admissionNo
      ? `رقم الطالب ${item.student.admissionNo}`
      : "بدون رقم طالب",
    meta: null,
    groupLabel: "الطالب المحدد",
  };
}

export function ParentNotificationsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("parent-notifications.create");
  const canUpdate = hasPermission("parent-notifications.update");
  const canDelete = hasPermission("parent-notifications.delete");
  const canReadStudents = hasPermission("students.read");
  const canReadRelationshipTypes = hasPermission("lookup-catalog.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState<ParentNotificationType | "all">("all");
  const [sentFilter, setSentFilter] = React.useState<"all" | "sent" | "not-sent">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingNotificationId, setEditingNotificationId] = React.useState<string | null>(
    null,
  );
  const [formState, setFormState] = React.useState<ParentNotificationFormState>(
    DEFAULT_FORM_STATE,
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [selectedFormStudent, setSelectedFormStudent] = React.useState<StudentPickerOption | null>(
    null,
  );
  const [selectedFilterStudentOption, setSelectedFilterStudentOption] =
    React.useState<StudentPickerOption | null>(null);

  const notificationsQuery = useParentNotificationsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    notificationType: typeFilter === "all" ? undefined : typeFilter,
    isSent: sentFilter === "all" ? undefined : sentFilter === "sent",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const relationshipTypeOptionsQuery = useRelationshipTypeOptionsQuery();

  const createMutation = useCreateParentNotificationMutation();
  const updateMutation = useUpdateParentNotificationMutation();
  const deleteMutation = useDeleteParentNotificationMutation();

  const notifications = React.useMemo(
    () => notificationsQuery.data?.data ?? [],
    [notificationsQuery.data?.data],
  );
  const pagination = notificationsQuery.data?.pagination;
  const isEditing = editingNotificationId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = notifications.some((item) => item.id === editingNotificationId);
    if (!stillExists) {
      setEditingNotificationId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setSelectedFormStudent(null);
    }
  }, [editingNotificationId, isEditing, notifications]);

  const resetForm = () => {
    setEditingNotificationId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setSelectedFormStudent(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.studentId) {
      setFormError("الطالب مطلوب.");
      return false;
    }

    if (!formState.notificationType) {
      setFormError("نوع الإشعار مطلوب.");
      return false;
    }

    if (!formState.isSent && formState.sentDate) {
      setFormError("لا يمكن تحديد تاريخ الإرسال إذا كان الإشعار غير مرسل.");
      return false;
    }

    if (formState.behaviorType.trim().length > 100) {
      setFormError("نوع السلوك يجب ألا يتجاوز 100 حرف.");
      return false;
    }

    if (formState.behaviorDescription.trim().length > 1000) {
      setFormError("وصف السلوك يجب ألا يتجاوز 1000 حرف.");
      return false;
    }

    if (formState.requiredAction.trim().length > 1000) {
      setFormError("الإجراء المطلوب يجب ألا يتجاوز 1000 حرف.");
      return false;
    }

    if (formState.results.trim().length > 1000) {
      setFormError("النتائج يجب ألا تتجاوز 1000 حرف.");
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
      studentId: formState.studentId,
      notificationType: formState.notificationType,
      guardianTitleId: formState.guardianTitleId
        ? Number(formState.guardianTitleId)
        : undefined,
      behaviorType: toOptionalString(formState.behaviorType),
      behaviorDescription: toOptionalString(formState.behaviorDescription),
      requiredAction: toOptionalString(formState.requiredAction),
      sendMethod: formState.sendMethod,
      messengerName: toOptionalString(formState.messengerName),
      isSent: formState.isSent,
      sentDate: formState.sentDate ? toDateIso(formState.sentDate) : undefined,
      results: toOptionalString(formState.results),
      isActive: formState.isActive,
    };

    if (isEditing && editingNotificationId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: parent-notifications.update.");
        return;
      }

      updateMutation.mutate(
        {
          notificationId: editingNotificationId,
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
      setFormError("لا تملك الصلاحية المطلوبة: parent-notifications.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (item: ParentNotificationListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingNotificationId(item.id);
    setFormState(toFormState(item));
    setSelectedFormStudent(buildStudentPickerOptionFromNotification(item));
  };

  const handleDelete = (item: ParentNotificationListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف إشعار رقم ${item.notificationNumber} للطالب ${item.student.fullName}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingNotificationId === item.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[480px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل إشعار ولي أمر" : "إضافة إشعار ولي أمر"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث تفاصيل الإشعار ونتائج المتابعة."
              : "إنشاء إشعار رسمي موجّه لولي الأمر."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>parent-notifications.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الطالب *</label>
                <StudentPickerSheet
                  scope="parent-notifications"
                  variant="form"
                  value={formState.studentId}
                  selectedOption={selectedFormStudent}
                  onSelect={(option) => {
                    setSelectedFormStudent(option);
                    setFormState((prev) => ({ ...prev, studentId: option?.id ?? "" }));
                  }}
                  disabled={!canReadStudents}
                  triggerTestId="parent-notification-form-student"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">نوع الإشعار *</label>
                  <select
                    data-testid="parent-notification-form-type"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.notificationType}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        notificationType: event.target.value as ParentNotificationType,
                      }))
                    }
                  >
                    {(Object.keys(NOTIFICATION_TYPE_LABELS) as ParentNotificationType[]).map(
                      (type) => (
                        <option key={type} value={type}>
                          {NOTIFICATION_TYPE_LABELS[type]}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">صفة ولي الأمر</label>
                  <select
                    data-testid="parent-notification-form-guardian-title"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.guardianTitleId}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, guardianTitleId: event.target.value }))
                    }
                    disabled={!canReadRelationshipTypes}
                  >
                    <option value="">غير محدد</option>
                    {(relationshipTypeOptionsQuery.data ?? []).map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.nameAr ?? item.code ?? item.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">نوع السلوك</label>
                <Input
                  data-testid="parent-notification-form-behavior-type"
                  value={formState.behaviorType}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, behaviorType: event.target.value }))
                  }
                  placeholder="مثال: سلوكي"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">وصف السلوك</label>
                <textarea
                  data-testid="parent-notification-form-behavior-description"
                  className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.behaviorDescription}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      behaviorDescription: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">المطلوب من ولي الأمر</label>
                <textarea
                  data-testid="parent-notification-form-required-action"
                  className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.requiredAction}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, requiredAction: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">طريقة الإرسال</label>
                  <select
                    data-testid="parent-notification-form-send-method"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.sendMethod}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        sendMethod: event.target.value as ParentNotificationSendMethod,
                      }))
                    }
                  >
                    {(Object.keys(SEND_METHOD_LABELS) as ParentNotificationSendMethod[]).map(
                      (method) => (
                        <option key={method} value={method}>
                          {SEND_METHOD_LABELS[method]}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">اسم الرسول</label>
                  <Input
                    data-testid="parent-notification-form-messenger-name"
                    value={formState.messengerName}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, messengerName: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>تم الإرسال</span>
                  <input
                    data-testid="parent-notification-form-is-sent"
                    type="checkbox"
                    checked={formState.isSent}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, isSent: event.target.checked }))
                    }
                  />
                </label>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">تاريخ الإرسال</label>
                  <Input
                    data-testid="parent-notification-form-sent-date"
                    type="date"
                    value={formState.sentDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, sentDate: event.target.value }))
                    }
                    disabled={!formState.isSent}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">النتائج</label>
                <textarea
                  data-testid="parent-notification-form-results"
                  className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.results}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, results: event.target.value }))
                  }
                />
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>نشط</span>
                <input
                  data-testid="parent-notification-form-active"
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
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
                  data-testid="parent-notification-form-submit"
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isFormSubmitting || (!canCreate && !isEditing)}
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <BellRing className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إضافة الإشعار"}
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
            <CardTitle>إشعارات أولياء الأمور</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            متابعة الإشعارات الرسمية المرسلة لأولياء الأمور.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_minmax(220px,260px)_130px_130px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالنوع/الطالب..."
                className="pr-8"
              />
            </div>

            <StudentPickerSheet
              scope="parent-notifications"
              variant="filter"
              value={studentFilter}
              selectedOption={selectedFilterStudentOption}
              onSelect={(option) => {
                setPage(1);
                setStudentFilter(option?.id ?? "all");
                setSelectedFilterStudentOption(option);
              }}
              disabled={!canReadStudents}
            />

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={typeFilter}
              onChange={(event) => {
                setPage(1);
                setTypeFilter(event.target.value as ParentNotificationType | "all");
              }}
            >
              <option value="all">كل الأنواع</option>
              {(Object.keys(NOTIFICATION_TYPE_LABELS) as ParentNotificationType[]).map(
                (type) => (
                  <option key={type} value={type}>
                    {NOTIFICATION_TYPE_LABELS[type]}
                  </option>
                ),
              )}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={sentFilter}
              onChange={(event) => {
                setPage(1);
                setSentFilter(event.target.value as "all" | "sent" | "not-sent");
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="sent">مرسل</option>
              <option value="not-sent">غير مرسل</option>
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </select>

            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {notificationsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {notificationsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {notificationsQuery.error instanceof Error
                ? notificationsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!notificationsQuery.isPending && notifications.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {notifications.map((item) => (
            <div
              key={item.id}
              data-testid="parent-notification-card"
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    إشعار رقم {item.notificationNumber} - {item.student.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    النوع: {NOTIFICATION_TYPE_LABELS[item.notificationType]} | الإرسال: {SEND_METHOD_LABELS[item.sendMethod]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الحالة: {item.isSent ? `مرسل (${formatDate(item.sentDate)})` : "غير مرسل"}
                  </p>
                  {item.behaviorDescription ? (
                    <p className="text-xs text-muted-foreground">الوصف: {item.behaviorDescription}</p>
                  ) : null}
                  {item.requiredAction ? (
                    <p className="text-xs text-muted-foreground">المطلوب: {item.requiredAction}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={item.isSent ? "default" : "outline"}>
                    {item.isSent ? "مرسل" : "غير مرسل"}
                  </Badge>
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-testid="parent-notification-card-edit"
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
                  data-testid="parent-notification-card-delete"
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
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void notificationsQuery.refetch()}
                disabled={notificationsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${notificationsQuery.isFetching ? "animate-spin" : ""}`}
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

