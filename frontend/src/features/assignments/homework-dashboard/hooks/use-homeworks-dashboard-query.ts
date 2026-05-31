"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseHomeworksDashboardQueryOptions = {
  academicYearId?: string;
  academicTermId?: string;
  sectionId?: string;
  subjectId?: string;
  fromDate?: string;
  toDate?: string;
};

export function useHomeworksDashboardQuery(
  options: UseHomeworksDashboardQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "homeworks",
      "dashboard",
      options.academicYearId ?? "all",
      options.academicTermId ?? "all",
      options.sectionId ?? "all",
      options.subjectId ?? "all",
      options.fromDate ?? "",
      options.toDate ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listHomeworksDashboard({
          ...options,
          asOfDate: new Date().toISOString(),
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
