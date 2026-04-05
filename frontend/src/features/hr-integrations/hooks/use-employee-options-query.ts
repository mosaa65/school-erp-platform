"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeOptionsQueryOptions = {
  enabled?: boolean;
};

export function useEmployeeOptionsQuery(
  options: UseEmployeeOptionsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: ["employees", "options", "hr-integrations"],
    enabled:
      (options.enabled ?? true) && auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listEmployees({
          page: 1,
          limit: 100,
          isActive: true,
        });

        return response.data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
          throw error;
        }

        if (error instanceof ApiError && error.status === 403) {
          return [];
        }

        throw error;
      }
    },
  });
}
