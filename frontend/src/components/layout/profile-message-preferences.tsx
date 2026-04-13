"use client";

import * as React from "react";
import {
  BellRing,
  Blend,
  Clock3,
  Music4,
  MoveUpRight,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SystemMessageInline } from "@/components/feedback/system-message-inline";
import { useSystemMessage } from "@/hooks/use-system-message";
import { cn } from "@/lib/utils";
import { resolveSystemMessageIconVisibility } from "@/theme/system-message-tokens";

type ProfileMessagePreferencesProps = {
  className?: string;
};

function GlassShell({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.25rem] border border-white/70 bg-white/68 p-3 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[color:var(--app-accent-color)]" />
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="h-px flex-1 bg-black/[0.06] dark:bg-white/10" />
      </div>
      {children}
    </section>
  );
}

function SegmentedOptions<TValue extends string>({
  items,
  selected,
  onSelect,
}: {
  items: Array<{ value: TValue; label: string; description: string }>;
  selected: TValue;
  onSelect: (value: TValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((item) => {
        const active = item.value === selected;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "rounded-[1rem] border px-3 py-2.5 text-right transition-all",
              active
                ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                : "border-white/70 bg-background/78 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white/75 dark:hover:bg-white/[0.06]",
            )}
          >
            <p className="text-xs font-semibold">{item.label}</p>
            <p className="mt-1 text-[10px] leading-4 opacity-80">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/70 bg-background/78 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-right">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-white/55">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function ProfileMessagePreferences({ className }: ProfileMessagePreferencesProps) {
  const {
    preferences,
    positionOptions,
    motionOptions,
    durationOptions,
    densityOptions,
    colorOptions,
    variantOptions,
    iconModeOptions,
    soundPresetOptions,
    volumeOptions,
    stackStrategyOptions,
    stackLimitOptions,
    setPosition,
    setMotionPreset,
    setDurationPreset,
    setDensityPreset,
    setColorMode,
    setVariant,
    setIconMode,
    setSoundPreset,
    setSoundVolume,
    setSoundEnabled,
    setStackStrategy,
    setMaxVisible,
    setSwipeToDismiss,
    setHoverPause,
    setClickToDismiss,
    setReducedMotion,
    notify,
    dismissAll,
    resetPreferences,
  } = useSystemMessage();
  const previewTimeoutsRef = React.useRef<number[]>([]);

  React.useEffect(
    () => () => {
      previewTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    },
    [],
  );

  const schedulePreviewTimeout = (callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(callback, delay);
    previewTimeoutsRef.current.push(timeoutId);
  };

  const handleActionPreview = () => {
    notify.info("تم أرشفة الرسالة التجريبية.", {
      persistent: true,
      action: {
        label: "تراجع",
        onClick: () => {
          notify.success("تم التراجع عن الإجراء التجريبي.");
        },
      },
    });
  };

  const handleUpdatePreview = () => {
    const messageId = notify.loading("جارٍ تجهيز معاينة التدفق...");

    schedulePreviewTimeout(() => {
      notify.update(messageId, {
        tone: "info",
        message: "تمت المرحلة الأولى من المعاينة.",
        persistent: true,
        action: {
          label: "متابعة",
          onClick: () => {
            notify.update(messageId, {
              tone: "success",
              message: "اكتمل التدفق التفاعلي بنجاح.",
              persistent: false,
              action: null,
            });
          },
        },
      });
    }, 1100);
  };

  const handleDedupePreview = () => {
    notify.info("هذه رسالة مكررة لاختبار الدمج.");
    notify.info("هذه رسالة مكررة لاختبار الدمج.");
    notify.info("هذه رسالة مكررة لاختبار الدمج.");
  };

  const handlePromisePreview = () => {
    void notify.promise(
      () =>
        new Promise<string>((resolve) => {
          schedulePreviewTimeout(() => {
            resolve("تمت مزامنة المعاينة");
          }, 1500);
        }),
      {
        loading: {
          message: "جارٍ تنفيذ تدفق الوعد التجريبي...",
          action: {
            label: "إخفاء",
            dismissOnClick: true,
          },
        },
        success: (result) => ({
          message: `${result} بنجاح.`,
        }),
        error: "فشلت معاينة الوعد التجريبي.",
      },
    );
  };

  const handleRetryPreview = () => {
    notify.retry("فشلت العملية التجريبية، هل تريد المحاولة مجددًا؟", () => {
      notify.success("تمت إعادة المحاولة التجريبية بنجاح.");
    });
  };

  const handleUndoPreview = () => {
    notify.undo("تم تنفيذ الإجراء التجريبي.", () => {
      notify.info("تم التراجع عن الإجراء التجريبي.");
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <GlassShell title="معاينة الرسائل" icon={BellRing}>
        <div className="space-y-2">
          <SystemMessageInline
            tone="success"
            message="تم حفظ تفضيلات الرسائل بنجاح."
            colorMode={preferences.colorMode}
            densityPreset={preferences.densityPreset}
            variant={preferences.variant}
            showIcon={resolveSystemMessageIconVisibility(preferences.iconMode, "success", false)}
            dismissible={false}
          />
          <SystemMessageInline
            tone="warning"
            message="هذه المعاينة تعكس النمط الجديد الذي سيستخدم لاحقًا في بقية النظام."
            colorMode={preferences.colorMode}
            densityPreset={preferences.densityPreset}
            variant={preferences.variant}
            showIcon={resolveSystemMessageIconVisibility(preferences.iconMode, "warning", false)}
            dismissible={false}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
          <Button type="button" size="sm" onClick={() => notify.success("تم تطبيق النمط الجديد بنجاح.")}>
            نجاح
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => notify.warning("هذه رسالة تحذير تجريبية للمعاينة.")}
          >
            تحذير
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => notify.error("تعذر تنفيذ العملية التجريبية.")}
          >
            خطأ
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => notify.info("هذه رسالة معلوماتية للمعاينة.")}
          >
            معلومة
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => notify.loading("جارٍ إنشاء معاينة للحركة...")}
          >
            تحميل
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleActionPreview}>
            إجراء
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleUpdatePreview}>
            تدفق
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleDedupePreview}>
            دمج
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handlePromisePreview}>
            وعد
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleRetryPreview}>
            إعادة
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleUndoPreview}>
            تراجع
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={dismissAll}>
            مسح الكل
          </Button>
        </div>
      </GlassShell>

      <GlassShell title="مكان الرسائل" icon={MoveUpRight}>
        <SegmentedOptions
          items={positionOptions}
          selected={preferences.position}
          onSelect={setPosition}
        />
      </GlassShell>

      <GlassShell title="الحركة" icon={Sparkles}>
        <SegmentedOptions
          items={motionOptions}
          selected={preferences.motionPreset}
          onSelect={setMotionPreset}
        />
      </GlassShell>

      <GlassShell title="المدة والكثافة" icon={Clock3}>
        <div className="space-y-2">
          <SegmentedOptions
            items={durationOptions}
            selected={preferences.durationPreset}
            onSelect={setDurationPreset}
          />
          <SegmentedOptions
            items={densityOptions}
            selected={preferences.densityPreset}
            onSelect={setDensityPreset}
          />
        </div>
      </GlassShell>

      <GlassShell title="الألوان" icon={Blend}>
        <SegmentedOptions
          items={colorOptions}
          selected={preferences.colorMode}
          onSelect={setColorMode}
        />
      </GlassShell>

      <GlassShell title="الأسلوب البصري" icon={Blend}>
        <div className="space-y-2">
          <SegmentedOptions
            items={variantOptions}
            selected={preferences.variant}
            onSelect={setVariant}
          />
          <SegmentedOptions
            items={iconModeOptions}
            selected={preferences.iconMode}
            onSelect={setIconMode}
          />
        </div>
      </GlassShell>

      <GlassShell title="الأصوات" icon={Music4}>
        <div className="space-y-2">
          <ToggleRow
            label="تشغيل أصوات الرسائل"
            description="يشغّل نغمة مستقلة لكل رسالة نجاح أو خطأ أو تحذير أو معلومة أو تحميل."
            checked={preferences.soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
          <SegmentedOptions
            items={soundPresetOptions}
            selected={preferences.soundPreset}
            onSelect={setSoundPreset}
          />
          <SegmentedOptions
            items={volumeOptions}
            selected={preferences.soundVolume}
            onSelect={setSoundVolume}
          />
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => notify.success("معاينة صوت النجاح.")}
            >
              نجاح
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => notify.error("معاينة صوت الخطأ.")}
            >
              خطأ
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => notify.warning("معاينة صوت التحذير.")}
            >
              تحذير
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => notify.info("معاينة صوت المعلومة.")}
            >
              معلومة
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => notify.neutral("معاينة الصوت المحايد.")}
            >
              محايد
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => notify.loading("معاينة صوت التحميل.")}
            >
              تحميل
            </Button>
          </div>
        </div>
      </GlassShell>

      <GlassShell title="التكديس" icon={BellRing}>
        <div className="space-y-2">
          <SegmentedOptions
            items={stackStrategyOptions}
            selected={preferences.stackStrategy}
            onSelect={setStackStrategy}
          />
          <SegmentedOptions
            items={stackLimitOptions}
            selected={preferences.maxVisible}
            onSelect={setMaxVisible}
          />
        </div>
      </GlassShell>

      <GlassShell title="السلوك" icon={Wand2}>
        <div className="space-y-2">
          <ToggleRow
            label="السحب للإغلاق"
            description="يفعّل سحب الرسالة العائمة يمينًا أو يسارًا لإغلاقها."
            checked={preferences.swipeToDismiss}
            onCheckedChange={setSwipeToDismiss}
          />
          <ToggleRow
            label="إيقاف مؤقت عند التحويم"
            description="يوقف العد التنازلي للرسالة أثناء المرور عليها أو التركيز داخلها."
            checked={preferences.hoverPause}
            onCheckedChange={setHoverPause}
          />
          <ToggleRow
            label="إغلاق بالنقر"
            description="يسمح بالنقر على جسم الرسالة لإغلاقها مباشرة."
            checked={preferences.clickToDismiss}
            onCheckedChange={setClickToDismiss}
          />
          <ToggleRow
            label="تقليل الحركة"
            description="يخفف الأنيميشن والانتقالات لتجربة أكثر هدوءًا."
            checked={preferences.reducedMotion}
            onCheckedChange={setReducedMotion}
          />
        </div>
      </GlassShell>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-2xl"
        onClick={resetPreferences}
      >
        إعادة إعدادات الرسائل
      </Button>
    </div>
  );
}
