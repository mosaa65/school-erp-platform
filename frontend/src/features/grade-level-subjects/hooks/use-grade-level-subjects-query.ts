"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGradeLevelSubjectsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  subjectId?: string;
  isMandatory?: boolean;
  isActive?: boolean;
};

export function useGradeLevelSubjectsQuery(
  options: UseGradeLevelSubjectsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "grade-level-subjects",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.gradeLevelId ?? "all",
      options.subjectId ?? "all",
      options.isMandatory === undefined
        ? "all"
        : options.isMandatory
          ? "mandatory"
          : "optional",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listGradeLevelSubjects({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          gradeLevelId: options.gradeLevelId,
          subjectId: options.subjectId,
          isMandatory: options.isMandatory,
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


