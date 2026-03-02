"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseAcademicTermOptionsQueryParams = {
  academicYearId?: string;
};

export function useAcademicTermOptionsQuery(params: UseAcademicTermOptionsQueryParams = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: ["academic-terms", "options", "term-subject-offerings", params.academicYearId ?? "all"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listAcademicTerms({
          page: 1,
          limit: 100,
          academicYearId: params.academicYearId,
          isActive: true,
        });

        return response.data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
          throw error;
        }

        if (error instanceof ApiError && error.status === 403) {
          return [];
        }

        throw error;
      }
    },
  });
}


