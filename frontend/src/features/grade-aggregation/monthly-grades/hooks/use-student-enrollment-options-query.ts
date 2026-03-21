"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import type { StudentEnrollmentListItem } from "@/lib/api/client";
import { sortStudentEnrollmentOptions } from "@/lib/student-enrollment-display";
import { useAuth } from "@/features/auth/providers/auth-provider";

type Params = {
  academicYearId?: string;
  sectionId?: string;
  studentId?: string;
};

export function useStudentEnrollmentOptionsQuery(params: Params = {}) {
  const auth = useAuth();

  return useQuery<StudentEnrollmentListItem[]>({
    queryKey: [
      "student-enrollments",
      "options",
      "monthly-grades",
      params.academicYearId ?? "all",
      params.sectionId ?? "all",
      params.studentId ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listStudentEnrollments({
          page: 1,
          limit: 100,
          academicYearId: params.academicYearId,
          sectionId: params.sectionId,
          studentId: params.studentId,
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
    select: (items) => sortStudentEnrollmentOptions(items),
  });
}


