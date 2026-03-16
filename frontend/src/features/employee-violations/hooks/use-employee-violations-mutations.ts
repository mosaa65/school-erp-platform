"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeViolationPayload,
  type UpdateEmployeeViolationPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeViolations() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-violations", "list"],
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

export function useCreateEmployeeViolationMutation() {
  const invalidate = useInvalidateEmployeeViolations();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeViolationPayload) =>
      apiClient.createEmployeeViolation(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeViolationMutation() {
  const invalidate = useInvalidateEmployeeViolations();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      violationId: string;
      payload: UpdateEmployeeViolationPayload;
    }) => apiClient.updateEmployeeViolation(params.violationId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeViolationMutation() {
  const invalidate = useInvalidateEmployeeViolations();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (violationId: string) => apiClient.deleteEmployeeViolation(violationId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


