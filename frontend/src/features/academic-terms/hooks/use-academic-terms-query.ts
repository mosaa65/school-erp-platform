"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type AcademicTermType,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseAcademicTermsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  termType?: AcademicTermType;
  isActive?: boolean;
};

export function useAcademicTermsQuery(options: UseAcademicTermsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "academic-terms",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.termType ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listAcademicTerms({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          termType: options.termType,
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


