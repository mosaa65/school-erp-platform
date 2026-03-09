"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type EmploymentType,
  type OperationalReadinessFilter,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseEmployeesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  genderId?: number;
  employmentType?: EmploymentType;
  idTypeId?: number;
  localityId?: number;
  qualificationId?: number;
  jobRoleId?: number;
  isActive?: boolean;
  operationalReadiness?: OperationalReadinessFilter;
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
      options.genderId ?? "all",
      options.employmentType ?? "all",
      options.idTypeId ?? "all",
      options.localityId ?? "all",
      options.qualificationId ?? "all",
      options.jobRoleId ?? "all",
      options.isActive === undefined
        ? "all"
        : options.isActive
          ? "active"
          : "inactive",
      options.operationalReadiness ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listEmployees({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          genderId: options.genderId,
          employmentType: options.employmentType,
          idTypeId: options.idTypeId,
          localityId: options.localityId,
          qualificationId: options.qualificationId,
          jobRoleId: options.jobRoleId,
          isActive: options.isActive,
          operationalReadiness: options.operationalReadiness,
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
