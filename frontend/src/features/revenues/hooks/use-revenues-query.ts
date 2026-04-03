"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, type PaginatedResponse } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

type RevenueListItem = {
  id: number;
  revenueDate?: string;
  amount?: number;
  sourceType?: string | null;
  receiptNumber?: string | null;
  description?: string | null;
  fund?: {
    id: number;
    nameAr?: string;
    code?: string | null;
  } | null;
  category?: {
    id: number;
    nameAr?: string;
    code?: string | null;
  } | null;
  createdByUser?: {
    id: string;
    email?: string | null;
  } | null;
  journalEntry?: {
    id: string;
    entryNumber?: string | null;
    status?: string | null;
  } | null;
};

type UseRevenuesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  fundId?: number;
  categoryId?: number;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useRevenuesQuery(options: UseRevenuesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "revenues",
      "list",
      options.page ?? 1,
      options.limit ?? 15,
      options.search ?? "",
      options.fundId ?? 0,
      options.categoryId ?? 0,
      options.sourceType ?? "all",
      options.dateFrom ?? "",
      options.dateTo ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await financeRequest<PaginatedResponse<RevenueListItem>>(
          "/finance/revenues",
          {
            params: {
              page: options.page ?? 1,
              limit: options.limit ?? 15,
              search: options.search,
              fundId: options.fundId,
              categoryId: options.categoryId,
              sourceType: options.sourceType,
              dateFrom: options.dateFrom,
              dateTo: options.dateTo,
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
