import type { ColorPresetId } from "@/theme/appearance-types";

export type ModuleAccentPresetMap = Readonly<Record<string, ColorPresetId>>;

export const MODULE_ACCENT_PRESET_MAP: ModuleAccentPresetMap = {
  overview: "slate",
  "system-01-shared": "violet",
  "system-02-academic-core": "emerald",
  "system-03-hr": "sky",
  "system-04-students": "indigo",
  "system-05-grades-config": "fuchsia",
  "system-05-grades-policies": "fuchsia",
  "system-05-grades-homeworks": "fuchsia",
  "system-05-grades-exams": "fuchsia",
  "system-05-grades-student-work": "fuchsia",
  "system-05-grades-aggregation": "fuchsia",
  "system-05-grades-reports": "fuchsia",
  "system-07-finance": "emerald",
  "system-19-health": "ruby",
};

export function resolveModuleAccentPresetId(
  moduleId?: string | null,
  fallback: ColorPresetId = "slate",
): ColorPresetId {
  if (!moduleId) {
    return fallback;
  }

  return MODULE_ACCENT_PRESET_MAP[moduleId] ?? fallback;
}

