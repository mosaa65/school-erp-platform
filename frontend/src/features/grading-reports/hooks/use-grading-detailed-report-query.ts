"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type GradingWorkflowStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGradingDetailedReportQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  sectionId?: string;
  academicTermId?: string;
  promotionDecisionId?: string;
  status?: GradingWorkflowStatus;
  isLocked?: boolean;
  isActive?: boolean;
  fromDate?: string;
  toDate?: string;
};

export function useGradingDetailedReportQuery(
  options: UseGradingDetailedReportQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "grading-reports",
      "details",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.gradeLevelId ?? "all",
      options.sectionId ?? "all",
      options.academicTermId ?? "all",
      options.promotionDecisionId ?? "all",
      options.status ?? "all",
      options.isLocked === undefined ? "all" : options.isLocked ? "locked" : "unlocked",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
      options.fromDate ?? "all",
      options.toDate ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.getGradingDetailedReport({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          gradeLevelId: options.gradeLevelId,
          sectionId: options.sectionId,
          academicTermId: options.academicTermId,
          promotionDecisionId: options.promotionDecisionId,
          status: options.status,
          isLocked: options.isLocked,
          isActive: options.isActive,
          fromDate: options.fromDate,
          toDate: options.toDate,
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

