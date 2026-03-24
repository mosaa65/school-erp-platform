"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseExamAssessmentsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  examPeriodId?: string;
  sectionId?: string;
  subjectId?: string;
  fromExamDate?: string;
  toExamDate?: string;
  isActive?: boolean;
};

export function useExamAssessmentsQuery(options: UseExamAssessmentsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "exam-assessments",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.examPeriodId ?? "all",
      options.sectionId ?? "all",
      options.subjectId ?? "all",
      options.fromExamDate ?? "",
      options.toExamDate ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listExamAssessments({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          examPeriodId: options.examPeriodId,
          sectionId: options.sectionId,
          subjectId: options.subjectId,
          fromExamDate: options.fromExamDate,
          toExamDate: options.toExamDate,
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


