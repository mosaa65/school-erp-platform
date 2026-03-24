"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseHomeworksQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicYearId?: string;
  academicTermId?: string;
  sectionId?: string;
  subjectId?: string;
  homeworkTypeId?: string;
  fromHomeworkDate?: string;
  toHomeworkDate?: string;
  fromDueDate?: string;
  toDueDate?: string;
  isActive?: boolean;
};

export function useHomeworksQuery(options: UseHomeworksQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "homeworks",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicYearId ?? "all",
      options.academicTermId ?? "all",
      options.sectionId ?? "all",
      options.subjectId ?? "all",
      options.homeworkTypeId ?? "all",
      options.fromHomeworkDate ?? "",
      options.toHomeworkDate ?? "",
      options.fromDueDate ?? "",
      options.toDueDate ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listHomeworks({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicYearId: options.academicYearId,
          academicTermId: options.academicTermId,
          sectionId: options.sectionId,
          subjectId: options.subjectId,
          homeworkTypeId: options.homeworkTypeId,
          fromHomeworkDate: options.fromHomeworkDate,
          toHomeworkDate: options.toHomeworkDate,
          fromDueDate: options.fromDueDate,
          toDueDate: options.toDueDate,
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



