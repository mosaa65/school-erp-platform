"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  Layers3,
  Mail,
  MonitorSmartphone,
  Palette,
  PanelsTopLeft,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InternationalPhoneField } from "@/components/ui/international-phone-field";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useBranchMode } from "@/hooks/use-branch-mode";
import { apiClient } from "@/lib/api/client";
import { translateRoleCode } from "@/lib/i18n/ar";
import { findCountryDialCodeOptionByDialCode } from "@/lib/intl/phone";
import {
  InfoRow,
  NoticeText,
  SectionCard,
  ProfilePageWrapper,
  resolveBranchModeLabel,
} from "./profile-shared";

export function ProfileAccountSection() {
  const auth = useAuth();
  const branchMode = useBranchMode();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [profileDraft, setProfileDraft] = React.useState({
    phoneCountryCode: "",
    phoneNationalNumber: "",
    webAuthnRequired: false,
  });
  const [profileInitialized, setProfileInitialized] = React.useState(false);
  const [showPhoneForm, setShowPhoneForm] = React.useState(false);
  const [notice, setNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const profileQuery = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: () => apiClient.getProfile(),
    enabled: Boolean(auth.session?.accessToken),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: {
      phoneCountryCode?: string;
      phoneNationalNumber?: string;
      webAuthnRequired?: boolean;
    }) => apiClient.updateProfile(payload),
    onSuccess: async (updated) => {
      setNotice({ type: "success", message: "تم حفظ رقم الهاتف بنجاح." });
      setProfileDraft({
        phoneCountryCode: updated.phoneCountryCode ?? "",
        phoneNationalNumber: updated.phoneNationalNumber ?? "",
        webAuthnRequired: updated.webAuthnRequired,
      });
      setProfileInitialized(true);
      setShowPhoneForm(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] }),
        queryClient.invalidateQueries({
          queryKey: ["auth", "webauthn", "credentials"],
        }),
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر حفظ بيانات الحساب.";
      setNotice({ type: "error", message });
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

  if (!auth.session) return null;

  const profile = profileQuery.data ?? null;
  const profileError =
    profileQuery.error instanceof Error ? profileQuery.error.message : null;
  const roleLabels = auth.session.user.roleCodes.map((roleCode) =>
    translateRoleCode(roleCode),
  );
  const branchModeLabel = resolveBranchModeLabel(
    branchMode.isLoaded,
    branchMode.isMultiBranchEnabled,
    branchMode.defaultBranchId,
  );
  const profilePhoneCountryIso2 =
    findCountryDialCodeOptionByDialCode(profileDraft.phoneCountryCode)?.iso2 ??
    "YE";

  const handleSavePhone = () => {
    setNotice(null);
    const country = profileDraft.phoneCountryCode.trim();
    const national = profileDraft.phoneNationalNumber.trim();
    if (Boolean(country) !== Boolean(national)) {
      setNotice({
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
  };

  return (
    <ProfilePageWrapper
      title="الحساب"
      description="المعلومات الشخصية ورقم الهاتف"
      icon={BadgeCheck}
    >
      {/* Account info rows */}
      <div className="space-y-2">
        <InfoRow
          label="البريد الإلكتروني"
          value={auth.session.user.email}
          icon={Mail}
        />
        <InfoRow
          label="رقم الهاتف"
          value={profileQuery.isLoading ? "جارٍ التحميل..." : (profile?.phoneE164 || "لا يوجد رقم هاتف")}
          icon={Phone}
        />
        <InfoRow
          label="عدد الأدوار"
          value={`${roleLabels.length} دور`}
          icon={ShieldCheck}
        />
        <InfoRow
          label="سياق العمل"
          value={branchModeLabel}
          icon={Layers3}
        />
        <InfoRow
          label="المعرّف"
          value={`#${auth.session.user.id}`}
          icon={BadgeCheck}
        />
      </div>

      {/* Role badges */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {roleLabels.map((roleLabel) => (
          <span
            key={roleLabel}
            className="rounded-full border border-white/70 bg-background/78 px-3 py-1 text-[11px] text-slate-700 dark:border-white/10 dark:bg-black/25 dark:text-white/78"
          >
            {roleLabel}
          </span>
        ))}
      </div>

      {/* Phone number */}
      <SectionCard
        title="رقم الهاتف"
        description="يُسجَّل رقم هاتفك هنا لتمكين خيارات الدخول السريع والتحقق الإضافي."
      >
        {!showPhoneForm ? (
          <Button
            type="button"
            className="h-11 w-full rounded-2xl"
            onClick={() => setShowPhoneForm(true)}
          >
            <Phone className="mr-2 h-4 w-4" />
            تعديل رقم الهاتف
          </Button>
        ) : (
          <div className="space-y-3">
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
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-11 flex-1 rounded-2xl"
                onClick={handleSavePhone}
                disabled={updateProfileMutation.isPending || !profile}
              >
                {updateProfileMutation.isPending ? "جارٍ الحفظ..." : "حفظ رقم الهاتف"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl sm:min-w-24"
                onClick={() => {
                  setShowPhoneForm(false);
                  setNotice(null);
                }}
              >
                إلغاء
              </Button>
            </div>
            {profileError ? (
              <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                {profileError}
              </p>
            ) : null}
            <NoticeText notice={notice} />
          </div>
        )}
      </SectionCard>

      {/* ── Quick Access Grid ─────────────────────────── */}
      <div className="mt-6 space-y-3">
        <p className="text-xs font-bold text-slate-400 dark:text-white/45 px-1">
          الوصول السريع للأقسام
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "الأمان والخصوصية",
              description: "كلمة المرور، البصمات، والتحقق الثنائي",
              icon: ShieldCheck,
              href: "/app/profile/security",
            },
            {
              title: "الأجهزة والجلسات",
              description: "الأجهزة النشطة وإدارة رموز الدخول",
              icon: MonitorSmartphone,
              href: "/app/profile/sessions",
            },
            {
              title: "المظهر والسمات",
              description: "تخصيص الألوان والخطوط والوضع الداكن",
              icon: Palette,
              href: "/app/profile/appearance",
            },
            {
              title: "الإشعارات ورسائل النظام",
              description: "تفضيلات التنبيهات ورسائل البريد",
              icon: Bell,
              href: "/app/profile/notifications",
            },
            {
              title: "إعدادات متقدمة",
              description: "تخطيط التنقل وإعدادات بطاقات العرض",
              icon: PanelsTopLeft,
              href: "/app/profile/advanced",
            },
          ].map((link) => {
            const LinkIcon = link.icon;
            return (
              <button
                key={link.href}
                type="button"
                onClick={() => router.push(link.href)}
                className="flex items-start gap-3 rounded-[1.4rem] border border-white/70 bg-background/78 p-4 text-right transition-all duration-300 hover:scale-[1.02] hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-soft)]/20 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
                  <LinkIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {link.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-white/55">
                    {link.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ProfilePageWrapper>
  );
}
