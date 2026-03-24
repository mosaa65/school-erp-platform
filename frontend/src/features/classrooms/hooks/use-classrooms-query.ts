"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseClassroomsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  buildingLookupId?: number;
  isActive?: boolean;
};

export function useClassroomsQuery(options: UseClassroomsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "classrooms",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.buildingLookupId ?? "all-buildings",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listClassrooms({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          buildingLookupId: options.buildingLookupId,
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
