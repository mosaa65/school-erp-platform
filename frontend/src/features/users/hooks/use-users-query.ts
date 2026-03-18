"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ApiError, apiClient } from "@/lib/api/client";

type UseUsersQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  deletedOnly?: boolean;
};

export function useUsersQuery(options: UseUsersQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "users",
      "list",
      options.page ?? 1,
      options.limit ?? 8,
      options.search ?? "",
      options.deletedOnly
        ? "deleted"
        : options.isActive === undefined
          ? "all"
          : options.isActive
            ? "active"
            : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listUsers({
          page: options.page ?? 1,
          limit: options.limit ?? 8,
          search: options.search,
          isActive: options.isActive,
          deletedOnly: options.deletedOnly ? true : undefined,
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


