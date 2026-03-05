"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  genderId?: number;
  bloodTypeId?: number;
  orphanStatusId?: number;
  isActive?: boolean;
};

export function useStudentsQuery(options: UseStudentsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "students",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.genderId ?? "all",
      options.bloodTypeId ?? "all",
      options.orphanStatusId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudents({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          genderId: options.genderId,
          bloodTypeId: options.bloodTypeId,
          orphanStatusId: options.orphanStatusId,
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


