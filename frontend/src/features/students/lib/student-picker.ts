"use client";

import type { StudentListItem } from "@/lib/api/client";
import {
  translateStudentGender,
  translateStudentHealthStatus,
  translateStudentOrphanStatus,
} from "@/lib/i18n/ar";

export type StudentPickerOption = {
  id: string;
  title: string;
  subtitle: string;
  meta: string | null;
  groupLabel: string;
  admissionNo?: string | null;
  birthDate?: string | null;
  ageYears?: number | null;
  ageSortValue?: number | null;
  isActive?: boolean;
  genderLabel?: string;
  healthStatusLabel?: string | null;
  orphanStatusLabel?: string;
  localityLabel?: string | null;
  currentAcademicYearLabel?: string | null;
  currentGradeLabel?: string | null;
  currentSectionLabel?: string | null;
  currentGradeSequence?: number | null;
  hasCurrentEnrollment?: boolean;
  guardiansSummary?: string | null;
  searchText?: string;
};

const DEFAULT_RECENT_STUDENTS_STORAGE_KEY = "student-picker:recent";
const MAX_RECENT_STUDENTS = 5;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isStudentPickerOption(value: unknown): value is StudentPickerOption {
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

function getPreferredEnrollment(student: StudentListItem) {
  return (
    student.enrollments.find((enrollment) => enrollment.academicYear.isCurrent) ??
    student.enrollments[0] ??
    null
  );
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase("ar").replace(/\s+/g, " ").trim();
}

function calculateAgeYears(birthDate: string | null): number | null {
  if (!birthDate) {
    return null;
  }

  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function toStudentPickerOption(student: StudentListItem): StudentPickerOption {
  const enrollment = getPreferredEnrollment(student);
  const gradeLevelName = enrollment?.section?.gradeLevel?.name ?? null;
  const sectionName = enrollment?.section?.name ?? null;
  const genderLabel = student.genderLookup?.nameAr ?? translateStudentGender(student.gender);
  const healthStatusLabel =
    student.healthStatusLookup?.nameAr ??
    (student.healthStatus ? translateStudentHealthStatus(student.healthStatus) : null);
  const orphanStatusLabel =
    student.orphanStatusLookup?.nameAr ?? translateStudentOrphanStatus(student.orphanStatus);
  const guardiansSummary = student.guardians
    .map((item) =>
      [item.guardian.fullName, item.guardian.phonePrimary, item.guardian.whatsappNumber]
        .filter((part): part is string => Boolean(part))
        .join(" "),
    )
    .filter(Boolean)
    .join(" | ");
  const metaParts = [
    gradeLevelName,
    sectionName ? `شعبة ${sectionName}` : null,
    enrollment?.academicYear?.name ?? null,
  ].filter((part): part is string => Boolean(part));
  const ageYears = calculateAgeYears(student.birthDate);
  const searchText = normalizeSearchText(
    [
      student.fullName,
      student.admissionNo,
      genderLabel,
      healthStatusLabel,
      orphanStatusLabel,
      student.locality?.nameAr,
      student.healthNotes,
      guardiansSummary,
      enrollment?.yearlyEnrollmentNo,
      enrollment?.academicYear?.name,
      enrollment?.academicYear?.code,
      enrollment?.section?.name,
      enrollment?.section?.code,
      enrollment?.section?.gradeLevel?.name,
      enrollment?.section?.gradeLevel?.code,
    ]
      .filter((part): part is string => Boolean(part))
      .join(" "),
  );

  return {
    id: student.id,
    title: student.fullName,
    subtitle: student.admissionNo ? `رقم الطالب ${student.admissionNo}` : "بدون رقم طالب",
    meta: metaParts.length > 0 ? metaParts.join(" | ") : null,
    groupLabel: gradeLevelName ? `الصف: ${gradeLevelName}` : "بدون شعبة حالية",
    admissionNo: student.admissionNo,
    birthDate: student.birthDate,
    ageYears,
    ageSortValue: student.birthDate ? new Date(student.birthDate).getTime() : null,
    isActive: student.isActive,
    genderLabel,
    healthStatusLabel,
    orphanStatusLabel,
    localityLabel: student.locality?.nameAr ?? null,
    currentAcademicYearLabel: enrollment?.academicYear?.name ?? null,
    currentGradeLabel: gradeLevelName,
    currentSectionLabel: sectionName,
    currentGradeSequence: enrollment?.section?.gradeLevel?.sequence ?? null,
    hasCurrentEnrollment: Boolean(enrollment),
    guardiansSummary: guardiansSummary || null,
    searchText,
  };
}

export function loadRecentStudentPickerOptions(
  storageKey = DEFAULT_RECENT_STUDENTS_STORAGE_KEY,
): StudentPickerOption[] {
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

    return parsed.filter(isStudentPickerOption).slice(0, MAX_RECENT_STUDENTS);
  } catch {
    return [];
  }
}

export function saveRecentStudentPickerOption(
  option: StudentPickerOption,
  storageKey = DEFAULT_RECENT_STUDENTS_STORAGE_KEY,
): StudentPickerOption[] {
  if (!isBrowser()) {
    return [option];
  }

  const current = loadRecentStudentPickerOptions(storageKey);
  const next = [option, ...current.filter((item) => item.id !== option.id)].slice(
    0,
    MAX_RECENT_STUDENTS,
  );

  window.localStorage.setItem(storageKey, JSON.stringify(next));

  return next;
}
