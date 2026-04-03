"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type InvoiceStatus } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentInvoicesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  enrollmentId?: string;
  academicYearId?: string;
  branchId?: number;
  currencyId?: number;
  status?: InvoiceStatus;
};

export function useStudentInvoicesQuery(options: UseStudentInvoicesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-invoices",
      "list",
      options.page ?? 1,
      options.limit ?? 20,
      options.search ?? "",
      options.enrollmentId ?? "all",
      options.academicYearId ?? "all",
      options.branchId ?? "all",
      options.currencyId ?? "all",
      options.status ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudentInvoices({
          page: options.page ?? 1,
          limit: options.limit ?? 20,
          search: options.search,
          enrollmentId: options.enrollmentId,
          academicYearId: options.academicYearId,
          branchId: options.branchId,
          currencyId: options.currencyId,
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
