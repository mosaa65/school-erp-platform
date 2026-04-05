"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type BudgetListItem,
  type BudgetStatus,
  type BudgetType,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type { BudgetListItem, BudgetStatus, BudgetType };

type BudgetsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: BudgetStatus;
  budgetType?: BudgetType;
  fiscalYearId?: number;
  branchId?: number;
};

export function useBudgetsQuery(options: BudgetsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "budgets",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.status ?? "all",
      options.budgetType ?? "all",
      options.fiscalYearId ?? "all",
      options.branchId ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listBudgets({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          status: options.status,
          budgetType: options.budgetType,
          fiscalYearId: options.fiscalYearId,
          branchId: options.branchId,
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
