"use client";

import * as React from "react";
import { Check, Palette, Plus, Sparkles, Type, X } from "lucide-react";
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
  icon: string;
}> = [
  { value: "system", label: "تلقائي", icon: "⚙️" },
  { value: "light", label: "نهاري", icon: "☀️" },
  { value: "dark", label: "ليلي", icon: "🌙" },
];

// Accent color per preset for the color dot
const PRESET_ACCENT_COLORS: Record<string, string> = {
  adaptive: "#94a3b8",
  custom: "#6366f1",
  violet: "#8b5cf6",
  emerald: "#10b981",
  sky: "#0ea5e9",
  indigo: "#6366f1",
  fuchsia: "#d946ef",
  slate: "#64748b",
  ruby: "#f43f5e",
};

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
    <div className="rounded-[1.05rem] border border-white/70 bg-background/80 px-2 py-2.5 text-slate-900 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-black/25 dark:text-white">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-white/55">
        <Icon className="h-3 w-3 text-[color:var(--app-accent-color)]" />
        <span>{label}</span>
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

export function ProfileAppearanceSection({ className }: AppearanceSectionProps) {
  const appearance = useAppearance();
  const [showCustomForm, setShowCustomForm] = React.useState(false);
  const [customColor, setCustomColor] = React.useState(appearance.customAccentHex);

  React.useEffect(() => {
    setCustomColor(appearance.customAccentHex);
  }, [appearance.customAccentHex]);

  const themePresets = React.useMemo<ThemePreviewOption[]>(
    () =>
      appearance.colorPresetOptions
        .filter((option) => option.value !== "custom")
        .map((option) => {
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
  const currentThemeLabel =
    appearance.colorPresetOptions.find((option) => option.value === appearance.preset)
      ?.label ?? appearance.preset;
  const currentFont = getSelectedLabel(fontPresets, appearance.fontFamily);
  const currentMode =
    MODE_OPTIONS.find((option) => option.value === appearance.mode)?.label ?? "تلقائي";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary tiles — 3 columns always */}
      <div className="grid grid-cols-3 gap-1.5">
        <SummaryTile label="الوضع" value={currentMode} icon={Sparkles} />
        <SummaryTile
          label="الثيم"
          value={currentThemeLabel}
          icon={Palette}
        />
        <SummaryTile
          label="الخط"
          value={currentFont?.label ?? appearance.fontFamily}
          icon={Type}
        />
      </div>

      {/* Mode selector */}
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
                  "flex flex-col items-center gap-1 rounded-[1rem] border px-2 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                    : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white",
                )}
              >
                <span className="text-base">{option.icon}</span>
                <span className="text-xs">{option.label}</span>
              </button>
            );
          })}
        </div>
      </GlassShell>

      {/* Theme selector — 3 per row with color dot */}
      <GlassShell title="الثيم" icon={Palette}>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {themePresets.map((preset) => {
            const active = preset.value === appearance.preset;
            const accentColor = PRESET_ACCENT_COLORS[preset.value] ?? "#94a3b8";
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => appearance.setPreset(preset.value as typeof appearance.preset)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-[0.9rem] border py-2.5 transition-all",
                  active
                    ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)]"
                    : "border-white/70 bg-background/78 hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]",
                )}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full shadow-md"
                  style={{ backgroundColor: accentColor }}
                >
                  {active ? <Check className="h-3 w-3 text-white" /> : null}
                </span>
                <span className="px-1 text-center text-[10px] font-medium leading-tight text-slate-800 dark:text-white/80">
                  {preset.label}
                </span>
              </button>
            );
          })}

          {/* Custom theme button */}
          <button
            type="button"
            onClick={() => setShowCustomForm((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-[0.9rem] border py-2.5 transition-all",
              showCustomForm || appearance.preset === "custom"
                ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]"
                : "border-dashed border-slate-300 bg-background/60 hover:bg-white/80 dark:border-white/15 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
            )}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed"
              style={{
                borderColor:
                  showCustomForm || appearance.preset === "custom"
                    ? "var(--app-accent-color)"
                    : "#94a3b8",
                backgroundColor:
                  showCustomForm || appearance.preset === "custom"
                    ? `${appearance.customAccentHex}33`
                    : "transparent",
              }}
            >
              {showCustomForm ? (
                <X className="h-3 w-3 text-[color:var(--app-accent-color)]" />
              ) : appearance.preset === "custom" ? (
                <Check className="h-3 w-3 text-[color:var(--app-accent-color)]" />
              ) : (
                <Plus className="h-3 w-3 text-slate-400 dark:text-white/40" />
              )}
            </span>
            <span className="px-1 text-[10px] font-medium text-slate-500 dark:text-white/50">
              مخصص
            </span>
          </button>
        </div>

        {/* Custom theme color form */}
        {showCustomForm && (
          <div className="mt-3 rounded-[1rem] border border-white/70 bg-background/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="mb-2 text-xs font-semibold text-slate-800 dark:text-white">
              اختر لون الثيم المخصص
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-lg border border-white/70 bg-transparent p-0.5 dark:border-white/10"
              />
              <div
                className="h-10 flex-1 rounded-lg transition-all"
                style={{
                  background: `linear-gradient(135deg, ${customColor}25, ${customColor}70)`,
                  border: `1.5px solid ${customColor}50`,
                }}
              />
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-md"
                style={{ backgroundColor: customColor }}
              >
                <Check className="h-4 w-4 text-white opacity-0" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  appearance.setCustomAccentHex(customColor);
                  appearance.setPreset("custom");
                  setShowCustomForm(false);
                }}
                className="h-9 flex-1 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: customColor }}
              >
                تطبيق اللون
              </button>
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="h-9 rounded-lg border border-white/70 bg-background/75 px-4 text-xs font-medium text-slate-700 transition-colors hover:bg-white dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.06]"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </GlassShell>

      {/* Font selector — 2 per row */}
      <GlassShell title="الخط" icon={Type}>
        <div className="grid grid-cols-2 gap-1.5">
          {fontPresets.map((font) => {
            const active = font.value === appearance.fontFamily;
            return (
              <button
                key={font.value}
                type="button"
                onClick={() => appearance.setFontFamily(font.value as typeof appearance.fontFamily)}
                className={cn(
                  "rounded-[1rem] border px-3 py-2.5 text-right transition-all",
                  active
                    ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]/20 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.5)]"
                    : "border-white/70 bg-background/78 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {font.label}
                  </span>
                  {active ? (
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--app-accent-color)]" />
                  ) : null}
                </div>
                <p
                  className="mt-1 truncate text-xs text-slate-600 dark:text-white/60"
                  style={{ fontFamily: font.stack }}
                >
                  مدرسة النجاح
                </p>
              </button>
            );
          })}
        </div>
      </GlassShell>

      {/* Font scale — 3 per row */}
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
                  "rounded-[1rem] border px-3 py-2.5 text-xs font-medium transition-all",
                  active
                    ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                    : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white",
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
