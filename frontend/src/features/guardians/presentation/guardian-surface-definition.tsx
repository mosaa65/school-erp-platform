"use client";

import * as React from "react";
import { Activity, IdCard, MapPin, MessageSquare, User, Users } from "lucide-react";
import {
  defineEntitySurface,
  registerEntitySurface,
} from "@/presentation/entity-surface/entity-surface-registry";
import type {
  EntitySurfacePreview,
  EntitySurfaceStatusChip,
} from "@/presentation/entity-surface/entity-surface-types";
import { translateGuardianRelationship, translateStudentGender } from "@/lib/i18n/ar";
import type { GuardianListItem, GuardianRelationship } from "@/lib/api/client";

const RELATIONSHIP_ORDER: GuardianRelationship[] = [
  "FATHER",
  "MOTHER",
  "BROTHER",
  "SISTER",
  "UNCLE",
  "AUNT",
  "GRANDFATHER",
  "GRANDMOTHER",
  "OTHER",
];

export const GUARDIAN_SUMMARY_PERMISSION_CODES = [
  "guardians.read.summary",
  "guardians.read",
] as const;
export const GUARDIAN_DETAILS_PERMISSION_CODES = [
  "guardians.read.details",
  "guardians.read",
] as const;
export const GUARDIAN_QUICK_ACTION_PERMISSION_CODES = [
  "guardians.quick-actions.use",
  "guardians.read.details",
  "guardians.read",
  "guardians.update",
  "guardians.delete",
] as const;

export function getGuardianDetailsPath(guardian: GuardianListItem): string {
  return `/app/guardians#${guardian.id}`;
}

export function getGuardianGenderLabel(guardian: GuardianListItem): string {
  return guardian.genderLookup?.nameAr ?? translateStudentGender(guardian.gender);
}

export function getGuardianIdentityLabel(guardian: GuardianListItem): string {
  return `${guardian.idNumber ?? "-"} (${guardian.idType?.nameAr ?? "بدون"})`;
}

export function getGuardianRelationshipPreview(guardian: GuardianListItem): string {
  if (guardian.students.length === 0) {
    return "لا يوجد طلاب مرتبطون";
  }

  const primary = guardian.students.find((item) => item.isPrimary);
  if (primary) {
    return `${translateGuardianRelationship(primary.relationship)} - ${primary.student.fullName}`;
  }

  const sorted = [...guardian.students].sort(
    (a, b) =>
      RELATIONSHIP_ORDER.indexOf(a.relationship) - RELATIONSHIP_ORDER.indexOf(b.relationship),
  );
  const first = sorted[0];

  return first
    ? `${translateGuardianRelationship(first.relationship)} - ${first.student.fullName}`
    : "لا يوجد طلاب مرتبطون";
}

export function getGuardianLocationLabel(guardian: GuardianListItem): string {
  return guardian.locality?.nameAr ?? "غير محدد";
}

export function getGuardianStatusChips(guardian: GuardianListItem): EntitySurfaceStatusChip[] {
  return [
    {
      key: "active",
      label: guardian.isActive ? "نشط" : "غير نشط",
      tone: guardian.isActive ? "success" : "outline",
      icon: <Activity className="h-3 w-3" />,
    },
  ];
}

export function buildGuardianSurfacePreview(guardian: GuardianListItem): EntitySurfacePreview {
  return {
    title: guardian.fullName,
    subtitle: guardian.phonePrimary ?? guardian.whatsappNumber ?? "بدون هاتف",
    description: getGuardianRelationshipPreview(guardian),
    meta: `${guardian.students.length} طلاب مرتبطين`,
    avatar: {
      fallback: guardian.fullName,
      alt: guardian.fullName,
      icon: <Users className="h-5 w-5" />,
      colorSeed: guardian.idNumber ?? guardian.id,
    },
    fields: [
      {
        key: "identity",
        label: "الهوية",
        value: getGuardianIdentityLabel(guardian),
        icon: <IdCard className="h-3.5 w-3.5" />,
      },
      {
        key: "whatsapp",
        label: "واتساب",
        value: guardian.whatsappNumber ?? "-",
        icon: <MessageSquare className="h-3.5 w-3.5" />,
      },
      {
        key: "students",
        label: "الطلاب",
        value: `${guardian.students.length}`,
        icon: <User className="h-3.5 w-3.5" />,
      },
      {
        key: "location",
        label: "المحلة",
        value: getGuardianLocationLabel(guardian),
        icon: <MapPin className="h-3.5 w-3.5" />,
      },
    ],
    statusChips: getGuardianStatusChips(guardian),
  };
}

export const guardianSurfaceDefinition = registerEntitySurface(
  defineEntitySurface<GuardianListItem>({
    entityKey: "guardians",
    displayName: "أولياء الأمور",
    allowedViewModes: ["list", "smart-card", "grid", "dense-row"],
    defaultViewMode: "smart-card",
    detailsMode: "sheet",
    detailsPath: getGuardianDetailsPath,
    summary: {
      title: "fullName",
      subtitle: "phonePrimary",
      meta: ["students", "whatsapp", "location"],
      quickActions: ["details", "edit", "delete"],
    },
    permissions: {
      summary: "guardians.read.summary",
      details: "guardians.read.details",
      quickActions: "guardians.quick-actions.use",
      quickEdit: "guardians.update",
      quickDelete: "guardians.delete",
    },
    buildPreview: buildGuardianSurfacePreview,
  }),
);
