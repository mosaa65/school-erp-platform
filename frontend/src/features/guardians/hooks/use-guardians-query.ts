"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseGuardiansQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  genderId?: number;
  idTypeId?: number;
  localityId?: number;
  isActive?: boolean;
};

export function useGuardiansQuery(options: UseGuardiansQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "guardians",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.genderId ?? "all",
      options.idTypeId ?? "all",
      options.localityId ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listGuardians({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          genderId: options.genderId,
          idTypeId: options.idTypeId,
          localityId: options.localityId,
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


