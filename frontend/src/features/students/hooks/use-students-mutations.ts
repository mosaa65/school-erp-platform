"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentPayload,
  type UpdateStudentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudents() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["students", "list"],
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

export function useCreateStudentMutation() {
  const invalidate = useInvalidateStudents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentPayload) => apiClient.createStudent(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentMutation() {
  const invalidate = useInvalidateStudents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { studentId: string; payload: UpdateStudentPayload }) =>
      apiClient.updateStudent(params.studentId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentMutation() {
  const invalidate = useInvalidateStudents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (studentId: string) => apiClient.deleteStudent(studentId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


