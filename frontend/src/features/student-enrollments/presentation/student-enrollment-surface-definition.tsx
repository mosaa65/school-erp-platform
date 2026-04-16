"use client";

import * as React from "react";
import { Activity, CalendarDays, GraduationCap, Hash, Layers3, RefreshCw } from "lucide-react";
import {
  defineEntitySurface,
  registerEntitySurface,
} from "@/presentation/entity-surface/entity-surface-registry";
import type {
  EntitySurfacePreview,
  EntitySurfaceStatusChip,
} from "@/presentation/entity-surface/entity-surface-types";
import { translateStudentEnrollmentStatus } from "@/lib/i18n/ar";
import { formatStudentEnrollmentPlacementLabel } from "@/lib/student-enrollment-display";
import type {
  StudentEnrollmentDistributionStatus,
  StudentEnrollmentListItem,
} from "@/lib/api/client";

const DISTRIBUTION_STATUS_LABELS: Record<StudentEnrollmentDistributionStatus, string> = {
  PENDING_DISTRIBUTION: "بانتظار التوزيع",
  ASSIGNED: "موزع",
  TRANSFERRED: "منقول",
};

export const STUDENT_ENROLLMENT_PERMISSION_CODES = ["student-enrollments.read"] as const;
export const STUDENT_ENROLLMENT_QUICK_ACTION_PERMISSION_CODES = [
  "student-enrollments.read",
  "student-enrollments.update",
  "student-enrollments.delete",
] as const;

export function getStudentEnrollmentDetailsPath(enrollment: StudentEnrollmentListItem): string {
  return `/app/student-enrollments#${enrollment.id}`;
}

export function formatEnrollmentDateLabel(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

export function getStudentEnrollmentDistributionLabel(
  distributionStatus: StudentEnrollmentDistributionStatus | null | undefined,
): string {
  if (!distributionStatus) {
    return "غير محددة";
  }

  return DISTRIBUTION_STATUS_LABELS[distributionStatus] ?? distributionStatus;
}

export function getStudentEnrollmentPlacementShortLabel(
  enrollment: StudentEnrollmentListItem,
): string {
  return formatStudentEnrollmentPlacementLabel(enrollment);
}

export function getStudentEnrollmentSummaryLabel(
  enrollment: StudentEnrollmentListItem,
): string {
  return `${enrollment.student.fullName} (${enrollment.student.admissionNo ?? "بدون رقم"})`;
}

export function getStudentEnrollmentStatusChips(
  enrollment: StudentEnrollmentListItem,
): EntitySurfaceStatusChip[] {
  return [
    {
      key: "status",
      label: translateStudentEnrollmentStatus(enrollment.status),
      tone: "accent",
      icon: <GraduationCap className="h-3 w-3" />,
    },
    {
      key: "active",
      label: enrollment.isActive ? "نشط" : "غير نشط",
      tone: enrollment.isActive ? "success" : "outline",
      icon: <Activity className="h-3 w-3" />,
    },
  ];
}

export function buildStudentEnrollmentSurfacePreview(
  enrollment: StudentEnrollmentListItem,
): EntitySurfacePreview {
  return {
    title: enrollment.student.fullName,
    subtitle: enrollment.student.admissionNo ?? "بدون رقم طالب",
    description: getStudentEnrollmentPlacementShortLabel(enrollment),
    meta: enrollment.yearlyEnrollmentNo
      ? `رقم القيد السنوي: ${enrollment.yearlyEnrollmentNo}`
      : "رقم القيد سيولد تلقائيًا",
    avatar: {
      fallback: enrollment.student.fullName,
      alt: enrollment.student.fullName,
      icon: <GraduationCap className="h-5 w-5" />,
      colorSeed: enrollment.yearlyEnrollmentNo ?? enrollment.id,
    },
    fields: [
      {
        key: "academic-year",
        label: "السنة",
        value: enrollment.academicYear.name,
        icon: <CalendarDays className="h-3.5 w-3.5" />,
      },
      {
        key: "placement",
        label: "الصف والشعبة",
        value:
          enrollment.section
            ? `${enrollment.section.gradeLevel.name} / ${enrollment.section.name}`
            : enrollment.gradeLevel?.name ?? "بانتظار التوزيع",
        icon: <Layers3 className="h-3.5 w-3.5" />,
      },
      {
        key: "distribution",
        label: "التوزيع",
        value: getStudentEnrollmentDistributionLabel(enrollment.distributionStatus),
        icon: <RefreshCw className="h-3.5 w-3.5" />,
      },
      {
        key: "number",
        label: "رقم القيد",
        value: enrollment.yearlyEnrollmentNo ?? "-",
        icon: <Hash className="h-3.5 w-3.5" />,
      },
    ],
    statusChips: getStudentEnrollmentStatusChips(enrollment),
  };
}

export const studentEnrollmentSurfaceDefinition = registerEntitySurface(
  defineEntitySurface<StudentEnrollmentListItem>({
    entityKey: "student-enrollments",
    displayName: "قيود الطلاب",
    allowedViewModes: ["list", "smart-card", "grid", "dense-row"],
    defaultViewMode: "list",
    detailsMode: "sheet",
    detailsPath: getStudentEnrollmentDetailsPath,
    summary: {
      title: "student.fullName",
      subtitle: "student.admissionNo",
      meta: ["academicYear", "section", "distributionStatus"],
      quickActions: ["details", "edit", "delete"],
    },
    permissions: {
      summary: "student-enrollments.read",
      details: "student-enrollments.read",
      quickActions: "student-enrollments.read",
      quickEdit: "student-enrollments.update",
      quickDelete: "student-enrollments.delete",
    },
    buildPreview: buildStudentEnrollmentSurfacePreview,
  }),
);
