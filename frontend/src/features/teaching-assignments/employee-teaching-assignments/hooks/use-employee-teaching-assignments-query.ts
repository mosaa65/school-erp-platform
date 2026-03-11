"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeTeachingAssignmentsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  sectionId?: string;
  subjectId?: string;
  academicYearId?: string;
  isActive?: boolean;
};

export function useEmployeeTeachingAssignmentsQuery(
  options: UseEmployeeTeachingAssignmentsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-teaching-assignments",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "all",
      options.sectionId ?? "all",
      options.subjectId ?? "all",
      options.academicYearId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeeTeachingAssignments({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          sectionId: options.sectionId,
          subjectId: options.subjectId,
          academicYearId: options.academicYearId,
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


