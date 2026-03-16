"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseSchoolProfilesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  ownershipTypeId?: number;
  isActive?: boolean;
};

export function useSchoolProfilesQuery(options: UseSchoolProfilesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "school-profiles",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.ownershipTypeId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listSchoolProfiles({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          ownershipTypeId: options.ownershipTypeId,
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


