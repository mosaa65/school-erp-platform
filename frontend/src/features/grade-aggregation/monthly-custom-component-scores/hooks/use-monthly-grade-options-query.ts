"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type Params = {
  academicMonthId?: string;
  sectionId?: string;
  subjectId?: string;
  isLocked?: boolean;
  isActive?: boolean;
};

export function useMonthlyGradeOptionsQuery(params: Params = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "monthly-grades",
      "options",
      "monthly-custom-component-scores",
      params.academicMonthId ?? "all",
      params.sectionId ?? "all",
      params.subjectId ?? "all",
      params.isLocked === undefined ? "all" : params.isLocked ? "locked" : "unlocked",
      params.isActive === undefined ? "all" : params.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listMonthlyGrades({
          page: 1,
          limit: 100,
          academicMonthId: params.academicMonthId,
          sectionId: params.sectionId,
          subjectId: params.subjectId,
          isLocked: params.isLocked,
          isActive: params.isActive,
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


