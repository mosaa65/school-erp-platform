import {
  createAccentVars,
  type AccentTokens,
  type ColorPresetDefinition,
  type ColorPresetId,
  type ColorScheme,
  type ThemeTokens,
} from "@/theme/appearance-types";
import { resolveModuleAccentPresetId } from "@/theme/module-accent-map";

export type ColorPresetPreview = {
  id: ColorPresetId;
  label: string;
  description: string;
  previewClassName: string;
};

type ThemeSurfaceTemplate = Omit<ThemeTokens, "accent" | "accentVars">;

type PresetTemplate = {
  light: {
    surface: ThemeSurfaceTemplate;
    accent: AccentTokens;
  };
  dark: {
    surface: ThemeSurfaceTemplate;
    accent: AccentTokens;
  };
};

function buildThemeTokens(template: PresetTemplate, scheme: ColorScheme): ThemeTokens {
  const variant = template[scheme];

  return {
    ...variant.surface,
    accent: variant.accent,
    accentVars: createAccentVars(variant.accent),
  };
}

function createPresetDefinition(
  id: ColorPresetId,
  labelAr: string,
  descriptionAr: string,
  template: PresetTemplate,
): ColorPresetDefinition {
  return {
    id,
    labelAr,
    descriptionAr,
    palette: {
      light: buildThemeTokens(template, "light"),
      dark: buildThemeTokens(template, "dark"),
    },
  };
}

const neutralSurface: ThemeSurfaceTemplate = {
  panelClassName: "border-slate-500/20 bg-background/55",
  activeGlowClassName: "from-slate-500/16 via-slate-500/6 to-transparent",
  headerClassName:
    "border-slate-500/25 bg-gradient-to-l from-slate-500/16 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(100,116,139,0.42)]",
  headerIconClassName:
    "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  headerBadgeClassName:
    "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

const customSurface: ThemeSurfaceTemplate = {
  panelClassName: "border-[color:var(--app-accent-strong)] bg-background/55",
  activeGlowClassName:
    "from-[color:var(--app-accent-strong)] via-[color:var(--app-accent-soft)] to-transparent",
  headerClassName:
    "border-[color:var(--app-accent-strong)] bg-gradient-to-l from-[color:var(--app-accent-soft)] via-background/92 to-background/78 shadow-[0_22px_55px_-34px_color-mix(in_oklab,var(--app-accent-color)_42%,transparent)]",
  headerIconClassName:
    "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]",
  headerBadgeClassName:
    "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]",
};

const violetSurface: ThemeSurfaceTemplate = {
  panelClassName: "border-violet-500/20 bg-background/55",
  activeGlowClassName: "from-violet-500/18 via-violet-500/7 to-transparent",
  headerClassName:
    "border-violet-500/25 bg-gradient-to-l from-violet-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(139,92,246,0.55)]",
  headerIconClassName:
    "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  headerBadgeClassName:
    "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const emeraldSurface: ThemeSurfaceTemplate = {
  panelClassName: "border-emerald-500/20 bg-background/55",
  activeGlowClassName: "from-emerald-500/18 via-emerald-500/7 to-transparent",
  headerClassName:
    "border-emerald-500/25 bg-gradient-to-l from-emerald-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(16,185,129,0.52)]",
  headerIconClassName:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  headerBadgeClassName:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const skySurface: ThemeSurfaceTemplate = {
  panelClassName: "border-sky-500/20 bg-background/55",
  activeGlowClassName: "from-sky-500/18 via-sky-500/7 to-transparent",
  headerClassName:
    "border-sky-500/25 bg-gradient-to-l from-sky-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(14,165,233,0.52)]",
  headerIconClassName:
    "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  headerBadgeClassName:
    "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

const indigoSurface: ThemeSurfaceTemplate = {
  panelClassName: "border-indigo-500/20 bg-background/55",
  activeGlowClassName: "from-indigo-500/18 via-indigo-500/7 to-transparent",
  headerClassName:
    "border-indigo-500/25 bg-gradient-to-l from-indigo-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(99,102,241,0.52)]",
  headerIconClassName:
    "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  headerBadgeClassName:
    "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
};

const fuchsiaSurface: ThemeSurfaceTemplate = {
  panelClassName: "border-fuchsia-500/20 bg-background/55",
  activeGlowClassName: "from-fuchsia-500/18 via-fuchsia-500/7 to-transparent",
  headerClassName:
    "border-fuchsia-500/25 bg-gradient-to-l from-fuchsia-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(217,70,239,0.52)]",
  headerIconClassName:
    "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  headerBadgeClassName:
    "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
};

const rubySurface: ThemeSurfaceTemplate = {
  panelClassName: "border-rose-500/20 bg-background/55",
  activeGlowClassName: "from-rose-500/18 via-rose-500/7 to-transparent",
  headerClassName:
    "border-rose-500/25 bg-gradient-to-l from-rose-500/20 via-background/92 to-background/78 shadow-[0_22px_55px_-34px_rgba(244,63,94,0.52)]",
  headerIconClassName:
    "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  headerBadgeClassName:
    "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const PRESET_DEFINITIONS: Record<ColorPresetId, ColorPresetDefinition> = {
  adaptive: createPresetDefinition(
    "adaptive",
    "متكيف مع النظام",
    "يحافظ على لون كل نظام كما هو في التجربة الحالية.",
    {
      light: {
        surface: neutralSurface,
        accent: {
          color: "rgb(100 116 139)",
          soft: "rgba(100, 116, 139, 0.12)",
          strong: "rgba(100, 116, 139, 0.22)",
          ring: "rgba(100, 116, 139, 0.3)",
        },
      },
      dark: {
        surface: neutralSurface,
        accent: {
          color: "rgb(148 163 184)",
          soft: "rgba(148, 163, 184, 0.12)",
          strong: "rgba(148, 163, 184, 0.22)",
          ring: "rgba(148, 163, 184, 0.3)",
        },
      },
    },
  ),
  custom: createPresetDefinition(
    "custom",
    "لون مخصص",
    "يطبق لونًا موحدًا تختاره يدويًا على النظام كاملًا.",
    {
      light: {
        surface: customSurface,
        accent: {
          color: "var(--app-accent-color)",
          soft: "var(--app-accent-soft)",
          strong: "var(--app-accent-strong)",
          ring: "var(--app-accent-ring)",
        },
      },
      dark: {
        surface: customSurface,
        accent: {
          color: "var(--app-accent-color)",
          soft: "var(--app-accent-soft)",
          strong: "var(--app-accent-strong)",
          ring: "var(--app-accent-ring)",
        },
      },
    },
  ),
  violet: createPresetDefinition(
    "violet",
    "بنفسجي",
    "ثيم هادئ ومناسب للبنية المشتركة والإعدادات العامة.",
    {
      light: {
        surface: violetSurface,
        accent: {
          color: "rgb(139 92 246)",
          soft: "rgba(139, 92, 246, 0.12)",
          strong: "rgba(139, 92, 246, 0.22)",
          ring: "rgba(139, 92, 246, 0.32)",
        },
      },
      dark: {
        surface: violetSurface,
        accent: {
          color: "rgb(168 85 247)",
          soft: "rgba(168, 85, 247, 0.12)",
          strong: "rgba(168, 85, 247, 0.22)",
          ring: "rgba(168, 85, 247, 0.32)",
        },
      },
    },
  ),
  emerald: createPresetDefinition(
    "emerald",
    "زمردي",
    "مناسب للنواة الأكاديمية والمالية والأنشطة المرتبطة بالنمو والتنظيم.",
    {
      light: {
        surface: emeraldSurface,
        accent: {
          color: "rgb(16 185 129)",
          soft: "rgba(16, 185, 129, 0.12)",
          strong: "rgba(16, 185, 129, 0.22)",
          ring: "rgba(16, 185, 129, 0.3)",
        },
      },
      dark: {
        surface: emeraldSurface,
        accent: {
          color: "rgb(52 211 153)",
          soft: "rgba(52, 211, 153, 0.12)",
          strong: "rgba(52, 211, 153, 0.22)",
          ring: "rgba(52, 211, 153, 0.3)",
        },
      },
    },
  ),
  sky: createPresetDefinition(
    "sky",
    "أزرق سماوي",
    "ثيم مناسب للموارد البشرية والإجراءات التشغيلية.",
    {
      light: {
        surface: skySurface,
        accent: {
          color: "rgb(14 165 233)",
          soft: "rgba(14, 165, 233, 0.12)",
          strong: "rgba(14, 165, 233, 0.22)",
          ring: "rgba(14, 165, 233, 0.3)",
        },
      },
      dark: {
        surface: skySurface,
        accent: {
          color: "rgb(56 189 248)",
          soft: "rgba(56, 189, 248, 0.12)",
          strong: "rgba(56, 189, 248, 0.22)",
          ring: "rgba(56, 189, 248, 0.3)",
        },
      },
    },
  ),
  indigo: createPresetDefinition(
    "indigo",
    "نيلي",
    "ثيم مناسب للطلاب ومسارات التعلّم والتقدّم الأكاديمي.",
    {
      light: {
        surface: indigoSurface,
        accent: {
          color: "rgb(99 102 241)",
          soft: "rgba(99, 102, 241, 0.12)",
          strong: "rgba(99, 102, 241, 0.22)",
          ring: "rgba(99, 102, 241, 0.32)",
        },
      },
      dark: {
        surface: indigoSurface,
        accent: {
          color: "rgb(129 140 248)",
          soft: "rgba(129, 140, 248, 0.12)",
          strong: "rgba(129, 140, 248, 0.22)",
          ring: "rgba(129, 140, 248, 0.32)",
        },
      },
    },
  ),
  fuchsia: createPresetDefinition(
    "fuchsia",
    "فوشيا",
    "ثيم مميز لدرجات الطلاب والسياسات والحالات التي تحتاج إبرازًا بصريًا.",
    {
      light: {
        surface: fuchsiaSurface,
        accent: {
          color: "rgb(217 70 239)",
          soft: "rgba(217, 70, 239, 0.12)",
          strong: "rgba(217, 70, 239, 0.22)",
          ring: "rgba(217, 70, 239, 0.32)",
        },
      },
      dark: {
        surface: fuchsiaSurface,
        accent: {
          color: "rgb(232 121 249)",
          soft: "rgba(232, 121, 249, 0.12)",
          strong: "rgba(232, 121, 249, 0.22)",
          ring: "rgba(232, 121, 249, 0.32)",
        },
      },
    },
  ),
  slate: createPresetDefinition(
    "slate",
    "رمادي أنيق",
    "ثيم محايد وهادئ يصلح كخيار عام افتراضي.",
    {
      light: {
        surface: neutralSurface,
        accent: {
          color: "rgb(100 116 139)",
          soft: "rgba(100, 116, 139, 0.12)",
          strong: "rgba(100, 116, 139, 0.22)",
          ring: "rgba(100, 116, 139, 0.3)",
        },
      },
      dark: {
        surface: neutralSurface,
        accent: {
          color: "rgb(148 163 184)",
          soft: "rgba(148, 163, 184, 0.12)",
          strong: "rgba(148, 163, 184, 0.22)",
          ring: "rgba(148, 163, 184, 0.3)",
        },
      },
    },
  ),
  ruby: createPresetDefinition(
    "ruby",
    "روبي",
    "ثيم أحمر واضح يصلح للحالات الصحية والتنبيهات البصرية القوية.",
    {
      light: {
        surface: rubySurface,
        accent: {
          color: "rgb(244 63 94)",
          soft: "rgba(244, 63, 94, 0.12)",
          strong: "rgba(244, 63, 94, 0.22)",
          ring: "rgba(244, 63, 94, 0.32)",
        },
      },
      dark: {
        surface: rubySurface,
        accent: {
          color: "rgb(251 113 133)",
          soft: "rgba(251, 113, 133, 0.12)",
          strong: "rgba(251, 113, 133, 0.22)",
          ring: "rgba(251, 113, 133, 0.32)",
        },
      },
    },
  ),
};

export const COLOR_PRESET_IDS = Object.keys(PRESET_DEFINITIONS) as ColorPresetId[];

export const COLOR_PRESETS: ColorPresetPreview[] = COLOR_PRESET_IDS.map((presetId) => {
  const preset = PRESET_DEFINITIONS[presetId];
  const previewClassName = preset.palette.light.headerClassName
    .replace("bg-gradient-to-l", "bg-gradient-to-r")
    .replace("shadow-[0_22px_55px_-34px_rgba(100,116,139,0.42)]", "shadow-none");

  return {
    id: preset.id,
    label: preset.labelAr,
    description: preset.descriptionAr,
    previewClassName,
  };
});

export function listColorPresets(): ColorPresetDefinition[] {
  return COLOR_PRESET_IDS.map((presetId) => PRESET_DEFINITIONS[presetId]);
}

export function getColorPresetDefinition(
  presetId: ColorPresetId,
): ColorPresetDefinition {
  return PRESET_DEFINITIONS[presetId] ?? PRESET_DEFINITIONS.slate;
}

export function resolvePresetThemeTokens(
  presetId: ColorPresetId,
  scheme: ColorScheme,
): ThemeTokens {
  return getColorPresetDefinition(presetId).palette[scheme];
}

export function resolveModuleAdaptiveThemeTokens(
  moduleId: string | null | undefined,
  scheme: ColorScheme,
): ThemeTokens {
  const presetId = resolveModuleAccentPresetId(moduleId);
  return resolvePresetThemeTokens(presetId, scheme);
}

export function resolveAppearanceThemeTokens(
  presetId: ColorPresetId,
  scheme: ColorScheme,
  moduleId?: string | null,
): ThemeTokens {
  if (presetId === "adaptive") {
    return resolveModuleAdaptiveThemeTokens(moduleId, scheme);
  }

  return resolvePresetThemeTokens(presetId, scheme);
}
