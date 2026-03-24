"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateSectionClassroomAssignmentPayload,
  type UpdateSectionClassroomAssignmentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateAssignments() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["section-classroom-assignments", "list"],
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

export function useCreateSectionClassroomAssignmentMutation() {
  const invalidate = useInvalidateAssignments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateSectionClassroomAssignmentPayload) =>
      apiClient.createSectionClassroomAssignment(payload),
    onSuccess: () => invalidate(),
    onError: handleAuthFailure,
  });
}

export function useUpdateSectionClassroomAssignmentMutation() {
  const invalidate = useInvalidateAssignments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      assignmentId: string;
      payload: UpdateSectionClassroomAssignmentPayload;
    }) => apiClient.updateSectionClassroomAssignment(params.assignmentId, params.payload),
    onSuccess: () => invalidate(),
    onError: handleAuthFailure,
  });
}

export function useDeleteSectionClassroomAssignmentMutation() {
  const invalidate = useInvalidateAssignments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiClient.deleteSectionClassroomAssignment(assignmentId),
    onSuccess: () => invalidate(),
    onError: handleAuthFailure,
  });
}
