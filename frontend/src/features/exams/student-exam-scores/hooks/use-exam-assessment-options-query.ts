"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useExamAssessmentOptionsQuery(examPeriodId?: string, isActive?: boolean) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "exam-assessments",
      "options",
      "student-exam-scores",
      examPeriodId ?? "all",
      isActive === undefined ? "all" : isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listExamAssessments({
          page: 1,
          limit: 100,
          examPeriodId,
          isActive,
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
  });
}


