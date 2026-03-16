"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type PermissionListItem } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

const OPTIONS_PAGE_SIZE = 100;

async function fetchAllPermissions(): Promise<PermissionListItem[]> {
  const aggregated: PermissionListItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await apiClient.listPermissions({
      page,
      limit: OPTIONS_PAGE_SIZE,
    });

    aggregated.push(...response.data);
    totalPages = response.pagination.totalPages;
    page += 1;
  }

  return aggregated;
}

export function usePermissionsOptionsQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["permissions", "options", "all"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await fetchAllPermissions();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
          throw error;
        }

        if (error instanceof ApiError && error.status === 403) {
          return [];
        }

        throw error;
      }
    },
  });
}
