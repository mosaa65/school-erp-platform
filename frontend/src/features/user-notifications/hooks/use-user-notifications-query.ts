"use client";

import { useQuery } from "@tanstack/react-query";
import { getAccessTokenFromStorage } from "@/lib/auth/session";
import { appConfig } from "@/lib/env";
import {
  ApiError,
  apiClient,
  type AuthApprovalPurpose,
  type UserNotificationType,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseUserNotificationsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  notificationType?: UserNotificationType;
  isRead?: boolean;
};

type UseUserNotificationsUnreadCountQueryOptions = {
  enabled?: boolean;
};

type UsePendingAuthApprovalsOptions = {
  page?: number;
  limit?: number;
  purpose?: AuthApprovalPurpose;
  search?: string;
  enabled?: boolean;
};

export type UserNotificationPreferences = {
  userId: string;
  inAppEnabled: boolean;
  actionRequiredOnly: boolean;
  leaveNotificationsEnabled: boolean;
  contractNotificationsEnabled: boolean;
  documentNotificationsEnabled: boolean;
  lifecycleNotificationsEnabled: boolean;
  updatedAt: string | null;
};

async function getUserNotificationPreferences(): Promise<UserNotificationPreferences> {
  const accessToken = getAccessTokenFromStorage();

  if (!accessToken) {
    throw new ApiError("جلسة الدخول غير متاحة. يرجى تسجيل الدخول مرة أخرى.", 401);
  }

  const response = await fetch(`${appConfig.apiProxyPrefix}/backend/user-notifications/preferences`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "message" in responseBody &&
      typeof responseBody.message === "string"
        ? responseBody.message
        : `تعذّر تحميل تفضيلات الإشعارات (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return responseBody as UserNotificationPreferences;
}

export function useUserNotificationsQuery(
  options: UseUserNotificationsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "user-notifications",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.notificationType ?? "all",
      options.isRead === undefined ? "all" : options.isRead ? "read" : "unread",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listUserNotifications({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          notificationType: options.notificationType,
          isRead: options.isRead,
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

export function useUserNotificationsUnreadCountQuery(
  options: UseUserNotificationsUnreadCountQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: ["user-notifications", "unread-count"],
    enabled: (options.enabled ?? true) && auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.getUserNotificationsUnreadCount();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
    refetchInterval: 60_000,
  });
}

export function useUserNotificationPreferencesQuery(
  options: UseUserNotificationsUnreadCountQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: ["user-notifications", "preferences"],
    enabled: (options.enabled ?? true) && auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await getUserNotificationPreferences();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }

        throw error;
      }
    },
  });
}

export function usePendingAuthApprovalsQuery(
  options: UsePendingAuthApprovalsOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "auth-approvals",
      "pending",
      options.page ?? 1,
      options.limit ?? 50,
      options.purpose ?? "all",
      options.search ?? "",
    ],
    enabled:
      (options.enabled ?? true) && auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listPendingAuthApprovals({
          page: options.page ?? 1,
          limit: options.limit ?? 50,
          purpose: options.purpose,
          search: options.search,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
          throw error;
        }

        if (error instanceof ApiError && error.status === 403) {
          return {
            data: [],
            pagination: {
              page: 1,
              limit: options.limit ?? 50,
              total: 0,
              totalPages: 1,
            },
          };
        }

        throw error;
      }
    },
  });
}
