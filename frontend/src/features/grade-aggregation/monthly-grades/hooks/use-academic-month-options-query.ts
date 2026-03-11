"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type Params = {
  academicYearId?: string;
  academicTermId?: string;
};

export function useAcademicMonthOptionsQuery(params: Params = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "academic-months",
      "options",
      "monthly-grades",
      params.academicYearId ?? "all",
      params.academicTermId ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listAcademicMonths({
          page: 1,
          limit: 100,
          academicYearId: params.academicYearId,
          academicTermId: params.academicTermId,
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


