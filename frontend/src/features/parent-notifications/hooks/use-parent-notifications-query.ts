"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type ParentNotificationSendMethod,
  type ParentNotificationType,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

type UseParentNotificationsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  notificationType?: ParentNotificationType;
  guardianTitleId?: number;
  sendMethod?: ParentNotificationSendMethod;
  isSent?: boolean;
  fromSentDate?: string;
  toSentDate?: string;
  isActive?: boolean;
};

export function useParentNotificationsQuery(
  options: UseParentNotificationsQueryOptions = {},
) {
  const auth = useAuth();

  return useQuery({
    queryKey: [
      "parent-notifications",
      "list",
      options.page ?? 1,
      options.limit ?? 12,
      options.search ?? "",
      options.studentId ?? "all",
      options.notificationType ?? "all",
      options.guardianTitleId ?? "all",
      options.sendMethod ?? "all",
      options.isSent === undefined ? "all" : options.isSent ? "sent" : "not-sent",
      options.fromSentDate ?? "",
      options.toSentDate ?? "",
      options.isActive === undefined ? "all" : options.isActive ? "active" : "inactive",
    ],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => {
      try {
        return await apiClient.listParentNotifications({
          page: options.page ?? 1,
          limit: options.limit ?? 12,
          search: options.search,
          studentId: options.studentId,
          notificationType: options.notificationType,
          guardianTitleId: options.guardianTitleId,
          sendMethod: options.sendMethod,
          isSent: options.isSent,
          fromSentDate: options.fromSentDate,
          toSentDate: options.toSentDate,
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
