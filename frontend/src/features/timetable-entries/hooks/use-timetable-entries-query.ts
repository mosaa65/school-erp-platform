"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type TimetableDay,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseTimetableEntriesQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  academicTermId?: string;
  sectionId?: string;
  termSubjectOfferingId?: string;
  dayOfWeek?: TimetableDay;
  isActive?: boolean;
};

export function useTimetableEntriesQuery(options: UseTimetableEntriesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "timetable-entries",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.academicTermId ?? "all",
      options.sectionId ?? "all",
      options.termSubjectOfferingId ?? "all",
      options.dayOfWeek ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listTimetableEntries({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          academicTermId: options.academicTermId,
          sectionId: options.sectionId,
          termSubjectOfferingId: options.termSubjectOfferingId,
          dayOfWeek: options.dayOfWeek,
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


