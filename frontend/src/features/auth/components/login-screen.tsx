"use client";

import * as React from "react";
import Link from "next/link";
import { Fingerprint, LoaderCircle, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { startAuthentication } from "@simplewebauthn/browser";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InternationalPhoneField } from "@/components/ui/international-phone-field";
import { PasswordFieldWithBiometricAction } from "@/components/ui/password-field-with-biometric-action";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLoginMutation } from "@/features/auth/hooks/use-login-mutation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  apiClient,
  type AccountApprovalPendingResponse,
  type LoginMfaChallengeResponse,
  type LoginActivationRequiredResponse,
  type LoginDeviceApprovalRequiredResponse,
  type LoginWebAuthnChallengeResponse,
} from "@/lib/api/client";
import { appConfig } from "@/lib/env";

type LoginMethod = "phone" | "email";

type Grecaptcha = {
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

const DEVICE_ID_STORAGE_KEY = "school_erp_device_id";

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath) {
    return "/app";
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/app";
  }

  return nextPath;
}

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

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const loginMutation = useLoginMutation();
  const nextPath = sanitizeNextPath(searchParams.get("next"));

  const [loginMethod, setLoginMethod] = React.useState<LoginMethod>("phone");
  const [email, setEmail] = React.useState("");
  const [phoneCountryIso2, setPhoneCountryIso2] = React.useState("YE");
  const [phoneNationalNumber, setPhoneNationalNumber] = React.useState("");
  const [phoneE164, setPhoneE164] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [captchaToken, setCaptchaToken] = React.useState("");
  const [captchaError, setCaptchaError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [mfaChallenge, setMfaChallenge] =
    React.useState<LoginMfaChallengeResponse | null>(null);
  const [webauthnChallenge, setWebauthnChallenge] =
    React.useState<LoginWebAuthnChallengeResponse | null>(null);
  const [mfaCode, setMfaCode] = React.useState("");
  const [activationChallenge, setActivationChallenge] =
    React.useState<LoginActivationRequiredResponse | null>(null);
  const [activationPending, setActivationPending] =
    React.useState<AccountApprovalPendingResponse | null>(null);
  const [deviceApprovalChallenge, setDeviceApprovalChallenge] =
    React.useState<LoginDeviceApprovalRequiredResponse | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [approvalCode, setApprovalCode] = React.useState("");
  const activationNeedsApproval = activationChallenge?.requiresApproval ?? false;

  const recaptchaSiteKey = appConfig.recaptchaSiteKey.trim();
  const recaptchaAction = appConfig.recaptchaAction;

  const loadRecaptcha = React.useCallback(async () => {
    if (!recaptchaSiteKey || typeof window === "undefined") {
      return null;
    }

    const existing = (window as Window & { grecaptcha?: Grecaptcha }).grecaptcha;
    if (existing?.execute) {
      return existing;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
      document.head.appendChild(script);
    });

    const grecaptcha = (window as Window & { grecaptcha?: Grecaptcha }).grecaptcha;
    if (!grecaptcha?.execute) {
      throw new Error("reCAPTCHA not available");
    }

    return grecaptcha;
  }, [recaptchaSiteKey]);

  const resolveCaptchaToken = React.useCallback(async () => {
    if (!recaptchaSiteKey) {
      return captchaToken.trim() || undefined;
    }

    const grecaptcha = await loadRecaptcha();
    if (!grecaptcha) {
      return undefined;
    }

    return (await grecaptcha.execute(recaptchaSiteKey, {
      action: recaptchaAction,
    })) as string;
  }, [captchaToken, loadRecaptcha, recaptchaAction, recaptchaSiteKey]);

  const verifyMfaMutation = useMutation({
    mutationFn: (payload: { challengeId: string; code: string }) =>
      apiClient.verifyLoginMfa(payload),
    onSuccess: (session) => {
      auth.signIn(session);
      router.replace(nextPath);
    },
  });

  const beginActivationMutation = useMutation({
    mutationFn: (payload: {
      loginId: string;
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
      deviceId: string;
      deviceLabel: string;
    }) => apiClient.beginAccountActivation(payload),
    onSuccess: (response) => {
      if ("accessToken" in response) {
        auth.signIn(response);
        router.replace(nextPath);
        return;
      }

      setActivationPending(response);
      setApprovalCode("");
    },
  });

  const completeActivationMutation = useMutation({
    mutationFn: (payload: {
      requestId: string;
      approvalCode: string;
      deviceId: string;
      deviceLabel: string;
    }) => apiClient.completeAccountActivation(payload),
    onSuccess: (session) => {
      auth.signIn(session);
      router.replace(nextPath);
    },
  });

  const completeDeviceApprovalMutation = useMutation({
    mutationFn: (payload: { requestId: string; approvalCode: string }) =>
      apiClient.completeDeviceApproval(payload),
    onSuccess: (session) => {
      auth.signIn(session);
      router.replace(nextPath);
    },
  });

  const passkeyLoginMutation = useMutation({
    mutationFn: async () => {
      const begin = await apiClient.beginWebAuthnAuthentication();
      const assertion = await startAuthentication({
        optionsJSON: begin.options as unknown as Parameters<
          typeof startAuthentication
        >[0]["optionsJSON"],
      });

      return apiClient.finishWebAuthnAuthentication({
        challengeId: begin.challengeId,
        response: assertion as unknown as Record<string, unknown>,
        deviceId: getOrCreateDeviceId(),
        deviceLabel: buildDeviceLabel(),
      });
    },
    onSuccess: (session) => {
      auth.signIn(session);
      router.replace(nextPath);
    },
  });

  const verifyWebAuthnMutation = useMutation({
    mutationFn: async () => {
      if (!webauthnChallenge) {
        throw new Error("Missing WebAuthn challenge.");
      }

      const assertion = await startAuthentication({
        optionsJSON: webauthnChallenge.options as unknown as Parameters<
          typeof startAuthentication
        >[0]["optionsJSON"],
      });

      return apiClient.finishWebAuthnAuthentication({
        challengeId: webauthnChallenge.challengeId,
        response: assertion as unknown as Record<string, unknown>,
        deviceId: getOrCreateDeviceId(),
        deviceLabel: buildDeviceLabel(),
      });
    },
    onSuccess: (session) => {
      auth.signIn(session);
      router.replace(nextPath);
    },
  });

  React.useEffect(() => {
    if (auth.isHydrated && auth.isAuthenticated) {
      router.replace(nextPath);
    }
  }, [auth.isAuthenticated, auth.isHydrated, nextPath, router]);

  const handlePrimarySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCaptchaError(null);
    setFormError(null);

    if (deviceApprovalChallenge) {
      if (approvalCode.trim().length < 6) {
        setFormError("أدخل كود موافقة الجهاز.");
        return;
      }

      completeDeviceApprovalMutation.mutate({
        requestId: deviceApprovalChallenge.requestId,
        approvalCode: approvalCode.trim(),
      });
      return;
    }

    if (activationChallenge) {
      if (activationPending) {
        if (approvalCode.trim().length < 6) {
          setFormError("أدخل كود الموافقة لإكمال التفعيل.");
          return;
        }

        completeActivationMutation.mutate({
          requestId: activationPending.requestId,
          approvalCode: approvalCode.trim(),
          deviceId: getOrCreateDeviceId(),
          deviceLabel: buildDeviceLabel(),
        });
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

      beginActivationMutation.mutate({
        loginId: activationChallenge.loginId,
        currentPassword: password,
        newPassword,
        confirmPassword,
        deviceId: getOrCreateDeviceId(),
        deviceLabel: buildDeviceLabel(),
      });
      return;
    }

    if (mfaChallenge) {
      verifyMfaMutation.mutate({
        challengeId: mfaChallenge.challengeId,
        code: mfaCode.trim(),
      });
      return;
    }

    if (webauthnChallenge) {
      verifyWebAuthnMutation.mutate();
      return;
    }

    const loginId =
      loginMethod === "email" ? email.trim().toLowerCase() : phoneE164.trim();

    if (loginMethod === "email" && !isValidEmail(loginId)) {
      setFormError("أدخل بريدًا إلكترونيًا صحيحًا.");
      return;
    }

    if (loginMethod === "phone" && !phoneE164.trim()) {
      setFormError("أدخل رقم هاتف صحيحًا مع الدولة.");
      return;
    }

    if (password.trim().length < 8) {
      setFormError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    resolveCaptchaToken()
      .then((token) => {
        loginMutation.mutate(
          {
            loginId,
            password,
            deviceId: getOrCreateDeviceId(),
            deviceLabel: buildDeviceLabel(),
            captchaToken: token,
          },
          {
            onSuccess: (response) => {
              if ("activationRequired" in response) {
                setActivationChallenge(response);
                setActivationPending(null);
                setDeviceApprovalChallenge(null);
                setMfaChallenge(null);
                setWebauthnChallenge(null);
                setMfaCode("");
                setApprovalCode("");
                setNewPassword("");
                setConfirmPassword("");
                return;
              }

              if ("deviceApprovalRequired" in response) {
                setDeviceApprovalChallenge(response);
                setActivationChallenge(null);
                setActivationPending(null);
                setMfaChallenge(null);
                setWebauthnChallenge(null);
                setApprovalCode("");
                return;
              }

              if ("mfaRequired" in response) {
                setMfaChallenge(response);
                setWebauthnChallenge(null);
                setMfaCode("");
                return;
              }

              if ("webauthnRequired" in response) {
                setWebauthnChallenge(response);
                setMfaChallenge(null);
                setMfaCode("");
              }
            },
          },
        );
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "تعذر التحقق من reCAPTCHA.";
        setCaptchaError(message);
      });
  };

  const isSubmitting =
    loginMutation.isPending ||
    beginActivationMutation.isPending ||
    completeActivationMutation.isPending ||
    completeDeviceApprovalMutation.isPending ||
    verifyMfaMutation.isPending ||
    verifyWebAuthnMutation.isPending ||
    passkeyLoginMutation.isPending;

  const activeError = deviceApprovalChallenge
    ? completeDeviceApprovalMutation.error
    : activationPending
      ? completeActivationMutation.error
      : activationChallenge
        ? beginActivationMutation.error
        : mfaChallenge
          ? verifyMfaMutation.error
          : webauthnChallenge
            ? verifyWebAuthnMutation.error
            : passkeyLoginMutation.error ?? loginMutation.error;

  const loginError =
    activeError instanceof Error ? activeError.message : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_30%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,1))] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_25%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,1))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-10 top-12 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-400/10" />
        <div className="absolute -right-10 top-16 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-400/10" />
        <div className="absolute bottom-0 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-cyan-200/20 blur-3xl dark:bg-cyan-300/10" />
      </div>

      <Card className="relative z-10 w-full max-w-[440px] rounded-[2rem] border border-white/60 bg-white/85 shadow-[0_32px_96px_-42px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
        <CardHeader className="space-y-5 px-8 pb-4 pt-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-primary/20 bg-primary/10 text-primary shadow-[0_18px_40px_-24px_rgba(13,148,136,0.55)]">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
            >
              دخول آمن
            </Badge>
            <CardTitle className="text-[29px] font-black tracking-tight text-slate-900 dark:text-white">
              تسجيل الدخول
            </CardTitle>
            <CardDescription className="mx-auto max-w-sm text-sm leading-7 text-slate-600 dark:text-slate-300">
              ابدأ برقم الهاتف كخيار افتراضي، أو استخدم البريد الإلكتروني عند
              الحاجة للوصول إلى النظام بنفس هوية الواجهة الرئيسية وبأمان أعلى.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-2">
          <form className="space-y-5" onSubmit={handlePrimarySubmit}>
            {deviceApprovalChallenge ? (
              <>
                <div className="rounded-2xl border border-orange-300/50 bg-orange-50/70 p-3 text-right text-sm text-orange-900 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-100">
                  تم طلب موافقة إدارية لهذا الجهاز. أدخل الكود الذي وصلك من الإدارة لإكمال الدخول.
                </div>

                <div className="space-y-2 text-right">
                  <label htmlFor="device-approval-code" className="text-sm font-bold">
                    كود اعتماد الجهاز
                  </label>
                  <Input
                    id="device-approval-code"
                    type="text"
                    inputMode="numeric"
                    value={approvalCode}
                    onChange={(event) =>
                      setApprovalCode(event.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="482913"
                    required
                    minLength={6}
                    maxLength={6}
                    className="h-11 rounded-2xl text-center font-mono tracking-[0.25em]"
                    dir="ltr"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl"
                  onClick={() => {
                    setDeviceApprovalChallenge(null);
                    setApprovalCode("");
                  }}
                  disabled={isSubmitting}
                >
                  رجوع
                </Button>
              </>
            ) : activationChallenge ? (
              <>
                <div className="rounded-2xl border border-emerald-300/50 bg-emerald-50/70 p-3 text-right text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                  {activationPending
                    ? "تم إنشاء طلب التفعيل. أدخل كود الموافقة لإكمال إنشاء كلمة المرور الجديدة."
                    : activationNeedsApproval
                      ? "تم التحقق من كلمة المرور المؤقتة. أنشئ كلمة المرور الجديدة ثم أكمل كود الموافقة الإدارية."
                      : "تم التحقق من كلمة المرور المؤقتة. أنشئ الآن كلمة المرور الخاصة بك."}
                </div>

                {activationPending ? (
                  <div className="space-y-2 text-right">
                    <label htmlFor="activation-approval-code" className="text-sm font-bold">
                      كود الموافقة
                    </label>
                    <Input
                      id="activation-approval-code"
                      type="text"
                      inputMode="numeric"
                      value={approvalCode}
                      onChange={(event) =>
                        setApprovalCode(event.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="482913"
                      required
                      minLength={6}
                      maxLength={6}
                      className="h-11 rounded-2xl text-center font-mono tracking-[0.25em]"
                      dir="ltr"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 text-right">
                      <label htmlFor="new-password" className="text-sm font-bold text-foreground/90">
                        كلمة المرور الجديدة
                      </label>
                      <PasswordFieldWithBiometricAction
                        id="new-password"
                        value={newPassword}
                        onChange={setNewPassword}
                        onBiometricAction={() => undefined}
                        biometricDisabled
                        required
                        minLength={8}
                      />
                    </div>

                    <div className="space-y-2 text-right">
                      <label htmlFor="confirm-password" className="text-sm font-bold text-foreground/90">
                        تأكيد كلمة المرور
                      </label>
                      <PasswordFieldWithBiometricAction
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        onBiometricAction={() => undefined}
                        biometricDisabled
                        required
                        minLength={8}
                      />
                    </div>

                    <p className="text-xs leading-6 text-muted-foreground">
                      في الحسابات الجديدة تُستخدم كلمة مرور مؤقتة لمرة واحدة ثم تُستبدل
                      بكلمة مرور خاصة بك، وإذا تطلب الحساب موافقة إدارية فسيظهر كود
                      الموافقة بعد هذه الخطوة.
                    </p>
                  </>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl"
                  onClick={() => {
                    setActivationChallenge(null);
                    setActivationPending(null);
                    setApprovalCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={isSubmitting}
                >
                  رجوع
                </Button>
              </>
            ) : mfaChallenge ? (
              <>
                <div className="rounded-2xl border border-amber-300/50 bg-amber-50/70 p-3 text-right text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                  تم تفعيل التحقق الثنائي لهذا الحساب. أدخل الرمز لإكمال الدخول.
                </div>

                <div className="space-y-2 text-right">
                  <label htmlFor="mfa-code" className="text-sm font-bold">
                    رمز التحقق
                  </label>
                  <Input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    value={mfaCode}
                    onChange={(event) =>
                      setMfaCode(event.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="123456"
                    required
                    minLength={6}
                    maxLength={6}
                    className="h-11 rounded-2xl text-center font-mono tracking-[0.25em]"
                    dir="ltr"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl"
                  onClick={() => {
                    setMfaChallenge(null);
                    setMfaCode("");
                  }}
                  disabled={isSubmitting}
                >
                  رجوع
                </Button>
              </>
            ) : webauthnChallenge ? (
              <>
                <div className="rounded-2xl border border-sky-300/50 bg-sky-50/70 p-3 text-right text-sm text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
                  هذا الحساب يتطلب تأكيد البصمة بعد كلمة المرور. أكمل التحقق
                  للمتابعة.
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl"
                  onClick={() => setWebauthnChallenge(null)}
                  disabled={isSubmitting}
                >
                  رجوع
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-[1.4rem] border border-border/60 bg-muted/30 p-1">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null);
                        setLoginMethod("phone");
                      }}
                      className={`rounded-[1rem] px-3 py-2.5 text-sm font-bold transition ${
                        loginMethod === "phone"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      رقم الهاتف
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null);
                        setLoginMethod("email");
                      }}
                      className={`rounded-[1rem] px-3 py-2.5 text-sm font-bold transition ${
                        loginMethod === "email"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      البريد الإلكتروني
                    </button>
                  </div>
                </div>

                {loginMethod === "phone" ? (
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-bold text-foreground/90">
                      رقم الهاتف
                    </label>
                    <InternationalPhoneField
                      countryIso2={phoneCountryIso2}
                      nationalNumber={phoneNationalNumber}
                      onChange={(next) => {
                        setPhoneCountryIso2(next.countryIso2);
                        setPhoneNationalNumber(next.nationalNumber);
                        setPhoneE164(next.isValid ? next.e164 : "");
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      اختر الدولة ثم أدخل الرقم المحلي، وسيتم استخدامه كهوية
                      الدخول الأساسية.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-right">
                    <label
                      htmlFor="email"
                      className="text-sm font-bold text-foreground/90"
                    >
                      البريد الإلكتروني
                    </label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      required
                      icon={<Mail className="h-4 w-4" />}
                      className="h-11 rounded-2xl text-right"
                      dir="rtl"
                    />
                  </div>
                )}

                <div className="space-y-2 text-right">
                  <label
                    htmlFor="password"
                    className="text-sm font-bold text-foreground/90"
                  >
                    كلمة المرور
                  </label>
                  <PasswordFieldWithBiometricAction
                    id="password"
                    value={password}
                    onChange={setPassword}
                    required
                    minLength={8}
                  />
                  <p className="text-xs leading-6 text-muted-foreground">
                    للحسابات الجديدة استخدم كلمة المرور المؤقتة لمرة واحدة المرسلة إليك،
                    ثم أكمل إنشاء كلمة المرور الخاصة بك بعد التحقق.
                  </p>
                  <div className="flex items-center justify-between">
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-semibold text-[color:var(--app-accent-color)] transition hover:opacity-80"
                    >
                      نسيت كلمة المرور؟
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => passkeyLoginMutation.mutate()}
                      disabled={isSubmitting}
                      title="تسجيل الدخول بالبصمة"
                      aria-label="تسجيل الدخول بالبصمة"
                      className="h-9 w-9 rounded-full border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
                    >
                      <Fingerprint className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {recaptchaSiteKey ? (
                  <div className="rounded-2xl border border-emerald-300/50 bg-emerald-50/60 p-3 text-right text-xs font-medium text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                    حماية تسجيل الدخول مفعلة تلقائيًا.
                  </div>
                ) : (
                  <div className="space-y-2 text-right">
                    <label
                      htmlFor="captcha-token"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      CAPTCHA Token للاختبار فقط
                    </label>
                    <Input
                      id="captcha-token"
                      type="text"
                      value={captchaToken}
                      onChange={(event) => setCaptchaToken(event.target.value)}
                      placeholder="03AGdB..."
                      className="h-10 rounded-2xl font-mono text-xs"
                      dir="ltr"
                    />
                  </div>
                )}
              </>
            )}

            {formError ? (
              <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-3 text-center text-sm font-medium text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                {formError}
              </div>
            ) : null}

            {captchaError ? (
              <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-3 text-center text-sm font-medium text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                {captchaError}
              </div>
            ) : null}

            {loginError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
                {loginError}
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full gap-2 rounded-2xl text-sm font-extrabold shadow-[0_18px_42px_-24px_rgba(13,148,136,0.6)]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4 scale-x-[-1]" />
              )}
              {deviceApprovalChallenge
                ? "تأكيد الجهاز"
                : activationChallenge
                  ? activationPending
                    ? "إكمال التفعيل"
                    : "إنشاء كلمة المرور"
                : mfaChallenge
                ? "تأكيد الرمز"
                : webauthnChallenge
                  ? "تأكيد بالبصمة"
                  : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
