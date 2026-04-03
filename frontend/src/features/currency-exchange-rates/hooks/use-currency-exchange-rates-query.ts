"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseCurrencyExchangeRatesQueryOptions = {
  page?: number;
  limit?: number;
  fromCurrencyId?: number;
  toCurrencyId?: number;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
};

export function useCurrencyExchangeRatesQuery(
  options: UseCurrencyExchangeRatesQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "currency-exchange-rates",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
      options.fromCurrencyId ?? "all",
      options.toCurrencyId ?? "all",
      options.dateFrom ?? "",
      options.dateTo ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listCurrencyExchangeRates({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          fromCurrencyId: options.fromCurrencyId,
          toCurrencyId: options.toCurrencyId,
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
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
