"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseFiscalYearsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  dateFrom?: string;
  dateTo?: string;
  isClosed?: boolean;
  isActive?: boolean;
};

export function useFiscalYearsQuery(options: UseFiscalYearsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "fiscal-years",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.dateFrom ?? "",
      options.dateTo ?? "",
      options.isClosed === undefined ? "all" : options.isClosed ? "closed" : "open",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listFiscalYears({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
          isClosed: options.isClosed,
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
