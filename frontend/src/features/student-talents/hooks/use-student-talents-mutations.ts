"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentTalentPayload,
  type UpdateStudentTalentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentTalents() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-talents", "list"],
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

export function useCreateStudentTalentMutation() {
  const invalidate = useInvalidateStudentTalents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentTalentPayload) =>
      apiClient.createStudentTalent(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentTalentMutation() {
  const invalidate = useInvalidateStudentTalents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { mappingId: string; payload: UpdateStudentTalentPayload }) =>
      apiClient.updateStudentTalent(params.mappingId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentTalentMutation() {
  const invalidate = useInvalidateStudentTalents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (mappingId: string) => apiClient.deleteStudentTalent(mappingId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
