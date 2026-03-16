"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentProblemsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  problemType?: string;
  isResolved?: boolean;
  fromProblemDate?: string;
  toProblemDate?: string;
  isActive?: boolean;
};

export function useStudentProblemsQuery(options: UseStudentProblemsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-problems",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.studentId ?? "all",
      options.problemType ?? "all",
      options.isResolved === undefined ? "all" : options.isResolved ? "resolved" : "open",
      options.fromProblemDate ?? "",
      options.toProblemDate ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudentProblems({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          studentId: options.studentId,
          problemType: options.problemType,
          isResolved: options.isResolved,
          fromProblemDate: options.fromProblemDate,
          toProblemDate: options.toProblemDate,
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
