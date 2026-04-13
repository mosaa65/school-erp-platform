"use client";

export type SystemMessageTone = "success" | "error" | "warning" | "info" | "neutral" | "loading";
export type SystemMessagePosition =
  | "top-right"
  | "top-center"
  | "bottom-center"
  | "bottom-left";
export type SystemMessageMotionPreset = "calm" | "elegant" | "lively" | "minimal";
export type SystemMessageDurationPreset = "smart" | "short" | "medium" | "long";
export type SystemMessageDensityPreset = "compact" | "balanced" | "rich";
export type SystemMessageColorMode = "semantic" | "theme-blended";
export type SystemMessageVariant = "soft" | "solid" | "outline";
export type SystemMessageStackStrategy = "preserve-important" | "replace-oldest";
export type SystemMessageStackLimit = "3" | "4" | "5" | "6";
export type SystemMessageIconMode = "always" | "smart" | "hidden";
export type SystemMessageSoundPreset = "classic" | "soft";
export type SystemMessageVolumePreset = "low" | "medium" | "high";

export type SystemMessagePreferences = {
  position: SystemMessagePosition;
  motionPreset: SystemMessageMotionPreset;
  durationPreset: SystemMessageDurationPreset;
  densityPreset: SystemMessageDensityPreset;
  colorMode: SystemMessageColorMode;
  variant: SystemMessageVariant;
  stackStrategy: SystemMessageStackStrategy;
  maxVisible: SystemMessageStackLimit;
  iconMode: SystemMessageIconMode;
  soundPreset: SystemMessageSoundPreset;
  soundVolume: SystemMessageVolumePreset;
  soundEnabled: boolean;
  swipeToDismiss: boolean;
  hoverPause: boolean;
  clickToDismiss: boolean;
  reducedMotion: boolean;
};

export type SystemMessageOption<TValue extends string> = {
  value: TValue;
  label: string;
  description: string;
};

const STORAGE_VERSION = 2;
const STORAGE_KEY = "school-erp.system-message.v1";

export const DEFAULT_SYSTEM_MESSAGE_PREFERENCES: SystemMessagePreferences = {
  position: "top-right",
  motionPreset: "elegant",
  durationPreset: "smart",
  densityPreset: "balanced",
  colorMode: "theme-blended",
  variant: "soft",
  stackStrategy: "preserve-important",
  maxVisible: "4",
  iconMode: "always",
  soundPreset: "classic",
  soundVolume: "medium",
  soundEnabled: true,
  swipeToDismiss: true,
  hoverPause: true,
  clickToDismiss: false,
  reducedMotion: false,
};

export const SYSTEM_MESSAGE_POSITION_OPTIONS: SystemMessageOption<SystemMessagePosition>[] = [
  {
    value: "top-right",
    label: "أعلى اليمين",
    description: "مناسب للحاسوب والتكديس الهادئ.",
  },
  {
    value: "top-center",
    label: "أعلى الوسط",
    description: "أفضل توازن للجوال والحوارات السريعة.",
  },
  {
    value: "bottom-center",
    label: "أسفل الوسط",
    description: "بعيد عن العنوان وقريب من الإبهام.",
  },
  {
    value: "bottom-left",
    label: "أسفل اليسار",
    description: "مناسب للعروض الواسعة مع إبقاء التركيز مركزيًا.",
  },
];

export const SYSTEM_MESSAGE_MOTION_OPTIONS: SystemMessageOption<SystemMessageMotionPreset>[] = [
  {
    value: "calm",
    label: "هادئ",
    description: "دخول وخروج لطيف جدًا.",
  },
  {
    value: "elegant",
    label: "أنيق",
    description: "الافتراضي المتوازن.",
  },
  {
    value: "lively",
    label: "نابض",
    description: "حضور أوضح مع حركة أكبر.",
  },
  {
    value: "minimal",
    label: "خفيف",
    description: "حركة شبه معدومة.",
  },
];

export const SYSTEM_MESSAGE_DURATION_OPTIONS: SystemMessageOption<SystemMessageDurationPreset>[] =
  [
    {
      value: "smart",
      label: "ذكي",
      description: "المدة تتغير حسب نوع الرسالة.",
    },
    {
      value: "short",
      label: "قصير",
      description: "اختفاء سريع للرسائل الخفيفة.",
    },
    {
      value: "medium",
      label: "متوسط",
      description: "المدى الأكثر توازنًا.",
    },
    {
      value: "long",
      label: "طويل",
      description: "يبقي الرسالة مدة أطول للقراءة.",
    },
  ];

export const SYSTEM_MESSAGE_DENSITY_OPTIONS: SystemMessageOption<SystemMessageDensityPreset>[] = [
  {
    value: "compact",
    label: "مضغوط",
    description: "مساحة أقل وتكديس أسرع.",
  },
  {
    value: "balanced",
    label: "متوازن",
    description: "الافتراضي للنظام.",
  },
  {
    value: "rich",
    label: "غني",
    description: "مساحة بصرية أكبر ولمسات أوضح.",
  },
];

export const SYSTEM_MESSAGE_COLOR_OPTIONS: SystemMessageOption<SystemMessageColorMode>[] = [
  {
    value: "semantic",
    label: "دلالي",
    description: "يحافظ على الأخضر والأحمر والأصفر بشكل واضح.",
  },
  {
    value: "theme-blended",
    label: "ممزوج",
    description: "يمزج الرسالة مع لون الثيم دون فقدان معناها.",
  },
];

export const SYSTEM_MESSAGE_VARIANT_OPTIONS: SystemMessageOption<SystemMessageVariant>[] = [
  {
    value: "soft",
    label: "ناعم",
    description: "الخيار الافتراضي الأهدأ والأكثر توازنًا.",
  },
  {
    value: "solid",
    label: "ممتلئ",
    description: "حضور أقوى وتباين أوضح للرسائل المهمة.",
  },
  {
    value: "outline",
    label: "حدود",
    description: "رسائل أخف مع حدود accent أوضح.",
  },
];

export const SYSTEM_MESSAGE_STACK_STRATEGY_OPTIONS: SystemMessageOption<SystemMessageStackStrategy>[] =
  [
    {
      value: "preserve-important",
      label: "يحافظ على المهم",
      description: "يحمي الرسائل الأهم ما أمكن قبل إزالة غيرها.",
    },
    {
      value: "replace-oldest",
      label: "يستبدل الأقدم",
      description: "يبقي أحدث الرسائل دائمًا حتى لو امتلأ التكديس.",
    },
  ];

export const SYSTEM_MESSAGE_STACK_LIMIT_OPTIONS: SystemMessageOption<SystemMessageStackLimit>[] = [
  {
    value: "3",
    label: "3",
    description: "هادئ وأقل ازدحامًا.",
  },
  {
    value: "4",
    label: "4",
    description: "الافتراضي المتوازن.",
  },
  {
    value: "5",
    label: "5",
    description: "مرونة أكبر للعمليات المتتابعة.",
  },
  {
    value: "6",
    label: "6",
    description: "مناسب للأنظمة ذات التنبيهات الكثيفة.",
  },
];

export const SYSTEM_MESSAGE_ICON_MODE_OPTIONS: SystemMessageOption<SystemMessageIconMode>[] = [
  {
    value: "always",
    label: "دائمًا",
    description: "يعرض الأيقونات في كل الرسائل.",
  },
  {
    value: "smart",
    label: "ذكي",
    description: "يعرض الأيقونات للحالات الأهم والأوضح فقط.",
  },
  {
    value: "hidden",
    label: "مخفي",
    description: "يعتمد على النص بدون أيقونات داخلية.",
  },
];

export const SYSTEM_MESSAGE_SOUND_PRESET_OPTIONS: SystemMessageOption<SystemMessageSoundPreset>[] =
  [
    {
      value: "classic",
      label: "كلاسيكي",
      description: "نغمات أوضح وأكثر حضورًا.",
    },
    {
      value: "soft",
      label: "ناعم",
      description: "نغمات أخف وأكثر هدوءًا.",
    },
  ];

export const SYSTEM_MESSAGE_VOLUME_OPTIONS: SystemMessageOption<SystemMessageVolumePreset>[] = [
  {
    value: "low",
    label: "منخفض",
    description: "هادئ جدًا ومناسب للاستخدام الطويل.",
  },
  {
    value: "medium",
    label: "متوسط",
    description: "الافتراضي المتوازن.",
  },
  {
    value: "high",
    label: "مرتفع",
    description: "أوضح وأقرب للتنبيهات البارزة.",
  },
];

type StoredSystemMessagePreferences = {
  version: number;
  preferences: SystemMessagePreferences;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPosition(value: unknown): value is SystemMessagePosition {
  return SYSTEM_MESSAGE_POSITION_OPTIONS.some((item) => item.value === value);
}

function isMotionPreset(value: unknown): value is SystemMessageMotionPreset {
  return SYSTEM_MESSAGE_MOTION_OPTIONS.some((item) => item.value === value);
}

function isDurationPreset(value: unknown): value is SystemMessageDurationPreset {
  return SYSTEM_MESSAGE_DURATION_OPTIONS.some((item) => item.value === value);
}

function isDensityPreset(value: unknown): value is SystemMessageDensityPreset {
  return SYSTEM_MESSAGE_DENSITY_OPTIONS.some((item) => item.value === value);
}

function isColorMode(value: unknown): value is SystemMessageColorMode {
  return SYSTEM_MESSAGE_COLOR_OPTIONS.some((item) => item.value === value);
}

function isVariant(value: unknown): value is SystemMessageVariant {
  return SYSTEM_MESSAGE_VARIANT_OPTIONS.some((item) => item.value === value);
}

function isStackStrategy(value: unknown): value is SystemMessageStackStrategy {
  return SYSTEM_MESSAGE_STACK_STRATEGY_OPTIONS.some((item) => item.value === value);
}

function isStackLimit(value: unknown): value is SystemMessageStackLimit {
  return SYSTEM_MESSAGE_STACK_LIMIT_OPTIONS.some((item) => item.value === value);
}

function isIconMode(value: unknown): value is SystemMessageIconMode {
  return SYSTEM_MESSAGE_ICON_MODE_OPTIONS.some((item) => item.value === value);
}

function isSoundPreset(value: unknown): value is SystemMessageSoundPreset {
  return SYSTEM_MESSAGE_SOUND_PRESET_OPTIONS.some((item) => item.value === value);
}

function isVolumePreset(value: unknown): value is SystemMessageVolumePreset {
  return SYSTEM_MESSAGE_VOLUME_OPTIONS.some((item) => item.value === value);
}

function normalizePreferences(
  input: (Partial<SystemMessagePreferences> & { showIcons?: boolean }) | undefined,
): SystemMessagePreferences {
  return {
    position: isPosition(input?.position)
      ? input.position
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.position,
    motionPreset: isMotionPreset(input?.motionPreset)
      ? input.motionPreset
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.motionPreset,
    durationPreset: isDurationPreset(input?.durationPreset)
      ? input.durationPreset
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.durationPreset,
    densityPreset: isDensityPreset(input?.densityPreset)
      ? input.densityPreset
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.densityPreset,
    colorMode: isColorMode(input?.colorMode)
      ? input.colorMode
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.colorMode,
    variant: isVariant(input?.variant)
      ? input.variant
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.variant,
    stackStrategy: isStackStrategy(input?.stackStrategy)
      ? input.stackStrategy
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.stackStrategy,
    maxVisible: isStackLimit(input?.maxVisible)
      ? input.maxVisible
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.maxVisible,
    iconMode: isIconMode(input?.iconMode)
      ? input.iconMode
      : typeof input?.showIcons === "boolean"
        ? input.showIcons
          ? "always"
          : "hidden"
        : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.iconMode,
    soundPreset: isSoundPreset(input?.soundPreset)
      ? input.soundPreset
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.soundPreset,
    soundVolume: isVolumePreset(input?.soundVolume)
      ? input.soundVolume
      : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.soundVolume,
    soundEnabled:
      typeof input?.soundEnabled === "boolean"
        ? input.soundEnabled
        : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.soundEnabled,
    swipeToDismiss:
      typeof input?.swipeToDismiss === "boolean"
        ? input.swipeToDismiss
        : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.swipeToDismiss,
    hoverPause:
      typeof input?.hoverPause === "boolean"
        ? input.hoverPause
        : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.hoverPause,
    clickToDismiss:
      typeof input?.clickToDismiss === "boolean"
        ? input.clickToDismiss
        : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.clickToDismiss,
    reducedMotion:
      typeof input?.reducedMotion === "boolean"
        ? input.reducedMotion
        : DEFAULT_SYSTEM_MESSAGE_PREFERENCES.reducedMotion,
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

export function loadSystemMessagePreferences(): SystemMessagePreferences {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_SYSTEM_MESSAGE_PREFERENCES;
  }

  try {
    const rawValue = storage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_SYSTEM_MESSAGE_PREFERENCES;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredSystemMessagePreferences>;
    if (parsed.version === STORAGE_VERSION && isRecord(parsed.preferences)) {
      return normalizePreferences(parsed.preferences as Partial<SystemMessagePreferences>);
    }

    if (isRecord(parsed)) {
      return normalizePreferences(parsed as Partial<SystemMessagePreferences>);
    }
  } catch {
    // Ignore invalid storage payloads and fall back to defaults.
  }

  return DEFAULT_SYSTEM_MESSAGE_PREFERENCES;
}

export function saveSystemMessagePreferences(preferences: SystemMessagePreferences): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const payload: StoredSystemMessagePreferences = {
    version: STORAGE_VERSION,
    preferences: normalizePreferences(preferences),
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

export function clearSystemMessagePreferences(): void {
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

export function resolveSystemMessageDuration(
  tone: SystemMessageTone,
  preset: SystemMessageDurationPreset,
): number {
  if (preset === "short") {
    return 2_600;
  }

  if (preset === "medium") {
    return 3_800;
  }

  if (preset === "long") {
    return 5_200;
  }

  switch (tone) {
    case "success":
      return 2_900;
    case "info":
      return 3_200;
    case "neutral":
      return 3_000;
    case "warning":
      return 4_400;
    case "error":
      return 5_400;
    case "loading":
      return 6_000;
    default:
      return 3_800;
  }
}
