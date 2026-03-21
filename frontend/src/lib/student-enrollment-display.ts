import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";

type GradeLevelLike = {
  name: string;
  code: string;
  sequence?: number;
} | null | undefined;

type SectionLike = {
  name: string;
  code: string;
  gradeLevel?: GradeLevelLike;
} | null | undefined;

type AcademicYearLike = {
  name: string;
  code: string;
};

type StudentLike = {
  fullName: string;
  admissionNo?: string | null;
} | null | undefined;

export type StudentEnrollmentPlacementLike = {
  academicYear: AcademicYearLike;
  gradeLevel?: GradeLevelLike;
  section?: SectionLike;
  student?: StudentLike;
};

export function formatStudentEnrollmentPlacementLabel(
  item: StudentEnrollmentPlacementLike,
): string {
  const academicYearLabel = formatNameCodeLabel(item.academicYear.name, item.academicYear.code);

  if (item.section) {
    return `${academicYearLabel} / ${formatSectionWithGradeLabel(item.section)}`;
  }

  const gradeLevelLabel = item.gradeLevel
    ? formatNameCodeLabel(item.gradeLevel.name, item.gradeLevel.code)
    : null;

  return gradeLevelLabel
    ? `${academicYearLabel} / ${gradeLevelLabel} / بانتظار التوزيع`
    : `${academicYearLabel} / بانتظار التوزيع`;
}

export function formatStudentEnrollmentOptionLabel(
  item: StudentEnrollmentPlacementLike & { student: StudentLike },
): string {
  const studentLabel = item.student
    ? `${item.student.fullName} (${item.student.admissionNo ?? "رقم القيد غير متاح"})`
    : "طالب غير محدد";
  return `${studentLabel} - ${formatStudentEnrollmentPlacementLabel(item)}`;
}

export function sortStudentEnrollmentOptions<T extends StudentEnrollmentPlacementLike & { student: { fullName: string } }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => {
    const academicYearCompare = left.academicYear.code.localeCompare(right.academicYear.code, "ar", {
      numeric: true,
      sensitivity: "base",
    });
    if (academicYearCompare !== 0) {
      return academicYearCompare;
    }

    const leftGradeSequence = left.gradeLevel?.sequence ?? left.section?.gradeLevel?.sequence ?? Number.MAX_SAFE_INTEGER;
    const rightGradeSequence = right.gradeLevel?.sequence ?? right.section?.gradeLevel?.sequence ?? Number.MAX_SAFE_INTEGER;
    if (leftGradeSequence !== rightGradeSequence) {
      return leftGradeSequence - rightGradeSequence;
    }

    const leftSectionCode = left.section?.code ?? "";
    const rightSectionCode = right.section?.code ?? "";
    const sectionCompare = leftSectionCode.localeCompare(rightSectionCode, "ar", {
      numeric: true,
      sensitivity: "base",
    });
    if (sectionCompare !== 0) {
      return sectionCompare;
    }

    return left.student.fullName.localeCompare(right.student.fullName, "ar", {
      sensitivity: "base",
    });
  });
}
