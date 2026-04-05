"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type EmployeeLifecycleChecklistStatus,
  type EmployeeLifecycleChecklistType,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeLifecycleChecklistsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  assignedToEmployeeId?: string;
  checklistType?: EmployeeLifecycleChecklistType;
  status?: EmployeeLifecycleChecklistStatus;
  isActive?: boolean;
};

export function useEmployeeLifecycleChecklistsQuery(
  options: UseEmployeeLifecycleChecklistsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-lifecycle-checklists",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "all",
      options.assignedToEmployeeId ?? "all",
      options.checklistType ?? "all",
      options.status ?? "all",
      options.isActive === undefined
        ? "all"
        : options.isActive
          ? "active"
          : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeeLifecycleChecklists({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          assignedToEmployeeId: options.assignedToEmployeeId,
          checklistType: options.checklistType,
          status: options.status,
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
