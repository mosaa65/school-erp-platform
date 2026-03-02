"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateSystemSettingPayload,
  type UpdateSystemSettingPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateSystemSettings() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["system-settings", "list"],
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

export function useCreateSystemSettingMutation() {
  const invalidate = useInvalidateSystemSettings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateSystemSettingPayload) =>
      apiClient.createSystemSetting(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateSystemSettingMutation() {
  const invalidate = useInvalidateSystemSettings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { settingId: number; payload: UpdateSystemSettingPayload }) =>
      apiClient.updateSystemSetting(params.settingId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteSystemSettingMutation() {
  const invalidate = useInvalidateSystemSettings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (settingId: number) => apiClient.deleteSystemSetting(settingId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
