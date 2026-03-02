"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateRolePayload,
  type UpdateRolePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateRolesList() {
  const queryClient = useQueryClient();

  return () => {
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

export function useCreateRoleMutation() {
  const invalidateRolesList = useInvalidateRolesList();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateRolePayload) => apiClient.createRole(payload),
    onSuccess: () => {
      invalidateRolesList();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateRoleMutation() {
  const invalidateRolesList = useInvalidateRolesList();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { roleId: string; payload: UpdateRolePayload }) =>
      apiClient.updateRole(params.roleId, params.payload),
    onSuccess: () => {
      invalidateRolesList();
    },
    onError: handleAuthFailure,
  });
}

export function useAssignRolePermissionsMutation() {
  const invalidateRolesList = useInvalidateRolesList();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { roleId: string; permissionIds: string[] }) =>
      apiClient.assignRolePermissions(params.roleId, params.permissionIds),
    onSuccess: () => {
      invalidateRolesList();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteRoleMutation() {
  const invalidateRolesList = useInvalidateRolesList();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (roleId: string) => apiClient.deleteRole(roleId),
    onSuccess: () => {
      invalidateRolesList();
    },
    onError: handleAuthFailure,
  });
}


