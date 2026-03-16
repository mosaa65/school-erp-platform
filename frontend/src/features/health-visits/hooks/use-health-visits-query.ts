"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ApiError, apiClient } from "@/lib/api/client";

type UseHealthVisitsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  nurseId?: string;
  healthStatusId?: number;
  isActive?: boolean;
  fromDate?: string;
  toDate?: string;
};

export function useHealthVisitsQuery(options: UseHealthVisitsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "health-visits",
      "list",
      options.page ?? 1,
      options.limit ?? 6,
      options.search ?? "",
      options.studentId ?? "all-students",
      options.nurseId ?? "all-nurses",
      options.healthStatusId ?? "all-statuses",
      options.isActive === undefined
        ? "all"
        : options.isActive
        ? "active"
        : "inactive",
      options.fromDate ?? "noop",
      options.toDate ?? "noop",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listHealthVisits({
          page: options.page,
          limit: options.limit,
          search: options.search,
          studentId: options.studentId,
          nurseId: options.nurseId,
          healthStatusId: options.healthStatusId,
          fromDate: options.fromDate,
          toDate: options.toDate,
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
