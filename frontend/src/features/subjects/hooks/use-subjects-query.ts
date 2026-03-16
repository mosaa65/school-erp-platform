"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type SubjectCategory,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseSubjectsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  category?: SubjectCategory;
  isActive?: boolean;
};

export function useSubjectsQuery(options: UseSubjectsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "subjects",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.category ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listSubjects({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          category: options.category,
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


