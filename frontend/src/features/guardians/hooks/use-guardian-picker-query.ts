"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type GuardianListItem,
  type PaginatedResponse,
  type StudentGender,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { toGuardianPickerOption } from "@/features/guardians/lib/guardian-picker";

export type GuardianPickerStatusFilter = "all" | "active" | "inactive";

type UseGuardianPickerQueryOptions = {
  search: string;
  enabled?: boolean;
  pageSize?: number;
  statusFilter?: GuardianPickerStatusFilter;
  gender?: StudentGender | "all";
};

function createEmptyGuardiansResponse(
  page: number,
  limit: number,
): PaginatedResponse<GuardianListItem> {
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

export function useGuardianPickerQuery({
  search,
  enabled = true,
  pageSize = 50,
  statusFilter = "active",
  gender = "all",
}: UseGuardianPickerQueryOptions) {
  const auth = useAuth();
  const normalizedSearch = search.trim();
  const serverSearch = normalizedSearch.length >= 2 ? normalizedSearch : undefined;

  const query = useInfiniteQuery<PaginatedResponse<GuardianListItem>>({
    queryKey: [
      "guardians",
      "picker",
      serverSearch ?? "",
      pageSize,
      statusFilter,
      gender,
    ],
    enabled: enabled && auth.isHydrated && auth.isAuthenticated,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1;

      try {
        return await apiClient.listGuardians({
          page,
          limit: pageSize,
          search: serverSearch,
          gender: gender === "all" ? undefined : gender,
          isActive: statusFilter === "all" ? undefined : statusFilter === "active",
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
          throw error;
        }

        if (error instanceof ApiError && error.status === 403) {
          return createEmptyGuardiansResponse(page, pageSize);
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

  const guardians = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const options = React.useMemo(
    () => guardians.map(toGuardianPickerOption),
    [guardians],
  );

  const totalAvailable = query.data?.pages[0]?.pagination.total ?? 0;

  return {
    ...query,
    guardians,
    options,
    totalAvailable,
  };
}
