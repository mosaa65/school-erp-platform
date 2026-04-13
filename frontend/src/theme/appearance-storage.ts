import type {
  AppearanceMode,
  ColorPresetId,
  ColorScheme,
  FontPresetId,
} from "@/theme/appearance-types";
import { COLOR_PRESETS, resolvePresetThemeTokens } from "@/theme/color-presets";
import { FONT_PRESETS, resolveFontFamily, resolveMonoFontFamily } from "@/theme/font-presets";

export type AppearanceSurfaceMode = AppearanceMode;
export type AppearanceColorPreset = ColorPresetId;
export type AppearanceFontFamily = FontPresetId;
export type AppearanceFontScale = "compact" | "comfortable" | "large";

export type AppearancePreferences = {
  colorPreset: AppearanceColorPreset;
  surfaceMode: AppearanceSurfaceMode;
  fontFamily: AppearanceFontFamily;
  fontScale: AppearanceFontScale;
  customAccentHex: string;
};

export type AppearanceResolvedTokens = {
  accentColor: string;
  accentSoft: string;
  accentStrong: string;
  accentRing: string;
};

export type AppearancePresetDefinition = {
  value: AppearanceColorPreset;
  label: string;
  description: string;
  tokens: AppearanceResolvedTokens | null;
};

export type AppearanceFontFamilyDefinition = {
  value: AppearanceFontFamily;
  label: string;
  stack: string;
};

export type AppearanceFontScaleDefinition = {
  value: AppearanceFontScale;
  label: string;
  description: string;
  scale: number;
};

const STORAGE_VERSION = 2;
const STORAGE_KEY = "school-erp.appearance.v1";
const DEFAULT_CUSTOM_ACCENT_HEX = "#6366f1";

export const DEFAULT_APPEARANCE_PREFERENCES: AppearancePreferences = {
  colorPreset: "adaptive",
  surfaceMode: "system",
  fontFamily: "cairo",
  fontScale: "comfortable",
  customAccentHex: DEFAULT_CUSTOM_ACCENT_HEX,
};

export const APPEARANCE_COLOR_PRESETS: AppearancePresetDefinition[] = COLOR_PRESETS.map(
  (preset) => ({
    value: preset.id,
    label: preset.label,
    description: preset.description,
    tokens:
      preset.id === "adaptive"
        ? null
        : toResolvedTokens(resolvePresetThemeTokens(preset.id, "light").accent),
  }),
);

export const APPEARANCE_FONT_FAMILIES: AppearanceFontFamilyDefinition[] = FONT_PRESETS.map(
  (font) => ({
    value: font.id,
    label: font.label,
    stack: resolveFontFamily(font.id),
  }),
);

export const APPEARANCE_FONT_SCALES: AppearanceFontScaleDefinition[] = [
  {
    value: "compact",
    label: "مضغوط",
    description: "مساحة أقل وكثافة أعلى للشاشات الطويلة.",
    scale: 0.96,
  },
  {
    value: "comfortable",
    label: "مريح",
    description: "التوازن الافتراضي بين القراءة والمساحة.",
    scale: 1,
  },
  {
    value: "large",
    label: "كبير",
    description: "قراءة أوضح للعروض الواسعة أو الاستخدام المطوّل.",
    scale: 1.08,
  },
];

type StoredAppearancePreferences = {
  version: number;
  preferences: AppearancePreferences;
};

function toResolvedTokens(
  accent: ReturnType<typeof resolvePresetThemeTokens>["accent"],
): AppearanceResolvedTokens {
  return {
    accentColor: accent.color,
    accentSoft: accent.soft,
    accentStrong: accent.strong,
    accentRing: accent.ring,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAppearanceSurfaceMode(value: unknown): value is AppearanceSurfaceMode {
  return value === "light" || value === "dark" || value === "system";
}

function isAppearanceColorPreset(value: unknown): value is AppearanceColorPreset {
  return APPEARANCE_COLOR_PRESETS.some((item) => item.value === value);
}

function isAppearanceFontFamily(value: unknown): value is AppearanceFontFamily {
  return APPEARANCE_FONT_FAMILIES.some((item) => item.value === value);
}

function isAppearanceFontScale(value: unknown): value is AppearanceFontScale {
  return APPEARANCE_FONT_SCALES.some((item) => item.value === value);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function toRgbChannels(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function normalizePreferences(
  input: Partial<AppearancePreferences> | undefined,
): AppearancePreferences {
  return {
    colorPreset: isAppearanceColorPreset(input?.colorPreset)
      ? input.colorPreset
      : DEFAULT_APPEARANCE_PREFERENCES.colorPreset,
    surfaceMode: isAppearanceSurfaceMode(input?.surfaceMode)
      ? input.surfaceMode
      : DEFAULT_APPEARANCE_PREFERENCES.surfaceMode,
    fontFamily: isAppearanceFontFamily(input?.fontFamily)
      ? input.fontFamily
      : DEFAULT_APPEARANCE_PREFERENCES.fontFamily,
    fontScale: isAppearanceFontScale(input?.fontScale)
      ? input.fontScale
      : DEFAULT_APPEARANCE_PREFERENCES.fontScale,
    customAccentHex: isHexColor(input?.customAccentHex)
      ? input.customAccentHex
      : DEFAULT_APPEARANCE_PREFERENCES.customAccentHex,
  };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadAppearancePreferences(): AppearancePreferences {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_APPEARANCE_PREFERENCES;
  }

  try {
    const rawValue = storage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_APPEARANCE_PREFERENCES;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredAppearancePreferences>;
    if (parsed.version === STORAGE_VERSION && isRecord(parsed.preferences)) {
      return normalizePreferences(parsed.preferences as Partial<AppearancePreferences>);
    }

    if (isRecord(parsed)) {
      return normalizePreferences(parsed as Partial<AppearancePreferences>);
    }

    return DEFAULT_APPEARANCE_PREFERENCES;
  } catch {
    return DEFAULT_APPEARANCE_PREFERENCES;
  }
}

export function saveAppearancePreferences(preferences: AppearancePreferences): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const payload: StoredAppearancePreferences = {
    version: STORAGE_VERSION,
    preferences: normalizePreferences(preferences),
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures in private mode or quota-constrained environments.
  }
}

export function clearAppearancePreferences(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function resolveSurfaceMode(
  surfaceMode: AppearanceSurfaceMode,
  prefersDark: boolean,
): Exclude<AppearanceSurfaceMode, "system"> {
  if (surfaceMode === "system") {
    return prefersDark ? "dark" : "light";
  }

  return surfaceMode;
}

export function resolveAppearanceTokens(
  preset: AppearanceColorPreset,
  scheme: ColorScheme,
  customAccentHex = DEFAULT_CUSTOM_ACCENT_HEX,
): AppearanceResolvedTokens | null {
  if (preset === "adaptive") {
    return null;
  }

  if (preset === "custom") {
    const { r, g, b } = toRgbChannels(customAccentHex);
    const ringAlpha = scheme === "dark" ? 0.4 : 0.34;

    return {
      accentColor: `rgb(${r} ${g} ${b})`,
      accentSoft: `rgba(${r}, ${g}, ${b}, 0.12)`,
      accentStrong: `rgba(${r}, ${g}, ${b}, 0.24)`,
      accentRing: `rgba(${r}, ${g}, ${b}, ${ringAlpha})`,
    };
  }

  return toResolvedTokens(resolvePresetThemeTokens(preset, scheme).accent);
}

export function resolveFontFamilyStack(fontFamily: AppearanceFontFamily): string {
  return resolveFontFamily(fontFamily);
}

export function resolveMonoFontFamilyStack(fontFamily: AppearanceFontFamily): string {
  return resolveMonoFontFamily(fontFamily);
}

export function resolveFontScaleValue(fontScale: AppearanceFontScale): number {
  return (
    APPEARANCE_FONT_SCALES.find((item) => item.value === fontScale)?.scale ??
    APPEARANCE_FONT_SCALES[1]?.scale ??
    1
  );
}

export function getAppearanceColorPresetLabel(preset: AppearanceColorPreset): string {
  return APPEARANCE_COLOR_PRESETS.find((item) => item.value === preset)?.label ?? preset;
}

export function getAppearanceFontFamilyLabel(fontFamily: AppearanceFontFamily): string {
  return APPEARANCE_FONT_FAMILIES.find((item) => item.value === fontFamily)?.label ?? fontFamily;
}

export function getAppearanceFontScaleLabel(fontScale: AppearanceFontScale): string {
  return APPEARANCE_FONT_SCALES.find((item) => item.value === fontScale)?.label ?? fontScale;
}
