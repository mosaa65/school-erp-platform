"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type BankReconciliationListItem,
  type BankReconciliationStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type { BankReconciliationListItem, BankReconciliationStatus };

type BankReconciliationsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: BankReconciliationStatus;
};

function matchesSearch(item: BankReconciliationListItem, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;

  const bankName = item.bankAccount?.nameAr ?? "";
  const bankNameEn = item.bankAccount?.nameEn ?? "";

  return (
    bankName.toLowerCase().includes(normalized) ||
    bankNameEn.toLowerCase().includes(normalized)
  );
}

export function useBankReconciliationsQuery(options: BankReconciliationsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "bank-reconciliations",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.status ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listBankReconciliations({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          status: options.status,
        });

        if (!options.search) {
          return response;
        }

        return {
          ...response,
          data: response.data.filter((item) => matchesSearch(item, options.search ?? "")),
        };
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}
