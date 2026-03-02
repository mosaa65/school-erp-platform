"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeTaskPayload,
  type UpdateEmployeeTaskPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeTasks() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-tasks", "list"],
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

export function useCreateEmployeeTaskMutation() {
  const invalidate = useInvalidateEmployeeTasks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeTaskPayload) =>
      apiClient.createEmployeeTask(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeTaskMutation() {
  const invalidate = useInvalidateEmployeeTasks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { taskId: string; payload: UpdateEmployeeTaskPayload }) =>
      apiClient.updateEmployeeTask(params.taskId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeTaskMutation() {
  const invalidate = useInvalidateEmployeeTasks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (taskId: string) => apiClient.deleteEmployeeTask(taskId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


