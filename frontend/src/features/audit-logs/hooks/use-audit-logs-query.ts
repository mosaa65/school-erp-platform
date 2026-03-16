"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type AuditStatus } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseAuditLogsQueryOptions = {
  page?: number;
  limit?: number;
  resource?: string;
  action?: string;
  status?: AuditStatus;
  actorUserId?: string;
  from?: string;
  to?: string;
};

export function useAuditLogsQuery(options: UseAuditLogsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "audit-logs",
      "list",
      options.page ?? 1,
      options.limit ?? 15,
      options.resource ?? "",
      options.action ?? "",
      options.status ?? "all",
      options.actorUserId ?? "",
      options.from ?? "",
      options.to ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listAuditLogs({
          page: options.page ?? 1,
          limit: options.limit ?? 15,
          resource: options.resource,
          action: options.action,
          status: options.status,
          actorUserId: options.actorUserId,
          from: options.from,
          to: options.to,
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


