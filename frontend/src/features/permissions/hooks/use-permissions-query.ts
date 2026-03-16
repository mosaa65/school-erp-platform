"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UsePermissionsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
};

export function usePermissionsQuery(options: UsePermissionsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "permissions",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listPermissions({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
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


