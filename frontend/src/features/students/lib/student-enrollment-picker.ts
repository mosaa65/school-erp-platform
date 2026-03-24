"use client";

import type {
  StudentEnrollmentDistributionStatus,
  StudentEnrollmentStatus,
} from "@/lib/api/client";
import { translateStudentEnrollmentStatus } from "@/lib/i18n/ar";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import {
  formatStudentEnrollmentPlacementLabel,
  sortStudentEnrollmentOptions,
  type StudentEnrollmentPlacementLike,
} from "@/lib/student-enrollment-display";

type StudentEnrollmentPickerStudent = {
  id: string;
  fullName: string;
  admissionNo?: string | null;
};

export type StudentEnrollmentPickerInput = StudentEnrollmentPlacementLike & {
  id: string;
  status: StudentEnrollmentStatus;
  distributionStatus?: StudentEnrollmentDistributionStatus | null;
  yearlyEnrollmentNo?: string | null;
  isActive: boolean;
  student: StudentEnrollmentPickerStudent;
};

export type StudentEnrollmentPickerOption = {
  id: string;
  studentId: string;
  title: string;
  subtitle: string;
  meta: string | null;
  groupLabel: string;
  admissionNo?: string | null;
  yearlyEnrollmentNo?: string | null;
  academicYearLabel?: string | null;
  academicYearCode?: string | null;
  gradeLevelLabel?: string | null;
  sectionLabel?: string | null;
  currentGradeSequence?: number | null;
  enrollmentStatus?: StudentEnrollmentStatus;
  enrollmentStatusLabel?: string;
  distributionStatus?: StudentEnrollmentDistributionStatus | null;
  distributionStatusLabel?: string | null;
  isActive?: boolean;
  searchText?: string;
};

const DEFAULT_RECENT_STUDENT_ENROLLMENTS_STORAGE_KEY = "student-enrollment-picker:recent";
const MAX_RECENT_STUDENT_ENROLLMENTS = 5;
const DISTRIBUTION_STATUS_LABELS: Record<StudentEnrollmentDistributionStatus, string> = {
  PENDING_DISTRIBUTION: "بانتظار التوزيع",
  ASSIGNED: "موزع",
  TRANSFERRED: "منقول",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isStudentEnrollmentPickerOption(
  value: unknown,
): value is StudentEnrollmentPickerOption {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.studentId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.subtitle === "string" &&
    (typeof candidate.meta === "string" || candidate.meta === null) &&
    typeof candidate.groupLabel === "string"
  );
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase("ar").replace(/\s+/g, " ").trim();
}

function resolveEnrollmentGroupLabel(item: StudentEnrollmentPickerInput): string {
  if (item.section) {
    return formatSectionWithGradeLabel(item.section);
  }

  if (item.gradeLevel) {
    return formatNameCodeLabel(item.gradeLevel.name, item.gradeLevel.code);
  }

  if (item.academicYear) {
    return formatNameCodeLabel(item.academicYear.name, item.academicYear.code);
  }

  return "قيود أخرى";
}

export function toStudentEnrollmentPickerOption(
  item: StudentEnrollmentPickerInput,
): StudentEnrollmentPickerOption {
  const gradeLevelLabel = item.section?.gradeLevel?.name ?? item.gradeLevel?.name ?? null;
  const sectionLabel = item.section?.name ?? null;
  const enrollmentStatusLabel = translateStudentEnrollmentStatus(item.status);
  const distributionStatusLabel = item.distributionStatus
    ? DISTRIBUTION_STATUS_LABELS[item.distributionStatus]
    : null;

  return {
    id: item.id,
    studentId: item.student.id,
    title: item.student.fullName,
    subtitle: item.student.admissionNo
      ? `رقم الطالب ${item.student.admissionNo}`
      : "بدون رقم طالب",
    meta: formatStudentEnrollmentPlacementLabel(item),
    groupLabel: resolveEnrollmentGroupLabel(item),
    admissionNo: item.student.admissionNo,
    yearlyEnrollmentNo: item.yearlyEnrollmentNo ?? null,
    academicYearLabel: item.academicYear?.name ?? null,
    academicYearCode: item.academicYear?.code ?? null,
    gradeLevelLabel,
    sectionLabel,
    currentGradeSequence:
      item.section?.gradeLevel?.sequence ?? item.gradeLevel?.sequence ?? null,
    enrollmentStatus: item.status,
    enrollmentStatusLabel,
    distributionStatus: item.distributionStatus ?? null,
    distributionStatusLabel,
    isActive: item.isActive,
    searchText: normalizeSearchText(
      [
        item.student.fullName,
        item.student.admissionNo,
        item.yearlyEnrollmentNo,
        item.academicYear?.name,
        item.academicYear?.code,
        item.gradeLevel?.name,
        item.gradeLevel?.code,
        item.section?.name,
        item.section?.code,
        item.section?.gradeLevel?.name,
        item.section?.gradeLevel?.code,
        enrollmentStatusLabel,
        distributionStatusLabel,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" "),
    ),
  };
}

export function mapStudentEnrollmentPickerOptions<T extends StudentEnrollmentPickerInput>(
  items: T[],
): StudentEnrollmentPickerOption[] {
  return sortStudentEnrollmentOptions(items).map(toStudentEnrollmentPickerOption);
}

export function loadRecentStudentEnrollmentPickerOptions(
  storageKey = DEFAULT_RECENT_STUDENT_ENROLLMENTS_STORAGE_KEY,
): StudentEnrollmentPickerOption[] {
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

    return parsed.filter(isStudentEnrollmentPickerOption).slice(
      0,
      MAX_RECENT_STUDENT_ENROLLMENTS,
    );
  } catch {
    return [];
  }
}

export function saveRecentStudentEnrollmentPickerOption(
  option: StudentEnrollmentPickerOption,
  storageKey = DEFAULT_RECENT_STUDENT_ENROLLMENTS_STORAGE_KEY,
): StudentEnrollmentPickerOption[] {
  if (!isBrowser()) {
    return [option];
  }

  const current = loadRecentStudentEnrollmentPickerOptions(storageKey);
  const next = [option, ...current.filter((item) => item.id !== option.id)].slice(
    0,
    MAX_RECENT_STUDENT_ENROLLMENTS,
  );

  window.localStorage.setItem(storageKey, JSON.stringify(next));

  return next;
}
