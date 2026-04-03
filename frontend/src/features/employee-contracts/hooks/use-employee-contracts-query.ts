"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeContractsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
  isCurrent?: boolean;
  isActive?: boolean;
};

export function useEmployeeContractsQuery(options: UseEmployeeContractsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-contracts",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "all",
      options.fromDate ?? "none",
      options.toDate ?? "none",
      options.isCurrent === undefined ? "all" : options.isCurrent ? "current" : "archived",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeeContracts({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          fromDate: options.fromDate,
          toDate: options.toDate,
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
