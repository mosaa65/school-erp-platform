"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type DiscountAppliesToFeeType,
  type DiscountType,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseDiscountRulesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  discountType?: DiscountType;
  appliesToFeeType?: DiscountAppliesToFeeType;
  academicYearId?: string;
  isActive?: boolean;
};

export function useDiscountRulesQuery(options: UseDiscountRulesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "discount-rules",
      "list",
      options.page ?? 1,
      options.limit ?? 20,
      options.search ?? "",
      options.discountType ?? "all",
      options.appliesToFeeType ?? "all",
      options.academicYearId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listDiscountRules({
          page: options.page ?? 1,
          limit: options.limit ?? 20,
          search: options.search,
          discountType: options.discountType,
          appliesToFeeType: options.appliesToFeeType,
          academicYearId: options.academicYearId,
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
