"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError, apiClient, type AuditStatus } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseAuditLogsQueryOptions = {
  page?: number;
  limit?: number;
  resource?: string;
  action?: string;
  actionType?: string;
  domain?: string;
  status?: AuditStatus;
  actorUserId?: string;
  user?: string;
  search?: string;
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
      options.actionType ?? "",
      options.domain ?? "",
      options.status ?? "all",
      options.actorUserId ?? "",
      options.user ?? "",
      options.search ?? "",
      options.from ?? "",
      options.to ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: async () => {
      try {
        return await apiClient.listAuditLogs({
          page: options.page ?? 1,
          limit: options.limit ?? 15,
          resource: options.resource,
          action: options.action,
          actionType: options.actionType,
          domain: options.domain,
          status: options.status,
          actorUserId: options.actorUserId,
          user: options.user,
          search: options.search,
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

export function useAuditLogDetailsQuery(auditLogId: string | null) {
  const auth = useAuth();

  return useQuery({
    queryKey: ["audit-logs", "details", auditLogId ?? ""],
    enabled: auth.isHydrated && auth.isAuthenticated && Boolean(auditLogId),
    queryFn: async () => {
      if (!auditLogId) {
        return null;
      }

      try {
        return await apiClient.getAuditLogById(auditLogId);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}

export function useAuditLogTimelineQuery(
  auditLogId: string | null,
  options?: {
    limit?: number;
    enabled?: boolean;
  },
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "audit-logs",
      "timeline",
      auditLogId ?? "",
      options?.limit ?? 10,
    ],
    enabled:
      auth.isHydrated &&
      auth.isAuthenticated &&
      Boolean(auditLogId) &&
      (options?.enabled ?? true),
    queryFn: async () => {
      if (!auditLogId) {
        return null;
      }

      try {
        return await apiClient.getAuditLogTimeline(auditLogId, options?.limit ?? 10);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}

export function useAuditLogRetentionPolicyQuery(options?: { enabled?: boolean }) {
  const auth = useAuth();

  return useQuery({
    queryKey: ["audit-logs", "retention-policy"],
    enabled:
      auth.isHydrated &&
      auth.isAuthenticated &&
      (options?.enabled ?? true),
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return await apiClient.getAuditLogRetentionPolicy();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}


