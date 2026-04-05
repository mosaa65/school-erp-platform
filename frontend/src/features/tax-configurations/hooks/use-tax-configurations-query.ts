"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type TaxConfigurationListItem, type TaxType } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type { TaxConfigurationListItem, TaxType };

type TaxConfigurationsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  taxType?: TaxType;
};

export function useTaxConfigurationsQuery(options: TaxConfigurationsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "tax-configurations",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
      options.taxType ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listTaxConfigurations({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          isActive: options.isActive,
          taxType: options.taxType,
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
