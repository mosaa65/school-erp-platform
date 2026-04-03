"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, type PaginatedResponse } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

type AuditTrailListItem = {
  id: string | number;
  tableName?: string;
  recordId?: string | number | null;
  action?: string | null;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  changeSummary?: string | null;
  userIp?: string | null;
  userAgent?: string | null;
  createdAt?: string;
  user?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type UseAuditTrailQueryOptions = {
  page?: number;
  limit?: number;
  tableName?: string;
  recordId?: string;
  action?: string;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
};

export function useAuditTrailQuery(options: UseAuditTrailQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "audit-trail",
      "list",
      options.page ?? 1,
      options.limit ?? 15,
      options.tableName ?? "",
      options.recordId ?? "",
      options.action ?? "",
      options.userId ?? "",
      options.search ?? "",
      options.from ?? "",
      options.to ?? "",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await financeRequest<PaginatedResponse<AuditTrailListItem>>(
          "/finance/audit-trail",
          {
            params: {
              page: options.page ?? 1,
              limit: options.limit ?? 15,
              tableName: options.tableName,
              recordId: options.recordId,
              action: options.action,
              userId: options.userId,
              search: options.search,
              from: options.from,
              to: options.to,
            },
          },
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}
