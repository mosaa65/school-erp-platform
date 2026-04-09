"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, KeyRound, LoaderCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InternationalPhoneField } from "@/components/ui/international-phone-field";
import { PasswordFieldWithBiometricAction } from "@/components/ui/password-field-with-biometric-action";
import {
  apiClient,
  type AccountApprovalPendingResponse,
} from "@/lib/api/client";

type ForgotMethod = "phone" | "email";

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
    userAgentData?: {
      platform?: string;
    };
  };

  const platform =
    navigatorWithUAData.userAgentData?.platform ?? navigator.platform ?? "Web";
  const language = navigator.language ?? "en";
  return `${platform} (${language})`.slice(0, 191);
}

export function ForgotPasswordScreen() {
  const [method, setMethod] = React.useState<ForgotMethod>("phone");
  const [phoneCountryIso2, setPhoneCountryIso2] = React.useState("YE");
  const [phoneNationalNumber, setPhoneNationalNumber] = React.useState("");
  const [phoneE164, setPhoneE164] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [request, setRequest] = React.useState<AccountApprovalPendingResponse | null>(null);
  const [approvalCode, setApprovalCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const beginForgotMutation = useMutation({
    mutationFn: (payload: { loginId: string }) =>
      apiClient.beginForgotPasswordReset({
        loginId: payload.loginId,
        deviceId: getOrCreateDeviceId(),
        deviceLabel: buildDeviceLabel(),
      }),
    onSuccess: (response) => {
      setRequest(response);
      setApprovalCode("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("تم إنشاء طلب الاستعادة. أدخل كود الإدارة وكلمة المرور الجديدة.");
      setFormError(null);
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
      setRequest(null);
      setApprovalCode("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("تمت إعادة تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.");
      setFormError(null);
    },
  });

  const isSubmitting = beginForgotMutation.isPending || completeForgotMutation.isPending;
  const mutationError =
    (beginForgotMutation.error as Error | null)?.message ??
    (completeForgotMutation.error as Error | null)?.message ??
    null;

  const handleBegin = () => {
    setNotice(null);
    setFormError(null);

    const loginId =
      method === "phone" ? phoneE164.trim() : email.trim().toLowerCase();

    if (!loginId) {
      setFormError("أدخل هوية الحساب أولًا.");
      return;
    }

    if (method === "email" && !isValidEmail(loginId)) {
      setFormError("صيغة البريد الإلكتروني غير صحيحة.");
      return;
    }

    beginForgotMutation.mutate({ loginId });
  };

  const handleComplete = () => {
    setNotice(null);
    setFormError(null);

    if (!request) {
      setFormError("لا يوجد طلب استعادة نشط.");
      return;
    }

    if (approvalCode.trim().length < 6) {
      setFormError("أدخل كود الموافقة المكوّن من 6 أرقام.");
      return;
    }

    if (newPassword.trim().length < 8) {
      setFormError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    completeForgotMutation.mutate({
      requestId: request.requestId,
      approvalCode: approvalCode.trim(),
      newPassword,
      confirmPassword,
    });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_30%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,1))] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_25%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,1))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-10 top-12 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-400/10" />
        <div className="absolute -right-10 top-16 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-400/10" />
      </div>

      <Card className="relative z-10 w-full max-w-[460px] rounded-[2rem] border border-white/60 bg-white/88 shadow-[0_32px_96px_-42px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
        <CardHeader className="space-y-4 px-8 pb-3 pt-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-primary/20 bg-primary/10 text-primary shadow-[0_18px_40px_-24px_rgba(13,148,136,0.55)]">
            <KeyRound className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-[27px] font-black tracking-tight text-slate-900 dark:text-white">
              نسيت كلمة المرور
            </CardTitle>
            <CardDescription className="mx-auto max-w-sm text-sm leading-7 text-slate-600 dark:text-slate-300">
              استعد حسابك عبر رقم الهاتف أو البريد، ثم أكمل كود الإدارة وإنشاء كلمة
              المرور الجديدة.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-8 pb-8">
          {!request ? (
            <>
              <div className="rounded-[1.4rem] border border-border/60 bg-muted/30 p-1">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setMethod("phone")}
                    className={`rounded-[1rem] px-3 py-2.5 text-sm font-bold transition ${
                      method === "phone"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    رقم الهاتف
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("email")}
                    className={`rounded-[1rem] px-3 py-2.5 text-sm font-bold transition ${
                      method === "email"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    البريد الإلكتروني
                  </button>
                </div>
              </div>

              {method === "phone" ? (
                <div className="space-y-2 text-right">
                  <label className="text-sm font-bold text-foreground/90">رقم الهاتف</label>
                  <InternationalPhoneField
                    countryIso2={phoneCountryIso2}
                    nationalNumber={phoneNationalNumber}
                    onChange={(next) => {
                      setPhoneCountryIso2(next.countryIso2);
                      setPhoneNationalNumber(next.nationalNumber);
                      setPhoneE164(next.isValid ? next.e164 : "");
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-2 text-right">
                  <label htmlFor="forgot-email" className="text-sm font-bold text-foreground/90">
                    البريد الإلكتروني
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="h-11 rounded-2xl text-right"
                    dir="rtl"
                  />
                </div>
              )}

              <Button
                type="button"
                className="h-11 w-full rounded-2xl text-sm font-extrabold"
                onClick={handleBegin}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                إرسال طلب الاستعادة
              </Button>
            </>
          ) : (
            <div className="space-y-3 rounded-[1.25rem] border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-100">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>أدخل كود الإدارة ثم كلمة المرور الجديدة لإكمال الاستعادة.</p>
              </div>

              <Input
                type="text"
                inputMode="numeric"
                value={approvalCode}
                onChange={(event) =>
                  setApprovalCode(event.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="482913"
                className="h-11 rounded-2xl text-center font-mono tracking-[0.25em]"
                dir="ltr"
              />

              <PasswordFieldWithBiometricAction
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
              />

              <PasswordFieldWithBiometricAction
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  className="h-11 rounded-2xl text-sm font-extrabold"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : null}
                  إكمال الاستعادة
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl"
                  onClick={() => {
                    setRequest(null);
                    setApprovalCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setFormError(null);
                  }}
                  disabled={isSubmitting}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          {notice ? (
            <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              {notice}
            </div>
          ) : null}

          {formError || mutationError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {formError ?? mutationError}
            </div>
          ) : null}

          <div className="pt-1 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--app-accent-color)] transition hover:opacity-80"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

