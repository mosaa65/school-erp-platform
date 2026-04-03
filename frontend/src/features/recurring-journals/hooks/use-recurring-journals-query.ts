"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type RecurringFrequency,
  type RecurringJournalListItem,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

export type { RecurringFrequency, RecurringJournalListItem };

export type RecurringJournalStatus = "ACTIVE" | "PAUSED";

type RecurringJournalsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: RecurringJournalStatus;
  frequency?: RecurringFrequency;
};

export function useRecurringJournalsQuery(options: RecurringJournalsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "recurring-journals",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.status ?? "all",
      options.frequency ?? "all",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        const isActive =
          options.status === undefined
            ? undefined
            : options.status === "ACTIVE";

        return await apiClient.listRecurringJournals({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          frequency: options.frequency,
          isActive,
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
