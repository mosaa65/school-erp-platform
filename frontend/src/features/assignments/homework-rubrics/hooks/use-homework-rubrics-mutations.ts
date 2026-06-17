"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateHomeworkRubricPayload,
  type UpdateHomeworkRubricPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateHomeworkRubrics() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["homework-rubrics"],
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

export function useCreateHomeworkRubricMutation() {
  const invalidate = useInvalidateHomeworkRubrics();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateHomeworkRubricPayload) =>
      apiClient.createHomeworkRubric(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateHomeworkRubricMutation() {
  const invalidate = useInvalidateHomeworkRubrics();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      homeworkRubricId: string;
      payload: UpdateHomeworkRubricPayload;
    }) => apiClient.updateHomeworkRubric(params.homeworkRubricId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteHomeworkRubricMutation() {
  const invalidate = useInvalidateHomeworkRubrics();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (homeworkRubricId: string) =>
      apiClient.deleteHomeworkRubric(homeworkRubricId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
