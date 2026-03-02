"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function useRoleOptionsQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["roles", "options"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const response = await apiClient.listRoles({
          page: 1,
          limit: 100,
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

export function useEmployeeOptionsQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["employees", "options"],
    enabled: auth.isHydrated && auth.isAuthenticated,
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


