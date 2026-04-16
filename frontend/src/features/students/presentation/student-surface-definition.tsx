import * as React from "react";
import {
  Activity,
  GraduationCap,
  HeartPulse,
  MapPin,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  defineEntitySurface,
  registerEntitySurface,
} from "@/presentation/entity-surface/entity-surface-registry";
import type {
  EntitySurfacePreview,
  EntitySurfaceStatusChip,
} from "@/presentation/entity-surface/entity-surface-types";
import {
  translateStudentEnrollmentStatus,
  translateStudentGender,
  translateStudentHealthStatus,
  translateStudentOrphanStatus,
} from "@/lib/i18n/ar";
import type { StudentListItem } from "@/lib/api/client";

export const STUDENT_SUMMARY_PERMISSION_CODES = ["students.read", "students.read.summary"] as const;
export const STUDENT_DETAILS_PERMISSION_CODES = ["students.read", "students.read.details"] as const;
export const STUDENT_QUICK_ACTION_PERMISSION_CODES = [
  "students.quick-actions.use",
  "students.update",
  "students.delete",
] as const;
export const STUDENT_SENSITIVE_PERMISSION_CODES = [
  "students.read",
  "students.fields.sensitive",
] as const;

function getLatestEnrollment(student: StudentListItem) {
  return student.enrollments[0] ?? null;
}

export function getStudentDetailsPath(student: StudentListItem): string {
  return `/app/students/${student.id}`;
}

export function getStudentAdmissionLabel(student: StudentListItem): string {
  return student.admissionNo ?? "بدون رقم";
}

export function getStudentGenderLabel(student: StudentListItem): string {
  return student.genderLookup?.nameAr ?? translateStudentGender(student.gender);
}

export function getStudentBirthDateLabel(student: StudentListItem): string {
  if (!student.birthDate) {
    return "-";
  }

  const date = new Date(student.birthDate);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

export function getStudentHealthLabel(student: StudentListItem): string {
  return student.healthStatusLookup?.nameAr ??
    (student.healthStatus ? translateStudentHealthStatus(student.healthStatus) : "غير محدد");
}

export function getStudentOrphanLabel(student: StudentListItem): string {
  return student.orphanStatusLookup?.nameAr ?? translateStudentOrphanStatus(student.orphanStatus);
}

export function getStudentLocalityLabel(student: StudentListItem): string {
  return student.locality?.nameAr ?? "غير محدد";
}

export function getStudentPlacementShortLabel(student: StudentListItem): string {
  const latestEnrollment = getLatestEnrollment(student);
  if (!latestEnrollment) {
    return "بدون قيد دراسي";
  }

  return `${latestEnrollment.section.gradeLevel.name} • ${latestEnrollment.section.name}`;
}

export function getStudentPlacementLongLabel(student: StudentListItem): string {
  const latestEnrollment = getLatestEnrollment(student);
  if (!latestEnrollment) {
    return "لا يوجد قيد دراسي بعد";
  }

  return `${latestEnrollment.academicYear.name} / ${latestEnrollment.section.gradeLevel.name} / ${latestEnrollment.section.name} (${translateStudentEnrollmentStatus(latestEnrollment.status)})`;
}

export function getStudentStatusChips(student: StudentListItem): EntitySurfaceStatusChip[] {
  const items: EntitySurfaceStatusChip[] = [
    {
      key: "active",
      label: student.isActive ? "نشط" : "غير نشط",
      tone: student.isActive ? "success" : "outline",
      icon: <Activity className="h-3 w-3" />,
    },
  ];

  if (student.healthStatus && student.healthStatus !== "HEALTHY") {
    items.push({
      key: "health",
      label: getStudentHealthLabel(student),
      tone: "warning",
      icon: <HeartPulse className="h-3 w-3" />,
    });
    return items;
  }

  if (student.orphanStatus !== "NONE") {
    items.push({
      key: "orphan",
      label: getStudentOrphanLabel(student),
      tone: student.orphanStatus === "BOTH_DECEASED" ? "accent" : "warning",
      icon: <ShieldAlert className="h-3 w-3" />,
    });
  }

  return items;
}

export function buildStudentSurfacePreview(student: StudentListItem): EntitySurfacePreview {
  return {
    title: student.fullName,
    subtitle: getStudentAdmissionLabel(student),
    description: getStudentPlacementShortLabel(student),
    meta: `${student.guardians.length} أولياء أمور`,
    avatar: {
      fallback: student.fullName,
      alt: student.fullName,
      icon: <GraduationCap className="h-5 w-5" />,
      colorSeed: student.admissionNo ?? student.id,
    },
    fields: [
      {
        key: "location",
        label: "المحلة",
        value: getStudentLocalityLabel(student),
        icon: <MapPin className="h-3.5 w-3.5" />,
      },
      {
        key: "guardians",
        label: "الأولياء",
        value: `${student.guardians.length}`,
        icon: <Users className="h-3.5 w-3.5" />,
      },
    ],
    statusChips: getStudentStatusChips(student),
  };
}

export const studentSurfaceDefinition = registerEntitySurface(
  defineEntitySurface<StudentListItem>({
    entityKey: "students",
    displayName: "الطلاب",
    allowedViewModes: ["list", "smart-card", "grid", "dense-row"],
    defaultViewMode: "smart-card",
    detailsMode: "page",
    detailsPath: getStudentDetailsPath,
    summary: {
      title: "fullName",
      subtitle: "admissionNo",
      meta: ["placement", "guardians"],
      quickActions: ["details", "edit", "delete"],
    },
    permissions: {
      summary: "students.read.summary",
      details: "students.read.details",
      quickActions: "students.quick-actions.use",
      quickEdit: "students.update",
      quickDelete: "students.delete",
      sensitive: "students.fields.sensitive",
    },
    buildPreview: buildStudentSurfacePreview,
  }),
);
