"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, type PaginatedResponse } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

type ExpenseListItem = {
  id: number;
  expenseDate?: string;
  amount?: number;
  isApproved?: boolean;
  vendorName?: string | null;
  invoiceNumber?: string | null;
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
  approvedByUser?: {
    id: string;
    email?: string | null;
  } | null;
  journalEntry?: {
    id: string;
    entryNumber?: string | null;
    status?: string | null;
  } | null;
};

type UseExpensesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  fundId?: number;
  categoryId?: number;
  isApproved?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

export function useExpensesQuery(options: UseExpensesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "expenses",
      "list",
      options.page ?? 1,
      options.limit ?? 15,
      options.search ?? "",
      options.fundId ?? 0,
      options.categoryId ?? 0,
      options.isApproved ?? "any",
      options.dateFrom ?? "",
      options.dateTo ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await financeRequest<PaginatedResponse<ExpenseListItem>>(
          "/finance/expenses",
          {
            params: {
              page: options.page ?? 1,
              limit: options.limit ?? 15,
              search: options.search,
              fundId: options.fundId,
              categoryId: options.categoryId,
              isApproved: options.isApproved,
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
