"use client";

import * as React from "react";
import { BellRing, LoaderCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useUpdateUserNotificationPreferencesMutation,
} from "@/features/user-notifications/hooks/use-user-notifications-mutations";
import {
  useUserNotificationPreferencesQuery,
  useUserNotificationsUnreadCountQuery,
  type UserNotificationPreferences,
} from "@/features/user-notifications/hooks/use-user-notifications-query";
import { cn } from "@/lib/utils";

type PreferenceKey =
  | "inAppEnabled"
  | "actionRequiredOnly"
  | "leaveNotificationsEnabled"
  | "contractNotificationsEnabled"
  | "documentNotificationsEnabled"
  | "lifecycleNotificationsEnabled";

type PreferenceItem = {
  key: PreferenceKey;
  title: string;
  description: string;
};

type ProfileNotificationPreferencesProps = {
  className?: string;
};

const PREFERENCE_ITEMS: PreferenceItem[] = [
  {
    key: "inAppEnabled",
    title: "تفعيل الإشعارات داخل التطبيق",
    description: "إظهار التنبيهات التشغيلية داخل مساحة العمل.",
  },
  {
    key: "actionRequiredOnly",
    title: "الإجراءات المطلوبة فقط",
    description: "تقليل الضوضاء والتركيز على الحالات التي تحتاج تدخلاً مباشرًا.",
  },
  {
    key: "leaveNotificationsEnabled",
    title: "إشعارات الإجازات",
    description: "طلبات الإجازات، الموافقات، والتنبيهات المرتبطة بها.",
  },
  {
    key: "contractNotificationsEnabled",
    title: "إشعارات العقود",
    description: "تجديد العقود وانتهاء الصلاحية والتنبيهات المرتبطة بها.",
  },
  {
    key: "documentNotificationsEnabled",
    title: "إشعارات المستندات",
    description: "المستندات الناقصة أو القريبة من الانتهاء.",
  },
  {
    key: "lifecycleNotificationsEnabled",
    title: "إشعارات دورة الحياة",
    description: "التهيئة، إنهاء الخدمة، والمهام الإجرائية المتتابعة.",
  },
];

export function ProfileNotificationPreferences({
  className,
}: ProfileNotificationPreferencesProps) {
  const { hasPermission } = useRbac();
  const canRead = hasPermission("user-notifications.read");
  const canUpdate = hasPermission("user-notifications.update");

  const preferencesQuery = useUserNotificationPreferencesQuery({
    enabled: canRead,
  });
  const unreadCountQuery = useUserNotificationsUnreadCountQuery({
    enabled: canRead,
  });
  const updatePreferencesMutation = useUpdateUserNotificationPreferencesMutation();

  const [preferencesDraft, setPreferencesDraft] =
    React.useState<UserNotificationPreferences | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!preferencesQuery.data) {
      return;
    }

    setPreferencesDraft(preferencesQuery.data);
  }, [preferencesQuery.data]);

  const errorMessage =
    (preferencesQuery.error as Error | null)?.message ??
    (updatePreferencesMutation.error as Error | null)?.message ??
    null;

  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;

  const handlePreferenceChange = (key: PreferenceKey, value: boolean) => {
    setMessage(null);
    setPreferencesDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = () => {
    if (!preferencesDraft || !canUpdate) {
      return;
    }

    setMessage(null);
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
          setMessage("تم حفظ تفضيلات الإشعارات بنجاح.");
        },
      },
    );
  };

  if (!canRead) {
    return null;
  }

  return (
    <Card
      className={cn(
        "overflow-hidden border-white/45 bg-white/70 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5",
        className,
      )}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)] shadow-sm">
            <BellRing className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-lg">الإشعارات</CardTitle>
            <CardDescription>
              تحكم سريع في تنبيهاتك دون مغادرة الملف الشخصي.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1.35rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]/45 px-4 py-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">الحالة الحالية</p>
            <p className="text-xs text-muted-foreground">
              غير المقروء الآن: {unreadCount}
            </p>
          </div>
          <Badge
            variant={unreadCount > 0 ? "default" : "secondary"}
            className="rounded-full px-3 py-1"
          >
            <ShieldCheck className="me-1 h-3.5 w-3.5" />
            {unreadCount > 0 ? "تحتاج متابعة" : "هادئة الآن"}
          </Badge>
        </div>

        {preferencesQuery.isPending ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/55 px-4 py-5 text-sm text-muted-foreground">
            جارٍ تحميل تفضيلات الإشعارات...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        ) : null}

        {preferencesDraft ? (
          <>
            <div className="grid gap-3">
              {PREFERENCE_ITEMS.map((item, index) => (
                <React.Fragment key={item.key}>
                  <div className="flex items-start justify-between gap-3 rounded-[1.25rem] border border-border/70 bg-background/60 px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={preferencesDraft[item.key]}
                      onCheckedChange={(value) => handlePreferenceChange(item.key, value)}
                      disabled={!canUpdate}
                      className="data-[state=checked]:bg-[color:var(--app-accent-color)]"
                    />
                  </div>
                  {index < PREFERENCE_ITEMS.length - 1 ? (
                    <Separator className="bg-border/60" />
                  ) : null}
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-border/70 bg-background/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {canUpdate
                  ? "يمكنك تعديل هذه التفضيلات الآن وسيتم حفظها على حسابك الحالي."
                  : "لا تملك الصلاحية المطلوبة لتعديل تفضيلات الإشعارات."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-2xl border-[color:var(--app-accent-strong)] bg-background/80 px-4 text-[color:var(--app-accent-color)] hover:bg-[color:var(--app-accent-soft)]"
                onClick={handleSave}
                disabled={!canUpdate || updatePreferencesMutation.isPending}
              >
                {updatePreferencesMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                حفظ التفضيلات
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
