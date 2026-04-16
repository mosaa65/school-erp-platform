"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

const EMPLOYEE_OPTIONS_PAGE_SIZE = 250;

type UseEmployeeOptionsQueryOptions = {
  enabled?: boolean;
  search?: string;
  isActive?: boolean;
  scope?: string;
  limit?: number;
};

export function useEmployeeOptionsQuery(
  options: UseEmployeeOptionsQueryOptions = {},
) {
  const auth = useAuth();
  const isActive = options.isActive ?? true;
  const limit = Math.min(
    options.limit ?? EMPLOYEE_OPTIONS_PAGE_SIZE,
    EMPLOYEE_OPTIONS_PAGE_SIZE,
  );
  const normalizedSearch = options.search?.trim() || undefined;

  return useQuery({
    queryKey: [
      "employees",
      "options",
      "shared",
      options.scope ?? "default",
      normalizedSearch ?? "",
      isActive,
      limit,
    ],
    enabled: (options.enabled ?? true) && auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const firstPage = await apiClient.listEmployeeOptions({
          page: 1,
          limit,
          search: normalizedSearch,
          isActive,
        });

        if (firstPage.pagination.totalPages <= 1) {
          return firstPage.data;
        }

        const remainingPages = await Promise.all(
          Array.from(
            { length: firstPage.pagination.totalPages - 1 },
            (_, index) => index + 2,
          ).map((page) =>
            apiClient.listEmployeeOptions({
              page,
              limit,
              search: normalizedSearch,
              isActive,
            }),
          ),
        );

        return [firstPage, ...remainingPages].flatMap((response) => response.data);
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
