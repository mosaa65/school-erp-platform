"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeTeachingAssignmentPayload,
  type UpdateEmployeeTeachingAssignmentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeTeachingAssignments() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-teaching-assignments", "list"],
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

export function useCreateEmployeeTeachingAssignmentMutation() {
  const invalidate = useInvalidateEmployeeTeachingAssignments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeTeachingAssignmentPayload) =>
      apiClient.createEmployeeTeachingAssignment(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeTeachingAssignmentMutation() {
  const invalidate = useInvalidateEmployeeTeachingAssignments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      assignmentId: string;
      payload: UpdateEmployeeTeachingAssignmentPayload;
    }) =>
      apiClient.updateEmployeeTeachingAssignment(params.assignmentId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeTeachingAssignmentMutation() {
  const invalidate = useInvalidateEmployeeTeachingAssignments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiClient.deleteEmployeeTeachingAssignment(assignmentId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


