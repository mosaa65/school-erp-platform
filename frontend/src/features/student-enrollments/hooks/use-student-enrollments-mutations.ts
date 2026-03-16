"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentEnrollmentPayload,
  type UpdateStudentEnrollmentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentEnrollments() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-enrollments", "list"],
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

export function useCreateStudentEnrollmentMutation() {
  const invalidate = useInvalidateStudentEnrollments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentEnrollmentPayload) =>
      apiClient.createStudentEnrollment(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentEnrollmentMutation() {
  const invalidate = useInvalidateStudentEnrollments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      enrollmentId: string;
      payload: UpdateStudentEnrollmentPayload;
    }) => apiClient.updateStudentEnrollment(params.enrollmentId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentEnrollmentMutation() {
  const invalidate = useInvalidateStudentEnrollments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (enrollmentId: string) => apiClient.deleteStudentEnrollment(enrollmentId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}



