"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseCurrenciesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isBase?: boolean;
  isActive?: boolean;
};

export function useCurrenciesQuery(options: UseCurrenciesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "currencies",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.isBase === undefined ? "all" : options.isBase ? "base" : "secondary",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listCurrencies({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          isBase: options.isBase,
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
