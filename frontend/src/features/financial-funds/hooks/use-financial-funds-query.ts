"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, type PaginatedResponse } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

type FinancialFundListItem = {
  id: number;
  nameAr?: string;
  code?: string | null;
  fundType?: string | null;
  currentBalance?: number | null;
  isActive?: boolean;
  createdAt?: string;
};

type UseFinancialFundsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  fundType?: string;
  isActive?: boolean;
};

export function useFinancialFundsQuery(options: UseFinancialFundsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "financial-funds",
      "list",
      options.page ?? 1,
      options.limit ?? 15,
      options.search ?? "",
      options.fundType ?? "all",
      options.isActive ?? "any",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await financeRequest<PaginatedResponse<FinancialFundListItem>>(
          "/finance/financial-funds",
          {
            params: {
              page: options.page ?? 1,
              limit: options.limit ?? 15,
              search: options.search,
              fundType: options.fundType,
              isActive: options.isActive,
            },
          },
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}
