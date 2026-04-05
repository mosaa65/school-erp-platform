"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseFiscalPeriodsQueryOptions = {
  page?: number;
  limit?: number;
  fiscalYearId?: number;
  periodType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
};

export function useFiscalPeriodsQuery(options: UseFiscalPeriodsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "fiscal-periods",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.periodType ?? "all",
      options.status ?? "all",
      options.fiscalYearId ?? "all",
      options.dateFrom ?? "",
      options.dateTo ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listFiscalPeriods({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          fiscalYearId: options.fiscalYearId,
          periodType: options.periodType,
          status: options.status,
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
