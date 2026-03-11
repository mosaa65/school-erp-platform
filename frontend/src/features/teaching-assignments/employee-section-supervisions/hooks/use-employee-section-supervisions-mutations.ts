"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeSectionSupervisionPayload,
  type UpdateEmployeeSectionSupervisionPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeSectionSupervisions() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-section-supervisions", "list"],
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

export function useCreateEmployeeSectionSupervisionMutation() {
  const invalidate = useInvalidateEmployeeSectionSupervisions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeSectionSupervisionPayload) =>
      apiClient.createEmployeeSectionSupervision(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeSectionSupervisionMutation() {
  const invalidate = useInvalidateEmployeeSectionSupervisions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      supervisionId: string;
      payload: UpdateEmployeeSectionSupervisionPayload;
    }) => apiClient.updateEmployeeSectionSupervision(params.supervisionId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeSectionSupervisionMutation() {
  const invalidate = useInvalidateEmployeeSectionSupervisions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (supervisionId: string) =>
      apiClient.deleteEmployeeSectionSupervision(supervisionId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

