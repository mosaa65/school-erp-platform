"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, type PaginatedResponse } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

type FinancialCategoryListItem = {
  id: number;
  nameAr?: string;
  categoryType?: string | null;
  isActive?: boolean;
  parentId?: number | null;
  createdAt?: string;
};

type UseFinancialCategoriesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  categoryType?: string;
  isActive?: boolean;
};

export function useFinancialCategoriesQuery(
  options: UseFinancialCategoriesQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "financial-categories",
      "list",
      options.page ?? 1,
      options.limit ?? 15,
      options.search ?? "",
      options.categoryType ?? "all",
      options.isActive ?? "any",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await financeRequest<PaginatedResponse<FinancialCategoryListItem>>(
          "/finance/financial-categories",
          {
            params: {
              page: options.page ?? 1,
              limit: options.limit ?? 15,
              search: options.search,
              categoryType: options.categoryType,
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
