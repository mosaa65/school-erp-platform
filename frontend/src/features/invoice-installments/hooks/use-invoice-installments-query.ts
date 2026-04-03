"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type InstallmentStatus } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseInvoiceInstallmentsQueryOptions = {
  page?: number;
  limit?: number;
  invoiceId?: string;
  status?: InstallmentStatus;
  dueDateFrom?: string;
  dueDateTo?: string;
};

export function useInvoiceInstallmentsQuery(
  options: UseInvoiceInstallmentsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "invoice-installments",
      "list",
      options.page ?? 1,
      options.limit ?? 20,
      options.invoiceId ?? "all",
      options.status ?? "all",
      options.dueDateFrom ?? "",
      options.dueDateTo ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listInvoiceInstallments({
          page: options.page ?? 1,
          limit: options.limit ?? 20,
          invoiceId: options.invoiceId,
          status: options.status,
          dueDateFrom: options.dueDateFrom,
          dueDateTo: options.dueDateTo,
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
