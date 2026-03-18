"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentHomeworkPayload,
  type UpdateStudentHomeworkPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentHomeworks() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-homeworks", "list"],
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

export function useCreateStudentHomeworkMutation() {
  const invalidate = useInvalidateStudentHomeworks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentHomeworkPayload) =>
      apiClient.createStudentHomework(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentHomeworkMutation() {
  const invalidate = useInvalidateStudentHomeworks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      studentHomeworkId: string;
      payload: UpdateStudentHomeworkPayload;
    }) => apiClient.updateStudentHomework(params.studentHomeworkId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentHomeworkMutation() {
  const invalidate = useInvalidateStudentHomeworks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (studentHomeworkId: string) =>
      apiClient.deleteStudentHomework(studentHomeworkId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}



