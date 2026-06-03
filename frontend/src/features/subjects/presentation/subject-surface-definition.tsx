import * as React from "react";
import { Activity, BookOpenText, Hash, Tag } from "lucide-react";
import {
  defineEntitySurface,
  registerEntitySurface,
} from "@/presentation/entity-surface/entity-surface-registry";
import type {
  EntitySurfacePreview,
  EntitySurfaceStatusChip,
} from "@/presentation/entity-surface/entity-surface-types";
import type { SubjectCategory, SubjectListItem } from "@/lib/api/client";

export function getSubjectCategoryLabel(category: SubjectCategory): string {
  switch (category) {
    case "CORE":
      return "أساسية";
    case "ELECTIVE":
      return "اختيارية";
    case "LANGUAGE":
      return "لغات";
    case "SCIENCE":
      return "علوم";
    case "MATHEMATICS":
      return "رياضيات";
    case "HUMANITIES":
      return "إنسانيات";
    case "ARTS":
      return "فنون";
    case "SPORTS":
      return "رياضة";
    case "TECHNOLOGY":
      return "تقنية";
    case "OTHER":
      return "أخرى";
    default:
      return category;
  }
}

export function getSubjectStatusChips(subject: SubjectListItem): EntitySurfaceStatusChip[] {
  return [
    {
      key: "active",
      label: subject.isActive ? "نشط" : "غير نشط",
      tone: subject.isActive ? "success" : "outline",
      icon: <Activity className="h-3 w-3" />,
    },
    {
      key: "category",
      label: getSubjectCategoryLabel(subject.category),
      tone:
        subject.category === "CORE" || subject.category === "MATHEMATICS"
          ? "accent"
          : subject.category === "SCIENCE" || subject.category === "LANGUAGE"
            ? "secondary"
            : "neutral",
      icon: <Tag className="h-3 w-3" />,
    },
  ];
}

export function buildSubjectSurfacePreview(subject: SubjectListItem): EntitySurfacePreview {
  return {
    title: subject.name,
    subtitle: subject.shortName ?? subject.code,
    description: `تصنيف المادة: ${getSubjectCategoryLabel(subject.category)}`,
    meta: subject.code,
    avatar: {
      fallback: subject.name,
      alt: subject.name,
      icon: <BookOpenText className="h-5 w-5" />,
      colorSeed: subject.code || subject.id,
    },
    fields: [
      {
        key: "code",
        label: "الكود",
        value: subject.code,
        icon: <Hash className="h-3.5 w-3.5" />,
      },
      {
        key: "category",
        label: "التصنيف",
        value: getSubjectCategoryLabel(subject.category),
        icon: <Tag className="h-3.5 w-3.5" />,
      },
    ],
    statusChips: getSubjectStatusChips(subject),
  };
}

export const subjectSurfaceDefinition = registerEntitySurface(
  defineEntitySurface<SubjectListItem>({
    entityKey: "subjects",
    displayName: "المواد الدراسية",
    allowedViewModes: ["list", "smart-card", "grid", "dense-row"],
    defaultViewMode: "smart-card",
    detailsMode: "none",
    summary: {
      title: "name",
      subtitle: "shortName",
      meta: ["code", "category"],
      quickActions: ["edit", "delete"],
    },
    permissions: {
      summary: "subjects.read",
      quickActions: "subjects.quick-actions.use",
      quickEdit: "subjects.update",
      quickDelete: "subjects.delete",
    },
    buildPreview: buildSubjectSurfacePreview,
  }),
);
