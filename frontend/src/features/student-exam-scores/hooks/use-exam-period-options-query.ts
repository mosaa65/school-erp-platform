"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useExamPeriodOptionsQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["exam-periods", "options", "student-exam-scores"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listExamPeriods({
          page: 1,
          limit: 100,
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


