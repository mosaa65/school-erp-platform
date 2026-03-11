"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentHomeworksQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  homeworkId?: string;
  studentEnrollmentId?: string;
  studentId?: string;
  academicYearId?: string;
  sectionId?: string;
  subjectId?: string;
  isCompleted?: boolean;
  fromSubmittedAt?: string;
  toSubmittedAt?: string;
  isActive?: boolean;
};

export function useStudentHomeworksQuery(options: UseStudentHomeworksQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-homeworks",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.homeworkId ?? "all",
      options.studentEnrollmentId ?? "all",
      options.studentId ?? "all",
      options.academicYearId ?? "all",
      options.sectionId ?? "all",
      options.subjectId ?? "all",
      options.isCompleted === undefined ? "all" : options.isCompleted ? "done" : "pending",
      options.fromSubmittedAt ?? "",
      options.toSubmittedAt ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudentHomeworks({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          homeworkId: options.homeworkId,
          studentEnrollmentId: options.studentEnrollmentId,
          studentId: options.studentId,
          academicYearId: options.academicYearId,
          sectionId: options.sectionId,
          subjectId: options.subjectId,
          isCompleted: options.isCompleted,
          fromSubmittedAt: options.fromSubmittedAt,
          toSubmittedAt: options.toSubmittedAt,
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



