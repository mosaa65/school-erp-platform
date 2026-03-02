"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type ExamAbsenceType } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseStudentExamScoresQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  examAssessmentId?: string;
  examPeriodId?: string;
  studentEnrollmentId?: string;
  studentId?: string;
  isPresent?: boolean;
  absenceType?: ExamAbsenceType;
  isActive?: boolean;
};

export function useStudentExamScoresQuery(options: UseStudentExamScoresQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "student-exam-scores",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.examAssessmentId ?? "all",
      options.examPeriodId ?? "all",
      options.studentEnrollmentId ?? "all",
      options.studentId ?? "all",
      options.isPresent === undefined ? "all" : options.isPresent ? "present" : "absent",
      options.absenceType ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listStudentExamScores({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          examAssessmentId: options.examAssessmentId,
          examPeriodId: options.examPeriodId,
          studentEnrollmentId: options.studentEnrollmentId,
          studentId: options.studentId,
          isPresent: options.isPresent,
          absenceType: options.absenceType,
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


