"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import type { GradingComponentCalculationMode } from "@/lib/api/client";

type UseGradingPolicyComponentsQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  gradingPolicyId?: string;
  calculationMode?: GradingComponentCalculationMode;
  includeInMonthly?: boolean;
  includeInSemester?: boolean;
  isActive?: boolean;
};

export function useGradingPolicyComponentsQuery(
  params: UseGradingPolicyComponentsQueryParams,
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "grading-policy-components",
      params.page ?? 1,
      params.limit ?? 20,
      params.search ?? "",
      params.gradingPolicyId ?? "",
      params.calculationMode ?? "",
      params.includeInMonthly ?? "",
      params.includeInSemester ?? "",
      params.isActive ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listGradingPolicyComponents({
          page: params.page,
          limit: params.limit,
          search: params.search,
          gradingPolicyId: params.gradingPolicyId,
          calculationMode: params.calculationMode,
          includeInMonthly: params.includeInMonthly,
          includeInSemester: params.includeInSemester,
          isActive: params.isActive,
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
