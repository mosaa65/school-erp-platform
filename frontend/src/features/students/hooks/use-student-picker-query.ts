"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type PaginatedResponse,
  type StudentGender,
  type StudentHealthStatus,
  type StudentListItem,
  type StudentOrphanStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { toStudentPickerOption } from "@/features/students/lib/student-picker";

export type StudentPickerStatusFilter = "all" | "active" | "inactive";

type UseStudentPickerQueryOptions = {
  search: string;
  enabled?: boolean;
  pageSize?: number;
  statusFilter?: StudentPickerStatusFilter;
  gender?: StudentGender | "all";
  healthStatus?: StudentHealthStatus | "all";
  orphanStatus?: StudentOrphanStatus | "all";
};

function createEmptyStudentsResponse(
  page: number,
  limit: number,
): PaginatedResponse<StudentListItem> {
  return {
    data: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  };
}

export function useStudentPickerQuery({
  search,
  enabled = true,
  pageSize = 50,
  statusFilter = "active",
  gender = "all",
  healthStatus = "all",
  orphanStatus = "all",
}: UseStudentPickerQueryOptions) {
  const auth = useAuth();
  const normalizedSearch = search.trim();
  const serverSearch = normalizedSearch.length >= 2 ? normalizedSearch : undefined;

  const query = useInfiniteQuery<PaginatedResponse<StudentListItem>>({
    queryKey: [
      "students",
      "picker",
      serverSearch ?? "",
      pageSize,
      statusFilter,
      gender,
      healthStatus,
      orphanStatus,
    ],
    enabled: enabled && auth.isHydrated && auth.isAuthenticated,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1;

      try {
        return await apiClient.listStudents({
          page,
          limit: pageSize,
          search: serverSearch,
          gender: gender === "all" ? undefined : gender,
          healthStatus: healthStatus === "all" ? undefined : healthStatus,
          orphanStatus: orphanStatus === "all" ? undefined : orphanStatus,
          isActive:
            statusFilter === "all" ? undefined : statusFilter === "active",
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
          throw error;
        }

        if (error instanceof ApiError && error.status === 403) {
          return createEmptyStudentsResponse(page, pageSize);
        }

        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page >= lastPage.pagination.totalPages) {
        return undefined;
      }

      return lastPage.pagination.page + 1;
    },
  });

  const students = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const options = React.useMemo(
    () => students.map(toStudentPickerOption),
    [students],
  );

  const totalAvailable = query.data?.pages[0]?.pagination.total ?? 0;

  return {
    ...query,
    students,
    options,
    totalAvailable,
  };
}
