"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type ViolationSeverity } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeViolationsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  reportedByEmployeeId?: string;
  severity?: ViolationSeverity;
  fromDate?: string;
  toDate?: string;
  isActive?: boolean;
};

export function useEmployeeViolationsQuery(
  options: UseEmployeeViolationsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-violations",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "all",
      options.reportedByEmployeeId ?? "all",
      options.severity ?? "all",
      options.fromDate ?? "none",
      options.toDate ?? "none",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeeViolations({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          reportedByEmployeeId: options.reportedByEmployeeId,
          severity: options.severity,
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


