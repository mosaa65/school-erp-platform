"use client";

import * as React from "react";
import Link from "next/link";
import {
  BellRing,
  CheckCheck,
  ExternalLink,
  RefreshCw,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Lock,
  Smartphone,
  Fingerprint,
  UserCheck,
  Clock,
} from "lucide-react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useApproveAuthApprovalMutation,
  useDeleteUserNotificationMutation,
  useMarkAllUserNotificationsReadMutation,
  useMarkUserNotificationReadMutation,
  useRejectAuthApprovalMutation,
  useUpdateUserNotificationPreferencesMutation,
} from "@/features/user-notifications/hooks/use-user-notifications-mutations";
import {
  usePendingAuthApprovalsQuery,
  useUserNotificationPreferencesQuery,
  useUserNotificationsQuery,
  type UserNotificationPreferences,
} from "@/features/user-notifications/hooks/use-user-notifications-query";
import type {
  UserNotificationType,
} from "@/lib/api/client";

const PAGE_SIZE = 12;

// Removed Type Labels

const TYPE_ICONS: Record<UserNotificationType, React.ReactNode> = {
  INFO: <Info className="h-4 w-4 text-blue-500" />,
  SUCCESS: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  ACTION_REQUIRED: <ShieldAlert className="h-4 w-4 text-rose-500" />,
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ar-YE", {
     year: 'numeric', month: '2-digit', day: '2-digit',
     hour: '2-digit', minute: '2-digit'
  });
}


function getAuthApprovalInfo(purpose: string): { title: string; icon: React.ReactNode; color: string } {
  switch (purpose) {
    case "FIRST_PASSWORD_SETUP": return { title: "تفعيل الحساب الأول", icon: <Fingerprint className="h-5 w-5" />, color: "bg-blue-500" };
    case "NEW_DEVICE_LOGIN": return { title: "اعتماد جهاز جديد", icon: <Smartphone className="h-5 w-5" />, color: "bg-amber-500" };
    case "PASSWORD_RESET": return { title: "استعادة كلمة المرور", icon: <Lock className="h-5 w-5" />, color: "bg-rose-500" };
    default: return { title: "طلب اعتماد", icon: <ShieldCheck className="h-5 w-5" />, color: "bg-primary" };
  }
}

export function UserNotificationsWorkspace() {
  const { hasPermission } = useRbac();
  const canUpdate = hasPermission("user-notifications.update");
  const canManageApprovals = hasPermission("users.update");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [readFilter, setReadFilter] = React.useState<"all" | "read" | "unread">("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | UserNotificationType>("all");

  const notificationsQuery = useUserNotificationsQuery({
    page, limit: PAGE_SIZE, search,
    isRead: readFilter === "all" ? undefined : readFilter === "read",
    notificationType: typeFilter === "all" ? undefined : typeFilter,
  });

  const pendingApprovalsQuery = usePendingAuthApprovalsQuery({
    page: 1, limit: 50, enabled: canManageApprovals,
  });

  const markReadMutation = useMarkUserNotificationReadMutation();
  const markAllReadMutation = useMarkAllUserNotificationsReadMutation();
  const deleteMutation = useDeleteUserNotificationMutation();
  const approveMutation = useApproveAuthApprovalMutation();
  const rejectMutation = useRejectAuthApprovalMutation();
  const preferencesQuery = useUserNotificationPreferencesQuery();
  const updatePrefsMutation = useUpdateUserNotificationPreferencesMutation();

  const [prefsDraft, setPrefsDraft] = React.useState<UserNotificationPreferences | null>(null);
  const [prefsMessage, setPrefsMessage] = React.useState<string | null>(null);

  const notifications = React.useMemo(() => notificationsQuery.data?.data ?? [], [notificationsQuery.data?.data]);
  const approvals = React.useMemo(() => pendingApprovalsQuery.data?.data ?? [], [pendingApprovalsQuery.data?.data]);
  const pagination = notificationsQuery.data?.pagination;
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (preferencesQuery.data) setPrefsDraft(preferencesQuery.data);
  }, [preferencesQuery.data]);

  const handleMarkAllRead = () => {
    if (!canUpdate || unreadCount === 0) return;
    markAllReadMutation.mutate();
  };

  const handleSavePrefs = () => {
    if (!prefsDraft || !canUpdate) return;
    updatePrefsMutation.mutate(prefsDraft, {
      onSuccess: () => {
        setPrefsMessage("تم حفظ تفضيلات الإشعارات بنجاح.");
        setTimeout(() => setPrefsMessage(null), 3000);
      }
    });
  };

  return (
    <PageShell
      title="مركز التنبيهات والاعتمادات"
      subtitle="إدارة تدفق المعلومات، طلبات الأمان، وتخصيص تجربة الإشعارات داخل النظام."
    >
      <div className="space-y-6">
        {/* Auth Approvals Section (High Priority) */}
        {approvals.length > 0 && (
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-1">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-base">طلبات اعتماد الأمان المعلقة</h3>
                <Badge variant="secondary" className="rounded-full">{approvals.length}</Badge>
             </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approvals.map((req) => {
                  const info = getAuthApprovalInfo(req.purpose);
                  return (
                    <Card key={req.id} className="border-amber-400/30 bg-amber-500/5 backdrop-blur-sm relative overflow-hidden group">
                       <div className={`absolute top-0 right-0 h-1 w-full ${info.color}`} />
                       <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                             <div className={`h-10 w-10 rounded-xl ${info.color} flex items-center justify-center text-white shadow-lg`}>
                                {info.icon}
                             </div>
                             <div>
                                <CardTitle className="text-sm font-bold">{info.title}</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold tracking-tighter opacity-70">
                                   ID: {req.id.slice(0, 8)}...
                                </CardDescription>
                             </div>
                          </div>
                       </CardHeader>
                       <CardContent className="space-y-4">
                          <div className="space-y-2 rounded-xl bg-background/50 border border-border/40 p-3">
                             <div className="flex items-center gap-2 text-[11px]">
                                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-bold">{req.user.firstName} {req.user.lastName}</span>
                             </div>
                             {req.deviceLabel && (
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                   <Smartphone className="h-3 w-3" />
                                   <span>{req.deviceLabel}</span>
                                </div>
                             )}
                             <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(req.createdAt)}</span>
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <Button size="sm" className="flex-1 font-bold h-8" onClick={() => approveMutation.mutate(req.id)} disabled={!canManageApprovals}>اعتماد</Button>
                             <Button size="sm" variant="outline" className="flex-1 font-bold h-8 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => rejectMutation.mutate(req.id)} disabled={!canManageApprovals}>رفض</Button>
                          </div>
                       </CardContent>
                    </Card>
                  );
                })}
             </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr,350px]">
          {/* Main Notifications List */}
          <div className="space-y-4">
            <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/60 pb-6">
                 <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <BellRing className="h-5 w-5 text-primary" />
                       <div>
                          <CardTitle className="text-lg font-bold">سجل الإشعارات</CardTitle>
                          <CardDescription>إدارة التنبيهات الواردة والقرارات التشغيلية.</CardDescription>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="outline" size="sm" className="gap-1.5 h-8 font-bold" onClick={handleMarkAllRead} disabled={unreadCount === 0 || markAllReadMutation.isPending}>
                          <CheckCheck className="h-3.5 w-3.5" /> قراءة الكل
                       </Button>
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => void notificationsQuery.refetch()}>
                          <RefreshCw className={`h-4 w-4 ${notificationsQuery.isFetching ? 'animate-spin' : ''}`} />
                       </Button>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="p-4 border-b border-border/40 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="بحث في الإشعارات..." className="h-9" />
                    <SelectField value={readFilter} onChange={e => setReadFilter(e.target.value as "all" | "read" | "unread")}>
                       <option value="all">كل الحالات</option>
                       <option value="unread">غير المقروءة</option>
                       <option value="read">المقروءة</option>
                    </SelectField>
                    <SelectField value={typeFilter} onChange={e => setTypeFilter(e.target.value as "all" | UserNotificationType)}>
                       <option value="all">كل الأنواع</option>
                       <option value="INFO">معلومات</option>
                       <option value="SUCCESS">نجاح العمليات</option>
                       <option value="WARNING">تنبيهات</option>
                       <option value="ACTION_REQUIRED">إجراءات مطلوبة</option>
                    </SelectField>
                 </div>

                 {notificationsQuery.isPending && <div className="p-12 text-center animate-pulse text-muted-foreground text-sm font-bold">جارٍ المسح الضوئي للتنبيهات...</div>}

                 <div className="divide-y divide-border/40">
                    {notifications.map(item => (
                       <div key={item.id} className={`p-4 transition-colors group ${item.isRead ? 'bg-transparent' : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary'}`}>
                          <div className="flex items-start gap-4">
                             <div className="mt-1">{TYPE_ICONS[item.notificationType]}</div>
                             <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                   <p className={`text-sm font-bold ${item.isRead ? 'text-foreground/70' : 'text-foreground'}`}>{item.title}</p>
                                   <span className="text-[10px] text-muted-foreground font-bold font-mono">{formatDate(item.createdAt)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{item.message}</p>
                                <div className="pt-2 flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                      {!item.isRead && (
                                         <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold px-2 py-0 hover:bg-primary/10" onClick={() => markReadMutation.mutate(item.id)}>تم الاطلاع</Button>
                                      )}
                                      {item.actionUrl && (
                                         <Button variant="link" size="sm" className="h-7 text-[10px] font-bold px-0 p-2 gap-1" asChild>
                                            <Link href={item.actionUrl}><ExternalLink className="h-3 w-3" /> عرض التفاصيل</Link>
                                         </Button>
                                      )}
                                   </div>
                                   <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-destructive group-hover:bg-destructive/5" onClick={() => {
                                      if(window.confirm("حذف الإشعار؟")) deleteMutation.mutate(item.id);
                                   }}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>

                 {!notificationsQuery.isPending && notifications.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground opacity-50 text-xs font-bold italic">صندوق الوارد نظيف تماماً.</div>
                 )}

                 <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 italic tracking-widest">Notification Engine v2.0</p>
                    <div className="flex items-center gap-2">
                       <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold" onClick={() => setPage(p => Math.max(p-1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                       <span className="text-[10px] font-bold px-2">Page {pagination?.page || 1} / {pagination?.totalPages || 1}</span>
                       <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold" onClick={() => setPage(p => pagination ? Math.min(p+1, pagination.totalPages) : p)} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: Preferences */}
          <div className="space-y-4">
             <Card className="border-border/70 bg-card/80 backdrop-blur-sm sticky top-4">
                <CardHeader className="pb-4">
                   <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm font-bold">إعدادات الإشعارات</CardTitle>
                   </div>
                </CardHeader>
                <CardContent className="space-y-6">
                   {prefsDraft ? (
                      <>
                        <div className="space-y-4">
                           <div className="space-y-3">
                              <p className="text-[10px] font-black uppercase text-muted-foreground border-b border-border/40 pb-1">القنوات التعليمية</p>
                              {[
                                 { key: "inAppEnabled" as const, label: "تفعيل الإشعارات داخل التطبيق" },
                                 { key: "actionRequiredOnly" as const, label: "الإجراءات المطلوبة فقط" },
                              ].map(item => (
                                 <label key={item.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 cursor-pointer transition-colors">
                                    <span className="text-[11px] font-bold grow">{item.label}</span>
                                    <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={prefsDraft[item.key]} onChange={e => setPrefsDraft(p => p ? { ...p, [item.key]: e.target.checked } : p)} />
                                 </label>
                              ))}
                           </div>
                           
                           <div className="space-y-3 pt-2">
                              <p className="text-[10px] font-black uppercase text-muted-foreground border-b border-border/40 pb-1">الأقسام المشمولة</p>
                              {[
                                 { key: "leaveNotificationsEnabled" as const, label: "إشعارات الإجازات" },
                                 { key: "contractNotificationsEnabled" as const, label: "إشعارات العقود" },
                                 { key: "documentNotificationsEnabled" as const, label: "إشعارات المستندات" },
                                 { key: "lifecycleNotificationsEnabled" as const, label: "إشعارات دورة الحياة" },
                              ].map(item => (
                                 <label key={item.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 cursor-pointer transition-colors">
                                    <span className="text-[11px] font-bold grow">{item.label}</span>
                                    <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={prefsDraft[item.key]} onChange={e => setPrefsDraft(p => p ? { ...p, [item.key]: e.target.checked } : p)} />
                                 </label>
                              ))}
                           </div>
                        </div>

                        <Button className="w-full font-bold h-9" onClick={handleSavePrefs} disabled={updatePrefsMutation.isPending}>
                           {updatePrefsMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />}
                           حفظ التفضيلات
                        </Button>

                        {prefsMessage && (
                           <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold text-center animate-in fade-in slide-in-from-top-1">
                              {prefsMessage}
                           </div>
                        )}
                      </>
                   ) : (
                      <div className="p-8 text-center animate-pulse opacity-40 italic text-xs">تحميل الإعدادات...</div>
                   )}
                </CardContent>
             </Card>

             <div className="p-4 rounded-2xl border border-dashed border-border/70 bg-muted/10">
                <div className="flex items-start gap-3">
                   <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                   <p className="text-[11px] text-muted-foreground leading-relaxed">تُستخدم هذه التفضيلات للتحكم في نوعية البيانات المرسلة لحسابك. يتم معالجة طلبات الأمان بشكل منفصل لضمان حماية النظام.</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
