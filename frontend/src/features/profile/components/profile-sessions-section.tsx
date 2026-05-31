"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Laptop,
  Monitor,
  MonitorSmartphone,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { apiClient, type AuthSessionView } from "@/lib/api/client";
import { SectionCard, ProfilePageWrapper } from "./profile-shared";

function formatSessionDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-YE");
}

function resolveSessionDeviceIcon(session: AuthSessionView) {
  const text = [session.deviceLabel, session.userAgent, session.deviceId]
    .filter(Boolean)
    .join(" ");
  if (/iphone/i.test(text)) return Smartphone;
  if (/ipad/i.test(text)) return Tablet;
  if (/android|huawei|honor/i.test(text)) return Smartphone;
  if (/macbook|mac os x|macos|macintosh/i.test(text)) return Laptop;
  if (/windows/i.test(text)) return Monitor;
  if (/linux/i.test(text)) return Monitor;
  return MonitorSmartphone;
}

function resolveSessionDeviceName(session: AuthSessionView): string {
  if (session.deviceLabel) return session.deviceLabel;
  const ua = session.userAgent ?? "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/HUAWEI|Huawei/i.test(ua)) {
    const m = ua.match(/HUAWEI\s+([A-Z0-9-]+)/i);
    return m ? `Huawei ${m[1]}` : "Huawei";
  }
  if (/Android/i.test(ua)) {
    const m = ua.match(/\(Linux; Android [^;]+; ([^)]+)\)/);
    return m ? m[1].trim() : "Android";
  }
  if (/Macintosh/i.test(ua)) return "MacBook";
  if (/Windows NT/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux";
  return session.deviceId ?? "جهاز غير معروف";
}

export function ProfileSessionsSection() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => apiClient.listAuthSessions(),
    enabled: Boolean(auth.session?.accessToken),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiClient.revokeAuthSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    },
  });

  if (!auth.session) return null;

  const sessions = sessionsQuery.data ?? [];

  return (
    <ProfilePageWrapper
      title="الأجهزة والجلسات"
      description="راقب الأجهزة المُسجَّل دخولها وألغِ أي جلسة غير معروفة."
      icon={MonitorSmartphone}
    >
      {/* ── Active Sessions ──────────────────────────── */}
      <SectionCard
        title="الجلسات النشطة"
        description="جميع الأجهزة التي سجلت دخولك منها."
      >
        <div className="space-y-2">
          {sessionsQuery.isLoading ? (
            <p className="text-xs text-slate-500 dark:text-white/60">
              جارٍ تحميل الجلسات...
            </p>
          ) : sessions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400 dark:border-white/10 dark:text-white/40">
              لا توجد جلسات نشطة أخرى.
            </p>
          ) : (
            sessions.map((session) => {
              const DeviceIcon = resolveSessionDeviceIcon(session);
              const deviceName = resolveSessionDeviceName(session);
              return (
                <div
                  key={session.id}
                  className="rounded-[1.15rem] border border-white/65 bg-white/75 p-3 dark:border-white/10 dark:bg-black/25"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[0.75rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                        <DeviceIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                          {deviceName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-white/50">
                          آخر نشاط:{" "}
                          {formatSessionDate(session.lastActivity)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {session.isCurrent ? (
                        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                          هذه الجلسة
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2 text-rose-700 hover:bg-rose-500/20 hover:text-rose-800 dark:text-rose-200"
                          onClick={() =>
                            revokeSessionMutation.mutate(session.id)
                          }
                          disabled={revokeSessionMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {(session.ipAddress || session.expiresAt) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400 dark:text-white/35">
                      {session.ipAddress && (
                        <span>IP: {session.ipAddress}</span>
                      )}
                      {session.expiresAt && (
                        <span>
                          ينتهي: {formatSessionDate(session.expiresAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SectionCard>

      {/* ── Session token info ───────────────────────── */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-[1.1rem] border border-white/70 bg-background/78 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[10px] text-slate-500 dark:text-white/50">
            نوع الرمز
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
            <KeyRound className="h-3 w-3 text-[color:var(--app-accent-color)]" />
            {auth.session?.tokenType ?? "—"}
          </p>
        </div>
        <div className="flex-1 rounded-[1.1rem] border border-white/70 bg-background/78 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[10px] text-slate-500 dark:text-white/50">
            مدة الجلسة
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-white">
            {auth.session?.expiresIn ?? "—"}
          </p>
        </div>
      </div>
    </ProfilePageWrapper>
  );
}
