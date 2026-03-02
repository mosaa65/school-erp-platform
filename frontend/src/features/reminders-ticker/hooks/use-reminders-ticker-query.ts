"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type ReminderTickerType } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseRemindersTickerQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  tickerType?: ReminderTickerType;
  isActive?: boolean;
};

export function useRemindersTickerQuery(options: UseRemindersTickerQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "reminders-ticker",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.tickerType ?? "all",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listRemindersTicker({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          tickerType: options.tickerType,
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
