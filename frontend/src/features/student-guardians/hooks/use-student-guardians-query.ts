"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentGuardiansQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  guardianId?: string;
  relationshipTypeId?: number;
  isPrimary?: boolean;
  isActive?: boolean;
};

export function useStudentGuardiansQuery(options: UseStudentGuardiansQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-guardians",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.studentId ?? "all",
      options.guardianId ?? "all",
      options.relationshipTypeId ?? "all",
      options.isPrimary === undefined ? "all" : options.isPrimary ? "primary" : "secondary",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudentGuardians({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          studentId: options.studentId,
          guardianId: options.guardianId,
          relationshipTypeId: options.relationshipTypeId,
          isPrimary: options.isPrimary,
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



