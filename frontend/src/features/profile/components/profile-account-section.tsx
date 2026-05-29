"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Layers3, Mail, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InternationalPhoneField } from "@/components/ui/international-phone-field";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useBranchMode } from "@/hooks/use-branch-mode";
import { apiClient } from "@/lib/api/client";
import { translateRoleCode } from "@/lib/i18n/ar";
import { findCountryDialCodeOptionByDialCode } from "@/lib/intl/phone";
import { cn } from "@/lib/utils";

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

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/70 bg-background/78 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-white/65">
        <Icon className="h-4 w-4 shrink-0 text-[color:var(--app-accent-color)]" />
        <span className="text-sm">{label}</span>
      </span>
      <span className="truncate text-left text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
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

export function ProfileAccountSection() {
  const auth = useAuth();
  const branchMode = useBranchMode();
  const queryClient = useQueryClient();

  const [profileDraft, setProfileDraft] = React.useState({
    phoneCountryCode: "",
    phoneNationalNumber: "",
    webAuthnRequired: false,
  });
  const [profileInitialized, setProfileInitialized] = React.useState(false);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auth", "profile"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "webauthn", "credentials"] }),
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "تعذر حفظ بيانات الحساب.";
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
  const profileError = profileQuery.error instanceof Error ? profileQuery.error.message : null;
  const roleLabels = auth.session.user.roleCodes.map((roleCode) => translateRoleCode(roleCode));
  const branchModeLabel = resolveBranchModeLabel(
    branchMode.isLoaded,
    branchMode.isMultiBranchEnabled,
    branchMode.defaultBranchId,
  );
  const profilePhoneCountryIso2 =
    findCountryDialCodeOptionByDialCode(profileDraft.phoneCountryCode)?.iso2 ?? "YE";

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
    <div className="space-y-3">

      {/* Account info rows */}
      <div className="space-y-2">
        <InfoRow label="البريد الإلكتروني" value={auth.session.user.email} icon={Mail} />
        <InfoRow label="عدد الأدوار" value={`${roleLabels.length} دور`} icon={ShieldCheck} />
        <InfoRow label="سياق العمل" value={branchModeLabel} icon={Layers3} />
        <InfoRow label="المعرّف" value={`#${auth.session.user.id}`} icon={BadgeCheck} />
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
        description="يُستخدم في تسجيل الدخول بالهاتف أو التحقق الثنائي."
      >
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
            className="h-11 rounded-2xl sm:min-w-40"
            onClick={handleSavePhone}
            disabled={updateProfileMutation.isPending || !profile}
          >
            {updateProfileMutation.isPending ? "جارٍ الحفظ..." : "حفظ الرقم"}
          </Button>
          {profile?.phoneE164 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-white/70">
              <Phone className="h-3.5 w-3.5 text-[color:var(--app-accent-color)]" />
              <span dir="ltr">{profile.phoneE164}</span>
            </div>
          ) : null}
        </div>
        {profileError ? (
          <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">{profileError}</p>
        ) : null}
        {notice ? (
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
        ) : null}
      </SectionCard>
    </div>
  );
}
