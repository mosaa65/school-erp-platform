import type { FontPresetDefinition, FontPresetId } from "@/theme/appearance-types";

const FONT_PRESET_DEFINITIONS: Record<FontPresetId, FontPresetDefinition> = {
  cairo: {
    id: "cairo",
    labelAr: "Cairo",
    descriptionAr: "الخط الحالي الافتراضي للنظام.",
    fontFamily: 'var(--font-cairo), "Cairo", ui-sans-serif, system-ui, sans-serif',
    monoFamily:
      'var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  tajawal: {
    id: "tajawal",
    labelAr: "Tajawal",
    descriptionAr: "خط عربي أكثر نعومة للواجهات الإدارية.",
    fontFamily: 'var(--font-tajawal), var(--font-cairo), ui-sans-serif, system-ui, sans-serif',
    monoFamily:
      'var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  "noto-kufi-arabic": {
    id: "noto-kufi-arabic",
    labelAr: "Noto Kufi Arabic",
    descriptionAr: "خط واضح ومناسب للقراءة الطويلة والعناوين.",
    fontFamily:
      'var(--font-noto-kufi-arabic), var(--font-cairo), ui-sans-serif, system-ui, sans-serif',
    monoFamily:
      'var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  almarai: {
    id: "almarai",
    labelAr: "Almarai",
    descriptionAr: "خط متوازن ومريح للواجهات ذات الكثافة العالية.",
    fontFamily:
      'var(--font-almarai), var(--font-cairo), ui-sans-serif, system-ui, sans-serif',
    monoFamily:
      'var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  system: {
    id: "system",
    labelAr: "System",
    descriptionAr: "يستخدم خط النظام المحلي للجهاز مباشرة.",
    fontFamily: 'system-ui, sans-serif',
    monoFamily: 'ui-monospace, SFMono-Regular, monospace',
  },
};

export type FontPresetPreview = {
  id: FontPresetId;
  label: string;
  preview: string;
};

export const FONT_PRESET_IDS = Object.keys(FONT_PRESET_DEFINITIONS) as FontPresetId[];

export const FONT_PRESETS: FontPresetPreview[] = FONT_PRESET_IDS.map((presetId) => {
  const preset = FONT_PRESET_DEFINITIONS[presetId];

  return {
    id: preset.id,
    label: preset.labelAr,
    preview: preset.descriptionAr,
  };
});

export function listFontPresets(): FontPresetDefinition[] {
  return FONT_PRESET_IDS.map((presetId) => FONT_PRESET_DEFINITIONS[presetId]);
}

export function getFontPresetDefinition(
  presetId: FontPresetId,
): FontPresetDefinition {
  return FONT_PRESET_DEFINITIONS[presetId] ?? FONT_PRESET_DEFINITIONS.cairo;
}

export function resolveFontFamily(presetId: FontPresetId): string {
  return getFontPresetDefinition(presetId).fontFamily;
}

export function resolveMonoFontFamily(presetId: FontPresetId): string {
  return (
    getFontPresetDefinition(presetId).monoFamily ??
    FONT_PRESET_DEFINITIONS.cairo.monoFamily ??
    'ui-monospace, SFMono-Regular, monospace'
  );
}
