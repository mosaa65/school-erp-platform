import type { CSSProperties } from "react";

export type AppearanceMode = "light" | "dark" | "system";

export type ColorPresetId =
  | "adaptive"
  | "violet"
  | "emerald"
  | "sky"
  | "indigo"
  | "fuchsia"
  | "slate"
  | "ruby";

export type ColorScheme = Exclude<AppearanceMode, "system">;

export type AccentTokens = {
  color: string;
  soft: string;
  strong: string;
  ring: string;
};

export type AccentVars = CSSProperties & {
  "--app-accent-color": string;
  "--app-accent-soft": string;
  "--app-accent-strong": string;
  "--app-accent-ring": string;
};

export type SurfaceThemeTokens = {
  panelClassName: string;
  activeGlowClassName: string;
  headerClassName: string;
  headerIconClassName: string;
  headerBadgeClassName: string;
};

export type ThemeTokens = SurfaceThemeTokens & {
  accent: AccentTokens;
  accentVars: AccentVars;
};

export type ColorPresetPalette = {
  light: ThemeTokens;
  dark: ThemeTokens;
};

export type ColorPresetDefinition = {
  id: ColorPresetId;
  labelAr: string;
  descriptionAr: string;
  palette: ColorPresetPalette;
};

export type FontPresetId =
  | "cairo"
  | "tajawal"
  | "noto-kufi-arabic"
  | "almarai"
  | "system";

export type FontPresetDefinition = {
  id: FontPresetId;
  labelAr: string;
  descriptionAr: string;
  fontFamily: string;
  monoFamily?: string;
};

export function createAccentVars(accent: AccentTokens): AccentVars {
  return {
    "--app-accent-color": accent.color,
    "--app-accent-soft": accent.soft,
    "--app-accent-strong": accent.strong,
    "--app-accent-ring": accent.ring,
  };
}
