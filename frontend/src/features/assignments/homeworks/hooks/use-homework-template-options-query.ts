"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useHomeworkTemplateOptionsQuery(options?: {
  homeworkTypeId?: string;
  subjectId?: string;
  gradeLevelId?: string;
}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "homework-templates",
      "options",
      options?.homeworkTypeId ?? "all",
      options?.subjectId ?? "all",
      options?.gradeLevelId ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listHomeworkTemplates({
          page: 1,
          limit: 100,
          isActive: true,
          homeworkTypeId: options?.homeworkTypeId,
          subjectId: options?.subjectId,
          gradeLevelId: options?.gradeLevelId,
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
