"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import type { StudentEnrollmentListItem } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { formatNameCodeLabel } from "@/lib/option-labels";

type StudentEnrollmentOptionItem = StudentEnrollmentListItem & {
  displayLabel: string;
};

type EnrollmentLabelInput = {
  student: {
    fullName: string;
    admissionNo: string | null;
  };
  academicYear: {
    name: string;
    code: string;
  };
  gradeLevel?: {
    name: string;
    code: string;
  } | null;
  section?: {
    name?: string | null;
    code?: string | null;
    gradeLevel?: {
      name: string;
      code: string;
    } | null;
  } | null;
};

function formatEnrollmentOptionLabel(item: EnrollmentLabelInput): string {
  const studentLabel = `${item.student.fullName} (${item.student.admissionNo ?? "غير متوفر"})`;
  const yearLabel = formatNameCodeLabel(item.academicYear.name, item.academicYear.code);
  const gradeLabel = item.gradeLevel
    ? formatNameCodeLabel(item.gradeLevel.name, item.gradeLevel.code)
    : item.section?.gradeLevel
      ? formatNameCodeLabel(
          item.section.gradeLevel.name,
          item.section.gradeLevel.code,
        )
      : "";
  const sectionLabel = item.section
    ? formatNameCodeLabel(item.section.name, item.section.code)
    : "غير موزع";

  if (gradeLabel) {
    return `${studentLabel} - ${yearLabel} / ${gradeLabel} / ${sectionLabel}`;
  }

  return `${studentLabel} - ${yearLabel} / ${sectionLabel}`;
}

export function useStudentEnrollmentOptionsQuery() {
  const auth = useAuth();

  return useQuery<StudentEnrollmentListItem[], Error, StudentEnrollmentOptionItem[]>({
    queryKey: ["student-enrollments", "options", "student-attendance"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listStudentEnrollments({
          page: 1,
          limit: 100,
          isActive: true,
        });

        return response.data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
          throw error;
        }

        if (error instanceof ApiError && error.status === 403) {
          return [];
        }

        throw error;
      }
    },
    select: (items) =>
      [...items]
        .sort((left, right) => {
          const academicYearCompare = left.academicYear.code.localeCompare(right.academicYear.code, "ar", {
            numeric: true,
            sensitivity: "base",
          });
          if (academicYearCompare !== 0) {
            return academicYearCompare;
          }

          const leftGradeSequence = left.gradeLevel?.sequence ?? Number.MAX_SAFE_INTEGER;
          const rightGradeSequence = right.gradeLevel?.sequence ?? Number.MAX_SAFE_INTEGER;
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
        })
        .map((item) => {
          const enrollment = item as EnrollmentLabelInput;
          return {
            ...item,
            displayLabel: formatEnrollmentOptionLabel(enrollment),
          };
        }),
  });
}
