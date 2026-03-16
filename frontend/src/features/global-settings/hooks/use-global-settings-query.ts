"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGlobalSettingsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isPublic?: boolean;
};

export function useGlobalSettingsQuery(options: UseGlobalSettingsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "global-settings",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.isPublic === undefined ? "all" : options.isPublic ? "public" : "private",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listGlobalSettings({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          isPublic: options.isPublic,
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


