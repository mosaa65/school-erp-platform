"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseMonthlyCustomComponentScoresQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  monthlyGradeId?: string;
  gradingPolicyComponentId?: string;
  academicMonthId?: string;
  subjectId?: string;
  sectionId?: string;
  studentEnrollmentId?: string;
  studentId?: string;
  isActive?: boolean;
};

export function useMonthlyCustomComponentScoresQuery(
  options: UseMonthlyCustomComponentScoresQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "monthly-custom-component-scores",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.monthlyGradeId ?? "all",
      options.gradingPolicyComponentId ?? "all",
      options.academicMonthId ?? "all",
      options.subjectId ?? "all",
      options.sectionId ?? "all",
      options.studentEnrollmentId ?? "all",
      options.studentId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listMonthlyCustomComponentScores({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          monthlyGradeId: options.monthlyGradeId,
          gradingPolicyComponentId: options.gradingPolicyComponentId,
          academicMonthId: options.academicMonthId,
          subjectId: options.subjectId,
          sectionId: options.sectionId,
          studentEnrollmentId: options.studentEnrollmentId,
          studentId: options.studentId,
          isActive: options.isActive,
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


