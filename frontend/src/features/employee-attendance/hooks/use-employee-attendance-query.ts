"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type EmployeeAttendanceStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeAttendanceQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  status?: EmployeeAttendanceStatus;
  fromDate?: string;
  toDate?: string;
  isActive?: boolean;
};

export function useEmployeeAttendanceQuery(
  options: UseEmployeeAttendanceQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-attendance",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "all",
      options.status ?? "all",
      options.fromDate ?? "none",
      options.toDate ?? "none",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeeAttendance({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          status: options.status,
          fromDate: options.fromDate,
          toDate: options.toDate,
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


