"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGradeLevelSubjectMappingOptionsQueryParams = {
  academicYearId?: string;
  gradeLevelId?: string;
  subjectId?: string;
  enabled?: boolean;
};

export function useGradeLevelSubjectMappingOptionsQuery(
  params: UseGradeLevelSubjectMappingOptionsQueryParams = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "grade-level-subjects",
      "mapping-check",
      "employee-teaching-assignments",
      params.academicYearId ?? "all",
      params.gradeLevelId ?? "all",
      params.subjectId ?? "all",
    ],
    enabled:
      auth.isHydrated &&
      auth.isAuthenticated &&
      Boolean(params.academicYearId && params.gradeLevelId && params.subjectId) &&
      (params.enabled ?? true),
    queryFn: async () => {
      try {
        const response = await apiClient.listGradeLevelSubjects({
          page: 1,
          limit: 20,
          academicYearId: params.academicYearId,
          gradeLevelId: params.gradeLevelId,
          subjectId: params.subjectId,
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


