"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentEnrollmentDistributionBoardQueryOptions = {
  academicYearId?: string;
  gradeLevelId?: string;
  search?: string;
  limit?: number;
};

export function useStudentEnrollmentDistributionBoardQuery(
  options: UseStudentEnrollmentDistributionBoardQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-enrollments",
      "distribution-board",
      options.academicYearId ?? "all",
      options.gradeLevelId ?? "all",
      options.search ?? "",
      options.limit ?? 200,
    ],
    enabled:
      auth.isHydrated &&
      auth.isAuthenticated &&
      Boolean(options.academicYearId && options.gradeLevelId),
    queryFn: async () => {
      try {
        return await apiClient.getStudentEnrollmentDistributionBoard({
          academicYearId: options.academicYearId!,
          gradeLevelId: options.gradeLevelId!,
          search: options.search,
          limit: options.limit,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}
