"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type GradingWorkflowStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseAnnualGradesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  sectionId?: string;
  subjectId?: string;
  studentEnrollmentId?: string;
  studentId?: string;
  finalStatusId?: string;
  status?: GradingWorkflowStatus;
  isLocked?: boolean;
  isActive?: boolean;
};

export function useAnnualGradesQuery(options: UseAnnualGradesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "annual-grades",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.sectionId ?? "all",
      options.subjectId ?? "all",
      options.studentEnrollmentId ?? "all",
      options.studentId ?? "all",
      options.finalStatusId ?? "all",
      options.status ?? "all",
      options.isLocked === undefined ? "all" : options.isLocked ? "locked" : "unlocked",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listAnnualGrades({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          sectionId: options.sectionId,
          subjectId: options.subjectId,
          studentEnrollmentId: options.studentEnrollmentId,
          studentId: options.studentId,
          finalStatusId: options.finalStatusId,
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


