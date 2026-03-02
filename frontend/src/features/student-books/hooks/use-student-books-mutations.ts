"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentBookPayload,
  type UpdateStudentBookPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentBooks() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-books", "list"],
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

export function useCreateStudentBookMutation() {
  const invalidate = useInvalidateStudentBooks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentBookPayload) => apiClient.createStudentBook(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentBookMutation() {
  const invalidate = useInvalidateStudentBooks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { studentBookId: string; payload: UpdateStudentBookPayload }) =>
      apiClient.updateStudentBook(params.studentBookId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentBookMutation() {
  const invalidate = useInvalidateStudentBooks();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (studentBookId: string) => apiClient.deleteStudentBook(studentBookId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}



