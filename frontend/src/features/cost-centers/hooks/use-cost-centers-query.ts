"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type CostCenterListItem } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type { CostCenterListItem };

type CostCentersQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  branchId?: number;
};

export function useCostCentersQuery(options: CostCentersQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "cost-centers",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
      options.branchId ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listCostCenters({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          isActive: options.isActive,
          branchId: options.branchId,
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
