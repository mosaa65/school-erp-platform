"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type TimetableDay } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeTasksQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  academicYearId?: string;
  dayOfWeek?: TimetableDay;
  isActive?: boolean;
};

export function useEmployeeTasksQuery(options: UseEmployeeTasksQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-tasks",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "all",
      options.academicYearId ?? "all",
      options.dayOfWeek ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeeTasks({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          academicYearId: options.academicYearId,
          dayOfWeek: options.dayOfWeek,
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


