"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type LookupCatalogListItem,
  type LookupCatalogType,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  EMPTY_GEOGRAPHY_DATA,
  type GeographyCatalogData,
} from "@/features/lookup-catalog/lib/geography";

const LOOKUP_PAGE_SIZE = 100;

async function listAllLookupItems(
  lookupType: LookupCatalogType,
): Promise<LookupCatalogListItem[]> {
  const items: LookupCatalogListItem[] = [];
  let page = 1;

  while (true) {
    const response = await apiClient.listLookupCatalogItems(lookupType, {
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

export function useGeographyOptionsQuery(scope: string) {
  const auth = useAuth();

  const loadLookupType = async (
    lookupType: LookupCatalogType,
  ): Promise<LookupCatalogListItem[]> => {
    try {
      return await listAllLookupItems(lookupType);
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
  };

  return useQuery<GeographyCatalogData>({
    queryKey: ["lookup-catalog", "geography", "options", scope],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      const [
        governorates,
        directorates,
        subDistricts,
        villages,
        localities,
      ] = await Promise.all([
        loadLookupType("governorates"),
        loadLookupType("directorates"),
        loadLookupType("sub-districts"),
        loadLookupType("villages"),
        loadLookupType("localities"),
      ]);

      return {
        governorates,
        directorates,
        subDistricts,
        villages,
        localities,
      };
    },
    placeholderData: EMPTY_GEOGRAPHY_DATA,
  });
}
