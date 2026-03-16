"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeSectionSupervisionsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  sectionId?: string;
  academicYearId?: string;
  canViewStudents?: boolean;
  canManageHomeworks?: boolean;
  canManageGrades?: boolean;
  isActive?: boolean;
};

export function useEmployeeSectionSupervisionsQuery(
  options: UseEmployeeSectionSupervisionsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-section-supervisions",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "",
      options.sectionId ?? "",
      options.academicYearId ?? "",
      options.canViewStudents === undefined
        ? "all"
        : options.canViewStudents
          ? "view-yes"
          : "view-no",
      options.canManageHomeworks === undefined
        ? "all"
        : options.canManageHomeworks
          ? "hw-yes"
          : "hw-no",
      options.canManageGrades === undefined
        ? "all"
        : options.canManageGrades
          ? "grades-yes"
          : "grades-no",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeeSectionSupervisions({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          sectionId: options.sectionId,
          academicYearId: options.academicYearId,
          canViewStudents: options.canViewStudents,
          canManageHomeworks: options.canManageHomeworks,
          canManageGrades: options.canManageGrades,
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

