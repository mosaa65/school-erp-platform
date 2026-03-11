"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateHomeworkTypePayload,
  type UpdateHomeworkTypePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateHomeworkTypes() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["homework-types", "list"],
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

export function useCreateHomeworkTypeMutation() {
  const invalidate = useInvalidateHomeworkTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateHomeworkTypePayload) => apiClient.createHomeworkType(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateHomeworkTypeMutation() {
  const invalidate = useInvalidateHomeworkTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { homeworkTypeId: string; payload: UpdateHomeworkTypePayload }) =>
      apiClient.updateHomeworkType(params.homeworkTypeId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteHomeworkTypeMutation() {
  const invalidate = useInvalidateHomeworkTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (homeworkTypeId: string) => apiClient.deleteHomeworkType(homeworkTypeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}



