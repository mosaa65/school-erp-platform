"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeTalentsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  talentId?: string;
  isActive?: boolean;
};

export function useEmployeeTalentsQuery(options: UseEmployeeTalentsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-talents",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "all",
      options.talentId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeeTalents({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          talentId: options.talentId,
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


