"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentGuardianPayload,
  type UpdateStudentGuardianPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentGuardians() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-guardians", "list"],
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

export function useCreateStudentGuardianMutation() {
  const invalidate = useInvalidateStudentGuardians();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentGuardianPayload) =>
      apiClient.createStudentGuardian(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentGuardianMutation() {
  const invalidate = useInvalidateStudentGuardians();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { relationId: string; payload: UpdateStudentGuardianPayload }) =>
      apiClient.updateStudentGuardian(params.relationId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentGuardianMutation() {
  const invalidate = useInvalidateStudentGuardians();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (relationId: string) => apiClient.deleteStudentGuardian(relationId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}



