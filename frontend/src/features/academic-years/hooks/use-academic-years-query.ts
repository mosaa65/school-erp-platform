"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type AcademicYearStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseAcademicYearsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: AcademicYearStatus;
  isCurrent?: boolean;
};

export function useAcademicYearsQuery(options: UseAcademicYearsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "academic-years",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.status ?? "all",
      options.isCurrent === undefined ? "all" : options.isCurrent ? "current" : "not-current",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listAcademicYears({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          status: options.status,
          isCurrent: options.isCurrent,
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


