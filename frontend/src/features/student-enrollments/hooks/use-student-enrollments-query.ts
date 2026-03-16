"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type StudentEnrollmentStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentEnrollmentsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  academicYearId?: string;
  sectionId?: string;
  status?: StudentEnrollmentStatus;
  isActive?: boolean;
};

export function useStudentEnrollmentsQuery(
  options: UseStudentEnrollmentsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-enrollments",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.studentId ?? "all",
      options.academicYearId ?? "all",
      options.sectionId ?? "all",
      options.status ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudentEnrollments({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          studentId: options.studentId,
          academicYearId: options.academicYearId,
          sectionId: options.sectionId,
          status: options.status,
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



