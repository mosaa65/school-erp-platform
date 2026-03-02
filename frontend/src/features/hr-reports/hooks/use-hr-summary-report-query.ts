"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseHrSummaryReportQueryOptions = {
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
};

export function useHrSummaryReportQuery(options: UseHrSummaryReportQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "hr-reports",
      "summary",
      options.fromDate ?? "all",
      options.toDate ?? "all",
      options.employeeId ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.getHrSummaryReport(options);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}


