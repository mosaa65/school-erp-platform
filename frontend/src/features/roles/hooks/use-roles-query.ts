"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseRolesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
};

export function useRolesQuery(options: UseRolesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "roles",
      "list",
      options.page ?? 1,
      options.limit ?? 10,
      options.search ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listRoles({
          page: options.page ?? 1,
          limit: options.limit ?? 10,
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


