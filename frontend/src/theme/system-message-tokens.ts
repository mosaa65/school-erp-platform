import type {
  SystemMessageColorMode,
  SystemMessageDensityPreset,
  SystemMessageIconMode,
  SystemMessageMotionPreset,
  SystemMessagePosition,
  SystemMessageTone,
  SystemMessageVariant,
} from "@/theme/system-message-preferences";

type Rgb = { r: number; g: number; b: number };

type TonePalette = {
  accent: string;
  surface: string;
  border: string;
  text: string;
  mutedText: string;
  iconSurface: string;
  iconColor: string;
  ring: string;
  shadow: string;
  halo: string;
};

type DensityTokens = {
  cardClassName: string;
  contentClassName: string;
  titleClassName: string;
  messageClassName: string;
  iconSizeClassName: string;
  closeButtonClassName: string;
};

type MotionTokens = {
  durationMs: number;
  enterClassName: string;
  exitClassName: string;
};

type VariantTokens = {
  background: string;
  borderColor: string;
  textColor: string;
  titleColor: string;
  iconSurface: string;
  iconColor: string;
  buttonBackground: string;
  buttonText: string;
  buttonBorder: string;
};

const TONE_SEMANTIC_HEX: Record<SystemMessageTone, string> = {
  success: "#16a34a",
  error: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
  neutral: "#475569",
  loading: "#4f46e5",
};

const TONE_LABELS: Record<SystemMessageTone, string> = {
  success: "نجاح",
  error: "خطأ",
  warning: "تحذير",
  info: "معلومة",
  neutral: "تنبيه",
  loading: "قيد التنفيذ",
};

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgba({ r, g, b }: Rgb, alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixRgb(a: Rgb, b: Rgb, ratio: number): Rgb {
  const clamped = Math.min(1, Math.max(0, ratio));
  return {
    r: Math.round(a.r * (1 - clamped) + b.r * clamped),
    g: Math.round(a.g * (1 - clamped) + b.g * clamped),
    b: Math.round(a.b * (1 - clamped) + b.b * clamped),
  };
}

function resolveAccentSeed(colorMode: SystemMessageColorMode): Rgb {
  return colorMode === "theme-blended" ? hexToRgb("#4f46e5") : hexToRgb("#ffffff");
}

export function resolveSystemMessageTonePalette(
  tone: SystemMessageTone,
  colorMode: SystemMessageColorMode,
  surfaceMode: "light" | "dark",
): TonePalette {
  const base = hexToRgb(TONE_SEMANTIC_HEX[tone]);
  const accentSeed = resolveAccentSeed(colorMode);
  const blended = colorMode === "theme-blended" ? mixRgb(base, accentSeed, 0.18) : base;
  const isDark = surfaceMode === "dark";

  return {
    accent: `rgb(${blended.r} ${blended.g} ${blended.b})`,
    surface: isDark ? rgba(blended, 0.18) : rgba(blended, 0.1),
    border: isDark ? rgba(blended, 0.4) : rgba(blended, 0.24),
    text: isDark ? "rgba(255,255,255,0.95)" : "rgba(15,23,42,0.96)",
    mutedText: isDark ? "rgba(255,255,255,0.72)" : "rgba(51,65,85,0.82)",
    iconSurface: isDark ? rgba(blended, 0.24) : rgba(blended, 0.16),
    iconColor: `rgb(${base.r} ${base.g} ${base.b})`,
    ring: isDark ? rgba(blended, 0.34) : rgba(blended, 0.22),
    shadow: isDark ? rgba(blended, 0.24) : rgba(blended, 0.18),
    halo: isDark ? rgba(blended, 0.2) : rgba(blended, 0.12),
  };
}

export function getSystemMessageToneLabel(tone: SystemMessageTone): string {
  return TONE_LABELS[tone];
}

export function resolveSystemMessageIconVisibility(
  iconMode: SystemMessageIconMode,
  tone: SystemMessageTone,
  hasAction: boolean,
): boolean {
  if (iconMode === "hidden") {
    return false;
  }

  if (iconMode === "always") {
    return true;
  }

  return tone === "error" || tone === "warning" || tone === "success" || tone === "loading" || hasAction;
}

export function resolveSystemMessageVariantTokens(
  variant: SystemMessageVariant,
  palette: TonePalette,
  surfaceMode: "light" | "dark",
): VariantTokens {
  const isDark = surfaceMode === "dark";

  if (variant === "solid") {
    return {
      background: `linear-gradient(135deg, ${palette.accent}, ${palette.shadow})`,
      borderColor: palette.border,
      textColor: "rgba(255,255,255,0.97)",
      titleColor: "rgba(255,255,255,0.92)",
      iconSurface: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.18)",
      iconColor: "rgba(255,255,255,0.96)",
      buttonBackground: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.18)",
      buttonText: "rgba(255,255,255,0.96)",
      buttonBorder: "rgba(255,255,255,0.2)",
    };
  }

  if (variant === "outline") {
    return {
      background: isDark ? "rgba(15,23,42,0.28)" : "rgba(255,255,255,0.56)",
      borderColor: palette.accent,
      textColor: palette.text,
      titleColor: palette.iconColor,
      iconSurface: "transparent",
      iconColor: palette.iconColor,
      buttonBackground: "transparent",
      buttonText: palette.iconColor,
      buttonBorder: palette.border,
    };
  }

  return {
    background: `linear-gradient(135deg, ${palette.surface}, rgba(255,255,255,0.04))`,
    borderColor: palette.border,
    textColor: palette.text,
    titleColor: palette.iconColor,
    iconSurface: palette.iconSurface,
    iconColor: palette.iconColor,
    buttonBackground: palette.iconSurface,
    buttonText: palette.iconColor,
    buttonBorder: palette.ring,
  };
}

export function resolveSystemMessageDensityTokens(
  density: SystemMessageDensityPreset,
): DensityTokens {
  if (density === "compact") {
    return {
      cardClassName: "rounded-[1.2rem]",
      contentClassName: "gap-2 px-3 py-2.5",
      titleClassName: "text-[11px]",
      messageClassName: "text-xs leading-5",
      iconSizeClassName: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
      closeButtonClassName: "h-7 w-7",
    };
  }

  if (density === "rich") {
    return {
      cardClassName: "rounded-[1.5rem]",
      contentClassName: "gap-3 px-4 py-3.5",
      titleClassName: "text-xs",
      messageClassName: "text-sm leading-6",
      iconSizeClassName: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
      closeButtonClassName: "h-8 w-8",
    };
  }

  return {
    cardClassName: "rounded-[1.35rem]",
    contentClassName: "gap-2.5 px-3.5 py-3",
    titleClassName: "text-[11px]",
    messageClassName: "text-sm leading-[1.375rem]",
    iconSizeClassName: "h-9 w-9 [&_svg]:h-[1.125rem] [&_svg]:w-[1.125rem]",
    closeButtonClassName: "h-[1.875rem] w-[1.875rem]",
  };
}

export function resolveSystemMessageMotionTokens(
  motionPreset: SystemMessageMotionPreset,
  reducedMotion: boolean,
  position: SystemMessagePosition,
): MotionTokens {
  if (reducedMotion || motionPreset === "minimal") {
    return {
      durationMs: 140,
      enterClassName: "translate-y-0 opacity-100 scale-100",
      exitClassName: "translate-y-0 opacity-0 scale-[0.99]",
    };
  }

  const slideClass =
    position.startsWith("top") ? "translate-y-2 opacity-0" : "-translate-y-2 opacity-0";

  if (motionPreset === "calm") {
    return {
      durationMs: 220,
      enterClassName: "translate-y-0 opacity-100 scale-100",
      exitClassName: `${slideClass} scale-[0.99]`,
    };
  }

  if (motionPreset === "lively") {
    return {
      durationMs: 320,
      enterClassName: "translate-y-0 opacity-100 scale-100",
      exitClassName: `${slideClass} scale-95`,
    };
  }

  return {
    durationMs: 260,
    enterClassName: "translate-y-0 opacity-100 scale-100",
    exitClassName: `${slideClass} scale-[0.97]`,
  };
}
