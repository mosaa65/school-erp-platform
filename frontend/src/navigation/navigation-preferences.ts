export type NavigationLayoutMode = "classic" | "rail" | "hub";
export type MobileNavigatorPresentation = "drawer" | "bottom-sheet";
export type NavigationLandingPage = "dashboard" | "navigation-hub" | "last-visited";
export type NavigationDensity = "comfortable" | "compact";

export type NavigationPreferences = {
  layoutMode: NavigationLayoutMode;
  mobilePresentation: MobileNavigatorPresentation;
  landingPage: NavigationLandingPage;
  density: NavigationDensity;
  showHeaderMenuButton: boolean;
};

export type NavigationLayoutDefinition = {
  value: NavigationLayoutMode;
  label: string;
  description: string;
  available: boolean;
};

export type MobileNavigatorPresentationDefinition = {
  value: MobileNavigatorPresentation;
  label: string;
  description: string;
};

export type NavigationLandingPageDefinition = {
  value: NavigationLandingPage;
  label: string;
  description: string;
  available: boolean;
};

export type NavigationDensityDefinition = {
  value: NavigationDensity;
  label: string;
  description: string;
};

const STORAGE_VERSION = 1;
const STORAGE_KEY = "school-erp.navigation.v1";

export const DEFAULT_NAVIGATION_PREFERENCES: NavigationPreferences = {
  layoutMode: "classic",
  mobilePresentation: "bottom-sheet",
  landingPage: "dashboard",
  density: "compact",
  showHeaderMenuButton: false,
};

export const NAVIGATION_LAYOUT_OPTIONS: NavigationLayoutDefinition[] = [
  {
    value: "classic",
    label: "قائمة جانبية",
    description: "القائمة الكاملة المعتادة مع الأسماء.",
    available: true,
  },
  {
    value: "rail",
    label: "أيقونات فقط",
    description: "مساحة أكبر للمحتوى مع إبقاء الملاحة كأيقونات.",
    available: true,
  },
  {
    value: "hub",
    label: "واجهة رئيسية",
    description: "تنقل رئيسي بدون سايدبار دائم.",
    available: true,
  },
];

export const MOBILE_NAVIGATOR_PRESENTATION_OPTIONS: MobileNavigatorPresentationDefinition[] = [
  {
    value: "drawer",
    label: "سحب جانبي",
    description: "يفتح التنقل كلوحة جانبية تقليدية.",
  },
  {
    value: "bottom-sheet",
    label: "نافذة سفلية",
    description: "يفتح التنقل كنافذة سفلية مضغوطة وأخف.",
  },
];

export const NAVIGATION_LANDING_PAGE_OPTIONS: NavigationLandingPageDefinition[] = [
  {
    value: "dashboard",
    label: "لوحة التحكم",
    description: "ابدأ دائمًا من الصفحة الرئيسية الحالية.",
    available: true,
  },
  {
    value: "navigation-hub",
    label: "واجهة التنقل",
    description: "ابدأ من شاشة التنقل الرئيسية الجديدة.",
    available: true,
  },
  {
    value: "last-visited",
    label: "آخر صفحة",
    description: "العودة إلى آخر صفحة تمت زيارتها.",
    available: false,
  },
];

export const NAVIGATION_DENSITY_OPTIONS: NavigationDensityDefinition[] = [
  {
    value: "comfortable",
    label: "مريح",
    description: "مسافات متوازنة وقراءة أوضح.",
  },
  {
    value: "compact",
    label: "مضغوط",
    description: "صفوف أقصر ومساحة أكبر للمحتوى.",
  },
];

type StoredNavigationPreferences = {
  version: number;
  preferences: NavigationPreferences;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNavigationLayoutMode(value: unknown): value is NavigationLayoutMode {
  return NAVIGATION_LAYOUT_OPTIONS.some((item) => item.value === value && item.available);
}

function isMobileNavigatorPresentation(
  value: unknown,
): value is MobileNavigatorPresentation {
  return MOBILE_NAVIGATOR_PRESENTATION_OPTIONS.some((item) => item.value === value);
}

function isNavigationLandingPage(value: unknown): value is NavigationLandingPage {
  return NAVIGATION_LANDING_PAGE_OPTIONS.some((item) => item.value === value && item.available);
}

function isNavigationDensity(value: unknown): value is NavigationDensity {
  return NAVIGATION_DENSITY_OPTIONS.some((item) => item.value === value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function normalizeNavigationPreferences(
  input: Partial<NavigationPreferences> | undefined,
): NavigationPreferences {
  return {
    layoutMode: isNavigationLayoutMode(input?.layoutMode)
      ? input.layoutMode
      : DEFAULT_NAVIGATION_PREFERENCES.layoutMode,
    mobilePresentation: isMobileNavigatorPresentation(input?.mobilePresentation)
      ? input.mobilePresentation
      : DEFAULT_NAVIGATION_PREFERENCES.mobilePresentation,
    landingPage: isNavigationLandingPage(input?.landingPage)
      ? input.landingPage
      : DEFAULT_NAVIGATION_PREFERENCES.landingPage,
    density: isNavigationDensity(input?.density)
      ? input.density
      : DEFAULT_NAVIGATION_PREFERENCES.density,
    showHeaderMenuButton: isBoolean(input?.showHeaderMenuButton)
      ? input.showHeaderMenuButton
      : DEFAULT_NAVIGATION_PREFERENCES.showHeaderMenuButton,
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

export function loadNavigationPreferences(): NavigationPreferences {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_NAVIGATION_PREFERENCES;
  }

  try {
    const rawValue = storage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_NAVIGATION_PREFERENCES;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredNavigationPreferences>;
    if (parsed.version === STORAGE_VERSION && isRecord(parsed.preferences)) {
      return normalizeNavigationPreferences(parsed.preferences as Partial<NavigationPreferences>);
    }

    if (isRecord(parsed)) {
      return normalizeNavigationPreferences(parsed as Partial<NavigationPreferences>);
    }

    return DEFAULT_NAVIGATION_PREFERENCES;
  } catch {
    return DEFAULT_NAVIGATION_PREFERENCES;
  }
}

export function saveNavigationPreferences(preferences: NavigationPreferences): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const payload: StoredNavigationPreferences = {
    version: STORAGE_VERSION,
    preferences: normalizeNavigationPreferences(preferences),
  };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

export function clearNavigationPreferences(): void {
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

export function getNavigationLayoutLabel(value: NavigationLayoutMode): string {
  return NAVIGATION_LAYOUT_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function getMobileNavigatorPresentationLabel(
  value: MobileNavigatorPresentation,
): string {
  return (
    MOBILE_NAVIGATOR_PRESENTATION_OPTIONS.find((item) => item.value === value)?.label ??
    value
  );
}

export function getNavigationLandingPageLabel(value: NavigationLandingPage): string {
  return NAVIGATION_LANDING_PAGE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function getNavigationDensityLabel(value: NavigationDensity): string {
  return NAVIGATION_DENSITY_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function getHeaderMenuButtonVisibilityLabel(value: boolean): string {
  return value ? "ظاهر" : "مخفي";
}
