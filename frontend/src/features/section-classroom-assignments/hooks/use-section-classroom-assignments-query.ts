"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseSectionClassroomAssignmentsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  sectionId?: string;
  classroomId?: string;
  academicYearId?: string;
  isActive?: boolean;
  isPrimary?: boolean;
};

export function useSectionClassroomAssignmentsQuery(
  options: UseSectionClassroomAssignmentsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "section-classroom-assignments",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.sectionId ?? "all",
      options.classroomId ?? "all",
      options.academicYearId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
      options.isPrimary === undefined ? "all" : options.isPrimary ? "primary" : "secondary",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listSectionClassroomAssignments({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          sectionId: options.sectionId,
          classroomId: options.classroomId,
          academicYearId: options.academicYearId,
          isActive: options.isActive,
          isPrimary: options.isPrimary,
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
