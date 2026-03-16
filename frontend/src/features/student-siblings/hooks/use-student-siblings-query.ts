"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type StudentSiblingRelationship } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentSiblingsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  siblingId?: string;
  relationship?: StudentSiblingRelationship;
  isActive?: boolean;
};

export function useStudentSiblingsQuery(options: UseStudentSiblingsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-siblings",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.studentId ?? "all",
      options.siblingId ?? "all",
      options.relationship ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudentSiblings({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          studentId: options.studentId,
          siblingId: options.siblingId,
          relationship: options.relationship,
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
