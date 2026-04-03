"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseBranchesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isHeadquarters?: boolean;
  isActive?: boolean;
};

export function useBranchesQuery(options: UseBranchesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "branches",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.isHeadquarters === undefined ? "all" : options.isHeadquarters ? "hq" : "branch",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listBranches({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          isHeadquarters: options.isHeadquarters,
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
