"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGradingSummaryReportQueryOptions = {
  academicYearId?: string;
  gradeLevelId?: string;
  sectionId?: string;
  academicTermId?: string;
  fromDate?: string;
  toDate?: string;
};

export function useGradingSummaryReportQuery(
  options: UseGradingSummaryReportQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "grading-reports",
      "summary",
      options.academicYearId ?? "all",
      options.gradeLevelId ?? "all",
      options.sectionId ?? "all",
      options.academicTermId ?? "all",
      options.fromDate ?? "all",
      options.toDate ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.getGradingSummaryReport(options);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}


