"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateReminderTickerPayload,
  type UpdateReminderTickerPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateRemindersTicker() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["reminders-ticker", "list"],
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

export function useCreateReminderTickerMutation() {
  const invalidate = useInvalidateRemindersTicker();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateReminderTickerPayload) =>
      apiClient.createReminderTicker(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateReminderTickerMutation() {
  const invalidate = useInvalidateRemindersTicker();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { reminderTickerId: number; payload: UpdateReminderTickerPayload }) =>
      apiClient.updateReminderTicker(params.reminderTickerId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteReminderTickerMutation() {
  const invalidate = useInvalidateRemindersTicker();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (reminderTickerId: number) =>
      apiClient.deleteReminderTicker(reminderTickerId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
