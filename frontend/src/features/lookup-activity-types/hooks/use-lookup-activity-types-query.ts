"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseLookupActivityTypesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  deletedOnly?: boolean;
};

export function useLookupActivityTypesQuery(options: UseLookupActivityTypesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "lookup-activity-types",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
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
        return await apiClient.listLookupActivityTypes({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
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


