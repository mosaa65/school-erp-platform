"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type EmployeeGender,
  type EmploymentType,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  gender?: EmployeeGender;
  employmentType?: EmploymentType;
  idTypeId?: number;
  jobTitle?: string;
  isActive?: boolean;
};

export function useEmployeesQuery(options: UseEmployeesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "employees",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.gender ?? "all",
      options.employmentType ?? "all",
      options.idTypeId ?? "all",
      options.jobTitle ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployees({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          gender: options.gender,
          employmentType: options.employmentType,
          idTypeId: options.idTypeId,
          jobTitle: options.jobTitle,
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


