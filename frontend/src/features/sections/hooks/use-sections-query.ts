"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseSectionsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  gradeLevelId?: string;
  isActive?: boolean;
};

export function useSectionsQuery(options: UseSectionsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "sections",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.gradeLevelId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listSections({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          gradeLevelId: options.gradeLevelId,
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


