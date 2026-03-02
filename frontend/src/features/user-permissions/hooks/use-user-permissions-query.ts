"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseUserPermissionsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  permissionId?: string;
  isRevoked?: boolean;
  isCurrent?: boolean;
};

export function useUserPermissionsQuery(options: UseUserPermissionsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "user-permissions",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.userId ?? "",
      options.permissionId ?? "",
      options.isRevoked === undefined ? "all" : options.isRevoked ? "revoked" : "not-revoked",
      options.isCurrent === undefined ? "all" : options.isCurrent ? "current" : "not-current",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listUserPermissions({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          userId: options.userId,
          permissionId: options.permissionId,
          isRevoked: options.isRevoked,
          isCurrent: options.isCurrent,
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
