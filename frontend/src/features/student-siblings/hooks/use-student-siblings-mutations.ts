"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentSiblingPayload,
  type UpdateStudentSiblingPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentSiblings() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-siblings", "list"],
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

export function useCreateStudentSiblingMutation() {
  const invalidate = useInvalidateStudentSiblings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentSiblingPayload) =>
      apiClient.createStudentSibling(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentSiblingMutation() {
  const invalidate = useInvalidateStudentSiblings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { siblingId: string; payload: UpdateStudentSiblingPayload }) =>
      apiClient.updateStudentSibling(params.siblingId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentSiblingMutation() {
  const invalidate = useInvalidateStudentSiblings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (siblingId: string) => apiClient.deleteStudentSibling(siblingId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
