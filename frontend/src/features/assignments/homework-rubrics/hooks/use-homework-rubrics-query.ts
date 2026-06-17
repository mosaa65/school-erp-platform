"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type HomeworkRubricDifficulty,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseHomeworkRubricsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  homeworkTypeId?: string;
  subjectId?: string;
  gradeLevelId?: string;
  difficulty?: HomeworkRubricDifficulty;
  isSystem?: boolean;
  isActive?: boolean;
};

export function useHomeworkRubricsQuery(
  options: UseHomeworkRubricsQueryOptions = {},
) {
  const auth = useAuth();
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;

  return useQuery({
    queryKey: [
      "homework-rubrics",
      "list",
      page,
      limit,
      options.search ?? "",
      options.homeworkTypeId ?? "",
      options.subjectId ?? "",
      options.gradeLevelId ?? "",
      options.difficulty ?? "all",
      options.isSystem === undefined ? "all" : options.isSystem ? "system" : "custom",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listHomeworkRubrics({
          page,
          limit,
          search: options.search,
          homeworkTypeId: options.homeworkTypeId,
          subjectId: options.subjectId,
          gradeLevelId: options.gradeLevelId,
          difficulty: options.difficulty,
          isSystem: options.isSystem,
          isActive: options.isActive,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
          throw error;
        }

        if (error instanceof ApiError && error.status === 403) {
          return {
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          };
        }

        throw error;
      }
    },
  });
}
