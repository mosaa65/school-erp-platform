"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateHomeworkPayload,
  type UpdateHomeworkPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateHomeworks() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["homeworks", "list"],
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

export function useCreateHomeworkMutation() {
  const invalidate = useInvalidateHomeworks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateHomeworkPayload) => apiClient.createHomework(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateHomeworkMutation() {
  const invalidate = useInvalidateHomeworks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { homeworkId: string; payload: UpdateHomeworkPayload }) =>
      apiClient.updateHomework(params.homeworkId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function usePopulateHomeworkStudentsMutation() {
  const invalidate = useInvalidateHomeworks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (homeworkId: string) => apiClient.populateHomeworkStudents(homeworkId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteHomeworkMutation() {
  const invalidate = useInvalidateHomeworks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (homeworkId: string) => apiClient.deleteHomework(homeworkId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}



