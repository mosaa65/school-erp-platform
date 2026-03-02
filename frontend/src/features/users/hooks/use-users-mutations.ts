"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateUserPayload,
  type UpdateUserPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateUsersList() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["users", "list"],
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

export function useCreateUserMutation() {
  const invalidateUsersList = useInvalidateUsersList();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => apiClient.createUser(payload),
    onSuccess: () => {
      invalidateUsersList();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateUserMutation() {
  const invalidateUsersList = useInvalidateUsersList();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { userId: string; payload: UpdateUserPayload }) =>
      apiClient.updateUser(params.userId, params.payload),
    onSuccess: () => {
      invalidateUsersList();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteUserMutation() {
  const invalidateUsersList = useInvalidateUsersList();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (userId: string) => apiClient.deleteUser(userId),
    onSuccess: () => {
      invalidateUsersList();
    },
    onError: handleAuthFailure,
  });
}

export function useLinkUserEmployeeMutation() {
  const invalidateUsersList = useInvalidateUsersList();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { userId: string; employeeId: string }) =>
      apiClient.linkUserEmployee(params.userId, params.employeeId),
    onSuccess: () => {
      invalidateUsersList();
    },
    onError: handleAuthFailure,
  });
}

export function useUnlinkUserEmployeeMutation() {
  const invalidateUsersList = useInvalidateUsersList();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (userId: string) => apiClient.unlinkUserEmployee(userId),
    onSuccess: () => {
      invalidateUsersList();
    },
    onError: handleAuthFailure,
  });
}


