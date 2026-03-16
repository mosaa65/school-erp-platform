"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type StudentBookStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentBooksQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  studentEnrollmentId?: string;
  studentId?: string;
  subjectId?: string;
  status?: StudentBookStatus;
  fromIssuedDate?: string;
  toIssuedDate?: string;
  isActive?: boolean;
};

export function useStudentBooksQuery(options: UseStudentBooksQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-books",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.studentEnrollmentId ?? "all",
      options.studentId ?? "all",
      options.subjectId ?? "all",
      options.status ?? "all",
      options.fromIssuedDate ?? "",
      options.toIssuedDate ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudentBooks({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          studentEnrollmentId: options.studentEnrollmentId,
          studentId: options.studentId,
          subjectId: options.subjectId,
          status: options.status,
          fromIssuedDate: options.fromIssuedDate,
          toIssuedDate: options.toIssuedDate,
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



