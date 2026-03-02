"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseTalentsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

export function useTalentsQuery(options: UseTalentsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "talents",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listTalents({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
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


