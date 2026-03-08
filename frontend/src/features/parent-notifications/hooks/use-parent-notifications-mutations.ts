"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateParentNotificationPayload,
  type UpdateParentNotificationPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateParentNotifications() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["parent-notifications", "list"],
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

export function useCreateParentNotificationMutation() {
  const invalidate = useInvalidateParentNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateParentNotificationPayload) =>
      apiClient.createParentNotification(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateParentNotificationMutation() {
  const invalidate = useInvalidateParentNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      notificationId: string;
      payload: UpdateParentNotificationPayload;
    }) => apiClient.updateParentNotification(params.notificationId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteParentNotificationMutation() {
  const invalidate = useInvalidateParentNotifications();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.deleteParentNotification(notificationId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
