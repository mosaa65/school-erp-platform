"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseTermSubjectOfferingOptionsQueryParams = {
  academicTermId?: string;
};

export function useTermSubjectOfferingOptionsQuery(
  params: UseTermSubjectOfferingOptionsQueryParams = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "term-subject-offerings",
      "options",
      "timetable-entries",
      params.academicTermId ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listTermSubjectOfferings({
          page: 1,
          limit: 100,
          academicTermId: params.academicTermId,
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


