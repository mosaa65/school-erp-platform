"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Laptop,
  Mail,
  Monitor,
  MonitorSmartphone,
  Phone,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordFieldWithBiometricAction } from "@/components/ui/password-field-with-biometric-action";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { apiClient, type AuthSessionView, type WebAuthnCredentialListItem } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type PasswordIdentityMethod = "phone" | "email";

const WEBAUTHN_QUERY_KEY = ["auth", "webauthn", "credentials"] as const;

function formatTransportLabel(transport: string): string {
  switch (transport) {
    case "internal": return "داخلي";
    case "hybrid":   return "هجين";
    case "usb":      return "USB";
    case "nfc":      return "NFC";
    case "ble":      return "Bluetooth";
    case "smart-card": return "بطاقة ذكية";
    default:         return transport;
  }
}

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

function detectCurrentDeviceName(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
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
  return "";
}

function SectionCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/55">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function NoticeText({ notice }: { notice: { type: "success" | "error"; message: string } | null }) {
  if (!notice) return null;
  return (
    <p
      className={cn(
        "mt-2 text-xs font-medium",
        notice.type === "success"
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-rose-700 dark:text-rose-300",
      )}
    >
      {notice.message}
    </p>
  );
}

export function ProfileSecuritySection() {
  const auth = useAuth();
  const queryClient = useQueryClient();

  const [credentialName, setCredentialName] = React.useState("");
  const [passkeyNotice, setPasskeyNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [passwordNotice, setPasswordNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [webAuthnNotice, setWebAuthnNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [passwordIdentityMethod, setPasswordIdentityMethod] =
    React.useState<PasswordIdentityMethod>("phone");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [nextPassword, setNextPassword] = React.useState("");
  const [confirmNextPassword, setConfirmNextPassword] = React.useState("");

  const [webAuthnRequired, setWebAuthnRequired] = React.useState(false);
  const [webAuthnInitialized, setWebAuthnInitialized] = React.useState(false);

  React.useEffect(() => {
    const detected = detectCurrentDeviceName();
    if (detected) setCredentialName(detected);
  }, []);

  const profileQuery = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: () => apiClient.getProfile(),
    enabled: Boolean(auth.session?.accessToken),
  });

  const webAuthnCredentialsQuery = useQuery({
    queryKey: WEBAUTHN_QUERY_KEY,
    queryFn: () => apiClient.listWebAuthnCredentials(),
    enabled: Boolean(auth.session?.accessToken),
  });

  const sessionsQuery = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => apiClient.listAuthSessions(),
    enabled: Boolean(auth.session?.accessToken),
  });

  const registerPasskeyMutation = useMutation({
    mutationFn: async () => {
      const begin = await apiClient.beginWebAuthnRegistration();
      const registration = await startRegistration({
        optionsJSON: begin.options as unknown as Parameters<typeof startRegistration>[0]["optionsJSON"],
      });
      return apiClient.finishWebAuthnRegistration({
        challengeId: begin.challengeId,
        response: registration as unknown as Record<string, unknown>,
        credentialName: credentialName.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setPasskeyNotice({ type: "success", message: "تم تسجيل البصمة بنجاح." });
      const detected = detectCurrentDeviceName();
      setCredentialName(detected || "");
      await queryClient.invalidateQueries({ queryKey: WEBAUTHN_QUERY_KEY });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر تسجيل البصمة، حاول مرة أخرى.";
      setPasskeyNotice({ type: "error", message });
    },
  });

  const removePasskeyMutation = useMutation({
    mutationFn: (credentialId: string) => apiClient.removeWebAuthnCredential(credentialId),
    onSuccess: async () => {
      setPasskeyNotice({ type: "success", message: "تم حذف البصمة من الحساب." });
      await queryClient.invalidateQueries({ queryKey: WEBAUTHN_QUERY_KEY });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر حذف البصمة.";
      setPasskeyNotice({ type: "error", message });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { webAuthnRequired: boolean }) => apiClient.updateProfile(payload),
    onSuccess: async (updated) => {
      setWebAuthnNotice({ type: "success", message: "تم حفظ إعداد البصمة." });
      setWebAuthnRequired(updated.webAuthnRequired);
      await queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر حفظ الإعداد.";
      setWebAuthnNotice({ type: "error", message });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: {
      loginId: string;
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => apiClient.changePasswordByCredentials(payload),
    onSuccess: () => {
      setCurrentPassword("");
      setNextPassword("");
      setConfirmNextPassword("");
      setPasswordNotice({ type: "success", message: "تم تغيير كلمة المرور بنجاح." });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر تغيير كلمة المرور.";
      setPasswordNotice({ type: "error", message });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiClient.revokeAuthSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    },
  });

  React.useEffect(() => {
    if (webAuthnInitialized) return;
    if (profileQuery.data) {
      setWebAuthnRequired(profileQuery.data.webAuthnRequired);
      setWebAuthnInitialized(true);
    }
  }, [webAuthnInitialized, profileQuery.data]);

  React.useEffect(() => {
    if (!profileQuery.data) return;
    if (profileQuery.data.phoneE164) {
      setPasswordIdentityMethod("phone");
    } else {
      setPasswordIdentityMethod("email");
    }
  }, [profileQuery.data]);

  if (!auth.session) return null;

  const profile = profileQuery.data ?? null;
  const webAuthnCredentials = webAuthnCredentialsQuery.data ?? [];
  const webAuthnError = webAuthnCredentialsQuery.error instanceof Error
    ? webAuthnCredentialsQuery.error.message : null;
  const isPasskeyBusy = registerPasskeyMutation.isPending || removePasskeyMutation.isPending;
  const sessions = sessionsQuery.data ?? [];
  const phoneLoginId = profile?.phoneE164?.trim() ?? "";
  const emailLoginId = auth.session.user.email.trim().toLowerCase();

  const handleChangePassword = () => {
    setPasswordNotice(null);
    const loginId = passwordIdentityMethod === "phone" ? phoneLoginId : emailLoginId;
    if (!loginId) {
      setPasswordNotice({ type: "error", message: "أضف رقم هاتف صالح أولًا أو استخدم البريد الإلكتروني." });
      return;
    }
    if (currentPassword.trim().length < 8) {
      setPasswordNotice({ type: "error", message: "أدخل كلمة المرور الحالية بشكل صحيح." });
      return;
    }
    if (nextPassword.trim().length < 8) {
      setPasswordNotice({ type: "error", message: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل." });
      return;
    }
    if (nextPassword !== confirmNextPassword) {
      setPasswordNotice({ type: "error", message: "تأكيد كلمة المرور غير مطابق." });
      return;
    }
    changePasswordMutation.mutate({ loginId, currentPassword, newPassword: nextPassword, confirmPassword: confirmNextPassword });
  };

  return (
    <div className="space-y-3">

      {/* ── Change Password ────────────────────────────── */}
      <SectionCard
        title="تغيير كلمة المرور"
        description="غيّر كلمة المرور مباشرةً من الملف الشخصي."
      >
        {/* Identity method toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setPasswordIdentityMethod("phone")}
            disabled={!phoneLoginId}
            className={cn(
              "rounded-[1rem] px-3 py-2 text-sm font-bold transition",
              passwordIdentityMethod === "phone"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
              !phoneLoginId ? "cursor-not-allowed opacity-40" : "",
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              رقم الهاتف
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPasswordIdentityMethod("email")}
            className={cn(
              "rounded-[1rem] px-3 py-2 text-sm font-bold transition",
              passwordIdentityMethod === "email"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              البريد
            </span>
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-white/55" dir="ltr">
          {passwordIdentityMethod === "phone"
            ? phoneLoginId || "لا يوجد رقم هاتف محفوظ بعد."
            : emailLoginId}
        </p>

        <div className="mt-3 space-y-2.5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-white/70">كلمة المرور الحالية</label>
            <PasswordFieldWithBiometricAction value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-white/70">كلمة المرور الجديدة</label>
            <PasswordFieldWithBiometricAction value={nextPassword} onChange={setNextPassword} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-white/70">تأكيد كلمة المرور</label>
            <PasswordFieldWithBiometricAction value={confirmNextPassword} onChange={setConfirmNextPassword} autoComplete="new-password" />
          </div>
        </div>

        <Button
          type="button"
          className="mt-3 h-11 w-full rounded-2xl"
          onClick={handleChangePassword}
          disabled={changePasswordMutation.isPending}
        >
          {changePasswordMutation.isPending ? "جارٍ التحديث..." : "حفظ كلمة المرور الجديدة"}
        </Button>
        <NoticeText notice={passwordNotice} />
      </SectionCard>

      {/* ── Passkeys ───────────────────────────────────── */}
      <SectionCard
        title="البصمة / Passkeys"
        description="فعّل بصمة هذا الجهاز لاستخدامها في تسجيل الدخول."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={credentialName}
            onChange={(event) => setCredentialName(event.target.value)}
            placeholder="اسم الجهاز (اختياري)"
            className="h-11 rounded-2xl"
          />
          <Button
            type="button"
            className="h-11 rounded-2xl sm:min-w-44"
            onClick={() => registerPasskeyMutation.mutate()}
            disabled={isPasskeyBusy}
          >
            {registerPasskeyMutation.isPending ? "جارٍ التفعيل..." : "إضافة بصمة"}
          </Button>
        </div>

        {webAuthnError ? (
          <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">{webAuthnError}</p>
        ) : null}
        <NoticeText notice={passkeyNotice} />

        {/* Credentials list */}
        <div className="mt-3 space-y-2">
          {webAuthnCredentialsQuery.isLoading ? (
            <p className="text-xs text-slate-500 dark:text-white/60">جارٍ تحميل البصمات...</p>
          ) : webAuthnCredentials.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400 dark:border-white/10 dark:text-white/40">
              لا توجد بصمات مضافة بعد.
            </p>
          ) : (
            webAuthnCredentials.map((credential: WebAuthnCredentialListItem) => (
              <div
                key={credential.id}
                className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-white/65 bg-white/75 px-3 py-2.5 dark:border-white/10 dark:bg-black/25"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                    {credential.credentialName ?? "Passkey بدون اسم"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-white/55">
                    {credential.deviceType}
                    {credential.transports.length > 0
                      ? ` • ${credential.transports.map(formatTransportLabel).join(", ")}`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2 text-rose-700 hover:bg-rose-500/20 hover:text-rose-800 dark:text-rose-200"
                  onClick={() => removePasskeyMutation.mutate(credential.id)}
                  disabled={isPasskeyBusy}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      {/* ── WebAuthn as 2FA toggle ─────────────────────── */}
      <SectionCard
        title="البصمة كعامل ثانوي"
        description="عند التفعيل سيُطلب منك تأكيد البصمة بعد إدخال كلمة المرور."
      >
        <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-black/20">
          <span className="text-sm font-medium text-slate-800 dark:text-white/90">
            تفعيل البصمة كعامل ثانوي
          </span>
          <Switch
            checked={webAuthnRequired}
            disabled={!profile?.hasWebAuthnCredentials}
            onCheckedChange={(checked) => setWebAuthnRequired(checked)}
          />
        </div>
        {!profile?.hasWebAuthnCredentials ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            أضف بصمة واحدة على الأقل قبل تفعيل هذا الخيار.
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-3 h-11 w-full rounded-2xl"
          onClick={() => updateProfileMutation.mutate({ webAuthnRequired })}
          disabled={updateProfileMutation.isPending || !profile}
        >
          {updateProfileMutation.isPending ? "جارٍ الحفظ..." : "حفظ الإعداد"}
        </Button>
        <NoticeText notice={webAuthnNotice} />
      </SectionCard>

      {/* ── Active Sessions ────────────────────────────── */}
      <SectionCard
        title="الأجهزة والجلسات النشطة"
        description="راقب الأجهزة المُسجَّل دخولها وألغِ أي جلسة غير معروفة."
      >
        <div className="space-y-2">
          {sessionsQuery.isLoading ? (
            <p className="text-xs text-slate-500 dark:text-white/60">جارٍ تحميل الجلسات...</p>
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
                          آخر نشاط: {formatSessionDate(session.lastActivity)}
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
                          onClick={() => revokeSessionMutation.mutate(session.id)}
                          disabled={revokeSessionMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {(session.ipAddress || session.expiresAt) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400 dark:text-white/35">
                      {session.ipAddress && <span>IP: {session.ipAddress}</span>}
                      {session.expiresAt && <span>ينتهي: {formatSessionDate(session.expiresAt)}</span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SectionCard>

      {/* Session token info */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-[1.1rem] border border-white/70 bg-background/78 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[10px] text-slate-500 dark:text-white/50">نوع الرمز</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
            <KeyRound className="h-3 w-3 text-[color:var(--app-accent-color)]" />
            {auth.session?.tokenType ?? "—"}
          </p>
        </div>
        <div className="flex-1 rounded-[1.1rem] border border-white/70 bg-background/78 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[10px] text-slate-500 dark:text-white/50">مدة الجلسة</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-white">
            {auth.session?.expiresIn ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
