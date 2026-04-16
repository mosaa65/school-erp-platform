"use client";

import type {
  EntitySurfaceAvatarMode,
  EntitySurfaceDensity,
  EntitySurfaceDetailsOpenMode,
  EntitySurfaceEffectsPreset,
  EntitySurfaceInlineActionsMode,
  EntitySurfaceLongPressMode,
  EntitySurfaceMotionPreset,
  EntitySurfaceOption,
  EntitySurfacePreferences,
  EntitySurfaceRichness,
  EntitySurfaceShapePreset,
  EntitySurfaceViewMode,
  EntitySurfaceVisualStyle,
} from "@/presentation/entity-surface/entity-surface-types";

const STORAGE_VERSION = 1;
const STORAGE_KEY = "school-erp.entity-surface.v1";

export const DEFAULT_ENTITY_SURFACE_PREFERENCES: EntitySurfacePreferences = {
  defaultViewMode: "list",
  density: "balanced",
  richness: "balanced",
  visualStyle: "glass",
  effectsPreset: "balanced",
  shapePreset: "rounded",
  avatarMode: "auto",
  inlineActionsMode: "always",
  detailsOpenMode: "screen-default",
  longPressMode: "enabled-with-blur",
  motionPreset: "elegant",
  reducedMotion: false,
};

export const ENTITY_SURFACE_VIEW_MODE_OPTIONS: EntitySurfaceOption<EntitySurfaceViewMode>[] = [
  {
    value: "list",
    label: "قائمة",
    description: "التوازن الأفضل لمعظم السجلات والقراءة المريحة.",
  },
  {
    value: "smart-card",
    label: "بطاقة ذكية",
    description: "هوية أغنى بصريًا مع تركيز أكبر على العنوان والصورة.",
  },
  {
    value: "grid",
    label: "شبكة",
    description: "مناسبة للشاشات الواسعة والعناصر ذات الحضور البصري.",
  },
  {
    value: "dense-row",
    label: "صف مضغوط",
    description: "أسرع عرض للشاشات الكثيفة والسجلات المتتابعة.",
  },
];

export const ENTITY_SURFACE_DENSITY_OPTIONS: EntitySurfaceOption<EntitySurfaceDensity>[] = [
  {
    value: "comfortable",
    label: "مريحة",
    description: "مسافات أوسع وتركيز أفضل على القراءة.",
  },
  {
    value: "balanced",
    label: "متوازنة",
    description: "الافتراضي الأنسب لمعظم الوحدات.",
  },
  {
    value: "compact",
    label: "مضغوطة",
    description: "محتوى أكثر في مساحة أقل.",
  },
];

export const ENTITY_SURFACE_RICHNESS_OPTIONS: EntitySurfaceOption<EntitySurfaceRichness>[] = [
  {
    value: "minimal",
    label: "مختصر جدًا",
    description: "أقل عدد ممكن من الحقول داخل البطاقة.",
  },
  {
    value: "balanced",
    label: "متوازن",
    description: "يعرض المهم بدون ازدحام.",
  },
  {
    value: "rich",
    label: "غني",
    description: "يعرض حقولًا أكثر مع حضور بصري أوضح.",
  },
];

export const ENTITY_SURFACE_VISUAL_STYLE_OPTIONS: EntitySurfaceOption<EntitySurfaceVisualStyle>[] =
  [
    {
      value: "glass",
      label: "زجاجي",
      description: "شفافية ناعمة وحدود أنيقة وهوية حديثة.",
    },
    {
      value: "soft",
      label: "ناعم",
      description: "خلفية هادئة وواضحة للاستخدام الطويل.",
    },
    {
      value: "outline",
      label: "حدود",
      description: "خفيف بصريًا مع حضور أوضح للحدود.",
    },
    {
      value: "solid-soft",
      label: "ممتلئ ناعم",
      description: "حضور أقوى بدون صلابة مزعجة.",
    },
  ];

export const ENTITY_SURFACE_EFFECTS_OPTIONS: EntitySurfaceOption<EntitySurfaceEffectsPreset>[] = [
  {
    value: "subtle",
    label: "منخفض",
    description: "Blur وظلال ولمعان أقل.",
  },
  {
    value: "balanced",
    label: "متوسط",
    description: "التوازن الأنسب للهوية الافتراضية.",
  },
  {
    value: "rich",
    label: "غني",
    description: "تأثيرات أوضح للشاشات التي تريد حضورًا أكبر.",
  },
];

export const ENTITY_SURFACE_SHAPE_OPTIONS: EntitySurfaceOption<EntitySurfaceShapePreset>[] = [
  {
    value: "soft",
    label: "ناعم",
    description: "حواف مريحة ومستقرة بصريًا.",
  },
  {
    value: "rounded",
    label: "مستدير",
    description: "هوية أكثر نعومة وقربًا من الواجهات الحديثة.",
  },
  {
    value: "geometric",
    label: "هندسي",
    description: "حواف أوضح وشخصية أكثر انتظامًا.",
  },
];

export const ENTITY_SURFACE_AVATAR_OPTIONS: EntitySurfaceOption<EntitySurfaceAvatarMode>[] = [
  {
    value: "auto",
    label: "تلقائي",
    description: "يعرض الصورة عند توفرها ويستخدم fallback عند غيابها.",
  },
  {
    value: "fallback-only",
    label: "رمزي فقط",
    description: "يعتمد على الأحرف أو الأيقونة بدل الصور الحقيقية.",
  },
  {
    value: "hidden",
    label: "مخفي",
    description: "يزيل الصورة والرمز ويمنح النص مساحة أكبر.",
  },
];

export const ENTITY_SURFACE_INLINE_ACTIONS_OPTIONS: EntitySurfaceOption<EntitySurfaceInlineActionsMode>[] =
  [
    {
      value: "always",
      label: "دائمًا",
      description: "الأزرار السريعة تبقى ظاهرة داخل البطاقة.",
    },
    {
      value: "hover",
      label: "عند التفاعل",
      description: "تظهر بوضوح عند hover أو التركيز أو التحديد.",
    },
    {
      value: "minimal",
      label: "مصغر",
      description: "يقلل كثافة الأزرار إلى وضع أخف.",
    },
  ];

export const ENTITY_SURFACE_DETAILS_OPEN_MODE_OPTIONS: EntitySurfaceOption<EntitySurfaceDetailsOpenMode>[] =
  [
    {
      value: "screen-default",
      label: "حسب الشاشة",
      description: "كل شاشة تقرر أفضل وضع للتفاصيل.",
    },
    {
      value: "sheet",
      label: "نافذة سفلية",
      description: "أفضل للجوال والتنقل السريع.",
    },
    {
      value: "dialog",
      label: "نافذة تركيز",
      description: "تجربة مركزة مع backdrop أنيق.",
    },
    {
      value: "page",
      label: "صفحة كاملة",
      description: "أنسب للسجلات الغنية بالتفاصيل.",
    },
  ];

export const ENTITY_SURFACE_LONG_PRESS_OPTIONS: EntitySurfaceOption<EntitySurfaceLongPressMode>[] =
  [
    {
      value: "enabled-with-blur",
      label: "مع blur",
      description: "يكبّر البطاقة ويضبب الخلفية عند الضغط المطول.",
    },
    {
      value: "enabled",
      label: "مفعّل",
      description: "يفتح الاختصارات بدون تأثيرات قوية.",
    },
    {
      value: "enabled-no-blur",
      label: "بدون blur",
      description: "يحافظ على الحركة مع إيقاف ضبابية الخلفية.",
    },
    {
      value: "disabled",
      label: "معطل",
      description: "يلغي الضغط المطول ويعتمد على الأزرار فقط.",
    },
  ];

export const ENTITY_SURFACE_MOTION_OPTIONS: EntitySurfaceOption<EntitySurfaceMotionPreset>[] = [
  {
    value: "calm",
    label: "هادئ",
    description: "حركة خفيفة جدًا ودخول ناعم.",
  },
  {
    value: "elegant",
    label: "أنيق",
    description: "الافتراضي المتوازن للعرض والتفاصيل.",
  },
  {
    value: "focus",
    label: "تركيز",
    description: "حضور أوضح للبطاقة والتفاصيل والاختصارات.",
  },
  {
    value: "minimal",
    label: "خفيف",
    description: "حركة شبه معدومة.",
  },
];

type StoredEntitySurfacePreferences = {
  version: number;
  preferences: EntitySurfacePreferences;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function isViewMode(value: unknown): value is EntitySurfaceViewMode {
  return ENTITY_SURFACE_VIEW_MODE_OPTIONS.some((item) => item.value === value);
}

function isDensity(value: unknown): value is EntitySurfaceDensity {
  return ENTITY_SURFACE_DENSITY_OPTIONS.some((item) => item.value === value);
}

function isRichness(value: unknown): value is EntitySurfaceRichness {
  return ENTITY_SURFACE_RICHNESS_OPTIONS.some((item) => item.value === value);
}

function isVisualStyle(value: unknown): value is EntitySurfaceVisualStyle {
  return ENTITY_SURFACE_VISUAL_STYLE_OPTIONS.some((item) => item.value === value);
}

function isEffectsPreset(value: unknown): value is EntitySurfaceEffectsPreset {
  return ENTITY_SURFACE_EFFECTS_OPTIONS.some((item) => item.value === value);
}

function isShapePreset(value: unknown): value is EntitySurfaceShapePreset {
  return ENTITY_SURFACE_SHAPE_OPTIONS.some((item) => item.value === value);
}

function isAvatarMode(value: unknown): value is EntitySurfaceAvatarMode {
  return ENTITY_SURFACE_AVATAR_OPTIONS.some((item) => item.value === value);
}

function isInlineActionsMode(value: unknown): value is EntitySurfaceInlineActionsMode {
  return ENTITY_SURFACE_INLINE_ACTIONS_OPTIONS.some((item) => item.value === value);
}

function isDetailsOpenMode(value: unknown): value is EntitySurfaceDetailsOpenMode {
  return ENTITY_SURFACE_DETAILS_OPEN_MODE_OPTIONS.some((item) => item.value === value);
}

function isLongPressMode(value: unknown): value is EntitySurfaceLongPressMode {
  return ENTITY_SURFACE_LONG_PRESS_OPTIONS.some((item) => item.value === value);
}

function isMotionPreset(value: unknown): value is EntitySurfaceMotionPreset {
  return ENTITY_SURFACE_MOTION_OPTIONS.some((item) => item.value === value);
}

function normalizePreferences(input: Partial<EntitySurfacePreferences> | undefined): EntitySurfacePreferences {
  return {
    defaultViewMode: isViewMode(input?.defaultViewMode)
      ? input.defaultViewMode
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.defaultViewMode,
    density: isDensity(input?.density)
      ? input.density
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.density,
    richness: isRichness(input?.richness)
      ? input.richness
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.richness,
    visualStyle: isVisualStyle(input?.visualStyle)
      ? input.visualStyle
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.visualStyle,
    effectsPreset: isEffectsPreset(input?.effectsPreset)
      ? input.effectsPreset
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.effectsPreset,
    shapePreset: isShapePreset(input?.shapePreset)
      ? input.shapePreset
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.shapePreset,
    avatarMode: isAvatarMode(input?.avatarMode)
      ? input.avatarMode
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.avatarMode,
    inlineActionsMode: isInlineActionsMode(input?.inlineActionsMode)
      ? input.inlineActionsMode
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.inlineActionsMode,
    detailsOpenMode: isDetailsOpenMode(input?.detailsOpenMode)
      ? input.detailsOpenMode
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.detailsOpenMode,
    longPressMode: isLongPressMode(input?.longPressMode)
      ? input.longPressMode
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.longPressMode,
    motionPreset: isMotionPreset(input?.motionPreset)
      ? input.motionPreset
      : DEFAULT_ENTITY_SURFACE_PREFERENCES.motionPreset,
    reducedMotion:
      typeof input?.reducedMotion === "boolean"
        ? input.reducedMotion
        : DEFAULT_ENTITY_SURFACE_PREFERENCES.reducedMotion,
  };
}

export function loadEntitySurfacePreferences(): EntitySurfacePreferences {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_ENTITY_SURFACE_PREFERENCES;
  }

  try {
    const rawValue = storage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_ENTITY_SURFACE_PREFERENCES;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredEntitySurfacePreferences>;
    if (parsed.version === STORAGE_VERSION && isRecord(parsed.preferences)) {
      return normalizePreferences(parsed.preferences as Partial<EntitySurfacePreferences>);
    }

    if (isRecord(parsed)) {
      return normalizePreferences(parsed as Partial<EntitySurfacePreferences>);
    }
  } catch {
    // Ignore invalid payloads and fall back to defaults.
  }

  return DEFAULT_ENTITY_SURFACE_PREFERENCES;
}

export function saveEntitySurfacePreferences(preferences: EntitySurfacePreferences): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const payload: StoredEntitySurfacePreferences = {
    version: STORAGE_VERSION,
    preferences: normalizePreferences(preferences),
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

export function clearEntitySurfacePreferences(): void {
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
