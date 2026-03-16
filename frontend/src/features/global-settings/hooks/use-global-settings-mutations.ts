"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateGlobalSettingPayload,
  type UpdateGlobalSettingPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateGlobalSettings() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["global-settings", "list"],
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

export function useCreateGlobalSettingMutation() {
  const invalidate = useInvalidateGlobalSettings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateGlobalSettingPayload) =>
      apiClient.createGlobalSetting(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateGlobalSettingMutation() {
  const invalidate = useInvalidateGlobalSettings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { settingId: string; payload: UpdateGlobalSettingPayload }) =>
      apiClient.updateGlobalSetting(params.settingId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteGlobalSettingMutation() {
  const invalidate = useInvalidateGlobalSettings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (settingId: string) => apiClient.deleteGlobalSetting(settingId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


