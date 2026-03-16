"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type GradeStage } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGradeLevelsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  stage?: GradeStage;
  isActive?: boolean;
};

export function useGradeLevelsQuery(options: UseGradeLevelsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "grade-levels",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.stage ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listGradeLevels({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          stage: options.stage,
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


