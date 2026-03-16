"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type StudentAttendanceStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentAttendanceQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  studentEnrollmentId?: string;
  studentId?: string;
  status?: StudentAttendanceStatus;
  fromDate?: string;
  toDate?: string;
  isActive?: boolean;
};

export function useStudentAttendanceQuery(
  options: UseStudentAttendanceQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-attendance",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.studentEnrollmentId ?? "all",
      options.studentId ?? "all",
      options.status ?? "all",
      options.fromDate ?? "",
      options.toDate ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudentAttendance({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          studentEnrollmentId: options.studentEnrollmentId,
          studentId: options.studentId,
          status: options.status,
          fromDate: options.fromDate,
          toDate: options.toDate,
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



