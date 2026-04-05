"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeeDocumentsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  fileCategory?: string;
  fileType?: string;
};

export function useEmployeeDocumentsQuery(options: UseEmployeeDocumentsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employee-documents",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.employeeId ?? "all",
      options.fileCategory ?? "all",
      options.fileType ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployeeDocuments({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          employeeId: options.employeeId,
          fileCategory: options.fileCategory,
          fileType: options.fileType,
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
