"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type LookupCatalogListItem } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

const LOOKUP_PAGE_SIZE = 100;

async function listAllBuildingItems(): Promise<LookupCatalogListItem[]> {
  const items: LookupCatalogListItem[] = [];
  let page = 1;

  while (true) {
    const response = await apiClient.listLookupCatalogItems("buildings", {
      page,
      limit: LOOKUP_PAGE_SIZE,
      isActive: true,
    });

    items.push(...response.data);

    if (page >= response.pagination.totalPages) {
      break;
    }

    page += 1;
  }

  return items;
}

export function useBuildingOptionsQuery(scope = "sections") {
  const auth = useAuth();

  return useQuery<LookupCatalogListItem[]>({
    queryKey: ["lookup-catalog", "buildings", "options", scope],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await listAllBuildingItems();
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
    placeholderData: [],
  });
}
