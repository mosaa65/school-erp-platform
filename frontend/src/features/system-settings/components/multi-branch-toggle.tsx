"use client";

import * as React from "react";
import { useBranchMode } from "@/hooks/use-branch-mode";
import { updateMultiBranchMode } from "@/features/system-settings/api/branch-mode.api";
import { useAuth } from "@/features/auth/providers/auth-provider";

type MultiBranchToggleProps = {
  /** معرِّف setting المُخزَّن في DB لإعداد multi_branch_mode  */
  settingId: number;
};

/**
 * MultiBranchToggle
 *
 * مكوِّن Toggle لتفعيل/إيقاف وضع الفروع المتعددة.
 * يُدرَج في صفحة إعدادات النظام داخل قسم "الفروع".
 *
 * مثال:
 *   <MultiBranchToggle settingId={42} />
 */
export function MultiBranchToggle({ settingId }: MultiBranchToggleProps) {
  const auth = useAuth();
  const { isMultiBranchEnabled, isLoaded, invalidate } = useBranchMode();
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleToggle() {
    if (!auth.session?.accessToken) return;
    setIsSaving(true);
    setError(null);

    try {
      await updateMultiBranchMode(
        settingId,
        !isMultiBranchEnabled,
        auth.session.accessToken,
      );
      // مسح الـ cache وإعادة قراءة الإعداد الجديد
      invalidate();
    } catch {
      setError("حدث خطأ أثناء تحديث الإعداد. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-muted/50">
        <div className="h-5 w-9 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-48 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg border bg-card">
        {/* النص */}
        <div>
          <p className="text-sm font-medium">وضع الفروع المتعددة (النموذج الهجين)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isMultiBranchEnabled
              ? "مفعَّل — يمكن ربط الطلاب والفواتير بفروع منفصلة."
              : "معطَّل — النظام يعمل في وضع المدرسة الواحدة."}
          </p>
        </div>

        {/* زر التبديل */}
        <button
          role="switch"
          aria-checked={isMultiBranchEnabled}
          aria-label="تفعيل وضع الفروع المتعددة"
          disabled={isSaving}
          onClick={handleToggle}
          className={[
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
            "transition-colors duration-200 ease-in-out focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isMultiBranchEnabled ? "bg-primary" : "bg-input",
          ].join(" ")}
        >
          <span
            className={[
              "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0",
              "transition-transform duration-200 ease-in-out",
              isMultiBranchEnabled ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </button>
      </div>

      {/* تحذير عند التفعيل */}
      {isMultiBranchEnabled && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          ⚡ النظام يعمل في وضع الفروع المتعددة. تأكد من تعيين الطلاب الحاليين لفروعهم الصحيحة.
        </div>
      )}

      {/* رسالة الخطأ */}
      {error && (
        <p className="text-xs text-destructive px-1">{error}</p>
      )}
    </div>
  );
}
