"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type GradingWorkflowStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseAcademicMonthsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  academicTermId?: string;
  status?: GradingWorkflowStatus;
  isCurrent?: boolean;
  isActive?: boolean;
};

export function useAcademicMonthsQuery(options: UseAcademicMonthsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "academic-months",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.academicTermId ?? "all",
      options.status ?? "all",
      options.isCurrent === undefined ? "all" : options.isCurrent ? "current" : "not-current",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listAcademicMonths({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          academicTermId: options.academicTermId,
          status: options.status,
          isCurrent: options.isCurrent,
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


