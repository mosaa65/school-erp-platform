"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useStudentEnrollmentOptionsQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["student-enrollments", "options", "student-homeworks"],
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
    select: (data) =>
      [...data].sort((left, right) => {
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
      }),
  });
}



