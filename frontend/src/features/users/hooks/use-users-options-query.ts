"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type UserListItem } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

const OPTIONS_PAGE_SIZE = 100;

async function fetchAllActiveUsers(): Promise<UserListItem[]> {
  const aggregated: UserListItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await apiClient.listUsers({
      page,
      limit: OPTIONS_PAGE_SIZE,
      isActive: true,
    });

    aggregated.push(...response.data);
    totalPages = response.pagination.totalPages;
    page += 1;
  }

  return aggregated;
}

export function useUsersOptionsQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["users", "options", "all-active"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await fetchAllActiveUsers();
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
