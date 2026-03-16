"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseTermSubjectOfferingsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  academicTermId?: string;
  gradeLevelSubjectId?: string;
  isActive?: boolean;
};

export function useTermSubjectOfferingsQuery(
  options: UseTermSubjectOfferingsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "term-subject-offerings",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.academicTermId ?? "all",
      options.gradeLevelSubjectId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listTermSubjectOfferings({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          academicTermId: options.academicTermId,
          gradeLevelSubjectId: options.gradeLevelSubjectId,
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


