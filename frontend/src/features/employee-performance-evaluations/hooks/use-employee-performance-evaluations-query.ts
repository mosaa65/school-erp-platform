"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type PerformanceRatingLevel,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeePerformanceEvaluationsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  academicYearId?: string;
  ratingLevel?: PerformanceRatingLevel;
  evaluatorEmployeeId?: string;
  isActive?: boolean;
};

export function useEmployeePerformanceEvaluationsQuery(
  options: UseEmployeePerformanceEvaluationsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-performance-evaluations",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "all",
      options.academicYearId ?? "all",
      options.ratingLevel ?? "all",
      options.evaluatorEmployeeId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeePerformanceEvaluations({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          academicYearId: options.academicYearId,
          ratingLevel: options.ratingLevel,
          evaluatorEmployeeId: options.evaluatorEmployeeId,
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


