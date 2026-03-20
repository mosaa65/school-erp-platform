"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentEnrollments() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-enrollments"],
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

export function useManualDistributeStudentEnrollmentsMutation() {
  const invalidate = useInvalidateStudentEnrollments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: apiClient.manualDistributeStudentEnrollments,
    onSuccess: invalidate,
    onError: handleAuthFailure,
  });
}

export function useTransferStudentEnrollmentsMutation() {
  const invalidate = useInvalidateStudentEnrollments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: apiClient.transferStudentEnrollments,
    onSuccess: invalidate,
    onError: handleAuthFailure,
  });
}

export function useReturnStudentEnrollmentsToPendingMutation() {
  const invalidate = useInvalidateStudentEnrollments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: apiClient.returnStudentEnrollmentsToPending,
    onSuccess: invalidate,
    onError: handleAuthFailure,
  });
}
