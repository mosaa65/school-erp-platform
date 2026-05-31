"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordFieldWithBiometricAction } from "@/components/ui/password-field-with-biometric-action";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { apiClient, type WebAuthnCredentialListItem } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { SectionCard, NoticeText, ProfilePageWrapper } from "./profile-shared";

type PasswordIdentityMethod = "phone" | "email";

const WEBAUTHN_QUERY_KEY = ["auth", "webauthn", "credentials"] as const;

function formatTransportLabel(transport: string): string {
  switch (transport) {
    case "internal":
      return "داخلي";
    case "hybrid":
      return "هجين";
    case "usb":
      return "USB";
    case "nfc":
      return "NFC";
    case "ble":
      return "Bluetooth";
    case "smart-card":
      return "بطاقة ذكية";
    default:
      return transport;
  }
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
  const [showPasswordForm, setShowPasswordForm] = React.useState(false);

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

  const registerPasskeyMutation = useMutation({
    mutationFn: async () => {
      const begin = await apiClient.beginWebAuthnRegistration();
      const registration = await startRegistration({
        optionsJSON: begin.options as unknown as Parameters<
          typeof startRegistration
        >[0]["optionsJSON"],
      });
      return apiClient.finishWebAuthnRegistration({
        challengeId: begin.challengeId,
        response: registration as unknown as Record<string, unknown>,
        credentialName: credentialName.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setPasskeyNotice({
        type: "success",
        message: "تم تسجيل البصمة بنجاح.",
      });
      const detected = detectCurrentDeviceName();
      setCredentialName(detected || "");
      await queryClient.invalidateQueries({ queryKey: WEBAUTHN_QUERY_KEY });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تسجيل البصمة، حاول مرة أخرى.";
      setPasskeyNotice({ type: "error", message });
    },
  });

  const removePasskeyMutation = useMutation({
    mutationFn: (credentialId: string) =>
      apiClient.removeWebAuthnCredential(credentialId),
    onSuccess: async () => {
      setPasskeyNotice({
        type: "success",
        message: "تم حذف البصمة من الحساب.",
      });
      await queryClient.invalidateQueries({ queryKey: WEBAUTHN_QUERY_KEY });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر حذف البصمة.";
      setPasskeyNotice({ type: "error", message });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { webAuthnRequired: boolean }) =>
      apiClient.updateProfile(payload),
    onSuccess: async (updated) => {
      setWebAuthnNotice({
        type: "success",
        message: "تم حفظ إعداد البصمة.",
      });
      setWebAuthnRequired(updated.webAuthnRequired);
      await queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر حفظ الإعداد.";
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
      setPasswordNotice({
        type: "success",
        message: "تم تغيير كلمة المرور بنجاح.",
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر تغيير كلمة المرور.";
      setPasswordNotice({ type: "error", message });
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
  const webAuthnError =
    webAuthnCredentialsQuery.error instanceof Error
      ? webAuthnCredentialsQuery.error.message
      : null;
  const isPasskeyBusy =
    registerPasskeyMutation.isPending || removePasskeyMutation.isPending;
  const phoneLoginId = profile?.phoneE164?.trim() ?? "";
  const emailLoginId = auth.session.user.email.trim().toLowerCase();

  const handleChangePassword = () => {
    setPasswordNotice(null);
    const loginId =
      passwordIdentityMethod === "phone" ? phoneLoginId : emailLoginId;
    if (!loginId) {
      setPasswordNotice({
        type: "error",
        message:
          "أضف رقم هاتف صالح أولًا أو استخدم البريد الإلكتروني.",
      });
      return;
    }
    if (currentPassword.trim().length < 8) {
      setPasswordNotice({
        type: "error",
        message: "أدخل كلمة المرور الحالية بشكل صحيح.",
      });
      return;
    }
    if (nextPassword.trim().length < 8) {
      setPasswordNotice({
        type: "error",
        message: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.",
      });
      return;
    }
    if (nextPassword !== confirmNextPassword) {
      setPasswordNotice({
        type: "error",
        message: "تأكيد كلمة المرور غير مطابق.",
      });
      return;
    }
    changePasswordMutation.mutate({
      loginId,
      currentPassword,
      newPassword: nextPassword,
      confirmPassword: confirmNextPassword,
    });
  };

  return (
    <ProfilePageWrapper
      title="الأمان"
      description="كلمة المرور، البصمات، والتحقق الثنائي"
      icon={ShieldCheck}
    >
      {/* ── Change Password ──────────────────────────── */}
      <SectionCard
        title="تغيير كلمة المرور"
        description="غيّر كلمة المرور مباشرةً من الملف الشخصي."
        icon={KeyRound}
      >
        {!showPasswordForm ? (
          <Button
            type="button"
            className="h-11 w-full rounded-2xl"
            onClick={() => setShowPasswordForm(true)}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            تغيير كلمة المرور
          </Button>
        ) : (
          <div className="space-y-4">
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
            <p
              className="mt-2 text-[11px] text-slate-500 dark:text-white/55"
              dir="ltr"
            >
              {passwordIdentityMethod === "phone"
                ? phoneLoginId || "لا يوجد رقم هاتف محفوظ بعد."
                : emailLoginId}
            </p>

            <div className="mt-3 space-y-2.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-white/70">
                  كلمة المرور الحالية
                </label>
                <PasswordFieldWithBiometricAction
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-white/70">
                  كلمة المرور الجديدة
                </label>
                <PasswordFieldWithBiometricAction
                  value={nextPassword}
                  onChange={setNextPassword}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-white/70">
                  تأكيد كلمة المرور
                </label>
                <PasswordFieldWithBiometricAction
                  value={confirmNextPassword}
                  onChange={setConfirmNextPassword}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-11 flex-1 rounded-2xl"
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending
                  ? "جارٍ التحديث..."
                  : "حفظ كلمة المرور الجديدة"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl sm:min-w-24"
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordNotice(null);
                }}
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
        <NoticeText notice={passwordNotice} />
      </SectionCard>

      {/* ── Passkeys ─────────────────────────────────── */}
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
            {registerPasskeyMutation.isPending
              ? "جارٍ التفعيل..."
              : "إضافة بصمة"}
          </Button>
        </div>

        {webAuthnError ? (
          <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">
            {webAuthnError}
          </p>
        ) : null}
        <NoticeText notice={passkeyNotice} />

        {/* Credentials list */}
        <div className="mt-3 space-y-2">
          {webAuthnCredentialsQuery.isLoading ? (
            <p className="text-xs text-slate-500 dark:text-white/60">
              جارٍ تحميل البصمات...
            </p>
          ) : webAuthnCredentials.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400 dark:border-white/10 dark:text-white/40">
              لا توجد بصمات مضافة بعد.
            </p>
          ) : (
            webAuthnCredentials.map(
              (credential: WebAuthnCredentialListItem) => (
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
                    onClick={() =>
                      removePasskeyMutation.mutate(credential.id)
                    }
                    disabled={isPasskeyBusy}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            )
          )}
        </div>
      </SectionCard>

      {/* ── WebAuthn as 2FA toggle ───────────────────── */}
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
          onClick={() =>
            updateProfileMutation.mutate({ webAuthnRequired })
          }
          disabled={updateProfileMutation.isPending || !profile}
        >
          {updateProfileMutation.isPending ? "جارٍ الحفظ..." : "حفظ الإعداد"}
        </Button>
        <NoticeText notice={webAuthnNotice} />
      </SectionCard>
    </ProfilePageWrapper>
  );
}
