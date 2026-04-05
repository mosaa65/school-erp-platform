"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, type PaginatedResponse } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

type CommunityContributionListItem = {
  id: number;
  payerName?: string | null;
  paymentDate?: string;
  receivedAmount?: number;
  isExempt?: boolean;
  receiptNumber?: string | null;
  notes?: string | null;
  enrollmentId?: string;
  academicYearId?: string;
  semesterId?: string;
  monthId?: string;
  requiredAmount?: {
    id: number;
    nameAr?: string;
    amountValue?: number;
  } | null;
  recipientEmployeeId?: string | null;
};

type UseCommunityContributionsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  enrollmentId?: string;
  academicYearId?: string;
  semesterId?: string;
  monthId?: string;
  requiredAmountId?: number;
  isExempt?: boolean;
  recipientEmployeeId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useCommunityContributionsQuery(
  options: UseCommunityContributionsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "community-contributions",
      "list",
      options.page ?? 1,
      options.limit ?? 15,
      options.search ?? "",
      options.enrollmentId ?? "",
      options.academicYearId ?? "",
      options.semesterId ?? "",
      options.monthId ?? "",
      options.requiredAmountId ?? 0,
      options.isExempt ?? "any",
      options.recipientEmployeeId ?? "",
      options.dateFrom ?? "",
      options.dateTo ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await financeRequest<PaginatedResponse<CommunityContributionListItem>>(
          "/finance/community-contributions",
          {
            params: {
              page: options.page ?? 1,
              limit: options.limit ?? 15,
              search: options.search,
              enrollmentId: options.enrollmentId,
              academicYearId: options.academicYearId,
              semesterId: options.semesterId,
              monthId: options.monthId,
              requiredAmountId: options.requiredAmountId,
              isExempt: options.isExempt,
              recipientEmployeeId: options.recipientEmployeeId,
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
