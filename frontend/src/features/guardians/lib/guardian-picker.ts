"use client";

import type { GuardianListItem } from "@/lib/api/client";
import { translateStudentGender } from "@/lib/i18n/ar";

export type GuardianPickerOption = {
  id: string;
  title: string;
  subtitle: string;
  meta: string | null;
  groupLabel: string;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  whatsappNumber?: string | null;
  localityLabel?: string | null;
  genderLabel?: string;
  idNumber?: string | null;
  linkedStudentsCount?: number;
  hasLinkedStudents?: boolean;
  linkedStudentsSummary?: string | null;
  isActive?: boolean;
  searchText?: string;
};

const DEFAULT_RECENT_GUARDIANS_STORAGE_KEY = "guardian-picker:recent";
const MAX_RECENT_GUARDIANS = 5;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isGuardianPickerOption(value: unknown): value is GuardianPickerOption {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.subtitle === "string" &&
    (typeof candidate.meta === "string" || candidate.meta === null) &&
    typeof candidate.groupLabel === "string"
  );
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase("ar").replace(/\s+/g, " ").trim();
}

export function toGuardianPickerOption(guardian: GuardianListItem): GuardianPickerOption {
  const subtitle = guardian.phonePrimary
    ? `الهاتف ${guardian.phonePrimary}`
    : guardian.whatsappNumber
      ? `واتساب ${guardian.whatsappNumber}`
      : "بدون رقم مسجل";

  const metaParts = [
    guardian.whatsappNumber && guardian.whatsappNumber !== guardian.phonePrimary
      ? `واتساب ${guardian.whatsappNumber}`
      : null,
    guardian.idNumber ? `هوية ${guardian.idNumber}` : null,
    guardian.students.length > 0 ? `طلاب مرتبطون ${guardian.students.length}` : "بدون طلاب مرتبطين",
  ].filter((part): part is string => Boolean(part));
  const linkedStudentsSummary = guardian.students
    .slice(0, 3)
    .map((item) => item.student.fullName)
    .join(" | ");
  const genderLabel = guardian.genderLookup?.nameAr ?? translateStudentGender(guardian.gender);
  const localityLabel = guardian.locality?.nameAr ?? null;
  const searchText = normalizeSearchText(
    [
      guardian.fullName,
      guardian.phonePrimary,
      guardian.phoneSecondary,
      guardian.whatsappNumber,
      guardian.idNumber,
      localityLabel,
      genderLabel,
      guardian.residenceText,
      guardian.students.map((item) => item.student.fullName).join(" "),
      guardian.students.map((item) => item.student.admissionNo ?? "").join(" "),
    ]
      .filter((part): part is string => Boolean(part))
      .join(" "),
  );

  return {
    id: guardian.id,
    title: guardian.fullName,
    subtitle,
    meta: metaParts.length > 0 ? metaParts.join(" | ") : null,
    groupLabel: localityLabel ? `المنطقة: ${localityLabel}` : "بدون منطقة مسجلة",
    phonePrimary: guardian.phonePrimary,
    phoneSecondary: guardian.phoneSecondary,
    whatsappNumber: guardian.whatsappNumber,
    localityLabel,
    genderLabel,
    idNumber: guardian.idNumber,
    linkedStudentsCount: guardian.students.length,
    hasLinkedStudents: guardian.students.length > 0,
    linkedStudentsSummary: linkedStudentsSummary || null,
    isActive: guardian.isActive,
    searchText,
  };
}

export function loadRecentGuardianPickerOptions(
  storageKey = DEFAULT_RECENT_GUARDIANS_STORAGE_KEY,
): GuardianPickerOption[] {
  if (!isBrowser()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isGuardianPickerOption).slice(0, MAX_RECENT_GUARDIANS);
  } catch {
    return [];
  }
}

export function saveRecentGuardianPickerOption(
  option: GuardianPickerOption,
  storageKey = DEFAULT_RECENT_GUARDIANS_STORAGE_KEY,
): GuardianPickerOption[] {
  if (!isBrowser()) {
    return [option];
  }

  const current = loadRecentGuardianPickerOptions(storageKey);
  const next = [option, ...current.filter((item) => item.id !== option.id)].slice(
    0,
    MAX_RECENT_GUARDIANS,
  );

  window.localStorage.setItem(storageKey, JSON.stringify(next));

  return next;
}
