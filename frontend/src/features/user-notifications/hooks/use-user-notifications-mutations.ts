"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccessTokenFromStorage } from "@/lib/auth/session";
import { appConfig } from "@/lib/env";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import type { UserNotificationPreferences } from "@/features/user-notifications/hooks/use-user-notifications-query";

type UpdateUserNotificationPreferencesPayload = Partial<
  Pick<
    UserNotificationPreferences,
    | "inAppEnabled"
    | "actionRequiredOnly"
    | "leaveNotificationsEnabled"
    | "contractNotificationsEnabled"
    | "documentNotificationsEnabled"
    | "lifecycleNotificationsEnabled"
  >
>;

async function updateUserNotificationPreferences(
  payload: UpdateUserNotificationPreferencesPayload,
): Promise<UserNotificationPreferences> {
  const accessToken = getAccessTokenFromStorage();

  if (!accessToken) {
    throw new ApiError("جلسة الدخول غير متاحة. يرجى تسجيل الدخول مرة أخرى.", 401);
  }

  const response = await fetch(`${appConfig.apiProxyPrefix}/backend/user-notifications/preferences`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
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
        : `تعذّر تحديث تفضيلات الإشعارات (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return responseBody as UserNotificationPreferences;
}

function useInvalidateUserNotifications() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["user-notifications"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["auth-approvals"],
    });
  };
}

function useHandleAuthFailure() {
  const auth = useAuth();

  return (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      auth.signOut();
    }
  };
}

export function useMarkUserNotificationReadMutation() {
  const invalidate = useInvalidateUserNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.markUserNotificationRead(notificationId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useMarkAllUserNotificationsReadMutation() {
  const invalidate = useInvalidateUserNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: () => apiClient.markAllUserNotificationsRead(),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteUserNotificationMutation() {
  const invalidate = useInvalidateUserNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.deleteUserNotification(notificationId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateUserNotificationPreferencesMutation() {
  const invalidate = useInvalidateUserNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: UpdateUserNotificationPreferencesPayload) =>
      updateUserNotificationPreferences(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useApproveAuthApprovalMutation() {
  const invalidate = useInvalidateUserNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (requestId: string) => apiClient.approveAuthApproval(requestId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useRejectAuthApprovalMutation() {
  const invalidate = useInvalidateUserNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (requestId: string) => apiClient.rejectAuthApproval(requestId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useReissueAuthApprovalMutation() {
  const invalidate = useInvalidateUserNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (requestId: string) => apiClient.reissueAuthApproval(requestId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
