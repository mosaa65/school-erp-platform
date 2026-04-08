"use client";

import * as React from "react";
import { KeyRound, LoaderCircle, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { startAuthentication } from "@simplewebauthn/browser";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLoginMutation } from "@/features/auth/hooks/use-login-mutation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  apiClient,
  type LoginMfaChallengeResponse,
  type LoginWebAuthnChallengeResponse,
} from "@/lib/api/client";
import { appConfig } from "@/lib/env";

const DEFAULT_EMAIL = "admin@school.local";
const DEFAULT_PASSWORD = "ChangeMe123!";
const DEFAULT_COUNTRY_CODE = "+967";
const DEVICE_ID_STORAGE_KEY = "school_erp_device_id";

type LoginMethod = "email" | "phone";

type Grecaptcha = {
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
  ready?: (callback: () => void) => void;
};

const COUNTRY_CODE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "اليمن (+967)", value: "+967" },
  { label: "السعودية (+966)", value: "+966" },
  { label: "الإمارات (+971)", value: "+971" },
  { label: "مصر (+20)", value: "+20" },
  { label: "الأردن (+962)", value: "+962" },
];

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath) {
    return "/app";
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/app";
  }

  return nextPath;
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/[^\d]/g, "");
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

  const [loginMethod, setLoginMethod] = React.useState<LoginMethod>("email");
  const [email, setEmail] = React.useState(DEFAULT_EMAIL);
  const [countryCode, setCountryCode] = React.useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [password, setPassword] = React.useState(DEFAULT_PASSWORD);
  const [captchaToken, setCaptchaToken] = React.useState("");
  const [captchaError, setCaptchaError] = React.useState<string | null>(null);
  const [mfaChallenge, setMfaChallenge] =
    React.useState<LoginMfaChallengeResponse | null>(null);
  const [webauthnChallenge, setWebauthnChallenge] =
    React.useState<LoginWebAuthnChallengeResponse | null>(null);
  const [mfaCode, setMfaCode] = React.useState("");

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCaptchaError(null);

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
      loginMethod === "email"
        ? email.trim()
        : `${countryCode}${normalizePhoneNumber(phoneNumber)}`;

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
                return;
              }

              router.replace(nextPath);
            },
          },
        );
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "تعذر التحقق من reCAPTCHA.";
        setCaptchaError(message);
      });
  };

  const isSubmitting =
    loginMutation.isPending ||
    verifyMfaMutation.isPending ||
    verifyWebAuthnMutation.isPending ||
    passkeyLoginMutation.isPending;

  const activeError = mfaChallenge
    ? verifyMfaMutation.error
    : webauthnChallenge
      ? verifyWebAuthnMutation.error
      : passkeyLoginMutation.error ?? loginMutation.error;

  const loginError =
    activeError instanceof Error ? activeError.message : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50/50 dark:bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-teal-100/50 dark:bg-teal-900/20 blur-[100px]" />
        <div className="absolute -top-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-orange-100/40 dark:bg-orange-900/20 blur-[100px]" />
        <div className="absolute bottom-[20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-yellow-50/50 dark:bg-yellow-900/10 blur-[100px]" />
      </div>

      <Card className="relative z-10 w-full max-w-[420px] rounded-2xl border-border/50 bg-white/95 dark:bg-card/95 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
        <CardHeader className="space-y-4 pt-8 pb-5 text-center flex flex-col items-center">
          <Badge
            variant="secondary"
            className="gap-1.5 rounded-full px-3 py-1 font-normal text-xs bg-muted/60 text-foreground shadow-none hover:bg-muted/80"
          >
            Frontend Step 02
            <KeyRound className="h-3.5 w-3.5" />
          </Badge>
          <div className="space-y-2 flex flex-col items-center">
            <CardTitle className="text-[26px] font-bold tracking-tight">تسجيل الدخول</CardTitle>
            <CardDescription className="text-sm font-medium leading-relaxed px-2 text-center text-muted-foreground">
              ادخل بالإيميل أو رقم الهاتف للوصول إلى لوحة School ERP.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-2">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {mfaChallenge ? (
              <>
                <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 text-sm text-right text-amber-900">
                  تم تفعيل التحقق الثنائي لهذا الحساب. أدخل رمز التطبيق لإكمال تسجيل
                  الدخول.
                </div>

                <div className="space-y-2.5 text-right w-full">
                  <label
                    htmlFor="mfa-code"
                    className="text-sm font-bold text-foreground/90 block"
                  >
                    رمز التحقق (MFA)
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
                    className="h-11 rounded-lg font-mono tracking-[0.25em] text-center"
                    dir="ltr"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMfaChallenge(null);
                    setMfaCode("");
                  }}
                  disabled={isSubmitting}
                >
                  رجوع لبيانات الدخول
                </Button>
              </>
            ) : webauthnChallenge ? (
              <>
                <div className="rounded-lg border border-sky-200/70 bg-sky-50/60 p-3 text-sm text-right text-sky-900">
                  تم تفعيل تسجيل الدخول بالبصمة لهذا الحساب. اضغط على زر التأكيد
                  لإكمال الدخول.
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setWebauthnChallenge(null)}
                  disabled={isSubmitting}
                >
                  رجوع لبيانات الدخول
                </Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/30 p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setLoginMethod("email")}
                    className={`rounded-lg px-3 py-2 font-semibold transition ${
                      loginMethod === "email"
                        ? "bg-background text-foreground shadow"
                        : "text-muted-foreground"
                    }`}
                  >
                    البريد الإلكتروني
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod("phone")}
                    className={`rounded-lg px-3 py-2 font-semibold transition ${
                      loginMethod === "phone"
                        ? "bg-background text-foreground shadow"
                        : "text-muted-foreground"
                    }`}
                  >
                    رقم الهاتف
                  </button>
                </div>

                {loginMethod === "email" ? (
                  <div className="space-y-2.5 text-right w-full">
                    <label
                      htmlFor="email"
                      className="text-sm font-bold text-foreground/90 block"
                    >
                      البريد الإلكتروني
                    </label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="admin@school.local"
                      required
                      className="h-11 rounded-lg font-medium text-right direction-rtl placeholder:text-muted-foreground/60 w-full focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 transition-colors"
                      dir="rtl"
                    />
                  </div>
                ) : (
                  <div className="space-y-2.5 text-right w-full">
                    <label
                      htmlFor="phone"
                      className="text-sm font-bold text-foreground/90 block"
                    >
                      رقم الهاتف
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="country-code"
                        value={countryCode}
                        onChange={(event) => setCountryCode(event.target.value)}
                        className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
                      >
                        {COUNTRY_CODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        placeholder="7XXXXXXXX"
                        required
                        className="h-11 rounded-lg font-medium text-right direction-rtl placeholder:text-muted-foreground/60 w-full focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 transition-colors"
                        dir="rtl"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 text-right w-full">
                  <label
                    htmlFor="password"
                    className="text-sm font-bold text-foreground/90 block"
                  >
                    كلمة المرور
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="h-11 rounded-lg tracking-[0.2em] font-medium text-right direction-rtl placeholder:text-muted-foreground/60 w-full focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 transition-colors"
                    dir="rtl"
                  />
                </div>

                {recaptchaSiteKey ? (
                  <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-3 text-xs text-right text-emerald-900">
                    حماية الدخول عبر reCAPTCHA مفعلة تلقائيًا.
                  </div>
                ) : (
                  <div className="space-y-2.5 text-right w-full">
                    <label
                      htmlFor="captcha-token"
                      className="text-xs font-semibold text-muted-foreground block"
                    >
                      CAPTCHA Token (اختياري - يطلب بعد محاولات فاشلة متكررة)
                    </label>
                    <Input
                      id="captcha-token"
                      type="text"
                      value={captchaToken}
                      onChange={(event) => setCaptchaToken(event.target.value)}
                      placeholder="03AGdBq24..."
                      className="h-10 rounded-lg font-mono text-xs"
                      dir="ltr"
                    />
                  </div>
                )}
              </>
            )}

            {captchaError ? (
              <div className="rounded-md border border-amber-300/40 bg-amber-50/60 p-3 text-sm font-medium text-amber-900 text-center">
                {captchaError}
              </div>
            ) : null}

            {loginError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive text-center">
                {loginError}
              </div>
            ) : null}

            <div className="pt-2 w-full">
              <Button
                type="submit"
                className="w-full h-11 gap-2 rounded-lg font-bold shadow-none tracking-wide hover:shadow-lg transition-all duration-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 scale-x-[-1]" />
                )}
                {mfaChallenge
                  ? "تأكيد الرمز"
                  : webauthnChallenge
                    ? "تأكيد بالبصمة"
                    : "دخول"}
              </Button>
            </div>

            {!mfaChallenge && !webauthnChallenge ? (
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-lg font-semibold"
                disabled={isSubmitting}
                onClick={() => passkeyLoginMutation.mutate()}
              >
                {passkeyLoginMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                دخول بالبصمة (Passkey)
              </Button>
            ) : null}
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2.5 border-t border-border/40 px-8 py-5 text-center text-xs font-medium text-muted-foreground">
          <p className="flex items-center justify-center flex-wrap gap-x-1 gap-y-2 leading-relaxed">
            بيانات seed الافتراضية:
            <code className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground/80 mx-0.5 font-mono">{DEFAULT_EMAIL}</code>/
            <code className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground/80 mx-0.5 font-mono">{DEFAULT_PASSWORD}</code>
          </p>
          <p>
            مصدر البيانات: <code className="text-foreground/80 font-mono">backend/prisma/seed.ts</code>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
