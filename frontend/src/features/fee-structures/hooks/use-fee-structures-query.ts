"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type FeeType } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseFeeStructuresQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  feeType?: FeeType;
  currencyId?: number;
  isActive?: boolean;
};

export function useFeeStructuresQuery(options: UseFeeStructuresQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "fee-structures",
      "list",
      options.page ?? 1,
      options.limit ?? 20,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.gradeLevelId ?? "all",
      options.feeType ?? "all",
      options.currencyId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listFeeStructures({
          page: options.page ?? 1,
          limit: options.limit ?? 20,
          search: options.search,
          academicYearId: options.academicYearId,
          gradeLevelId: options.gradeLevelId,
          feeType: options.feeType,
          currencyId: options.currencyId,
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
