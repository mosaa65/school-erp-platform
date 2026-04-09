"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, RefreshCcw, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InternationalPhoneField } from "@/components/ui/international-phone-field";
import { PasswordFieldWithBiometricAction } from "@/components/ui/password-field-with-biometric-action";
import {
  apiClient,
  type AccountApprovalPendingResponse,
} from "@/lib/api/client";

type RecoveryMode = "forgot" | "change" | null;
type ForgotMethod = "phone" | "email";
type ChangeMethod = "phone" | "email";

const DEVICE_ID_STORAGE_KEY = "school_erp_device_id";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "web:ssr";
  }

  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `web:${crypto.randomUUID()}`
      : `web:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}

function buildDeviceLabel(): string {
  if (typeof navigator === "undefined") {
    return "Web Client";
  }

  const navigatorWithUAData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };

  const platform =
    navigatorWithUAData.userAgentData?.platform ?? navigator.platform ?? "Web";
  const language = navigator.language ?? "en";
  return `${platform} (${language})`.slice(0, 191);
}

export function AuthRecoveryPanels() {
  const [mode, setMode] = React.useState<RecoveryMode>(null);
  const [forgotMethod, setForgotMethod] = React.useState<ForgotMethod>("phone");
  const [forgotPhoneCountryIso2, setForgotPhoneCountryIso2] = React.useState("YE");
  const [forgotPhoneNationalNumber, setForgotPhoneNationalNumber] =
    React.useState("");
  const [forgotPhoneE164, setForgotPhoneE164] = React.useState("");
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [forgotRequest, setForgotRequest] =
    React.useState<AccountApprovalPendingResponse | null>(null);
  const [forgotApprovalCode, setForgotApprovalCode] = React.useState("");
  const [forgotNewPassword, setForgotNewPassword] = React.useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = React.useState("");

  const [changeMethod, setChangeMethod] = React.useState<ChangeMethod>("phone");
  const [changePhoneCountryIso2, setChangePhoneCountryIso2] = React.useState("YE");
  const [changePhoneNationalNumber, setChangePhoneNationalNumber] =
    React.useState("");
  const [changePhoneE164, setChangePhoneE164] = React.useState("");
  const [changeEmail, setChangeEmail] = React.useState("");
  const [changeCurrentPassword, setChangeCurrentPassword] = React.useState("");
  const [changeNewPassword, setChangeNewPassword] = React.useState("");
  const [changeConfirmPassword, setChangeConfirmPassword] = React.useState("");
  const [panelMessage, setPanelMessage] = React.useState<string | null>(null);
  const [panelError, setPanelError] = React.useState<string | null>(null);

  const beginForgotMutation = useMutation({
    mutationFn: (payload: { loginId: string }) =>
      apiClient.beginForgotPasswordReset({
        loginId: payload.loginId,
        deviceId: getOrCreateDeviceId(),
        deviceLabel: buildDeviceLabel(),
      }),
    onSuccess: (response) => {
      setForgotRequest(response);
      setForgotApprovalCode("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setPanelMessage("تم إنشاء طلب الاستعادة. أدخل الكود الجديد ثم كلمة المرور الجديدة.");
      setPanelError(null);
    },
  });

  const completeForgotMutation = useMutation({
    mutationFn: (payload: {
      requestId: string;
      approvalCode: string;
      newPassword: string;
      confirmPassword: string;
    }) =>
      apiClient.completeForgotPasswordReset({
        requestId: payload.requestId,
        approvalCode: payload.approvalCode,
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword,
        deviceId: getOrCreateDeviceId(),
        deviceLabel: buildDeviceLabel(),
      }),
    onSuccess: () => {
      setForgotRequest(null);
      setForgotApprovalCode("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setPanelMessage("تمت إعادة تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.");
      setPanelError(null);
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
      setChangeCurrentPassword("");
      setChangeNewPassword("");
      setChangeConfirmPassword("");
      setPanelMessage("تم تغيير كلمة المرور بنجاح.");
      setPanelError(null);
    },
  });

  const isSubmitting =
    beginForgotMutation.isPending ||
    completeForgotMutation.isPending ||
    changePasswordMutation.isPending;

  const mutationError =
    (beginForgotMutation.error as Error | null)?.message ??
    (completeForgotMutation.error as Error | null)?.message ??
    (changePasswordMutation.error as Error | null)?.message ??
    null;

  const handleBeginForgot = () => {
    setPanelMessage(null);
    setPanelError(null);

    const loginId =
      forgotMethod === "phone"
        ? forgotPhoneE164.trim()
        : forgotEmail.trim().toLowerCase();

    if (!loginId) {
      setPanelError("أدخل هوية الحساب أولًا.");
      return;
    }

    if (forgotMethod === "email" && !isValidEmail(loginId)) {
      setPanelError("صيغة البريد الإلكتروني غير صحيحة.");
      return;
    }

    beginForgotMutation.mutate({ loginId });
  };

  const handleCompleteForgot = () => {
    setPanelMessage(null);
    setPanelError(null);

    if (!forgotRequest) {
      setPanelError("لا يوجد طلب استعادة نشط.");
      return;
    }

    if (forgotApprovalCode.trim().length < 6) {
      setPanelError("أدخل كود الموافقة المكوّن من 6 أرقام.");
      return;
    }

    if (forgotNewPassword.trim().length < 8) {
      setPanelError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setPanelError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    completeForgotMutation.mutate({
      requestId: forgotRequest.requestId,
      approvalCode: forgotApprovalCode.trim(),
      newPassword: forgotNewPassword,
      confirmPassword: forgotConfirmPassword,
    });
  };

  const handleChangePassword = () => {
    setPanelMessage(null);
    setPanelError(null);

    const loginId =
      changeMethod === "phone"
        ? changePhoneE164.trim()
        : changeEmail.trim().toLowerCase();

    if (!loginId) {
      setPanelError("أدخل هوية الحساب أولًا.");
      return;
    }

    if (changeMethod === "email" && !isValidEmail(loginId)) {
      setPanelError("صيغة البريد الإلكتروني غير صحيحة.");
      return;
    }

    if (changeCurrentPassword.trim().length < 8) {
      setPanelError("أدخل كلمة المرور الحالية بشكل صحيح.");
      return;
    }

    if (changeNewPassword.trim().length < 8) {
      setPanelError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (changeNewPassword !== changeConfirmPassword) {
      setPanelError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    changePasswordMutation.mutate({
      loginId,
      currentPassword: changeCurrentPassword,
      newPassword: changeNewPassword,
      confirmPassword: changeConfirmPassword,
    });
  };

  return (
    <section className="space-y-3 rounded-[1.5rem] border border-border/60 bg-muted/25 p-4 text-right">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Badge
            variant="secondary"
            className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
          >
            أدوات كلمة المرور
          </Badge>
          <p className="text-sm font-bold text-foreground">
            استعادة أو تغيير كلمة المرور
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
          <Button
            type="button"
            variant={mode === "forgot" ? "default" : "outline"}
            className="h-10 rounded-2xl px-4 text-sm"
            onClick={() => setMode(mode === "forgot" ? null : "forgot")}
          >
            <RefreshCcw className="h-4 w-4" />
            نسيت كلمة المرور
          </Button>
          <Button
            type="button"
            variant={mode === "change" ? "default" : "outline"}
            className="h-10 rounded-2xl px-4 text-sm"
            onClick={() => setMode(mode === "change" ? null : "change")}
          >
            <KeyRound className="h-4 w-4" />
            تغيير كلمة المرور
          </Button>
        </div>
      </div>

      {mode === "forgot" ? (
        <div className="space-y-3 rounded-[1.25rem] border border-dashed border-border/70 bg-background/70 p-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setForgotMethod("phone")}
              className={`rounded-[1rem] px-3 py-2 text-sm font-bold transition ${
                forgotMethod === "phone"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              رقم الهاتف
            </button>
            <button
              type="button"
              onClick={() => setForgotMethod("email")}
              className={`rounded-[1rem] px-3 py-2 text-sm font-bold transition ${
                forgotMethod === "email"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              البريد الإلكتروني
            </button>
          </div>

          {forgotMethod === "phone" ? (
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/90">رقم الهاتف</label>
              <InternationalPhoneField
                countryIso2={forgotPhoneCountryIso2}
                nationalNumber={forgotPhoneNationalNumber}
                onChange={(next) => {
                  setForgotPhoneCountryIso2(next.countryIso2);
                  setForgotPhoneNationalNumber(next.nationalNumber);
                  setForgotPhoneE164(next.isValid ? next.e164 : "");
                }}
                placeholder="7XXXXXXXX"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="forgot-email" className="text-sm font-bold text-foreground/90">
                البريد الإلكتروني
              </label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="name@example.com"
                icon={<span className="text-sm">@</span>}
                className="h-11 rounded-2xl text-right"
                dir="rtl"
              />
            </div>
          )}

          {!forgotRequest ? (
            <Button
              type="button"
              className="h-11 w-full rounded-2xl"
              onClick={handleBeginForgot}
              disabled={isSubmitting}
            >
              إرسال طلب الاستعادة
            </Button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-amber-300/40 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-100">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>أدخل كود الإدارة ثم كلمة المرور الجديدة لإكمال الاستعادة.</p>
              </div>

              <Input
                type="text"
                inputMode="numeric"
                value={forgotApprovalCode}
                onChange={(event) =>
                  setForgotApprovalCode(event.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="482913"
                className="h-11 rounded-2xl text-center font-mono tracking-[0.25em]"
                dir="ltr"
              />

              <PasswordFieldWithBiometricAction
                value={forgotNewPassword}
                onChange={setForgotNewPassword}
                biometricDisabled
                onBiometricAction={() => undefined}
                autoComplete="new-password"
              />

              <PasswordFieldWithBiometricAction
                value={forgotConfirmPassword}
                onChange={setForgotConfirmPassword}
                biometricDisabled
                onBiometricAction={() => undefined}
                autoComplete="new-password"
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  className="h-11 rounded-2xl"
                  onClick={handleCompleteForgot}
                  disabled={isSubmitting}
                >
                  إكمال الاستعادة
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl"
                  onClick={() => {
                    setForgotRequest(null);
                    setForgotApprovalCode("");
                    setForgotNewPassword("");
                    setForgotConfirmPassword("");
                  }}
                  disabled={isSubmitting}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {mode === "change" ? (
        <div className="space-y-3 rounded-[1.25rem] border border-dashed border-border/70 bg-background/70 p-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setChangeMethod("phone")}
              className={`rounded-[1rem] px-3 py-2 text-sm font-bold transition ${
                changeMethod === "phone"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              رقم الهاتف
            </button>
            <button
              type="button"
              onClick={() => setChangeMethod("email")}
              className={`rounded-[1rem] px-3 py-2 text-sm font-bold transition ${
                changeMethod === "email"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              البريد الإلكتروني
            </button>
          </div>

          {changeMethod === "phone" ? (
            <InternationalPhoneField
              countryIso2={changePhoneCountryIso2}
              nationalNumber={changePhoneNationalNumber}
              onChange={(next) => {
                setChangePhoneCountryIso2(next.countryIso2);
                setChangePhoneNationalNumber(next.nationalNumber);
                setChangePhoneE164(next.isValid ? next.e164 : "");
              }}
              placeholder="7XXXXXXXX"
            />
          ) : (
            <Input
              type="email"
              value={changeEmail}
              onChange={(event) => setChangeEmail(event.target.value)}
              placeholder="name@example.com"
              className="h-11 rounded-2xl text-right"
              dir="rtl"
            />
          )}

          <div className="flex items-start gap-2 rounded-2xl border border-sky-300/40 bg-sky-50/80 p-3 text-xs text-sky-950 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              يتم التحقق من كلمة المرور الحالية ثم تحديث كلمة المرور الجديدة مباشرة.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="current-password" className="text-sm font-bold text-foreground/90">
              كلمة المرور الحالية
            </label>
            <PasswordFieldWithBiometricAction
              id="current-password"
              value={changeCurrentPassword}
              onChange={setChangeCurrentPassword}
              biometricDisabled
              onBiometricAction={() => undefined}
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="new-password-scaffold" className="text-sm font-bold text-foreground/90">
              كلمة المرور الجديدة
            </label>
            <PasswordFieldWithBiometricAction
              id="new-password-scaffold"
              value={changeNewPassword}
              onChange={setChangeNewPassword}
              biometricDisabled
              onBiometricAction={() => undefined}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm-password-scaffold"
              className="text-sm font-bold text-foreground/90"
            >
              تأكيد كلمة المرور
            </label>
            <PasswordFieldWithBiometricAction
              id="confirm-password-scaffold"
              value={changeConfirmPassword}
              onChange={setChangeConfirmPassword}
              biometricDisabled
              onBiometricAction={() => undefined}
              autoComplete="new-password"
            />
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-2xl"
            onClick={handleChangePassword}
            disabled={isSubmitting}
          >
            حفظ التغيير
          </Button>
        </div>
      ) : null}

      {panelMessage ? (
        <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
          {panelMessage}
        </div>
      ) : null}

      {panelError || mutationError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {panelError ?? mutationError}
        </div>
      ) : null}
    </section>
  );
}
