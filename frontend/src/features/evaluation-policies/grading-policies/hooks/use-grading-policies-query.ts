"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type AssessmentType,
  type GradingWorkflowStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGradingPoliciesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  subjectId?: string;
  sectionId?: string;
  academicTermId?: string;
  teacherEmployeeId?: string;
  assessmentType?: AssessmentType;
  status?: GradingWorkflowStatus;
  isDefault?: boolean;
  isActive?: boolean;
};

export function useGradingPoliciesQuery(options: UseGradingPoliciesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "grading-policies",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.gradeLevelId ?? "all",
      options.subjectId ?? "all",
      options.sectionId ?? "all",
      options.academicTermId ?? "all",
      options.teacherEmployeeId ?? "all",
      options.assessmentType ?? "all",
      options.status ?? "all",
      options.isDefault === undefined ? "all" : options.isDefault ? "default" : "custom",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listGradingPolicies({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          gradeLevelId: options.gradeLevelId,
          subjectId: options.subjectId,
          sectionId: options.sectionId,
          academicTermId: options.academicTermId,
          teacherEmployeeId: options.teacherEmployeeId,
          assessmentType: options.assessmentType,
          status: options.status,
          isDefault: options.isDefault,
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


