"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type TieBreakStrategy,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGradingOutcomeRulesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  tieBreakStrategy?: TieBreakStrategy;
  isActive?: boolean;
};

export function useGradingOutcomeRulesQuery(
  options: UseGradingOutcomeRulesQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "grading-outcome-rules",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.gradeLevelId ?? "all",
      options.tieBreakStrategy ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listGradingOutcomeRules({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          gradeLevelId: options.gradeLevelId,
          tieBreakStrategy: options.tieBreakStrategy,
          isActive: options.isActive,
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


