"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateUserPermissionPayload,
  type RevokeUserPermissionPayload,
  type UpdateUserPermissionPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateUserPermissions() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["user-permissions", "list"],
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

export function useCreateUserPermissionMutation() {
  const invalidate = useInvalidateUserPermissions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateUserPermissionPayload) =>
      apiClient.createUserPermission(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateUserPermissionMutation() {
  const invalidate = useInvalidateUserPermissions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { userPermissionId: number; payload: UpdateUserPermissionPayload }) =>
      apiClient.updateUserPermission(params.userPermissionId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useRevokeUserPermissionMutation() {
  const invalidate = useInvalidateUserPermissions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { userPermissionId: number; payload: RevokeUserPermissionPayload }) =>
      apiClient.revokeUserPermission(params.userPermissionId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteUserPermissionMutation() {
  const invalidate = useInvalidateUserPermissions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (userPermissionId: number) =>
      apiClient.deleteUserPermission(userPermissionId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
