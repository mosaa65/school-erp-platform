"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseAnnualStatusesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isSystem?: boolean;
  isActive?: boolean;
};

export function useAnnualStatusesQuery(options: UseAnnualStatusesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "annual-statuses",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.isSystem === undefined ? "all" : options.isSystem ? "system" : "custom",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listAnnualStatuses({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          isSystem: options.isSystem,
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


