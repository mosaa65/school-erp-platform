"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateHomeworkTemplatePayload,
  type UpdateHomeworkTemplatePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateHomeworkTemplates() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["homework-templates"],
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

export function useCreateHomeworkTemplateMutation() {
  const invalidate = useInvalidateHomeworkTemplates();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateHomeworkTemplatePayload) =>
      apiClient.createHomeworkTemplate(payload),
    onSuccess: invalidate,
    onError: handleAuthFailure,
  });
}

export function useUpdateHomeworkTemplateMutation() {
  const invalidate = useInvalidateHomeworkTemplates();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      homeworkTemplateId: string;
      payload: UpdateHomeworkTemplatePayload;
    }) =>
      apiClient.updateHomeworkTemplate(
        params.homeworkTemplateId,
        params.payload,
      ),
    onSuccess: invalidate,
    onError: handleAuthFailure,
  });
}

export function useDeleteHomeworkTemplateMutation() {
  const invalidate = useInvalidateHomeworkTemplates();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (homeworkTemplateId: string) =>
      apiClient.deleteHomeworkTemplate(homeworkTemplateId),
    onSuccess: invalidate,
    onError: handleAuthFailure,
  });
}
