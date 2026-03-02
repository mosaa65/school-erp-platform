"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreatePermissionPayload,
  type UpdatePermissionPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidatePermissions() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["permissions", "list"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["permissions", "options"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["roles", "list"],
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

export function useCreatePermissionMutation() {
  const invalidate = useInvalidatePermissions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreatePermissionPayload) =>
      apiClient.createPermission(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdatePermissionMutation() {
  const invalidate = useInvalidatePermissions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { permissionId: string; payload: UpdatePermissionPayload }) =>
      apiClient.updatePermission(params.permissionId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeletePermissionMutation() {
  const invalidate = useInvalidatePermissions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (permissionId: string) => apiClient.deletePermission(permissionId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


