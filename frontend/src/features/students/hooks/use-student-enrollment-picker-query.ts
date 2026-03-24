"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type PaginatedResponse,
  type StudentEnrollmentDistributionStatus,
  type StudentEnrollmentListItem,
  type StudentEnrollmentStatus,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { toStudentEnrollmentPickerOption } from "@/features/students/lib/student-enrollment-picker";

export type StudentEnrollmentPickerActiveFilter = "all" | "active" | "inactive";

type UseStudentEnrollmentPickerQueryOptions = {
  search: string;
  enabled?: boolean;
  pageSize?: number;
  activeFilter?: StudentEnrollmentPickerActiveFilter;
  status?: StudentEnrollmentStatus | "all";
  distributionStatus?: StudentEnrollmentDistributionStatus | "all";
  studentId?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  sectionId?: string;
};

function createEmptyStudentEnrollmentsResponse(
  page: number,
  limit: number,
): PaginatedResponse<StudentEnrollmentListItem> {
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

export function useStudentEnrollmentPickerQuery({
  search,
  enabled = true,
  pageSize = 50,
  activeFilter = "active",
  status = "all",
  distributionStatus = "all",
  studentId,
  academicYearId,
  gradeLevelId,
  sectionId,
}: UseStudentEnrollmentPickerQueryOptions) {
  const auth = useAuth();
  const normalizedSearch = search.trim();
  const serverSearch = normalizedSearch.length >= 2 ? normalizedSearch : undefined;

  const query = useInfiniteQuery<PaginatedResponse<StudentEnrollmentListItem>>({
    queryKey: [
      "student-enrollments",
      "picker",
      serverSearch ?? "",
      pageSize,
      activeFilter,
      status,
      distributionStatus,
      studentId ?? "all",
      academicYearId ?? "all",
      gradeLevelId ?? "all",
      sectionId ?? "all",
    ],
    enabled: enabled && auth.isHydrated && auth.isAuthenticated,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1;

      try {
        return await apiClient.listStudentEnrollments({
          page,
          limit: pageSize,
          search: serverSearch,
          studentId,
          academicYearId,
          gradeLevelId,
          sectionId,
          status: status === "all" ? undefined : status,
          distributionStatus:
            distributionStatus === "all" ? undefined : distributionStatus,
          isActive:
            activeFilter === "all" ? undefined : activeFilter === "active",
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
          throw error;
        }

        if (error instanceof ApiError && error.status === 403) {
          return createEmptyStudentEnrollmentsResponse(page, pageSize);
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

  const enrollments = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const options = React.useMemo(
    () => enrollments.map(toStudentEnrollmentPickerOption),
    [enrollments],
  );

  const totalAvailable = query.data?.pages[0]?.pagination.total ?? 0;

  return {
    ...query,
    enrollments,
    options,
    totalAvailable,
  };
}
