"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseLookupBloodTypesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  deletedOnly?: boolean;
};

export function useLookupBloodTypesQuery(
  options: UseLookupBloodTypesQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "lookup-blood-types",
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
        return await apiClient.listLookupBloodTypes({
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


