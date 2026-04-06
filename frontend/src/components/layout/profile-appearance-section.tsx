"use client";

import * as React from "react";
import { Check, Palette, Sparkles, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/hooks/use-appearance";
import { COLOR_PRESETS } from "@/theme/color-presets";
import { FONT_PRESETS } from "@/theme/font-presets";

type AppearanceSectionProps = {
  className?: string;
};

type AppearanceMode = "light" | "dark" | "system";

type ThemePreviewOption = {
  value: string;
  label: string;
  previewClassName: string;
};

type FontPreviewOption = {
  value: string;
  label: string;
  preview: string;
  stack: string;
};

type FontScaleOption = {
  value: string;
  label: string;
};

const MODE_OPTIONS: Array<{
  value: AppearanceMode;
  label: string;
}> = [
  { value: "system", label: "تلقائي" },
  { value: "light", label: "نهاري" },
  { value: "dark", label: "ليلي" },
];

function getSelectedLabel<T extends { id?: string; value?: string; label: string }>(
  items: T[],
  selected: string,
): T | undefined {
  return items.find((item) => (item.id ?? item.value) === selected);
}

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
    <section className="rounded-[1.25rem] border border-white/70 bg-white/68 p-3 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.85)] sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Icon className="h-4 w-4 text-[color:var(--app-accent-color)]" />
          {title}
        </span>
        <span className="h-px flex-1 bg-black/[0.06] dark:bg-white/10" />
      </div>
      {children}
    </section>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[1.05rem] border border-white/70 bg-background/80 px-3 py-3 text-slate-900 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-black/25 dark:text-white">
      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-white/55">
        <Icon className="h-3.5 w-3.5 text-[color:var(--app-accent-color)]" />
        <span>{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

export function ProfileAppearanceSection({ className }: AppearanceSectionProps) {
  const appearance = useAppearance();

  const themePresets = React.useMemo<ThemePreviewOption[]>(
    () =>
      appearance.colorPresetOptions.map((option) => {
        const preview = COLOR_PRESETS.find((preset) => preset.id === option.value);

        return {
          value: option.value,
          label: option.label,
          previewClassName:
            preview?.previewClassName ??
            "from-slate-500/70 via-background/10 to-transparent",
        };
      }),
    [appearance.colorPresetOptions],
  );

  const fontPresets = React.useMemo<FontPreviewOption[]>(
    () =>
      appearance.fontFamilyOptions.map((option) => {
        const preview = FONT_PRESETS.find((font) => font.id === option.value);

        return {
          value: option.value,
          label: option.label,
          preview: preview?.preview ?? option.label,
          stack: option.stack,
        };
      }),
    [appearance.fontFamilyOptions],
  );

  const fontScales = appearance.fontScaleOptions as FontScaleOption[];
  const currentTheme = getSelectedLabel(themePresets, appearance.preset);
  const currentFont = getSelectedLabel(fontPresets, appearance.fontFamily);
  const currentScale = getSelectedLabel(fontScales, appearance.fontScale);
  const currentMode =
    MODE_OPTIONS.find((option) => option.value === appearance.mode)?.label ?? "تلقائي";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryTile label="الوضع" value={currentMode} icon={Sparkles} />
        <SummaryTile
          label="الثيم"
          value={currentTheme?.label ?? appearance.preset}
          icon={Palette}
        />
        <SummaryTile
          label="الخط"
          value={currentFont?.label ?? appearance.fontFamily}
          icon={Type}
        />
      </div>

      <div
        className="rounded-[1.3rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.72))] p-3 text-slate-900 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#14161c] dark:text-white dark:shadow-[0_18px_44px_-28px_rgba(15,23,42,0.95)]"
        style={{
          fontFamily: currentFont?.stack ?? "var(--appearance-font-family)",
          fontSize: "calc(14px * var(--appearance-font-scale))",
        }}
      >
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-white/50">
          <span>المعاينة</span>
          <span className="rounded-full border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-2.5 py-1 text-[color:var(--app-accent-color)]">
            {appearance.resolvedSurfaceMode}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold">مدرسة النجاح الحديثة</p>
        <p className="mt-1 text-[11px] leading-6 text-slate-500 dark:text-white/55">
          {currentTheme?.label ?? appearance.preset} • {currentFont?.label ?? appearance.fontFamily} •{" "}
          {currentScale?.label ?? appearance.fontScale}
        </p>
      </div>

      <GlassShell title="وضع العرض" icon={Sparkles}>
        <div className="grid grid-cols-3 gap-2">
          {MODE_OPTIONS.map((option) => {
            const active = appearance.mode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => appearance.setMode(option.value)}
                className={cn(
                  "rounded-[1rem] border px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                    : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-white",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </GlassShell>

      <GlassShell title="الثيم" icon={Palette}>
        <div className="grid gap-2 sm:grid-cols-2">
          {themePresets.map((preset) => {
            const active = preset.value === appearance.preset;

            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => appearance.setPreset(preset.value as typeof appearance.preset)}
                className={cn(
                  "overflow-hidden rounded-[1rem] border text-right transition-all",
                  active
                    ? "border-[color:var(--app-accent-strong)] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.8)]"
                    : "border-white/70 hover:bg-white/70 dark:border-white/10 dark:hover:border-white/20",
                )}
              >
                <div className={cn("h-9 bg-gradient-to-br", preset.previewClassName)} />
                <div className="flex items-center justify-between gap-2 bg-white/[0.62] px-3 py-3 dark:bg-white/[0.03]">
                  <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {preset.label}
                  </span>
                  {active ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--app-accent-color)] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </GlassShell>

      <GlassShell title="الخط" icon={Type}>
        <div className="grid gap-2 sm:grid-cols-2">
          {fontPresets.map((font) => {
            const active = font.value === appearance.fontFamily;

            return (
              <button
                key={font.value}
                type="button"
                onClick={() => appearance.setFontFamily(font.value as typeof appearance.fontFamily)}
                className={cn(
                  "rounded-[1rem] border px-3 py-3 text-right transition-all",
                  active
                    ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]/20 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.8)]"
                    : "border-white/70 bg-background/78 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.05]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {font.label}
                  </span>
                  {active ? <Check className="h-4 w-4 text-[color:var(--app-accent-color)]" /> : null}
                </div>
                <p
                  className="mt-2 truncate text-sm text-slate-700 dark:text-white/70"
                  style={{ fontFamily: font.stack }}
                >
                  مدرسة النجاح الحديثة
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/45">
                  {font.preview}
                </p>
              </button>
            );
          })}
        </div>
      </GlassShell>

      <GlassShell title="الحجم" icon={Sparkles}>
        <div className="grid grid-cols-3 gap-2">
          {fontScales.map((scale) => {
            const active = scale.value === appearance.fontScale;

            return (
              <button
                key={scale.value}
                type="button"
                onClick={() => appearance.setFontScale(scale.value as typeof appearance.fontScale)}
                className={cn(
                  "rounded-[1rem] border px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                    : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-white",
                )}
              >
                {scale.label}
              </button>
            );
          })}
        </div>
      </GlassShell>
    </div>
  );
}
