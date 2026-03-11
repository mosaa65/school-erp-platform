"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGradingPolicyComponentOptionsQueryParams = {
  context?: {
    gradingPolicyId: string;
    academicYearId: string;
    gradeLevelId: string;
    subjectId: string;
  } | null;
};

export function useGradingPolicyComponentOptionsQuery(
  params: UseGradingPolicyComponentOptionsQueryParams,
) {
  const auth = useAuth();
  const context = params.context;

  return useQuery({
    queryKey: [
      "grading-policy-components",
      "options",
      "monthly-custom-component-scores",
      context?.gradingPolicyId ?? "none",
      context?.academicYearId ?? "none",
      context?.gradeLevelId ?? "none",
      context?.subjectId ?? "none",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated && Boolean(context),
    queryFn: async () => {
      if (!context) {
        return [];
      }

      try {
        const response = await apiClient.listGradingPolicies({
          page: 1,
          limit: 100,
          academicYearId: context.academicYearId,
          gradeLevelId: context.gradeLevelId,
          subjectId: context.subjectId,
          assessmentType: "MONTHLY",
          isActive: true,
        });

        const policy = response.data.find(
          (item) => item.id === context.gradingPolicyId,
        );

        if (!policy) {
          return [];
        }

        return policy.components.filter(
          (component) => component.isActive && component.includeInMonthly,
        );
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


