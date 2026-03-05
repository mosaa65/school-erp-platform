"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupEnrollmentStatusPayload,
  type UpdateLookupEnrollmentStatusPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupEnrollmentStatuses() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-enrollment-statuses", "list"],
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

export function useCreateLookupEnrollmentStatusMutation() {
  const invalidate = useInvalidateLookupEnrollmentStatuses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupEnrollmentStatusPayload) =>
      apiClient.createLookupEnrollmentStatus(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupEnrollmentStatusMutation() {
  const invalidate = useInvalidateLookupEnrollmentStatuses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      lookupEnrollmentStatusId: number;
      payload: UpdateLookupEnrollmentStatusPayload;
    }) =>
      apiClient.updateLookupEnrollmentStatus(params.lookupEnrollmentStatusId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupEnrollmentStatusMutation() {
  const invalidate = useInvalidateLookupEnrollmentStatuses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (lookupEnrollmentStatusId: number) =>
      apiClient.deleteLookupEnrollmentStatus(lookupEnrollmentStatusId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


