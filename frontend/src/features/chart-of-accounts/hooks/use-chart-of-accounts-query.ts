"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseChartOfAccountsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  accountType?: string;
  parentId?: number;
  branchId?: number;
  isHeader?: boolean;
  isActive?: boolean;
};

export function useChartOfAccountsQuery(options: UseChartOfAccountsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "chart-of-accounts",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.accountType ?? "all",
      options.parentId ?? "all",
      options.branchId ?? "all",
      options.isHeader === undefined ? "all" : options.isHeader ? "header" : "detail",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listChartOfAccounts({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          accountType: options.accountType,
          parentId: options.parentId,
          branchId: options.branchId,
          isHeader: options.isHeader,
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
