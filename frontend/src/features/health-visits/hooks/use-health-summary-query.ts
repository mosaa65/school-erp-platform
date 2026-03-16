"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ApiError, apiClient } from "@/lib/api/client";

export function useHealthSummaryQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["health-visits", "summary"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.getHealthVisitsSummary();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}
