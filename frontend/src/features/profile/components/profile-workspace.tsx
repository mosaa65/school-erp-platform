"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronDown,
  KeyRound,
  Layers3,
  LogOut,
  Mail,
  Phone,
  MonitorSmartphone,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  LayoutGrid,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { ProfileAppearanceSection } from "@/components/layout/profile-appearance-section";
import { ProfileNavigationSection } from "@/components/layout/profile-navigation-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppearance } from "@/hooks/use-appearance";
import { useBranchMode } from "@/hooks/use-branch-mode";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  apiClient,
  type AuthSessionView,
  type WebAuthnCredentialListItem,
} from "@/lib/api/client";
import { translateRoleCode } from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";

type SectionId = "appearance" | "navigation" | "account" | "security";

const APP_VERSION_LABEL = "School ERP Web v0.1.0";
const WEBAUTHN_QUERY_KEY = ["auth", "webauthn", "credentials"] as const;

function resolveBranchModeLabel(
  isLoaded: boolean,
  isMultiBranchEnabled: boolean,
  defaultBranchId: number | null,
): string {
  if (!isLoaded) {
    return "جارٍ مزامنة الفروع";
  }

  if (isMultiBranchEnabled) {
    return defaultBranchId ? `متعدد الفروع • #${defaultBranchId}` : "متعدد الفروع";
  }

  return "مدرسة واحدة";
}

function formatTransportLabel(transport: string): string {
  switch (transport) {
    case "internal":
      return "جهاز داخلي";
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

function formatSessionDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ar-YE");
}

function resolveSessionLabel(session: AuthSessionView): string {
  return (
    session.deviceLabel ||
    session.userAgent ||
    session.deviceId ||
    "جهاز غير معروف"
  );
}

function ProfileStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/65 bg-white/72 px-3 py-3 text-center shadow-[0_16px_34px_-26px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.8)]">
      <p className="text-[11px] text-slate-500 dark:text-white/50">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function ProfileSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.8rem] border border-white/65 bg-white/76 text-slate-900 shadow-[0_26px_68px_-42px_rgba(15,23,42,0.2)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58 dark:text-white dark:shadow-[0_26px_68px_-42px_rgba(15,23,42,0.95)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-3.5 text-right transition hover:bg-black/[0.03] dark:hover:bg-white/[0.03] sm:px-5 sm:py-4"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold sm:text-base">{title}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform dark:text-white/45",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-black/5 px-3 py-3.5 dark:border-white/10 sm:px-5 sm:py-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ProfileRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/70 bg-background/78 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-white/70">
        <Icon className="h-4 w-4 shrink-0 text-[color:var(--app-accent-color)]" />
        <span>{label}</span>
      </span>
      <span className="truncate text-left text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

export function ProfileWorkspace() {
  const auth = useAuth();
  const router = useRouter();
  const appearance = useAppearance();
  const branchMode = useBranchMode();
  const queryClient = useQueryClient();
  const [credentialName, setCredentialName] = React.useState("");
  const [expandedSections, setExpandedSections] = React.useState<Record<SectionId, boolean>>({
    appearance: false,
    navigation: false,
    account: false,
    security: false,
  });
  const [profileDraft, setProfileDraft] = React.useState({
    phoneCountryCode: "",
    phoneNationalNumber: "",
    webAuthnRequired: false,
  });
  const [profileInitialized, setProfileInitialized] = React.useState(false);
  const [securityNotice, setSecurityNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [profileNotice, setProfileNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const webAuthnCredentialsQuery = useQuery({
    queryKey: WEBAUTHN_QUERY_KEY,
    queryFn: () => apiClient.listWebAuthnCredentials(),
    enabled: Boolean(auth.session?.accessToken),
  });

  const profileQuery = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: () => apiClient.getProfile(),
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
      setSecurityNotice({
        type: "success",
        message: "تم تسجيل البصمة بنجاح.",
      });
      setCredentialName("");
      await queryClient.invalidateQueries({ queryKey: WEBAUTHN_QUERY_KEY });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تسجيل البصمة، حاول مرة أخرى.";
      setSecurityNotice({
        type: "error",
        message,
      });
    },
  });

  const removePasskeyMutation = useMutation({
    mutationFn: (credentialId: string) =>
      apiClient.removeWebAuthnCredential(credentialId),
    onSuccess: async () => {
      setSecurityNotice({
        type: "success",
        message: "تم حذف البصمة من الحساب.",
      });
      await queryClient.invalidateQueries({ queryKey: WEBAUTHN_QUERY_KEY });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر حذف البصمة.";
      setSecurityNotice({
        type: "error",
        message,
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: {
      phoneCountryCode?: string;
      phoneNationalNumber?: string;
      webAuthnRequired?: boolean;
    }) => apiClient.updateProfile(payload),
    onSuccess: async (updated) => {
      setProfileNotice({
        type: "success",
        message: "تم حفظ إعدادات الحساب بنجاح.",
      });
      setProfileDraft({
        phoneCountryCode: updated.phoneCountryCode ?? "",
        phoneNationalNumber: updated.phoneNationalNumber ?? "",
        webAuthnRequired: updated.webAuthnRequired,
      });
      setProfileInitialized(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] }),
        queryClient.invalidateQueries({ queryKey: WEBAUTHN_QUERY_KEY }),
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر حفظ بيانات الحساب.";
      setProfileNotice({
        type: "error",
        message,
      });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiClient.revokeAuthSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    },
  });

  React.useEffect(() => {
    if (profileInitialized) {
      return;
    }

    if (profileQuery.data) {
      setProfileDraft({
        phoneCountryCode: profileQuery.data.phoneCountryCode ?? "",
        phoneNationalNumber: profileQuery.data.phoneNationalNumber ?? "",
        webAuthnRequired: profileQuery.data.webAuthnRequired,
      });
      setProfileInitialized(true);
    }
  }, [profileInitialized, profileQuery.data]);

  if (!auth.session) {
    return null;
  }

  const userName = `${auth.session.user.firstName} ${auth.session.user.lastName}`;
  const roleLabels = auth.session.user.roleCodes.map((roleCode) => translateRoleCode(roleCode));
  const branchModeLabel = resolveBranchModeLabel(
    branchMode.isLoaded,
    branchMode.isMultiBranchEnabled,
    branchMode.defaultBranchId,
  );
  const webAuthnCredentials = webAuthnCredentialsQuery.data ?? [];
  const webAuthnError =
    webAuthnCredentialsQuery.error instanceof Error
      ? webAuthnCredentialsQuery.error.message
      : null;
  const isPasskeyBusy =
    registerPasskeyMutation.isPending || removePasskeyMutation.isPending;
  const profile = profileQuery.data ?? null;
  const profileError =
    profileQuery.error instanceof Error ? profileQuery.error.message : null;
  const sessions = sessionsQuery.data ?? [];

  const toggleSection = (sectionId: SectionId) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-2 sm:space-y-3">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/76 px-3 pb-3 pt-12 text-slate-900 shadow-[0_36px_100px_-56px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58 dark:text-white dark:shadow-[0_36px_100px_-56px_rgba(15,23,42,1)] sm:rounded-[2.25rem] sm:px-5 sm:pb-5 sm:pt-14">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-l from-transparent via-[color:var(--app-accent-soft)] to-transparent" />
        <div className="pointer-events-none absolute -left-6 bottom-2 h-20 w-20 rounded-full bg-[color:var(--app-accent-soft)] blur-3xl" />
        <div className="pointer-events-none absolute -right-8 top-6 h-24 w-24 rounded-full bg-[color:var(--app-accent-strong)] blur-3xl" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-sky-100/55 via-transparent to-transparent dark:from-sky-400/8" />

        <div className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[5px] border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] text-slate-700 shadow-[0_22px_40px_-18px_rgba(15,23,42,0.35)] dark:border-slate-950 dark:bg-white dark:text-slate-900 dark:shadow-[0_18px_36px_-18px_rgba(15,23,42,0.9)] sm:h-20 sm:w-20 sm:border-[6px]">
          <UserCircle2 className="h-9 w-9 sm:h-11 sm:w-11" />
        </div>

        <div className="text-center">
          <h2 className="mx-auto max-w-xl text-lg font-bold leading-8 sm:text-[1.45rem]">
            {userName}
          </h2>
          <p className="mt-1 truncate text-[12px] text-slate-500 dark:text-white/55 sm:text-sm">
            {auth.session.user.email}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ProfileStat label="الأدوار" value={`${roleLabels.length}`} />
          <ProfileStat label="الصلاحيات" value={`${auth.session.user.permissionCodes.length}`} />
          <div className="col-span-2 flex items-center justify-center rounded-[1.15rem] border border-[color:var(--app-accent-strong)] bg-[linear-gradient(180deg,var(--app-accent-soft),rgba(255,255,255,0.88))] text-[color:var(--app-accent-color)] shadow-[0_16px_36px_-24px_rgba(15,23,42,0.28)] dark:bg-[color:var(--app-accent-soft)] dark:shadow-[0_16px_36px_-24px_rgba(15,23,42,0.8)] sm:col-span-1">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border border-white/70 bg-white/78 px-3 py-1 text-[11px] text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80">
            {branchModeLabel}
          </span>
          {roleLabels.slice(0, 2).map((roleLabel) => (
            <span
              key={roleLabel}
              className="rounded-full border border-white/70 bg-white/78 px-3 py-1 text-[11px] text-slate-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70"
            >
              {roleLabel}
            </span>
          ))}
          {roleLabels.length > 2 ? (
            <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-[11px] text-slate-500 dark:border-white/15 dark:text-white/50">
              +{roleLabels.length - 2}
            </span>
          ) : null}
        </div>
      </section>

      <div className="space-y-3">
        <ProfileSection
          title="المظهر"
          icon={Palette}
          open={expandedSections.appearance}
          onToggle={() => toggleSection("appearance")}
        >
          <ProfileAppearanceSection />
          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-11 w-full rounded-[1.1rem] border border-white/70 bg-background/75 text-slate-800 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] dark:hover:text-white"
            onClick={() => appearance.resetAppearance()}
          >
            <RotateCcw className="h-4 w-4" />
            إعادة المظهر
          </Button>
        </ProfileSection>

        <ProfileSection
          title="التنقل"
          icon={LayoutGrid}
          open={expandedSections.navigation}
          onToggle={() => toggleSection("navigation")}
        >
          <ProfileNavigationSection />
        </ProfileSection>

        <ProfileSection
          title="الحساب"
          icon={BadgeCheck}
          open={expandedSections.account}
          onToggle={() => toggleSection("account")}
        >
          <div className="space-y-2">
            <ProfileRow label="البريد" value={auth.session.user.email} icon={Mail} />
            <ProfileRow label="الأدوار" value={`${roleLabels.length}`} icon={ShieldCheck} />
            <ProfileRow label="سياق العمل" value={branchModeLabel} icon={Layers3} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {roleLabels.map((roleLabel) => (
              <span
                key={roleLabel}
                className="rounded-full border border-white/70 bg-background/78 px-3 py-1 text-[11px] text-slate-700 dark:border-white/10 dark:bg-black/25 dark:text-white/78"
              >
                {roleLabel}
              </span>
            ))}
          </div>

          <div className="mt-4 rounded-[1.1rem] border border-white/70 bg-background/78 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              رقم الهاتف
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-white/70">
              أضف رقم الهاتف ليُستخدم في تسجيل الدخول بالإيميل أو الهاتف.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Input
                value={profileDraft.phoneCountryCode}
                onChange={(event) =>
                  setProfileDraft((prev) => ({
                    ...prev,
                    phoneCountryCode: event.target.value,
                  }))
                }
                placeholder="+967"
                className="h-10 rounded-lg"
              />
              <Input
                value={profileDraft.phoneNationalNumber}
                onChange={(event) =>
                  setProfileDraft((prev) => ({
                    ...prev,
                    phoneNationalNumber: event.target.value,
                  }))
                }
                placeholder="7XXXXXXXX"
                className="h-10 rounded-lg"
              />
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-10 rounded-lg sm:min-w-40"
                onClick={() => {
                  const country = profileDraft.phoneCountryCode.trim();
                  const national = profileDraft.phoneNationalNumber.trim();

                  if (Boolean(country) !== Boolean(national)) {
                    setProfileNotice({
                      type: "error",
                      message:
                        "أدخل مفتاح الدولة ورقم الهاتف معًا، أو اتركهما فارغين.",
                    });
                    return;
                  }

                  const payload: {
                    phoneCountryCode?: string;
                    phoneNationalNumber?: string;
                    webAuthnRequired?: boolean;
                  } = {
                    webAuthnRequired: profileDraft.webAuthnRequired,
                  };

                  if (country || national) {
                    payload.phoneCountryCode = country;
                    payload.phoneNationalNumber = national;
                  } else if (profile?.phoneCountryCode || profile?.phoneNationalNumber) {
                    payload.phoneCountryCode = "";
                    payload.phoneNationalNumber = "";
                  }

                  updateProfileMutation.mutate(payload);
                }}
                disabled={updateProfileMutation.isPending || !profile}
              >
                {updateProfileMutation.isPending ? "جارٍ الحفظ..." : "حفظ الرقم"}
              </Button>
              {profile?.phoneE164 ? (
                <div className="flex items-center gap-2 rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-white/70">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{profile.phoneE164}</span>
                </div>
              ) : null}
            </div>

            {profileError ? (
              <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                {profileError}
              </p>
            ) : null}
            {profileNotice ? (
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  profileNotice.type === "success"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300",
                )}
              >
                {profileNotice.message}
              </p>
            ) : null}
          </div>
        </ProfileSection>

        <ProfileSection
          title="الجلسة"
          icon={MonitorSmartphone}
          open={expandedSections.security}
          onToggle={() => toggleSection("security")}
        >
          <div className="space-y-2">
            <ProfileRow label="نوع الرمز" value={auth.session.tokenType} icon={KeyRound} />
            <ProfileRow label="مدة الجلسة" value={auth.session.expiresIn} icon={MonitorSmartphone} />
          </div>

          <div className="mt-3 rounded-[1.1rem] border border-white/70 bg-background/78 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              البصمة / Passkeys
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-white/70">
              فعّل بصمة هذا الجهاز من الملف الشخصي لتستخدمها لاحقًا في تسجيل الدخول.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={credentialName}
                onChange={(event) => setCredentialName(event.target.value)}
                placeholder="اسم الجهاز (اختياري)"
                className="h-10 rounded-lg"
              />
              <Button
                type="button"
                className="h-10 rounded-lg sm:min-w-48"
                onClick={() => registerPasskeyMutation.mutate()}
                disabled={isPasskeyBusy}
              >
                {registerPasskeyMutation.isPending ? "جارٍ التفعيل..." : "إضافة بصمة"}
              </Button>
            </div>

            {securityNotice ? (
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  securityNotice.type === "success"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300",
                )}
              >
                {securityNotice.message}
              </p>
            ) : null}
            {webAuthnError ? (
              <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                {webAuthnError}
              </p>
            ) : null}

            <div className="mt-3 space-y-2">
              {webAuthnCredentialsQuery.isLoading ? (
                <p className="text-xs text-slate-500 dark:text-white/60">
                  جارٍ تحميل البصمات...
                </p>
              ) : webAuthnCredentials.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-white/60">
                  لا توجد بصمات مضافة بعد.
                </p>
              ) : (
                webAuthnCredentials.map((credential: WebAuthnCredentialListItem) => (
                  <div
                    key={credential.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/65 bg-white/75 px-3 py-2 dark:border-white/10 dark:bg-black/25"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                        {credential.credentialName ?? "Passkey بدون اسم"}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-slate-600 dark:text-white/65">
                        {credential.deviceType}
                        {credential.transports.length > 0
                          ? ` • ${credential.transports.map(formatTransportLabel).join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 rounded-lg border border-rose-500/35 bg-rose-500/10 px-2 text-rose-700 hover:bg-rose-500/20 hover:text-rose-800 dark:text-rose-200"
                      onClick={() => removePasskeyMutation.mutate(credential.id)}
                      disabled={isPasskeyBusy}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 rounded-[1.1rem] border border-white/70 bg-background/78 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              تسجيل الدخول بالبصمة بعد كلمة المرور
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-white/70">
              عند التفعيل سيُطلب منك تأكيد البصمة بعد إدخال كلمة المرور.
            </p>

            <label className="mt-3 flex items-center justify-between rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/20">
              <span>تفعيل البصمة كعامل ثانوي</span>
              <input
                type="checkbox"
                checked={profileDraft.webAuthnRequired}
                onChange={(event) =>
                  setProfileDraft((prev) => ({
                    ...prev,
                    webAuthnRequired: event.target.checked,
                  }))
                }
                disabled={!profile?.hasWebAuthnCredentials}
              />
            </label>

            {!profile?.hasWebAuthnCredentials ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                أضف بصمة واحدة على الأقل قبل تفعيل هذا الخيار.
              </p>
            ) : null}

            <Button
              type="button"
              className="mt-3 h-10 w-full rounded-lg"
              onClick={() =>
                updateProfileMutation.mutate({
                  webAuthnRequired: profileDraft.webAuthnRequired,
                })
              }
              disabled={updateProfileMutation.isPending || !profile}
            >
              {updateProfileMutation.isPending ? "جارٍ الحفظ..." : "حفظ الإعداد"}
            </Button>
          </div>

          <div className="mt-3 rounded-[1.1rem] border border-white/70 bg-background/78 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              الأجهزة والجلسات النشطة
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-white/70">
              راقب الأجهزة التي سجلت الدخول وقم بإلغاء أي جلسة غير معروفة.
            </p>

            <div className="mt-3 space-y-2">
              {sessionsQuery.isLoading ? (
                <p className="text-xs text-slate-500 dark:text-white/60">
                  جارٍ تحميل الجلسات...
                </p>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-white/60">
                  لا توجد جلسات نشطة أخرى.
                </p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-white/65 bg-white/75 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-black/25 dark:text-white/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">
                        {resolveSessionLabel(session)}
                      </span>
                      {session.isCurrent ? (
                        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                          هذه الجلسة
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-white/55">
                      <span>آخر نشاط: {formatSessionDate(session.lastActivity)}</span>
                      <span>ينتهي: {formatSessionDate(session.expiresAt)}</span>
                      {session.ipAddress ? <span>IP: {session.ipAddress}</span> : null}
                      {session.deviceId ? (
                        <span>Device: {session.deviceId}</span>
                      ) : null}
                      {session.userAgent ? (
                        <span>Agent: {session.userAgent}</span>
                      ) : null}
                    </div>
                    {!session.isCurrent ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 h-8 rounded-lg border border-rose-500/35 bg-rose-500/10 px-2 text-rose-700 hover:bg-rose-500/20 hover:text-rose-800 dark:text-rose-200"
                        onClick={() => revokeSessionMutation.mutate(session.id)}
                        disabled={revokeSessionMutation.isPending}
                      >
                        إلغاء الجلسة
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-11 w-full rounded-[1.1rem] border border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 hover:text-rose-800 dark:text-rose-200 dark:hover:bg-rose-500/20 dark:hover:text-white"
            onClick={() => {
              auth.signOut();
              router.replace("/auth/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </ProfileSection>
      </div>

      <p className="px-2 pt-1 text-[11px] text-muted-foreground">{APP_VERSION_LABEL}</p>
    </div>
  );
}
