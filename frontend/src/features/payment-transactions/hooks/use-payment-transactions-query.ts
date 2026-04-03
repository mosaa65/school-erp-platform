"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type PaymentTransactionListItem,
  type PaymentTransactionStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type { PaymentTransactionListItem, PaymentTransactionStatus };

type PaymentTransactionsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentTransactionStatus;
};

export function usePaymentTransactionsQuery(options: PaymentTransactionsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "payment-transactions",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.status ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listPaymentTransactions({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          status: options.status,
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
