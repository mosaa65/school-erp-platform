"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronDown,
  KeyRound,
  Laptop,
  Layers3,
  LogOut,
  Mail,
  Monitor,
  Phone,
  MonitorSmartphone,
  Palette,
  ScanSearch,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  UserCircle2,
  LayoutGrid,
  PanelsTopLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { ProfileAppearanceSection } from "@/components/layout/profile-appearance-section";
import { ProfileMessagePreferences } from "@/components/layout/profile-message-preferences";
import { ProfileNavigationSection } from "@/components/layout/profile-navigation-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InternationalPhoneField } from "@/components/ui/international-phone-field";
import { PasswordFieldWithBiometricAction } from "@/components/ui/password-field-with-biometric-action";
import { Switch } from "@/components/ui/switch";
import { useAppearance } from "@/hooks/use-appearance";
import { useBranchMode } from "@/hooks/use-branch-mode";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  apiClient,
  type AuthSessionView,
  type WebAuthnCredentialListItem,
} from "@/lib/api/client";
import { translateRoleCode } from "@/lib/i18n/ar";
import { findCountryDialCodeOptionByDialCode } from "@/lib/intl/phone";
import { cn } from "@/lib/utils";

type SectionId = "appearance" | "entitySurface" | "navigation" | "account" | "security";
type PasswordIdentityMethod = "phone" | "email";

const APP_VERSION_LABEL = "School ERP Web v0.1.0";
const WEBAUTHN_QUERY_KEY = ["auth", "webauthn", "credentials"] as const;

function resolveBranchModeLabel(
  isLoaded: boolean,
  isMultiBranchEnabled: boolean,
  defaultBranchId: number | null,
): string {
  if (!isLoaded) return "جارٍ مزامنة الفروع";
  if (isMultiBranchEnabled)
    return defaultBranchId ? `متعدد الفروع • #${defaultBranchId}` : "متعدد الفروع";
  return "مدرسة واحدة";
}

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

/** Detect device icon from session metadata */
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

/** Smart device name from userAgent */
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

/** Detect current device name from navigator */
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
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/70 bg-background/78 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-white/70">
        <Icon className="h-4 w-4 shrink-0 text-[color:var(--app-accent-color)]" />
        <span className="text-sm">{label}</span>
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
    entitySurface: false,
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
  const [passwordIdentityMethod, setPasswordIdentityMethod] =
    React.useState<PasswordIdentityMethod>("phone");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [nextPassword, setNextPassword] = React.useState("");
  const [confirmNextPassword, setConfirmNextPassword] = React.useState("");
  const [accountNotice, setAccountNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);

  // Auto-detect device name for passkey
  React.useEffect(() => {
    const detected = detectCurrentDeviceName();
    if (detected) setCredentialName(detected);
  }, []);

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
      setSecurityNotice({ type: "success", message: "تم تسجيل البصمة بنجاح." });
      const detected = detectCurrentDeviceName();
      setCredentialName(detected || "");
      await queryClient.invalidateQueries({ queryKey: WEBAUTHN_QUERY_KEY });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر تسجيل البصمة، حاول مرة أخرى.";
      setSecurityNotice({ type: "error", message });
    },
  });

  const removePasskeyMutation = useMutation({
    mutationFn: (credentialId: string) => apiClient.removeWebAuthnCredential(credentialId),
    onSuccess: async () => {
      setSecurityNotice({ type: "success", message: "تم حذف البصمة من الحساب." });
      await queryClient.invalidateQueries({ queryKey: WEBAUTHN_QUERY_KEY });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر حذف البصمة.";
      setSecurityNotice({ type: "error", message });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: {
      phoneCountryCode?: string;
      phoneNationalNumber?: string;
      webAuthnRequired?: boolean;
    }) => apiClient.updateProfile(payload),
    onSuccess: async (updated) => {
      setProfileNotice({ type: "success", message: "تم حفظ إعدادات الحساب بنجاح." });
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
      const message = error instanceof Error ? error.message : "تعذر حفظ بيانات الحساب.";
      setProfileNotice({ type: "error", message });
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
      setAccountNotice({
        type: "success",
        message: "تم تغيير كلمة المرور بنجاح.",
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر تغيير كلمة المرور.";
      setAccountNotice({ type: "error", message });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiClient.revokeAuthSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    },
  });

  React.useEffect(() => {
    if (profileInitialized) return;
    if (profileQuery.data) {
      setProfileDraft({
        phoneCountryCode: profileQuery.data.phoneCountryCode ?? "",
        phoneNationalNumber: profileQuery.data.phoneNationalNumber ?? "",
        webAuthnRequired: profileQuery.data.webAuthnRequired,
      });
      setProfileInitialized(true);
    }
  }, [profileInitialized, profileQuery.data]);

  React.useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    if (profileQuery.data.phoneE164) {
      setPasswordIdentityMethod("phone");
      return;
    }

    setPasswordIdentityMethod("email");
  }, [profileQuery.data]);

  const profilePhoneCountryIso2 =
    findCountryDialCodeOptionByDialCode(profileDraft.phoneCountryCode)?.iso2 ?? "YE";

  if (!auth.session) return null;

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

  const phoneLoginId = profile?.phoneE164?.trim() ?? "";
  const emailLoginId = auth.session.user.email.trim().toLowerCase();

  const handleChangePassword = () => {
    setAccountNotice(null);

    const loginId = passwordIdentityMethod === "phone" ? phoneLoginId : emailLoginId;
    if (!loginId) {
      setAccountNotice({
        type: "error",
        message: "أضف رقم هاتف صالح أولًا أو استخدم البريد الإلكتروني.",
      });
      return;
    }

    if (currentPassword.trim().length < 8) {
      setAccountNotice({
        type: "error",
        message: "أدخل كلمة المرور الحالية بشكل صحيح.",
      });
      return;
    }

    if (nextPassword.trim().length < 8) {
      setAccountNotice({
        type: "error",
        message: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.",
      });
      return;
    }

    if (nextPassword !== confirmNextPassword) {
      setAccountNotice({
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
    <div className="mx-auto max-w-2xl space-y-3 sm:space-y-4">

      {/* ── Profile Card ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/76 text-slate-900 shadow-[0_36px_100px_-56px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58 dark:text-white sm:rounded-[2.25rem]">

        {/* Accent banner */}
        <div className="relative h-20 overflow-hidden sm:h-24">
          <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--app-accent-color)]/30 via-[color:var(--app-accent-soft)] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[color:var(--app-accent-strong)] to-transparent" />
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[color:var(--app-accent-color)]/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-4 bottom-0 h-16 w-16 rounded-full bg-white/10 blur-xl" />
        </div>

        {/* Avatar - overlapping banner */}
        <div className="absolute left-1/2 top-6 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-white shadow-[0_10px_36px_-14px_rgba(15,23,42,0.28)] dark:border-[color:var(--app-accent-soft)] dark:bg-slate-900 sm:top-8 sm:h-24 sm:w-24">
          <UserCircle2 className="h-10 w-10 text-[color:var(--app-accent-color)] sm:h-12 sm:w-12" />
        </div>

        {/* Content */}
        <div className="px-4 pb-5 pt-14 text-center sm:px-6 sm:pb-6 sm:pt-16">
          <h2 className="text-lg font-bold leading-tight sm:text-xl">{userName}</h2>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-white/50">
            {auth.session.user.email}
          </p>

          {/* Stats row */}
          <div className="mx-auto mt-4 flex w-fit justify-center divide-x divide-x-reverse divide-black/10 rounded-2xl border border-white/70 bg-white/60 px-2 py-2 shadow-sm dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-col items-center px-4">
              <span className="text-xl font-bold text-[color:var(--app-accent-color)]">
                {roleLabels.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-white/50">الأدوار</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="text-xl font-bold text-[color:var(--app-accent-color)]">
                {auth.session.user.permissionCodes.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-white/50">الصلاحيات</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="text-xl font-bold text-[color:var(--app-accent-color)]">
                {sessionsQuery.isLoading ? "—" : sessions.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-white/50">الجلسات</span>
            </div>
          </div>

          {/* Role badges */}
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <span className="rounded-full border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-3 py-1 text-[11px] font-medium text-[color:var(--app-accent-color)]">
              {branchModeLabel}
            </span>
            {roleLabels.slice(0, 2).map((roleLabel) => (
              <span
                key={roleLabel}
                className="rounded-full border border-white/70 bg-white/78 px-3 py-1 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70"
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
        </div>
      </section>

      {/* ── Sections ─────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Appearance */}
        <ProfileSection
          title="المظهر"
          icon={Palette}
          open={expandedSections.appearance}
          onToggle={() => toggleSection("appearance")}
        >
          <ProfileAppearanceSection />
          <ProfileMessagePreferences className="mt-3" />
          <Button
            type="button"
            variant="ghost"
            className="mt-3 h-11 w-full rounded-2xl border border-white/70 bg-background/75 text-slate-800 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] dark:hover:text-white"
            onClick={() => appearance.resetAppearance()}
          >
            <RotateCcw className="h-4 w-4" />
            إعادة المظهر
          </Button>
        </ProfileSection>

        {/* Entity surface */}
        <ProfileSection
          title="بطاقات العرض والتفاصيل"
          icon={PanelsTopLeft}
          open={expandedSections.entitySurface}
          onToggle={() => toggleSection("entitySurface")}
        >
          <div className="space-y-3">
            <div className="rounded-[1.25rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                  <ScanSearch className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    إعدادات بطاقات العرض والتفاصيل
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/55">
                    افتح الصفحة المخصصة للتحكم في شكل البطاقات، الألوان، التفاعل، ومعاينة
                    الصلاحيات قبل تطبيقها على واجهة الطلاب.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                className="mt-3 h-11 w-full rounded-2xl"
                onClick={() => router.push("/app/profile/entity-surface")}
              >
                <PanelsTopLeft className="h-4 w-4" />
                فتح إعدادات البطاقات
              </Button>
            </div>
          </div>
        </ProfileSection>

        {/* Navigation */}
        <ProfileSection
          title="التنقل"
          icon={LayoutGrid}
          open={expandedSections.navigation}
          onToggle={() => toggleSection("navigation")}
        >
          <ProfileNavigationSection />
        </ProfileSection>

        {/* Account */}
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

          <div className="mt-4 rounded-[1.25rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">رقم الهاتف</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
              أضف رقم الهاتف ليُستخدم في تسجيل الدخول بالإيميل أو الهاتف.
            </p>
            <div className="mt-3">
              <InternationalPhoneField
                countryIso2={profilePhoneCountryIso2}
                nationalNumber={profileDraft.phoneNationalNumber}
                onChange={(next) =>
                  setProfileDraft((prev) => ({
                    ...prev,
                    phoneCountryCode: next.dialCode,
                    phoneNationalNumber: next.nationalNumber,
                  }))
                }
                inputClassName="h-11 rounded-2xl"
              />
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-11 rounded-2xl sm:min-w-40"
                onClick={() => {
                  const country = profileDraft.phoneCountryCode.trim();
                  const national = profileDraft.phoneNationalNumber.trim();
                  if (Boolean(country) !== Boolean(national)) {
                    setProfileNotice({
                      type: "error",
                      message: "أدخل مفتاح الدولة ورقم الهاتف معًا، أو اتركهما فارغين.",
                    });
                    return;
                  }
                  const payload: {
                    phoneCountryCode?: string;
                    phoneNationalNumber?: string;
                    webAuthnRequired?: boolean;
                  } = { webAuthnRequired: profileDraft.webAuthnRequired };
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
                <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-white/70">
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

          <div className="mt-4 rounded-[1.25rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              تغيير كلمة المرور
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
              غيّر كلمة المرور من إعدادات الحساب بدل شاشة تسجيل الدخول.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-1">
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
                رقم الهاتف
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
                البريد الإلكتروني
              </button>
            </div>

            <p className="mt-2 text-[11px] text-slate-500 dark:text-white/55" dir="ltr">
              {passwordIdentityMethod === "phone"
                ? phoneLoginId || "لا يوجد رقم هاتف محفوظ بعد."
                : emailLoginId}
            </p>

            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-white/70">
                كلمة المرور الحالية
              </label>
              <PasswordFieldWithBiometricAction
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
              />
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-white/70">
                كلمة المرور الجديدة
              </label>
              <PasswordFieldWithBiometricAction
                value={nextPassword}
                onChange={setNextPassword}
                autoComplete="new-password"
              />
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-white/70">
                تأكيد كلمة المرور
              </label>
              <PasswordFieldWithBiometricAction
                value={confirmNextPassword}
                onChange={setConfirmNextPassword}
                autoComplete="new-password"
              />
            </div>

            <Button
              type="button"
              className="mt-3 h-11 w-full rounded-2xl"
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "جارٍ التحديث..." : "حفظ كلمة المرور الجديدة"}
            </Button>

            {accountNotice ? (
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  accountNotice.type === "success"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300",
                )}
              >
                {accountNotice.message}
              </p>
            ) : null}
          </div>
        </ProfileSection>

        {/* Security / Sessions */}
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

          {/* Passkey registration */}
          <div className="mt-3 rounded-[1.25rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              البصمة / Passkeys
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
              فعّل بصمة هذا الجهاز من الملف الشخصي لتستخدمها لاحقًا في تسجيل الدخول.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={credentialName}
                onChange={(event) => setCredentialName(event.target.value)}
                placeholder="اسم الجهاز (اختياري)"
                className="h-11 rounded-2xl"
              />
              <Button
                type="button"
                className="h-11 rounded-2xl sm:min-w-48"
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
                <p className="text-xs text-slate-500 dark:text-white/60">جارٍ تحميل البصمات...</p>
              ) : webAuthnCredentials.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-white/60">لا توجد بصمات مضافة بعد.</p>
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
          </div>

          {/* WebAuthn toggle — iOS style */}
          <div className="mt-3 rounded-[1.25rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              تسجيل الدخول بالبصمة بعد كلمة المرور
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
              عند التفعيل سيُطلب منك تأكيد البصمة بعد إدخال كلمة المرور.
            </p>

            {/* iOS toggle */}
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-black/20">
              <span className="text-sm font-medium text-slate-800 dark:text-white/90">
                تفعيل البصمة كعامل ثانوي
              </span>
              <Switch
                checked={profileDraft.webAuthnRequired}
                disabled={!profile?.hasWebAuthnCredentials}
                onCheckedChange={(checked) =>
                  setProfileDraft((prev) => ({ ...prev, webAuthnRequired: checked }))
                }
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
                updateProfileMutation.mutate({ webAuthnRequired: profileDraft.webAuthnRequired })
              }
              disabled={updateProfileMutation.isPending || !profile}
            >
              {updateProfileMutation.isPending ? "جارٍ الحفظ..." : "حفظ الإعداد"}
            </Button>
          </div>

          {/* Active sessions */}
          <div className="mt-3 rounded-[1.25rem] border border-white/70 bg-background/78 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              الأجهزة والجلسات النشطة
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
              راقب الأجهزة التي سجلت الدخول وقم بإلغاء أي جلسة غير معروفة.
            </p>

            <div className="mt-3 space-y-2">
              {sessionsQuery.isLoading ? (
                <p className="text-xs text-slate-500 dark:text-white/60">جارٍ تحميل الجلسات...</p>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-white/60">لا توجد جلسات نشطة أخرى.</p>
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
                          {/* Device icon */}
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

                        {/* Badges / actions */}
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

                      {/* Extra metadata */}
                      {(session.ipAddress || session.expiresAt) && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400 dark:text-white/35">
                          {session.ipAddress && <span>IP: {session.ipAddress}</span>}
                          {session.expiresAt && (
                            <span>ينتهي: {formatSessionDate(session.expiresAt)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>


        </ProfileSection>
      </div>

      {/* ── Sign Out Button ──────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowSignOutConfirm(true)}
        className="group flex w-full items-center justify-center gap-3 rounded-[1.8rem] border border-rose-500/25 bg-rose-500/8 px-5 py-4 text-rose-700 transition-all hover:border-rose-500/40 hover:bg-rose-500/14 dark:border-rose-500/20 dark:bg-rose-500/[0.06] dark:text-rose-300 dark:hover:bg-rose-500/12"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 transition-all group-hover:bg-rose-500/18">
          <LogOut className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold">تسجيل الخروج</span>
      </button>

      <p className="px-2 pt-0.5 text-center text-[11px] text-muted-foreground">{APP_VERSION_LABEL}</p>

      {/* ── Sign Out Confirmation Modal ───────────────── */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSignOutConfirm(false)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_36px_100px_-30px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_36px_100px_-30px_rgba(0,0,0,0.8)]">
            {/* Top accent line */}
            <div className="h-1 w-full bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600" />

            <div className="p-6">
              {/* Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10">
                <LogOut className="h-7 w-7 text-rose-600 dark:text-rose-400" />
              </div>

              {/* Text */}
              <div className="mt-4 text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  تسجيل الخروج
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-white/60">
                  هل أنت متأكد من تسجيل الخروج؟
                  <br />
                  سيتم إنهاء جلستك الحالية.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[1rem] bg-rose-600 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,0.55)] transition-all hover:bg-rose-700 active:scale-[0.98]"
                  onClick={() => {
                    auth.signOut();
                    router.replace("/auth/login");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  تأكيد تسجيل الخروج
                </button>
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-center rounded-[1rem] border border-black/8 bg-transparent text-sm font-medium text-slate-600 transition-all hover:bg-black/[0.04] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.05]"
                  onClick={() => setShowSignOutConfirm(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
