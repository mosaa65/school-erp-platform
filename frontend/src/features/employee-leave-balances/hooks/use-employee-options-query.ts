"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type EmployeeOption = {
  id: string;
  fullName: string;
  jobNumber: string | null;
};

export function useEmployeeOptionsQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: ["employees", "options", "employee-leave-balances"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async (): Promise<EmployeeOption[]> => {
      try {
        const response = await apiClient.listEmployees({
          page: 1,
          limit: 100,
          isActive: true,
        });

        return response.data.map((employee) => ({
          id: employee.id,
          fullName: employee.fullName,
          jobNumber: employee.jobNumber ?? null,
        }));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}
