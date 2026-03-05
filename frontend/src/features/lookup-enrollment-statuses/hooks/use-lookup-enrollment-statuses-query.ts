"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseLookupEnrollmentStatusesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  enabled?: boolean;
};

export function useLookupEnrollmentStatusesQuery(options: UseLookupEnrollmentStatusesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "lookup-enrollment-statuses",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated && (options.enabled ?? true),
    queryFn: async () => {
      try {
        return await apiClient.listLookupEnrollmentStatuses({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
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


