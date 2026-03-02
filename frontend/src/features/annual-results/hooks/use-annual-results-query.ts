"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type GradingWorkflowStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseAnnualResultsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  sectionId?: string;
  studentEnrollmentId?: string;
  studentId?: string;
  promotionDecisionId?: string;
  status?: GradingWorkflowStatus;
  isLocked?: boolean;
  isActive?: boolean;
};

export function useAnnualResultsQuery(options: UseAnnualResultsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "annual-results",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.gradeLevelId ?? "all",
      options.sectionId ?? "all",
      options.studentEnrollmentId ?? "all",
      options.studentId ?? "all",
      options.promotionDecisionId ?? "all",
      options.status ?? "all",
      options.isLocked === undefined ? "all" : options.isLocked ? "locked" : "unlocked",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listAnnualResults({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          gradeLevelId: options.gradeLevelId,
          sectionId: options.sectionId,
          studentEnrollmentId: options.studentEnrollmentId,
          studentId: options.studentId,
          promotionDecisionId: options.promotionDecisionId,
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


