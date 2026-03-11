"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type AssessmentType,
  type GradingWorkflowStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseExamPeriodsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  academicTermId?: string;
  assessmentType?: AssessmentType;
  status?: GradingWorkflowStatus;
  isLocked?: boolean;
  isActive?: boolean;
};

export function useExamPeriodsQuery(options: UseExamPeriodsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "exam-periods",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.academicTermId ?? "all",
      options.assessmentType ?? "all",
      options.status ?? "all",
      options.isLocked === undefined ? "all" : options.isLocked ? "locked" : "unlocked",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listExamPeriods({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          academicTermId: options.academicTermId,
          assessmentType: options.assessmentType,
          status: options.status,
          isLocked: options.isLocked,
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


