"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type StudentGender,
  type StudentOrphanStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  gender?: StudentGender;
  bloodTypeId?: number;
  orphanStatus?: StudentOrphanStatus;
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
      options.gender ?? "all",
      options.bloodTypeId ?? "all",
      options.orphanStatus ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudents({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          gender: options.gender,
          bloodTypeId: options.bloodTypeId,
          orphanStatus: options.orphanStatus,
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


